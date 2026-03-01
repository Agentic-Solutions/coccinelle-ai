/**
 * Webhook WhatsApp - Gestion des messages WhatsApp via Twilio
 * 
 * ARCHITECTURE MULTI-TENANT :
 * - Chaque tenant peut avoir son propre numéro WhatsApp configuré
 * - Ou utiliser le numéro partagé Coccinelle
 * - Le routage se fait via la table omni_phone_mappings
 */

import { omniLogger } from '../utils/logger.js';
import { ClaudeAIService } from '../services/claude-ai.js';

/**
 * Génère un UUID v4
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Trouve le tenant associé à un numéro WhatsApp
 * Cherche dans omni_phone_mappings
 */
async function findTenantByWhatsAppNumber(db, toNumber) {
  try {
    // Nettoie le numéro (enlève le préfixe whatsapp:)
    const cleanNumber = toNumber.replace('whatsapp:', '').replace(/\s/g, '');
    
    // Cherche dans omni_phone_mappings
    const mapping = await db.prepare(`
      SELECT tenant_id FROM omni_phone_mappings 
      WHERE phone_number = ? AND channel_type = 'whatsapp' AND is_active = 1
    `).bind(cleanNumber).first();
    
    if (mapping) {
      return mapping.tenant_id;
    }
    
    // Fallback: cherche sans le préfixe + (pour compatibilité)
    const mappingAlt = await db.prepare(`
      SELECT tenant_id FROM omni_phone_mappings 
      WHERE (phone_number = ? OR phone_number = ?) AND channel_type = 'whatsapp' AND is_active = 1
    `).bind(cleanNumber, cleanNumber.replace('+', '')).first();
    
    if (mappingAlt) {
      return mappingAlt.tenant_id;
    }
    
    // Dernier fallback: premier tenant avec WhatsApp activé (pour le numéro partagé)
    const defaultTenant = await db.prepare(`
      SELECT id FROM tenants WHERE status = 'active' LIMIT 1
    `).first();
    
    return defaultTenant?.id || null;
  } catch (error) {
    omniLogger.error('Erreur recherche tenant par WhatsApp', { error: error.message });
    return null;
  }
}

/**
 * Récupère la configuration de l'agent pour un tenant
 */
async function getAgentConfig(db, tenantId) {
  try {
    const config = await db.prepare(`
      SELECT * FROM omni_agent_configs WHERE tenant_id = ?
    `).bind(tenantId).first();
    
    if (config) {
      return {
        agent_name: config.agent_name || 'Sara',
        agent_personality: config.agent_personality || 'professional',
        greeting_message: config.greeting_message || 'Bonjour ! Je suis Sara, votre assistante. Comment puis-je vous aider ?',
        business_context: config.business_context || '',
        language: config.language || 'fr-FR'
      };
    }
    
    // Config par défaut
    return {
      agent_name: 'Sara',
      agent_personality: 'professional',
      greeting_message: 'Bonjour ! Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?',
      business_context: '',
      language: 'fr-FR'
    };
  } catch (error) {
    omniLogger.error('Erreur récupération config agent', { error: error.message });
    return {
      agent_name: 'Sara',
      agent_personality: 'professional',
      greeting_message: 'Bonjour ! Comment puis-je vous aider ?'
    };
  }
}

/**
 * Trouve ou crée une conversation WhatsApp
 */
