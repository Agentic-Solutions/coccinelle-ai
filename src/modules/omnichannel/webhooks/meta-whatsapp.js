/**
 * Webhook Meta WhatsApp Cloud API
 * Gestion des messages WhatsApp via Meta Cloud API
 */

import { omniLogger } from '../utils/logger.js';
import { ClaudeAIService } from '../services/claude-ai.js';

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * GET - Vérification du webhook par Meta
 */
export async function handleMetaWebhookVerification(request, env) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const verifyToken = env.META_WEBHOOK_VERIFY_TOKEN || 'coccinelle_meta_verify_2026';

  if (mode === 'subscribe' && token === verifyToken) {
    omniLogger.info('✅ Meta webhook vérifié');
    return new Response(challenge, { status: 200 });
  }

  return new Response('Forbidden', { status: 403 });
}

/**
 * Trouve le tenant via le meta_phone_number_id
 */
async function findTenantByMetaPhoneId(db, phoneNumberId) {
  try {
    // Chercher dans omni_phone_mappings par meta_phone_number_id
    const mapping = await db.prepare(`
      SELECT tenant_id FROM omni_phone_mappings 
      WHERE meta_phone_number_id = ? AND channel_type = 'whatsapp' AND is_active = 1
    `).bind(phoneNumberId).first();

    if (mapping) {
      omniLogger.info('✅ Tenant trouvé via mapping', { tenantId: mapping.tenant_id, phoneNumberId });
      return mapping.tenant_id;
    }

    // Fallback: premier tenant actif
    omniLogger.warn('⚠️ Pas de mapping trouvé, utilisation du premier tenant actif', { phoneNumberId });
    const tenant = await db.prepare(`SELECT id FROM tenants WHERE status = 'active' LIMIT 1`).first();
    return tenant?.id || null;

  } catch (error) {
    omniLogger.error('Erreur recherche tenant', { error: error.message });
    return null;
  }
}

/**
 * Envoyer un message WhatsApp via Meta Cloud API
 */
async function sendMetaWhatsApp(env, phoneNumberId, to, message) {
  const accessToken = env.META_WHATSAPP_ACCESS_TOKEN;
  
  if (!accessToken) {
    throw new Error('META_WHATSAPP_ACCESS_TOKEN non configuré');
  }

  const url = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: message }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Meta WhatsApp API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  omniLogger.info('✅ Message WhatsApp envoyé', { messageId: data.messages?.[0]?.id, to });
  return data;
}

/**
 * Trouve ou crée une conversation WhatsApp
 */
async function findOrCreateConversation(db, tenantId, phoneNumber, customerName) {
  try {
    const existing = await db.prepare(`
      SELECT id FROM omni_conversations 
      WHERE tenant_id = ? AND client_phone = ? AND current_channel = 'whatsapp' AND status = 'active'
      ORDER BY last_message_at DESC LIMIT 1
    `).bind(tenantId, phoneNumber).first();

    if (existing) {
      await db.prepare(`
        UPDATE omni_conversations SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).bind(existing.id).run();
      return existing.id;
    }

    const conversationId = generateUUID();
    await db.prepare(`
      INSERT INTO omni_conversations (id, tenant_id, client_phone, client_name, current_channel, active_channels, status, first_message_at, last_message_at)
      VALUES (?, ?, ?, ?, 'whatsapp', '["whatsapp"]', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(conversationId, tenantId, phoneNumber, customerName || phoneNumber).run();

    omniLogger.info('Nouvelle conversation WhatsApp', { conversationId, tenantId });
    return conversationId;
  } catch (error) {
    omniLogger.error('Erreur conversation', { error: error.message });
    throw error;
  }
}

/**
 * Stocke un message
 */
async function storeMessage(db, conversationId, content, direction, senderRole) {
  const messageId = generateUUID();
  await db.prepare(`
    INSERT INTO omni_messages (id, conversation_id, channel, direction, content, content_type, sender_role, created_at)
    VALUES (?, ?, 'whatsapp', ?, ?, 'text', ?, CURRENT_TIMESTAMP)
  `).bind(messageId, conversationId, direction, content, senderRole).run();
  return messageId;
}

/**
 * Récupère la Knowledge Base pour un tenant
 */
async function getKnowledgeContext(db, tenantId) {
  try {
    const docs = await db.prepare(`
      SELECT content FROM knowledge_documents 
      WHERE tenant_id = ? AND status = 'active'
      ORDER BY created_at DESC LIMIT 20
    `).bind(tenantId).all();

    if (docs.results && docs.results.length > 0) {
      const kb = docs.results.map(d => d.content).join('\n\n');
      omniLogger.info('📚 Knowledge Base chargée', { tenantId, docsCount: docs.results.length, kbLength: kb.length });
      return kb;
    }
    omniLogger.warn('⚠️ Pas de Knowledge Base', { tenantId });
    return '';
  } catch (error) {
    omniLogger.error('Erreur KB', { error: error.message });
    return '';
  }
}

/**
 * POST - Messages WhatsApp entrants
 */
export async function handleMetaWhatsAppWebhook(request, env) {
  try {
    const body = await request.json();
    
    omniLogger.info('📱 Webhook Meta WhatsApp', { object: body.object, hasEntry: !!body.entry });

    if (body.object !== 'whatsapp_business_account') {
      return new Response('OK', { status: 200 });
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        const phoneNumberId = value.metadata?.phone_number_id;
        
        for (const message of value.messages || []) {
          if (message.type !== 'text') continue;

          const fromNumber = message.from;
          const messageText = message.text?.body;
          const contactName = value.contacts?.[0]?.profile?.name || fromNumber;

          omniLogger.info('📨 Message reçu', { from: fromNumber, text: messageText?.substring(0, 50), phoneNumberId });

          // === ROUTAGE MULTI-TENANT ===
          const tenantId = await findTenantByMetaPhoneId(env.DB, phoneNumberId);

          if (!tenantId) {
            omniLogger.error('❌ Aucun tenant trouvé');
            continue;
          }

          // Conversation
          const conversationId = await findOrCreateConversation(env.DB, tenantId, fromNumber, contactName);

          // Stocker message entrant
          await storeMessage(env.DB, conversationId, messageText, 'inbound', 'customer');

          // Knowledge Base
          const knowledgeContext = await getKnowledgeContext(env.DB, tenantId);

          // Générer réponse IA
          let aiResponse;
          try {
            const claudeService = new ClaudeAIService(env.OPENAI_API_KEY);
            
            const agentConfig = await env.DB.prepare(`
              SELECT * FROM omni_agent_configs WHERE tenant_id = ?
            `).bind(tenantId).first() || {
              agent_name: 'Sara',
              agent_personality: 'professionnelle et chaleureuse'
            };

            const session = await claudeService.createSession(agentConfig, knowledgeContext);
            aiResponse = await claudeService.streamResponse(session, messageText);

          } catch (aiError) {
            omniLogger.error('Erreur IA', { error: aiError.message });
            aiResponse = "Bonjour ! Je suis Sara. Comment puis-je vous aider ?";
          }

          // Stocker réponse
          await storeMessage(env.DB, conversationId, aiResponse, 'outbound', 'assistant');

          // Envoyer via Meta
          await sendMetaWhatsApp(env, phoneNumberId, fromNumber, aiResponse);
        }
      }
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    omniLogger.error('❌ Erreur webhook', { error: error.message, stack: error.stack });
    return new Response('OK', { status: 200 });
  }
}
