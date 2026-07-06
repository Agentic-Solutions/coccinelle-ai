// Module Availability - Gestion des disponibilités agents + horaires d'ouverture
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';
import { syncSlotsToHoraires } from '../shared/horaires-slots.js';

export async function handleAvailabilityRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // === Availability Slots ===

    // GET /api/v1/availability
    if (path === '/api/v1/availability' && method === 'GET') {
      return await handleGetAvailability(request, env);
    }

    // POST /api/v1/availability
    if (path === '/api/v1/availability' && method === 'POST') {
      return await handleSetAvailability(request, env);
    }

    // DELETE /api/v1/availability/:id
    if (path.match(/^\/api\/v1\/availability\/[^/]+$/) && method === 'DELETE') {
      const slotId = path.split('/')[4];
      return await handleDeleteAvailability(request, env, slotId);
    }

    // === Business Hours ===

    // GET /api/v1/business-hours
    if (path === '/api/v1/business-hours' && method === 'GET') {
      return await handleGetBusinessHours(request, env);
    }

    // POST /api/v1/business-hours
    if (path === '/api/v1/business-hours' && method === 'POST') {
      return await handleSetBusinessHours(request, env);
    }

    return null;

  } catch (error) {
    logger.error('Availability route error', { error: error.message, path });
    return errorResponse(error.message, 500, request);
  }
}

// GET /api/v1/availability?agent_id=xxx
async function handleGetAvailability(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { user, tenant } = authResult;
  const url = new URL(request.url);
  const agentId = url.searchParams.get('agent_id') || user.id;

  const result = await env.DB.prepare(
    'SELECT * FROM availability_slots WHERE tenant_id = ? AND agent_id = ? ORDER BY day_of_week'
  ).bind(tenant.id, agentId).all();

  return successResponse({ slots: result.results || [] }, 200, request);
}

// POST /api/v1/availability
async function handleSetAvailability(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { user, tenant } = authResult;
  const body = await request.json();
  const {
    agent_id,
    day_of_week,
    start_time,
    end_time,
    break_start,
    break_end,
    slot_duration,
    is_available
  } = body;

  const targetAgentId = agent_id || user.id;

  if (day_of_week === undefined || day_of_week < 1 || day_of_week > 7) {
    return errorResponse('day_of_week doit etre entre 1 (lundi) et 7 (dimanche)', 400, request);
  }

  // Validate that the agent exists and ensure FK to agents table is satisfied
  try {
    let agentExists = await env.DB.prepare('SELECT id FROM agents WHERE id = ?').bind(targetAgentId).first();
    if (!agentExists) {
      // Check commercial_agents — if found, auto-create agents row to satisfy FK
      const commAgent = await env.DB.prepare(
        'SELECT id, first_name, last_name, email, phone FROM commercial_agents WHERE id = ? AND tenant_id = ?'
      ).bind(targetAgentId, tenant.id).first();
      if (commAgent) {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO agents (id, tenant_id, first_name, last_name, email, phone)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(commAgent.id, tenant.id, commAgent.first_name || 'Agent', commAgent.last_name || '', commAgent.email || `${commAgent.id}@coccinelle.ai`, commAgent.phone).run();
        agentExists = commAgent;
      }
    }
    if (!agentExists) {
      // Check users table as last resort — also sync to agents
      const userAgent = await env.DB.prepare('SELECT id, name, email FROM users WHERE id = ? AND tenant_id = ?').bind(targetAgentId, tenant.id).first();
      if (userAgent) {
        const parts = (userAgent.name || 'Agent').split(' ');
        await env.DB.prepare(
          `INSERT OR IGNORE INTO agents (id, tenant_id, first_name, last_name, email)
           VALUES (?, ?, ?, ?, ?)`
        ).bind(userAgent.id, tenant.id, parts[0], parts.slice(1).join(' ') || '', userAgent.email || `${userAgent.id}@coccinelle.ai`).run();
        agentExists = userAgent;
      }
    }
    if (!agentExists) {
      return errorResponse('Agent introuvable. Verifiez le agent_id.', 400, request);
    }
  } catch (e) {
    logger.warn('Agent validation error', { error: e.message });
  }

  const slotId = auth.generateId('avail');
  const slotData = {
    id: slotId,
    tenant_id: tenant.id,
    agent_id: targetAgentId,
    day_of_week,
    start_time: start_time || '09:00',
    end_time: end_time || '18:00',
    break_start: break_start || null,
    break_end: break_end || null,
    slot_duration: slot_duration || 30,
    is_available: is_available !== undefined ? (is_available ? 1 : 0) : 1
  };

  try {
    // Upsert: delete existing then insert (with tenant_id)
    await env.DB.prepare(
      'DELETE FROM availability_slots WHERE tenant_id = ? AND agent_id = ? AND day_of_week = ?'
    ).bind(tenant.id, targetAgentId, day_of_week).run();

    await env.DB.prepare(`
      INSERT INTO availability_slots (id, tenant_id, agent_id, day_of_week, start_time, end_time, break_start, break_end, slot_duration, is_available)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      slotId, tenant.id, targetAgentId, day_of_week,
      slotData.start_time, slotData.end_time,
      slotData.break_start, slotData.break_end,
      slotData.slot_duration, slotData.is_available
    ).run();
  } catch (dbError) {
    // Fallback: try without tenant_id and extended columns (original schema)
    logger.warn('Availability insert with full schema failed, trying fallback', { error: dbError.message });
    try {
      await env.DB.prepare(
        'DELETE FROM availability_slots WHERE agent_id = ? AND day_of_week = ?'
      ).bind(targetAgentId, day_of_week).run();

      await env.DB.prepare(`
        INSERT INTO availability_slots (id, agent_id, day_of_week, start_time, end_time, is_available)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        slotId, targetAgentId, day_of_week,
        slotData.start_time, slotData.end_time,
        slotData.is_available
      ).run();
    } catch (fallbackError) {
      logger.error('Availability slot creation failed', { error: fallbackError.message });
      return errorResponse('Impossible de creer le creneau: ' + fallbackError.message, 500, request);
    }
  }

  // SSOT horaires (reverse) : si on vient d'éditer l'agent société par défaut,
  // régénérer le cache tenants.horaires pour garder Paramètres cohérent. No-op sinon.
  await syncSlotsToHoraires(env, tenant.id, targetAgentId);

  return successResponse({ slot: slotData }, 201, request);
}

