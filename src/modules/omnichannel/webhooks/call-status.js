/**
 * Webhook Call Status - Notifications de changement de statut d'appel
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';

/**
 * POST /webhooks/omnichannel/call-status
 * Webhook Twilio pour les changements de statut d'appel
 * (ringing, answered, completed, failed, busy, no-answer)
 */
export async function handleCallStatus(request, env) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const callStatus = formData.get('CallStatus'); // initiated, ringing, in-progress, completed, busy, failed, no-answer
    const duration = formData.get('CallDuration');
    const from = formData.get('From');
    const to = formData.get('To');

    omniLogger.info('Call status update', {
      callSid,
      callStatus,
      duration,
      from,
      to
    });

    // Trouver la conversation associée
    const conversation = await env.DB.prepare(`
      SELECT id, tenant_id, status
      FROM omni_conversations
      WHERE call_sid = ?
      LIMIT 1
    `).bind(callSid).first();

    if (!conversation) {
      omniLogger.warn('Conversation not found for call status update', { callSid });
      return new Response('OK', { status: 200 });
    }

    // Mettre à jour le statut selon le call status
    let newStatus = conversation.status;
    let closedReason = null;

    switch (callStatus) {
      case 'completed':
        newStatus = 'closed';
        closedReason = 'completed';
        break;
      case 'failed':
      case 'busy':
      case 'no-answer':
        newStatus = 'closed';
        closedReason = callStatus;
        break;
      case 'in-progress':
        newStatus = 'active';
        break;
    }

    // Mettre à jour la conversation
    if (newStatus !== conversation.status) {
      await env.DB.prepare(`
        UPDATE omni_conversations
        SET status = ?,
            closed_reason = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `).bind(newStatus, closedReason, conversation.id).run();

      omniLogger.info('Conversation status updated', {
        conversationId: conversation.id,
        oldStatus: conversation.status,
        newStatus,
        closedReason
      });
    }

    // Enregistrer un message système si l'appel est terminé
    if (callStatus === 'completed' && duration) {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(`
        INSERT INTO omni_messages (
          id, conversation_id, channel, direction, content,
          sender_role, duration, created_at
        ) VALUES (?, ?, 'voice', 'inbound', ?, 'system', ?, datetime('now'))
      `).bind(
        messageId,
        conversation.id,
        `Appel terminé - Durée: ${duration}s`,
        parseInt(duration)
      ).run();
    }

    return new Response('OK', { status: 200 });

  } catch (error) {
    omniLogger.error('Failed to handle call status', { error: error.message });
    return new Response('Error', { status: 500 });
  }
}
