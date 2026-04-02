/**
 * Routes API Omnicanal — gestion des regles automatiques
 * GET /api/v1/omnicanal/rules — lister les regles
 * POST /api/v1/omnicanal/rules — creer une regle
 * PUT /api/v1/omnicanal/rules/:id — modifier une regle
 * DELETE /api/v1/omnicanal/rules/:id — supprimer une regle
 * GET /api/v1/omnicanal/executions — logs d'execution
 * POST /api/v1/omnicanal/test — simuler un evenement
 * POST /api/v1/omnicanal/event — evenement externe (auth VoixIA)
 */

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { handleOmniEvent } from './orchestrator.js';

// Middleware auth interne
async function requireAuth(request, env) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return { error: 'Authorization required', status: 401 };

  const token = authHeader.replace('Bearer ', '');
  // Import dynamique pour eviter circular
  const { verifyToken } = await import('../auth/helpers.js');
  const payload = verifyToken(token, env.JWT_SECRET);
  if (!payload) return { error: 'Invalid token', status: 401 };
  return { user: payload, tenant_id: payload.tenant_id };
}

export async function handleOmnicanalRoutes(request, env, path, method) {
  // Auth obligatoire
  const auth = await requireAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const tenantId = auth.tenant_id;

  // GET /api/v1/omnicanal/rules
  if (path === '/api/v1/omnicanal/rules' && method === 'GET') {
    return getRules(env, tenantId);
  }

  // POST /api/v1/omnicanal/rules
  if (path === '/api/v1/omnicanal/rules' && method === 'POST') {
    return createRule(request, env, tenantId);
  }

  // PUT /api/v1/omnicanal/rules/:id
  const putMatch = path.match(/^\/api\/v1\/omnicanal\/rules\/(\d+)$/);
  if (putMatch && method === 'PUT') {
    return updateRule(request, env, tenantId, parseInt(putMatch[1]));
  }

  // DELETE /api/v1/omnicanal/rules/:id
  const delMatch = path.match(/^\/api\/v1\/omnicanal\/rules\/(\d+)$/);
  if (delMatch && method === 'DELETE') {
    return deleteRule(env, tenantId, parseInt(delMatch[1]));
  }

  // GET /api/v1/omnicanal/executions
  if (path === '/api/v1/omnicanal/executions' && method === 'GET') {
    return getExecutions(env, tenantId);
  }

  // POST /api/v1/omnicanal/test
  if (path === '/api/v1/omnicanal/test' && method === 'POST') {
    return testEvent(request, env, tenantId);
  }

  return null;
}

