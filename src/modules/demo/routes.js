/**
 * Module Demo — POST /api/v1/demo/reset
 * Remet le compte démo Maze dans son état de référence.
 * Protégé par X-Demo-Reset-Key (secret Workers DEMO_RESET_KEY).
 */
import { logger } from '../../utils/logger.js';
import {
  DEMO_TENANT_ID,
  DEMO_USER_NAME,
  SEED_PROSPECTS,
  buildSeedCalls,
  buildSeedCallSummaries,
  buildSeedAppointments,
} from './seed.js';

export async function handleDemoRoutes(request, env, path, method) {
  if (path !== '/api/v1/demo/reset' || method !== 'POST') {
    return null; // Pas notre route
  }

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    // ═══ AUTH : clé secrète obligatoire ═══
    const key = request.headers.get('X-Demo-Reset-Key');
    if (!env.DEMO_RESET_KEY) {
      return json({ error: 'DEMO_RESET_KEY non configurée sur le Worker' }, 503);
    }
    if (!key || key !== env.DEMO_RESET_KEY) {
      return json({ error: 'Clé de reset invalide' }, 401);
    }

    // ═══ GARDE-FOU : seul le tenant démo Maze est ciblé ═══
    const tenantId = DEMO_TENANT_ID;

    // Vérifier que le tenant existe en DB
    const tenant = await env.DB.prepare(
      'SELECT id FROM tenants WHERE id = ?'
    ).bind(tenantId).first();
    if (!tenant) {
      return json({ error: 'Tenant démo introuvable en base' }, 404);
    }

    const now = new Date().toISOString();
    const counts = { deleted: {}, inserted: {} };

    // ═══ 1. DELETE données existantes du tenant démo ═══
    // Ordre : call_summaries → calls → appointments → prospects (FK)
    const delCS = await env.DB.prepare(
      'DELETE FROM call_summaries WHERE tenant_id = ?'
    ).bind(tenantId).run();
    counts.deleted.call_summaries = delCS.meta.changes;

    const delCalls = await env.DB.prepare(
      'DELETE FROM calls WHERE tenant_id = ?'
    ).bind(tenantId).run();
    counts.deleted.calls = delCalls.meta.changes;

    const delAppts = await env.DB.prepare(
      'DELETE FROM appointments WHERE tenant_id = ?'
    ).bind(tenantId).run();
    counts.deleted.appointments = delAppts.meta.changes;

    const delProspects = await env.DB.prepare(
      'DELETE FROM prospects WHERE tenant_id = ?'
    ).bind(tenantId).run();
    counts.deleted.prospects = delProspects.meta.changes;

    // ═══ 2. INSERT jeu de données de référence ═══

    // Prospects (10)
    for (const p of SEED_PROSPECTS) {
      await env.DB.prepare(`
        INSERT INTO prospects (id, tenant_id, first_name, last_name, phone, email, status, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(p.id, tenantId, p.first_name, p.last_name, p.phone, p.email, p.status, p.source, now).run();
    }
    counts.inserted.prospects = SEED_PROSPECTS.length;

    // Calls (5)
    const calls = buildSeedCalls(tenantId, now);
    for (const c of calls) {
      await env.DB.prepare(`
        INSERT INTO calls (id, tenant_id, from_number, to_number, direction, status, duration, prospect_id, transcript, created_at, started_at, ended_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(c.id, c.tenant_id, c.from_number, c.to_number, c.direction, c.status, c.duration, c.prospect_id, c.transcript, c.created_at, c.started_at, c.ended_at).run();
    }
    counts.inserted.calls = calls.length;

    // Call summaries (5)
    const summaries = buildSeedCallSummaries(tenantId, now);
    for (const s of summaries) {
      await env.DB.prepare(`
        INSERT INTO call_summaries (id, call_id, tenant_id, message_count, duration, summary, sentiment, intent, appointment_booked, transfer_requested, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(s.id, s.call_id, s.tenant_id, s.message_count, s.duration, s.summary, s.sentiment, s.intent, s.appointment_booked, s.transfer_requested, s.created_at).run();
    }
    counts.inserted.call_summaries = summaries.length;

    // Appointments (3)
    const appts = buildSeedAppointments(tenantId, now);
    for (const a of appts) {
      await env.DB.prepare(`
        INSERT INTO appointments (id, tenant_id, prospect_id, agent_id, type, scheduled_at, duration_minutes, management_token, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(a.id, a.tenant_id, a.prospect_id, a.agent_id, a.type, a.scheduled_at, a.duration_minutes, a.management_token, a.status, a.notes, now).run();
    }
    counts.inserted.appointments = appts.length;

    // ═══ 3. Remettre users.name = "Camille Mercier" ═══
    await env.DB.prepare(
      'UPDATE users SET name = ? WHERE tenant_id = ? AND email = ?'
    ).bind(DEMO_USER_NAME, tenantId, 'demo.maze@coccinelle.ai').run();

    logger.info('Demo reset completed', { tenantId, counts });

    return json({
      reset: true,
      tenant_id: tenantId,
      counts,
      message: 'Compte démo Syndic Horizon remis à zéro'
    }, 200);

  } catch (error) {
    logger.error('Demo reset error', { error: error.message });
    return json({ error: 'Erreur lors du reset : ' + error.message }, 500);
  }
}

// ─── Helpers ───
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Demo-Reset-Key',
  };
}
