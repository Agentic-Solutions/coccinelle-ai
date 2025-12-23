/**
 * Webhook SMS - Gestion des messages SMS via Twilio
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';
import { ClaudeAIService } from '../services/claude-ai.js';

/**
 * POST /webhooks/omnichannel/sms
 * Webhook Twilio pour les SMS entrants
 */
export async function handleIncomingSMS(request, env) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid');
    const from = formData.get('From');
    const to = formData.get('To');
    const body = formData.get('Body');

    omniLogger.info('Incoming SMS', { messageSid, from, to, body });

    // Config agent par défaut
    const agentConfig = {
      agent_name: 'Sara',
      agent_personality: 'friendly',
      greeting_message: 'Bonjour ! Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?'
    };

    // Chercher ou créer une conversation pour ce numéro
    let conversation = await env.DB.prepare(`
      SELECT * FROM omni_conversations
      WHERE customer_phone = ? AND current_channel = 'sms' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(from).first();

    let conversationId;

    if (!conversation) {
      // Créer nouvelle conversation
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await env.DB.prepare(queries.createConversation).bind(
        conversationId,
        null, // conversation_sid
        'tenant_mihmuebzieaxehi7qv',
        from,
        null, // email
        null, // name
        JSON.stringify(['sms']),
        'sms',
        JSON.stringify({}),
        null, // external_id
        now,
        now
      ).run();

      omniLogger.info('New SMS conversation created', { conversationId, from });
    } else {
      conversationId = conversation.id;
      omniLogger.info('Existing SMS conversation found', { conversationId, from });
    }

    // Enregistrer le message entrant
    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'sms', 'inbound', ?, 'client', datetime('now'))
    `).bind(userMessageId, conversationId, body).run();

    // Générer une réponse avec OpenAI
    const ai = new ClaudeAIService(env.OPENAI_API_KEY);

    // Créer ou récupérer la session AI
    let session;
    if (conversation && conversation.conversation_context) {
      try {
        const context = JSON.parse(conversation.conversation_context);
        session = context.aiSession || await ai.createSession(agentConfig);
      } catch {
        session = await ai.createSession(agentConfig);
      }
    } else {
      session = await ai.createSession(agentConfig);
    }

    const response = await ai.streamResponse(session, body);

    // Enregistrer la réponse
    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'sms', 'outbound', ?, 'assistant', datetime('now'))
    `).bind(assistantMessageId, conversationId, response).run();

    // Sauvegarder la session AI dans le contexte
    await env.DB.prepare(`
      UPDATE omni_conversations
      SET conversation_context = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify({ aiSession: session }), conversationId).run();

    // Envoyer la réponse via Twilio SMS
    await sendTwilioSMS(env, from, response);

    // Répondre avec TwiML vide (la réponse a déjà été envoyée via API)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'application/xml' }
    });

  } catch (error) {
    omniLogger.error('Failed to handle incoming SMS', { error: error.message });

    // Répondre avec un message d'erreur
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Désolé, une erreur est survenue. Veuillez réessayer plus tard.</Message>
</Response>`, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}

/**
 * Envoyer un SMS via l'API Twilio
 */
async function sendTwilioSMS(env, to, message) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: message
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Twilio SMS API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  omniLogger.info('SMS sent via Twilio', { messageSid: data.sid, to });

  return data;
}
