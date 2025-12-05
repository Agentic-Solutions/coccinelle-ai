/**
 * Webhook WhatsApp - Gestion des messages WhatsApp via Twilio
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';
import { ClaudeAIService } from '../services/claude-ai.js';

/**
 * POST /webhooks/omnichannel/whatsapp
 * Webhook Twilio pour les messages WhatsApp entrants
 */
export async function handleIncomingWhatsApp(request, env) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid');
    const from = formData.get('From'); // Format: whatsapp:+33...
    const to = formData.get('To');
    const body = formData.get('Body');

    omniLogger.info('Incoming WhatsApp message', { messageSid, from, to, body });

    // Extraire le numéro de téléphone (enlever le préfixe "whatsapp:")
    const phoneNumber = from.replace('whatsapp:', '');

    // Config agent par défaut
    const agentConfig = {
      agent_name: 'Sara',
      agent_personality: 'friendly',
      greeting_message: 'Bonjour ! Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?'
    };

    // Chercher ou créer une conversation pour ce numéro
    let conversation = await env.DB.prepare(`
      SELECT * FROM omni_conversations
      WHERE client_phone = ? AND current_channel = 'whatsapp' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(phoneNumber).first();

    let conversationId;

    if (!conversation) {
      // Créer nouvelle conversation
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await env.DB.prepare(queries.createConversation).bind(
        conversationId,
        null, // conversation_sid
        'tenant_mihmuebzieaxehi7qv',
        phoneNumber,
        null, // email
        null, // name
        JSON.stringify(['whatsapp']),
        'whatsapp',
        JSON.stringify({}),
        null, // external_id
        now,
        now
      ).run();

      omniLogger.info('New WhatsApp conversation created', { conversationId, phoneNumber });
    } else {
      conversationId = conversation.id;
      omniLogger.info('Existing WhatsApp conversation found', { conversationId, phoneNumber });
    }

    // Enregistrer le message entrant
    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'whatsapp', 'inbound', ?, 'client', datetime('now'))
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
      ) VALUES (?, ?, 'whatsapp', 'outbound', ?, 'assistant', datetime('now'))
    `).bind(assistantMessageId, conversationId, response).run();

    // Sauvegarder la session AI dans le contexte
    await env.DB.prepare(`
      UPDATE omni_conversations
      SET conversation_context = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify({ aiSession: session }), conversationId).run();

    // Envoyer la réponse via Twilio WhatsApp
    await sendTwilioWhatsApp(env, from, response);

    // Répondre avec TwiML vide (la réponse a déjà été envoyée via API)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'application/xml' }
    });

  } catch (error) {
    omniLogger.error('Failed to handle incoming WhatsApp', { error: error.message });

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
 * Envoyer un message WhatsApp via l'API Twilio
 */
async function sendTwilioWhatsApp(env, to, message) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = `whatsapp:${env.TWILIO_PHONE_NUMBER}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const body = new URLSearchParams({
    To: to, // Already has "whatsapp:" prefix
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
    throw new Error(`Twilio WhatsApp API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  omniLogger.info('WhatsApp message sent via Twilio', { messageSid: data.sid, to });

  return data;
}