async function findOrCreateConversation(db, tenantId, phoneNumber, customerName) {
  try {
    // Cherche une conversation active avec ce numéro
    const existing = await db.prepare(`
      SELECT id FROM omni_conversations 
      WHERE tenant_id = ? AND client_phone = ? AND current_channel_type = 'whatsapp' AND status = 'active'
      ORDER BY last_message_at DESC
      LIMIT 1
    `).bind(tenantId, phoneNumber).first();
    
    if (existing) {
      // Met à jour last_message_at
      await db.prepare(`
        UPDATE omni_conversations 
        SET last_message_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(existing.id).run();
      
      return existing.id;
    }
    
    // Crée une nouvelle conversation
    const conversationId = generateUUID();
    await db.prepare(`
      INSERT INTO omni_conversations (
        id, tenant_id, client_phone, client_name,
        current_channel, active_channels, status,
        first_message_at, last_message_at
      ) VALUES (?, ?, ?, ?, 'whatsapp', '["whatsapp"]', 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(conversationId, tenantId, phoneNumber, customerName || phoneNumber).run();
    
    omniLogger.info('Nouvelle conversation WhatsApp créée', { conversationId, tenantId, phoneNumber });
    return conversationId;
  } catch (error) {
    omniLogger.error('Erreur création conversation WhatsApp', { error: error.message });
    throw error;
  }
}

/**
 * Stocke un message dans la base
 */
async function storeMessage(db, conversationId, content, direction, senderRole) {
  try {
    const messageId = generateUUID();
    await db.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        content_type, sender_role, created_at
      ) VALUES (?, ?, 'whatsapp', ?, ?, 'text', ?, CURRENT_TIMESTAMP)
    `).bind(messageId, conversationId, direction, content, senderRole).run();
    
    return messageId;
  } catch (error) {
    omniLogger.error('Erreur stockage message', { error: error.message });
    throw error;
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
    throw new Error(`Twilio WhatsApp API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  omniLogger.info('Message WhatsApp envoyé', { messageSid: data.sid, to });

  return data;
}

/**
 * POST /webhooks/omnichannel/whatsapp
 * Webhook Twilio pour les messages WhatsApp entrants
 */
export async function handleIncomingWhatsApp(request, env) {
  try {
    const formData = await request.formData();
    const messageSid = formData.get('MessageSid');
    const from = formData.get('From'); // Format: whatsapp:+33...
    const to = formData.get('To');     // Format: whatsapp:+33...
    const body = formData.get('Body');
    const profileName = formData.get('ProfileName'); // Nom WhatsApp du client

    omniLogger.info('📱 Message WhatsApp entrant', { messageSid, from, to, body: body?.substring(0, 50) });

    // Extraire le numéro de téléphone (enlever le préfixe "whatsapp:")
    const phoneNumber = from.replace('whatsapp:', '');

    // === ROUTAGE MULTI-TENANT ===
    const tenantId = await findTenantByWhatsAppNumber(env.DB, to);
    
    if (!tenantId) {
      omniLogger.warn('❌ Tenant non trouvé pour ce numéro WhatsApp', { to });
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'application/xml' }
      });
    }
    
    omniLogger.info('✅ Tenant trouvé', { tenantId });

    // Récupérer la config agent du tenant
    const agentConfig = await getAgentConfig(env.DB, tenantId);

    // Trouver ou créer la conversation
    const conversationId = await findOrCreateConversation(
      env.DB, tenantId, phoneNumber, profileName
    );

    // Enregistrer le message entrant
    await storeMessage(env.DB, conversationId, body, 'inbound', 'customer');

    // === GÉNÉRATION DE LA RÉPONSE IA ===
    let aiResponse;
    try {
      const ai = new ClaudeAIService(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY);
      
      // Récupérer l'historique de la conversation (derniers 10 messages)
      const history = await env.DB.prepare(`
        SELECT content, direction, sender_role FROM omni_messages 
        WHERE conversation_id = ? 
        ORDER BY created_at DESC LIMIT 10
      `).bind(conversationId).all();
      
      const messages = (history.results || []).reverse().map(msg => ({
        role: msg.sender_role === 'customer' ? 'user' : 'assistant',
        content: msg.content
      }));
      
      // Créer le contexte système
      const systemPrompt = `Tu es ${agentConfig.agent_name}, une assistante virtuelle ${agentConfig.agent_personality}. 
${agentConfig.business_context}
Réponds de manière concise et utile. Tu communiques par WhatsApp, donc garde tes messages courts.
Langue: Français.`;

      // Appel à l'API (simplifié)
      aiResponse = await ai.generateResponse(systemPrompt, messages, body);
      
    } catch (aiError) {
      omniLogger.error('Erreur génération IA', { error: aiError.message });
      aiResponse = agentConfig.greeting_message || "Bonjour ! Comment puis-je vous aider ?";
    }

    // Enregistrer la réponse
    await storeMessage(env.DB, conversationId, aiResponse, 'outbound', 'assistant');

    // Envoyer la réponse via Twilio WhatsApp
    await sendTwilioWhatsApp(env, from, aiResponse);

    // Répondre avec TwiML vide (la réponse a déjà été envoyée via API)
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'application/xml' }
    });

  } catch (error) {
    omniLogger.error('❌ Erreur traitement WhatsApp', { error: error.message, stack: error.stack });

    // Répondre avec un message d'erreur
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Désolé, une erreur est survenue. Veuillez réessayer plus tard.</Message>
</Response>`, {
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}