// DELETE /api/v1/availability/:id
async function handleDeleteAvailability(request, env, slotId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { tenant } = authResult;

  const existing = await env.DB.prepare(
    'SELECT * FROM availability_slots WHERE id = ? AND tenant_id = ?'
  ).bind(slotId, tenant.id).first();

  if (!existing) {
    return errorResponse('Creneau non trouve', 404, request);
  }

  await env.DB.prepare(
    'DELETE FROM availability_slots WHERE id = ? AND tenant_id = ?'
  ).bind(slotId, tenant.id).run();

  return successResponse({ message: 'Creneau supprime' }, 200, request);
}

// GET /api/v1/business-hours
async function handleGetBusinessHours(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { tenant } = authResult;

  const result = await env.DB.prepare(
    'SELECT * FROM business_hours WHERE tenant_id = ? ORDER BY day_of_week'
  ).bind(tenant.id).all();

  return successResponse({ hours: result.results || [] }, 200, request);
}

// POST /api/v1/business-hours
async function handleSetBusinessHours(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { tenant } = authResult;
  const body = await request.json();
  const { hours } = body;

  if (!Array.isArray(hours)) {
    return errorResponse('hours doit etre un tableau', 400, request);
  }

  // Delete existing then insert all
  await env.DB.prepare(
    'DELETE FROM business_hours WHERE tenant_id = ?'
  ).bind(tenant.id).run();

  for (const h of hours) {
    const hourId = auth.generateId('bh');
    await env.DB.prepare(`
      INSERT INTO business_hours (id, tenant_id, day_of_week, is_open, open_time, close_time)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      hourId,
      tenant.id,
      h.day_of_week,
      h.is_open !== undefined ? (h.is_open ? 1 : 0) : 1,
      h.open_time || '09:00',
      h.close_time || '18:00'
    ).run();
  }

  return successResponse({ message: 'Horaires enregistres' }, 200, request);
}
