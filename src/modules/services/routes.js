/**
 * =====================================================
 * COCCINELLE.AI - SERVICES/PRESTATIONS ROUTES
 * Endpoints /api/v1/services/*
 * CRUD prestations + assignation membres
 * =====================================================
 */

import { requireAuth, generateId, logAudit } from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';
import { getCorsHeaders } from '../../config/cors.js';

export async function handleServicesRoutes(request, env, path, method) {
  const corsHeaders = getCorsHeaders(request);
  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  // ── GET /api/v1/services ─────────────────────────
  if (path === '/api/v1/services' && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    try {
      const result = await env.DB.prepare(`
        SELECT s.id, s.name, s.description, s.duration_minutes, s.price, s.color, s.category, s.is_active, s.created_at,
          (SELECT COUNT(*) FROM commercial_agent_services cas WHERE cas.service_id = s.id AND cas.is_active = 1) as agent_count
        FROM services s
        WHERE s.tenant_id = ? AND s.is_active = 1
        ORDER BY s.name ASC
      `).bind(tenantId).all();

      return new Response(JSON.stringify({
        success: true,
        services: result.results || []
      }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Services] GET list error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur serveur' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── POST /api/v1/services ────────────────────────
  if (path === '/api/v1/services' && method === 'POST') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ success: false, error: 'Body JSON invalide' }), { status: 400, headers: jsonHeaders }); }

    const { name, description, duration_minutes, price, color, category } = body;
    if (!name || !name.trim()) return new Response(JSON.stringify({ success: false, error: 'Le nom est requis' }), { status: 400, headers: jsonHeaders });

    const id = generateId('svc');
    try {
      await env.DB.prepare(`
        INSERT INTO services (id, tenant_id, name, description, duration_minutes, price, color, category, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
      `).bind(id, tenantId, name.trim(), description || null, duration_minutes || 30, price || null, color || '#6366f1', category || null).run();

      return new Response(JSON.stringify({ success: true, id, name: name.trim() }), { status: 201, headers: jsonHeaders });
    } catch (err) {
      logger.error('[Services] POST create error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur creation prestation' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── PUT /api/v1/services/:id ─────────────────────
  const putMatch = path.match(/^\/api\/v1\/services\/([^/]+)$/);
  if (putMatch && method === 'PUT') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const serviceId = putMatch[1];
    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ success: false, error: 'Body JSON invalide' }), { status: 400, headers: jsonHeaders }); }

    const { name, description, duration_minutes, price, color, category } = body;
    try {
      await env.DB.prepare(`
        UPDATE services SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          duration_minutes = COALESCE(?, duration_minutes),
          price = ?,
          color = COALESCE(?, color),
          category = COALESCE(?, category),
          updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(name || null, description || null, duration_minutes || null, price ?? null, color || null, category || null, serviceId, tenantId).run();

      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Services] PUT update error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur modification' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── DELETE /api/v1/services/:id ──────────────────
  const delMatch = path.match(/^\/api\/v1\/services\/([^/]+)$/);
  if (delMatch && method === 'DELETE') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const serviceId = delMatch[1];
    try {
      await env.DB.prepare(`
        UPDATE services SET is_active = 0, updated_at = datetime('now')
        WHERE id = ? AND tenant_id = ?
      `).bind(serviceId, tenantId).run();

      return new Response(JSON.stringify({ success: true }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Services] DELETE error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur suppression' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── GET /api/v1/services/:id/agents ──────────────
  const getAgentsMatch = path.match(/^\/api\/v1\/services\/([^/]+)\/agents$/);
  if (getAgentsMatch && method === 'GET') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const serviceId = getAgentsMatch[1];
    try {
      const result = await env.DB.prepare(`
        SELECT cas.id as assignment_id, cas.agent_id, cas.custom_duration_minutes, cas.is_active,
          ca.first_name, ca.last_name, ca.email, ca.role, ca.color
        FROM commercial_agent_services cas
        JOIN commercial_agents ca ON cas.agent_id = ca.id
        WHERE cas.service_id = ? AND cas.tenant_id = ? AND cas.is_active = 1 AND ca.is_active = 1
        ORDER BY ca.first_name ASC
      `).bind(serviceId, tenantId).all();

      return new Response(JSON.stringify({
        success: true,
        agents: (result.results || []).map(a => ({
          ...a,
          name: `${a.first_name} ${a.last_name}`.trim()
        }))
      }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Services] GET agents error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur serveur' }), { status: 500, headers: jsonHeaders });
    }
  }

  // ── PUT /api/v1/services/:id/agents ──────────────
  // Full replace: body = { agents: [{ agent_id, custom_duration_minutes? }] }
  const putAgentsMatch = path.match(/^\/api\/v1\/services\/([^/]+)\/agents$/);
  if (putAgentsMatch && method === 'PUT') {
    const auth = await requireAuth(request, env);
    if (auth.error) return new Response(JSON.stringify({ success: false, error: auth.error }), { status: auth.status, headers: jsonHeaders });

    const tenantId = auth.tenant.id;
    const serviceId = putAgentsMatch[1];
    let body;
    try { body = await request.json(); } catch { return new Response(JSON.stringify({ success: false, error: 'Body JSON invalide' }), { status: 400, headers: jsonHeaders }); }

    const { agents } = body;
    if (!Array.isArray(agents)) return new Response(JSON.stringify({ success: false, error: 'agents doit etre un tableau' }), { status: 400, headers: jsonHeaders });

    try {
      // Delete existing assignments for this service
      const stmts = [
        env.DB.prepare(`DELETE FROM commercial_agent_services WHERE service_id = ? AND tenant_id = ?`).bind(serviceId, tenantId)
      ];

      // Insert new assignments
      for (const a of agents) {
        if (!a.agent_id) continue;
        stmts.push(
          env.DB.prepare(`
            INSERT INTO commercial_agent_services (id, tenant_id, agent_id, service_id, custom_duration_minutes, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
          `).bind(generateId('cas'), tenantId, a.agent_id, serviceId, a.custom_duration_minutes || null)
        );
      }

      await env.DB.batch(stmts);

      return new Response(JSON.stringify({ success: true, count: agents.length }), { headers: jsonHeaders });
    } catch (err) {
      logger.error('[Services] PUT agents error', { error: err.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur assignation' }), { status: 500, headers: jsonHeaders });
    }
  }

  return null;
}
