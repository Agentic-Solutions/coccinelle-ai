/**
 * Webhook Email - Gestion des emails via Resend
 * Version multi-tenant avec routing dynamique
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

    // ============================================
    // ROUTING MULTI-TENANT DYNAMIQUE
    // ============================================
    
    // Extraire l'adresse de destination
    const toEmail = Array.isArray(to) ? to[0] : to;
    const toAddress = typeof toEmail === 'string' ? toEmail : toEmail?.email;
    
    omniLogger.info('Routing email', { toAddress });
    
    // Extraire le slug depuis l'adresse (ex: marie-dupont@coccinelle.ai → marie-dupont)
    let tenantSlug = null;
    if (toAddress && toAddress.includes('@coccinelle.ai')) {
      tenantSlug = toAddress.split('@')[0];
    }
    
    if (!tenantSlug) {
      omniLogger.error('Cannot extract tenant slug from email', { toAddress });
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid destination email - cannot determine tenant' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Chercher le tenant par slug
    const tenant = await env.DB.prepare(`
      SELECT id, name, slug FROM tenants WHERE slug = ?
    `).bind(tenantSlug).first();
    
    if (!tenant) {
      omniLogger.error('Tenant not found for slug', { tenantSlug });
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Tenant not found for slug: ${tenantSlug}` 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const tenantId = tenant.id;
    omniLogger.info('Tenant found', { tenantId, tenantName: tenant.name, tenantSlug });

    // ============================================
    // CHARGER LA CONFIGURATION DE L'AGENT
    // ============================================
    
    // Chercher la config agent du tenant (ou utiliser défaut)
    const agentConfigRow = await env.DB.prepare(`
      SELECT * FROM omni_agent_configs WHERE tenant_id = ? LIMIT 1
    `).bind(tenantId).first();
    
    const agentConfig = agentConfigRow ? {
      agent_name: agentConfigRow.agent_name || 'Sara',
      agent_personality: agentConfigRow.agent_personality || 'professional',
      greeting_message: agentConfigRow.greeting_message || `Bonjour ! Je suis Sara, l'assistante de ${tenant.name}. Comment puis-je vous aider ?`
    } : {
      agent_name: 'Sara',
      agent_personality: 'professional',
      greeting_message: `Bonjour ! Je suis Sara, l'assistante de ${tenant.name}. Comment puis-je vous aider ?`
    };

    // ============================================
    // CHARGER LA KNOWLEDGE BASE DU TENANT
    // ============================================
    
    let knowledgeContext = '';
    const knowledgeDocs = await env.DB.prepare(`
      SELECT content FROM knowledge_documents WHERE tenant_id = ? LIMIT 5
    `).bind(tenantId).all();
    
    if (knowledgeDocs.results && knowledgeDocs.results.length > 0) {
      knowledgeContext = knowledgeDocs.results.map(doc => doc.content).join('\n\n');
      omniLogger.info('Knowledge base loaded', { 
        tenantId, 
        docsCount: knowledgeDocs.results.length 
      });
    }

    // ============================================
    // GESTION CONVERSATION
    // ============================================

    // Chercher ou créer une conversation pour cet email
    let conversation = await env.DB.prepare(`
      SELECT * FROM omni_conversations
      WHERE tenant_id = ? AND client_email = ? AND current_channel = 'email' AND status = 'active'
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(tenantId, senderEmail).first();

    let conversationId;

    if (!conversation) {
      // Créer nouvelle conversation
      conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      await env.DB.prepare(queries.createConversation).bind(
        conversationId,
        null, // conversation_sid
        tenantId,  // ← TENANT DYNAMIQUE
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

      omniLogger.info('New email conversation created', { conversationId, senderEmail, tenantId });
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

    // ============================================
    // GÉNÉRER RÉPONSE IA AVEC CONTEXTE
    // ============================================
    
    const ai = new ClaudeAIService(env.OPENAI_API_KEY);

    // Créer ou récupérer la session AI
    let session;
    if (conversation && conversation.conversation_context) {
      try {
        const context = JSON.parse(conversation.conversation_context);
        session = context.aiSession || await ai.createSession(agentConfig, knowledgeContext);
      } catch {
        session = await ai.createSession(agentConfig, knowledgeContext);
      }
    } else {
      session = await ai.createSession(agentConfig, knowledgeContext);
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
    await sendResendEmail(env, senderEmail, `Re: ${subject}`, response, tenant.name);

    return new Response(JSON.stringify({ 
      success: true,
      tenant: tenant.name,
      conversationId 
    }), {
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
async function sendResendEmail(env, to, subject, text, tenantName) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.RESEND_FROM_EMAIL || `Sara <sara@coccinelle.ai>`;

  const url = 'https://api.resend.com/emails';

  // Ajouter signature avec nom du tenant
  const textWithSignature = `${text}\n\n--\nSara - Assistante de ${tenantName}\nPowered by Coccinelle.ai`;

  const body = {
    from: from,
    to: [to],
    subject,
    text: textWithSignature
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
  omniLogger.info('Email sent via Resend', { emailId: data.id, to, tenantName });

  return data;
}
