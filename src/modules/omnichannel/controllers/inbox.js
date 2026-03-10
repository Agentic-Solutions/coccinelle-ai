/**
 * Controller Inbox — N7 Lien Inbox <-> Prospect
 * GET /api/v1/omnichannel/inbox/conversations — liste conversations avec prospect lie
 * GET /api/v1/omnichannel/inbox/conversations/:id — detail conversation + messages
 * POST /api/v1/omnichannel/inbox/conversations/:id/link — lier un prospect
 */

import { omniLogger } from '../utils/logger.js';
import { requireAuth } from '../../auth/helpers.js';

/**
 * GET /api/v1/omnichannel/inbox/conversations
 * Liste les conversations du tenant avec prospect/customer lie
 */
export async function listInboxConversations(request, env) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return jsonResp({ error: authResult.error }, authResult.status);
  }

  const tenantId = authResult.tenant.id;
  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'active';
  const channel = url.searchParams.get('channel');
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE c.tenant_id = ?';
  const params = [tenantId];

  if (status !== 'all') {
    whereClause += ' AND c.status = ?';
    params.push(status);
  }
  if (channel) {
    whereClause += ' AND c.current_channel = ?';
    params.push(channel);
  }

  try {
    const countResult = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM omni_conversations c ${whereClause}`
    ).bind(...params).first();

    const conversations = await env.DB.prepare(`
      SELECT
        c.id,
        c.conversation_sid,
        c.tenant_id,
        c.client_phone,
        c.client_email,
        c.client_name,
        c.current_channel,
        c.active_channels,
        c.last_intent,
        c.last_sentiment,
        c.status,
        c.prospect_id,
        c.customer_id,
        c.first_message_at,
        c.last_message_at,
        c.created_at,
        p.first_name as prospect_first_name,
        p.last_name as prospect_last_name,
        p.phone as prospect_phone,
        p.email as prospect_email,
        p.status as prospect_status,
        (SELECT content FROM omni_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM omni_messages WHERE conversation_id = c.id) as message_count
      FROM omni_conversations c
      LEFT JOIN prospects p ON p.id = c.prospect_id AND p.tenant_id = c.tenant_id
      ${whereClause}
      ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(...params, limit, offset).all();

    const total = countResult?.total || 0;

    return jsonResp({
      success: true,
      conversations: (conversations.results || []).map(c => ({
        id: c.id,
        customer_phone: c.client_phone,
        customer_email: c.client_email,
        customer_name: c.client_name,
        current_channel: c.current_channel,
        active_channels: safeJsonParse(c.active_channels, []),
        last_intent: c.last_intent,
        last_sentiment: c.last_sentiment,
        status: c.status,
        last_message: c.last_message,
        message_count: c.message_count || 0,
        first_message_at: c.first_message_at,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
        prospect: c.prospect_id ? {
          id: c.prospect_id,
          first_name: c.prospect_first_name,
          last_name: c.prospect_last_name,
          phone: c.prospect_phone,
          email: c.prospect_email,
          status: c.prospect_status
        } : null,
        customer_id: c.customer_id
      })),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    omniLogger.error('listInboxConversations error', { error: error.message });
    return jsonResp({ error: error.message }, 500);
  }
}

/**
 * GET /api/v1/omnichannel/inbox/conversations/:id
 * Detail d'une conversation avec messages et prospect lie
 */
export async function getInboxConversation(request, env, conversationId) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return jsonResp({ error: authResult.error }, authResult.status);
  }

  const tenantId = authResult.tenant.id;

  try {
    // Get conversation with prospect
    const conversation = await env.DB.prepare(`
      SELECT
        c.*,
        p.id as prospect_id_ref,
        p.first_name as prospect_first_name,
        p.last_name as prospect_last_name,
        p.phone as prospect_phone,
        p.email as prospect_email,
        p.status as prospect_status,
        p.source as prospect_source
      FROM omni_conversations c
      LEFT JOIN prospects p ON p.id = c.prospect_id AND p.tenant_id = c.tenant_id
      WHERE c.id = ? AND c.tenant_id = ?
    `).bind(conversationId, tenantId).first();

    if (!conversation) {
      return jsonResp({ error: 'Conversation non trouvee' }, 404);
    }

    // Get messages
    const messages = await env.DB.prepare(`
      SELECT * FROM omni_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT 200
    `).bind(conversationId).all();

    // If no prospect linked, try to auto-link
    let prospect = null;
    if (conversation.prospect_id_ref) {
      prospect = {
        id: conversation.prospect_id_ref,
        first_name: conversation.prospect_first_name,
        last_name: conversation.prospect_last_name,
        phone: conversation.prospect_phone,
        email: conversation.prospect_email,
        status: conversation.prospect_status,
        source: conversation.prospect_source
      };
    }

    return jsonResp({
      success: true,
      conversation: {
        id: conversation.id,
        customer_phone: conversation.client_phone,
        customer_email: conversation.client_email,
        customer_name: conversation.client_name,
        current_channel: conversation.current_channel,
        active_channels: safeJsonParse(conversation.active_channels, []),
        last_intent: conversation.last_intent,
        last_sentiment: conversation.last_sentiment,
        status: conversation.status,
        first_message_at: conversation.first_message_at,
        last_message_at: conversation.last_message_at,
        created_at: conversation.created_at,
        prospect
      },
      messages: (messages.results || []).map(m => ({
        id: m.id,
        channel: m.channel,
        direction: m.direction,
        content: m.content,
        content_type: m.content_type,
        sender_role: m.sender_role,
        sentiment: m.sentiment,
        created_at: m.created_at
      }))
    });
  } catch (error) {
    omniLogger.error('getInboxConversation error', { error: error.message });
    return jsonResp({ error: error.message }, 500);
  }
}

