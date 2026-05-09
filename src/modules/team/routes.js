/**
 * =====================================================
 * COCCINELLE.AI - TEAM ROUTES (gestion equipe)
 * Endpoints /api/v1/team/*
 * CRUD sur commercial_agents + availability_slots
 * =====================================================
 */

import { requireAuth } from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';
import { getCorsHeaders } from '../../config/cors.js';

function generateId(prefix) {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 12);
  return `${prefix}_${ts}_${rand}`;
}

export async function handleTeamRoutes(request, env, path, method) {
  const corsHeaders = getCorsHeaders(request);
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  // ── GET /api/v1/team/members ───────────────────
  if (path === '/api/v1/team/members' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    try {
      const result = await env.DB.prepare(`
        SELECT ca.id, ca.first_name, ca.last_name, ca.email, ca.phone, ca.role, ca.color, ca.is_active, ca.created_at,
          (SELECT COUNT(*) FROM availability_slots avs WHERE avs.agent_id = ca.id AND avs.tenant_id = ca.tenant_id) as slot_count
        FROM commercial_agents ca
        WHERE ca.tenant_id = ? AND ca.is_active = 1
        ORDER BY ca.first_name ASC
      `).bind(tenantId).all();

      return new Response(JSON.stringify({
        success: true,
        members: (result.results || []).map(m => ({
          ...m,
          name: `${m.first_name} ${m.last_name}`.trim()
        }))
      }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] GET members error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur serveur' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── POST /api/v1/team/members ──────────────────
  if (path === '/api/v1/team/members' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ success: false, error: 'Body JSON invalide' }), { status: 400, headers: jsonHeaders }); }

    const { name, email, role, color } = body;
    if (!name || !name.trim()) return new Response(JSON.stringify({ success: false, error: 'Le nom est requis' }), { status: 400, headers: jsonHeaders });

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(' ') || '';
    const id = generateId('agent');

    try {
      await env.DB.prepare(`
        INSERT INTO commercial_agents (id, tenant_id, first_name, last_name, email, role, color, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).bind(id, tenantId, firstName, lastName, email || null, role || 'member', color || '#6366f1').run();

      return new Response(JSON.stringify({ success: true, id, name: `${firstName} ${lastName}`.trim() }), { status: 201, headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] POST member error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur creation membre' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── PUT /api/v1/team/members/:id ───────────────
  const putMatch = path.match(/^\/api\/v1\/team\/members\/([^/]+)$/);
  if (putMatch && method === 'PUT') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const memberId = putMatch[1];
    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ success: false, error: 'Body JSON invalide' }), { status: 400, headers: jsonHeaders }); }

    const { name, email, role, color } = body;
    const parts = name ? name.trim().split(/\s+/) : [];
    const firstName = parts[0] || null;
    const lastName = parts.slice(1).join(' ') || null;

    try {
      await env.DB.prepare(`
        UPDATE commercial_agents SET
          first_name = COALESCE(?, first_name),
          last_name = COALESCE(?, last_name),
          email = COALESCE(?, email),
          role = COALESCE(?, role),
          color = COALESCE(?, color),
          updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(firstName, lastName, email || null, role || null, color || null, memberId, tenantId).run();

      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] PUT member error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur modification' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── DELETE /api/v1/team/members/:id ────────────
  const delMatch = path.match(/^\/api\/v1\/team\/members\/([^/]+)$/);
  if (delMatch && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const memberId = delMatch[1];

    try {
      await env.DB.prepare(`
        UPDATE commercial_agents SET is_active = 0, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(memberId, tenantId).run();

      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] DELETE member error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur suppression' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── GET /api/v1/team/members/:id/slots ─────────
  const getSlotsMatch = path.match(/^\/api\/v1\/team\/members\/([^/]+)\/slots$/);
  if (getSlotsMatch && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const agentId = getSlotsMatch[1];

    try {
      const result = await env.DB.prepare(`
        SELECT id, day_of_week, start_time, end_time, slot_duration, is_available
        FROM availability_slots
        WHERE agent_id = ? AND tenant_id = ?
        ORDER BY day_of_week, start_time
      `).bind(agentId, tenantId).all();

      return new Response(JSON.stringify({ success: true, slots: result.results || [] }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] GET slots error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur chargement slots' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── POST /api/v1/team/members/:id/slots ────────
  const postSlotsMatch = path.match(/^\/api\/v1\/team\/members\/([^/]+)\/slots$/);
  if (postSlotsMatch && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const agentId = postSlotsMatch[1];

    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ success: false, error: 'Body JSON invalide' }), { status: 400, headers: jsonHeaders }); }

    const { day_of_week, start_time, end_time, duration_minutes } = body;
    if (day_of_week === undefined || !start_time || !end_time) {
      return new Response(JSON.stringify({ success: false, error: 'day_of_week, start_time et end_time requis' }), { status: 400, headers: jsonHeaders });
    }

    const duration = duration_minutes || 30;
    const [sh, sm] = start_time.split(':').map(Number);
    const [eh, em] = end_time.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;

    const slots = [];
    while (cur + duration <= end) {
      const slotStart = `${String(Math.floor(cur / 60)).padStart(2, '0')}:${String(cur % 60).padStart(2, '0')}`;
      const slotEnd = `${String(Math.floor((cur + duration) / 60)).padStart(2, '0')}:${String((cur + duration) % 60).padStart(2, '0')}`;
      slots.push({ id: generateId('slot'), start: slotStart, end: slotEnd });
      cur += duration;
    }

    try {
      const stmts = slots.map(s =>
        env.DB.prepare(`
          INSERT INTO availability_slots (id, tenant_id, agent_id, day_of_week, start_time, end_time, slot_duration, is_available, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        `).bind(s.id, tenantId, agentId, day_of_week, s.start, s.end, duration)
      );
      if (stmts.length > 0) await env.DB.batch(stmts);

      return new Response(JSON.stringify({ success: true, count: slots.length }), { status: 201, headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] POST slots error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur creation slots' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── DELETE /api/v1/team/members/:id/slots ──────
  const delSlotsMatch = path.match(/^\/api\/v1\/team\/members\/([^/]+)\/slots$/);
  if (delSlotsMatch && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const agentId = delSlotsMatch[1];

    try {
      await env.DB.prepare(`
        DELETE FROM availability_slots WHERE agent_id = ? AND tenant_id = ?
      `).bind(agentId, tenantId).run();

      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] DELETE slots error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur suppression slots' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── GET /api/v1/team/members/:id/services ─────
  const getServicesMatch = path.match(/^\/api\/v1\/team\/members\/([^/]+)\/services$/);
  if (getServicesMatch && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const agentId = getServicesMatch[1];

    try {
      const result = await env.DB.prepare(`
        SELECT cas.id as assignment_id, cas.service_id, cas.custom_duration_minutes, cas.is_active,
          s.name, s.description, COALESCE(cas.custom_duration_minutes, s.duration_minutes) as duration_minutes, s.price, s.color, s.category
        FROM commercial_agent_services cas
        JOIN services s ON cas.service_id = s.id
        WHERE cas.agent_id = ? AND cas.tenant_id = ? AND cas.is_active = 1 AND s.is_active = 1
        ORDER BY s.name ASC
      `).bind(agentId, tenantId).all();

      return new Response(JSON.stringify({ success: true, services: result.results || [] }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] GET member services error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur chargement prestations' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── PUT /api/v1/team/members/:id/services ─────
  // Body: { services: [{ service_id, custom_duration_minutes? }] }
  const putServicesMatch = path.match(/^\/api\/v1\/team\/members\/([^/]+)\/services$/);
  if (putServicesMatch && method === 'PUT') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const agentId = putServicesMatch[1];
    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ success: false, error: 'Body JSON invalide' }), { status: 400, headers: jsonHeaders }); }

    const { services } = body;
    if (!Array.isArray(services)) return new Response(JSON.stringify({ success: false, error: 'services doit etre un tableau' }), { status: 400, headers: jsonHeaders });

    try {
      const stmts = [
        env.DB.prepare(`DELETE FROM commercial_agent_services WHERE agent_id = ? AND tenant_id = ?`).bind(agentId, tenantId)
      ];

      for (const s of services) {
        if (!s.service_id) continue;
        stmts.push(
          env.DB.prepare(`
            INSERT INTO commercial_agent_services (id, tenant_id, agent_id, service_id, custom_duration_minutes, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
          `).bind(generateId('cas'), tenantId, agentId, s.service_id, s.custom_duration_minutes || null)
        );
      }

      await env.DB.batch(stmts);

      return new Response(JSON.stringify({ success: true, count: services.length }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Team] PUT member services error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur sauvegarde prestations' }), { status: 500, headers: jsonHeaders });
    }
  }

  return null;
}