// Lister les regles du tenant
async function getRules(env, tenantId) {
  try {
    const rules = await env.DB.prepare(`
      SELECT * FROM omni_rules
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).bind(tenantId).all();

    return successResponse({ rules: rules.results || [] });
  } catch (error) {
    logger.error('getRules error', { error: error.message });
    return errorResponse('Erreur lors de la recuperation des regles', 500);
  }
}

// Creer une regle
async function createRule(request, env, tenantId) {
  try {
    const body = await request.json();
    const { trigger_event, trigger_channel, action_channel, action_type, action_template, delay_seconds } = body;

    if (!trigger_event || !trigger_channel || !action_channel || !action_type) {
      return errorResponse('Champs requis: trigger_event, trigger_channel, action_channel, action_type', 400);
    }

    const valid_events = ['call_ended', 'message_received', 'appointment_created'];
    const valid_channels = ['voice', 'sms', 'whatsapp', 'email', 'crm'];
    const valid_actions = ['send_message', 'send_email', 'ai_reply', 'create_prospect'];

    if (!valid_events.includes(trigger_event)) return errorResponse(`trigger_event invalide: ${trigger_event}`, 400);
    if (!valid_channels.includes(trigger_channel)) return errorResponse(`trigger_channel invalide`, 400);
    if (!valid_channels.includes(action_channel)) return errorResponse(`action_channel invalide`, 400);
    if (!valid_actions.includes(action_type)) return errorResponse(`action_type invalide: ${action_type}`, 400);

    await env.DB.prepare(`
      INSERT INTO omni_rules (tenant_id, trigger_event, trigger_channel, action_channel, action_type, action_template, delay_seconds, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `).bind(tenantId, trigger_event, trigger_channel, action_channel, action_type, action_template || null, delay_seconds || 0).run();

    return successResponse({ message: 'Regle creee' });
  } catch (error) {
    logger.error('createRule error', { error: error.message });
    return errorResponse('Erreur lors de la creation', 500);
  }
}

// Modifier une regle
async function updateRule(request, env, tenantId, ruleId) {
  try {
    // Verifier que la regle appartient au tenant
    const existing = await env.DB.prepare(`
      SELECT id FROM omni_rules WHERE id = ? AND tenant_id = ?
    `).bind(ruleId, tenantId).first();

    if (!existing) return errorResponse('Regle non trouvee', 404);

    const body = await request.json();
    const fields = [];
    const values = [];

    if (body.action_template !== undefined) { fields.push('action_template = ?'); values.push(body.action_template); }
    if (body.delay_seconds !== undefined) { fields.push('delay_seconds = ?'); values.push(body.delay_seconds); }
    if (body.is_active !== undefined) { fields.push('is_active = ?'); values.push(body.is_active ? 1 : 0); }

    if (fields.length === 0) return errorResponse('Aucun champ a modifier', 400);

    values.push(ruleId, tenantId);
    await env.DB.prepare(`
      UPDATE omni_rules SET ${fields.join(', ')} WHERE id = ? AND tenant_id = ?
    `).bind(...values).run();

    return successResponse({ message: 'Regle modifiee' });
  } catch (error) {
    logger.error('updateRule error', { error: error.message });
    return errorResponse('Erreur lors de la modification', 500);
  }
}

// Supprimer une regle
async function deleteRule(env, tenantId, ruleId) {
  try {
    const result = await env.DB.prepare(`
      DELETE FROM omni_rules WHERE id = ? AND tenant_id = ?
    `).bind(ruleId, tenantId).run();

    if (result.meta.changes === 0) return errorResponse('Regle non trouvee', 404);

    return successResponse({ message: 'Regle supprimee' });
  } catch (error) {
    logger.error('deleteRule error', { error: error.message });
    return errorResponse('Erreur lors de la suppression', 500);
  }
}

// Logs des 50 dernieres executions
async function getExecutions(env, tenantId) {
  try {
    const execs = await env.DB.prepare(`
      SELECT ore.id, ore.rule_id, ore.contact_phone, ore.contact_email,
             ore.status, ore.result, ore.executed_at,
             omr.trigger_event, omr.trigger_channel, omr.action_channel, omr.action_type
      FROM omni_rule_executions ore
      JOIN omni_rules omr ON ore.rule_id = omr.id
      WHERE ore.tenant_id = ?
      ORDER BY ore.executed_at DESC
      LIMIT 50
    `).bind(tenantId).all();

    return successResponse({ executions: execs.results || [] });
  } catch (error) {
    logger.error('getExecutions error', { error: error.message });
    return errorResponse('Erreur lors de la recuperation des logs', 500);
  }
}

/**
 * POST /api/v1/omnicanal/event — evenement externe (auth VoixIA : X-VoixIA-Key + X-VoixIA-Tenant)
 * Appele par l'agent Python VoixIA en fin d'appel (call_ended)
 * Body : { event_type, channel, contact: { phone, email, name }, data: { duration, summary, ... } }
 */
export async function handleOmnicanalEvent(request, env) {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Auth VoixIA (X-VoixIA-Key + X-VoixIA-Tenant)
    const { requireVoixIAAuth } = await import('../voixia/auth.js');
    const auth = await requireVoixIAAuth(request, env);
    if (auth.error) return errorResponse(auth.error, auth.status);

    const tenantId = auth.tenant_id;
    const body = await request.json();
    const { event_type, channel, contact, data } = body;

    if (!event_type || !channel) {
      return errorResponse('Champs requis: event_type, channel', 400);
    }

    const event = {
      type: event_type,
      channel,
      contact: {
        phone: contact?.phone || null,
        email: contact?.email || null,
        name: contact?.name || 'Inconnu'
      },
      data: data || {}
    };

    logger.info('Omnicanal event recu', { tenantId, event_type, channel });

    const result = await handleOmniEvent(env, tenantId, event);

    return successResponse({ success: true, executed: result?.executed || 0, details: result });
  } catch (error) {
    logger.error('handleOmnicanalEvent error', { error: error.message });
    return errorResponse('Erreur lors du traitement de l evenement', 500);
  }
}

// Simuler un evenement pour tester les regles
async function testEvent(request, env, tenantId) {
  try {
    const body = await request.json();
    const { event_type, channel, contact_phone, contact_email, contact_name, message } = body;

    if (!event_type || !channel) {
      return errorResponse('Champs requis: event_type, channel', 400);
    }

    const event = {
      type: event_type,
      channel,
      contact: {
        phone: contact_phone || '+33600000000',
        email: contact_email || null,
        name: contact_name || 'Test Contact'
      },
      data: {
        message: message || 'Message de test',
        duration: '3m42s',
        summary: 'Test de l orchestrateur omnicanal'
      }
    };

    const result = await handleOmniEvent(env, tenantId, event);

    return successResponse({ simulation: true, ...result });
  } catch (error) {
    logger.error('testEvent error', { error: error.message });
    return errorResponse('Erreur lors de la simulation', 500);
  }
}