/**
 * POST /api/v1/omnichannel/inbox/conversations/:id/link
 * Lier un prospect a une conversation (auto ou manuel)
 * Body: { prospect_id?: string } — si vide, tente auto-linking par phone/email
 */
export async function linkConversationToProspect(request, env, conversationId) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return jsonResp({ error: authResult.error }, authResult.status);
  }

  const tenantId = authResult.tenant.id;

  try {
    // Get conversation
    const conversation = await env.DB.prepare(
      'SELECT * FROM omni_conversations WHERE id = ? AND tenant_id = ?'
    ).bind(conversationId, tenantId).first();

    if (!conversation) {
      return jsonResp({ error: 'Conversation non trouvee' }, 404);
    }

    let prospectId = null;
    const body = await request.json().catch(() => ({}));

    if (body.prospect_id) {
      // Manual linking
      const prospect = await env.DB.prepare(
        'SELECT id FROM prospects WHERE id = ? AND tenant_id = ?'
      ).bind(body.prospect_id, tenantId).first();

      if (!prospect) {
        return jsonResp({ error: 'Prospect non trouve' }, 404);
      }
      prospectId = body.prospect_id;
    } else {
      // Auto-linking by phone or email
      prospectId = await autoLinkProspect(env, tenantId, conversation.client_phone, conversation.client_email);
    }

    if (!prospectId) {
      return jsonResp({
        success: false,
        message: 'Aucun prospect trouve pour auto-liaison. Utilisez prospect_id pour lier manuellement.',
        customer_phone: conversation.client_phone,
        customer_email: conversation.client_email
      });
    }

    // Update conversation
    await env.DB.prepare(
      'UPDATE omni_conversations SET prospect_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(prospectId, conversationId).run();

    // Get prospect info
    const prospect = await env.DB.prepare(
      'SELECT id, first_name, last_name, phone, email, status FROM prospects WHERE id = ?'
    ).bind(prospectId).first();

    omniLogger.info('Conversation linked to prospect', { conversationId, prospectId });

    return jsonResp({
      success: true,
      message: 'Conversation liee au prospect',
      prospect
    });
  } catch (error) {
    omniLogger.error('linkConversationToProspect error', { error: error.message });
    return jsonResp({ error: error.message }, 500);
  }
}

/**
 * Auto-link : cherche un prospect par phone ou email
 */
async function autoLinkProspect(env, tenantId, phone, email) {
  if (phone) {
    // Normalize phone (remove spaces, +33 -> 0, etc.)
    const normalizedPhone = phone.replace(/\s/g, '');
    const prospect = await env.DB.prepare(
      'SELECT id FROM prospects WHERE tenant_id = ? AND phone = ? LIMIT 1'
    ).bind(tenantId, normalizedPhone).first();
    if (prospect) return prospect.id;

    // Try without +33 prefix
    if (normalizedPhone.startsWith('+33')) {
      const altPhone = '0' + normalizedPhone.substring(3);
      const prospect2 = await env.DB.prepare(
        'SELECT id FROM prospects WHERE tenant_id = ? AND phone = ? LIMIT 1'
      ).bind(tenantId, altPhone).first();
      if (prospect2) return prospect2.id;
    }
  }

  if (email) {
    const prospect = await env.DB.prepare(
      'SELECT id FROM prospects WHERE tenant_id = ? AND email = ? LIMIT 1'
    ).bind(tenantId, email.toLowerCase()).first();
    if (prospect) return prospect.id;
  }

  return null;
}

// Helper
function jsonResp(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function safeJsonParse(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}
