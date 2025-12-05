/**
 * Webhook Email - Gestion des emails via Resend
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';
import { ClaudeAIService } from '../services/claude-ai.js';

/**
 * POST /webhooks/omnichannel/email
 * Webhook Resend pour les emails entrants
 */
export async function handleIncomingEmail(request, env) {
  try {
    const payload = await request.json();

    const {
      type,
      created_at,
      data
    } = payload;

    // Vérifier que c'est bien un email entrant
    if (type !== 'email.received') {
      omniLogger.info('Ignoring non-email event', { type });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const {
      email_id,
      from,
      to,
      subject,
      html,
      text
    } = data;

    omniLogger.info('Incoming email', { email_id, from, to, subject });

    // Extraire l'adresse email de l'expéditeur
    const senderEmail = typeof from === 'string' ? from : from.email;

    // Config agent par défaut
    const agentConfig = {
      agent_name: 'Sara',
      agent_personality: 'professional',
      greeting_message: 'Bonjour ! Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?'
    };

    // Chercher ou créer une conversation pour cet email
    let conversation = await env.DB.prepare(`
      SELECT * FROM omni_conversations
      WHERE client_email = ? AND current_channel = 'email' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(senderEmail).first();

    let conversationId;

    if (!conversation) {
      // Créer nouvelle conversation
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await env.DB.prepare(queries.createConversation).bind(
        conversationId,
        null, // conversation_sid
        'tenant_mihmuebzieaxehi7qv',
        null, // phone
        senderEmail,
        null, // name
        JSON.stringify(['email']),
        'email',
        JSON.stringify({ subject }),
        email_id,
        now,
        now
      ).run();

      omniLogger.info('New email conversation created', { conversationId, senderEmail });
    } else {
      conversationId = conversation.id;
      omniLogger.info('Existing email conversation found', { conversationId, senderEmail });
    }

    // Utiliser le texte brut en priorité, sinon HTML
    const emailBody = text || html || subject;

    // Enregistrer le message entrant
    const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'email', 'inbound', ?, 'client', datetime('now'))
    `).bind(userMessageId, conversationId, emailBody).run();

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

    const response = await ai.streamResponse(session, emailBody);

    // Enregistrer la réponse
    const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'email', 'outbound', ?, 'assistant', datetime('now'))
    `).bind(assistantMessageId, conversationId, response).run();

    // Sauvegarder la session AI dans le contexte
    await env.DB.prepare(`
      UPDATE omni_conversations
      SET conversation_context = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(JSON.stringify({ aiSession: session, subject }), conversationId).run();

    // Envoyer la réponse par email via Resend
    await sendResendEmail(env, senderEmail, `Re: ${subject}`, response);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to handle incoming email', {
      error: error.message,
      stack: error.stack
    });

    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Envoyer un email via l'API Resend
 */
async function sendResendEmail(env, to, subject, text) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  const url = 'https://api.resend.com/emails';

  const body = {
    from: `Sara <${from}>`,
    to: [to],
    subject,
    text
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  omniLogger.info('Email sent via Resend', { emailId: data.id, to });

  return data;
}
