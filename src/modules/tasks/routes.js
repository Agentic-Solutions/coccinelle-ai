// Module Tasks — Gestion des tâches et affectation intelligente
// Routes JWT pour dashboard + route VoixIA pour création depuis l'agent vocal

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { generateId, verifyToken, logAudit } from '../auth/helpers.js';
import { getCorsHeaders } from '../../config/cors.js';

/**
 * Handler principal pour les routes /api/v1/tasks/*
 */
export async function handleTasksRoutes(request, env, ctx, corsHeaders) {
  const path = new URL(request.url).pathname;
  const method = request.method;

  try {
    // Auth JWT
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }
    const token = authHeader.slice(7);
    const payload = await verifyToken(token, env.JWT_SECRET);
    if (!payload || !payload.tenant_id) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }
    const tenantId = payload.tenant_id;

    // GET /api/v1/tasks/stats
    if (path === '/api/v1/tasks/stats' && method === 'GET') {
      return await handleGetTaskStats(env, tenantId, corsHeaders);
    }

    // GET /api/v1/tasks/:id
    if (path.startsWith('/api/v1/tasks/') && path !== '/api/v1/tasks/stats' && method === 'GET') {
      const id = path.split('/').pop();
      return await handleGetTask(env, tenantId, id, corsHeaders);
    }

    // PATCH /api/v1/tasks/:id
    if (path.startsWith('/api/v1/tasks/') && method === 'PATCH') {
      const id = path.split('/').pop();
      return await handleUpdateTask(request, env, tenantId, id, corsHeaders);
    }

    // GET /api/v1/tasks
    if (path === '/api/v1/tasks' && method === 'GET') {
      return await handleListTasks(request, env, tenantId, corsHeaders);
    }

    return null;
  } catch (error) {
    logger.error('Tasks route error', { error: error.message, path });
    return Response.json({ error: 'Erreur interne' }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Handler pour /api/v1/task-types (JWT)
 */
export async function handleTaskTypesRoutes(request, env, ctx, corsHeaders) {
  const path = new URL(request.url).pathname;
  const method = request.method;

  if (path !== '/api/v1/task-types' || method !== 'GET') return null;

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }
    const payload = await verifyToken(authHeader.slice(7), env.JWT_SECRET);
    if (!payload || !payload.tenant_id) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }

    const types = await env.DB.prepare(
      'SELECT * FROM task_types WHERE tenant_id = ? ORDER BY secteur, name'
    ).bind(payload.tenant_id).all();

    return Response.json({ success: true, task_types: types.results || [] }, { headers: corsHeaders });
  } catch (error) {
    logger.error('Task-types route error', { error: error.message });
    return Response.json({ error: 'Erreur interne' }, { status: 500, headers: corsHeaders });
  }
}

/**
 * Handler pour /api/v1/assignment-rules (JWT)
 */
export async function handleAssignmentRulesRoutes(request, env, ctx, corsHeaders) {
  const path = new URL(request.url).pathname;
  const method = request.method;

  if (path !== '/api/v1/assignment-rules') return null;

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }
    const payload = await verifyToken(authHeader.slice(7), env.JWT_SECRET);
    if (!payload || !payload.tenant_id) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }

    if (method === 'GET') {
      const rules = await env.DB.prepare(
        'SELECT ar.*, tt.name as task_type_name FROM assignment_rules ar LEFT JOIN task_types tt ON tt.id = ar.task_type_id WHERE ar.tenant_id = ? ORDER BY ar.task_type_id, ar.priority'
      ).bind(payload.tenant_id).all();
      return Response.json({ success: true, rules: rules.results || [] }, { headers: corsHeaders });
    }

    if (method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return Response.json({ error: 'Body JSON invalide' }, { status: 400, headers: corsHeaders }); }
      const { task_type_id, assignee_id, assignee_name, priority } = body;
      if (!task_type_id || !assignee_id || !assignee_name) {
        return Response.json({ error: 'task_type_id, assignee_id et assignee_name requis' }, { status: 400, headers: corsHeaders });
      }
      const id = generateId('rule');
      await env.DB.prepare(
        'INSERT INTO assignment_rules (id, tenant_id, task_type_id, assignee_id, assignee_name, priority) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(id, payload.tenant_id, task_type_id, assignee_id, assignee_name, priority || 1).run();
      return Response.json({ success: true, id }, { status: 201, headers: corsHeaders });
    }

    return null;
  } catch (error) {
    logger.error('Assignment-rules route error', { error: error.message });
    return Response.json({ error: 'Erreur interne' }, { status: 500, headers: corsHeaders });
  }
}

// ─── Handlers ───────────────────────────────────────────────────────────────────

async function handleListTasks(request, env, tenantId, corsHeaders) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const assigneeId = url.searchParams.get('assignee_id');
  const priority = url.searchParams.get('priority');

  let sql = `SELECT t.*, tt.name as task_type_name, tt.secteur, tt.priority as type_priority
    FROM tasks t LEFT JOIN task_types tt ON tt.id = t.task_type_id
    WHERE t.tenant_id = ?`;
  const params = [tenantId];

  if (status) { sql += ' AND t.status = ?'; params.push(status); }
  if (assigneeId) { sql += ' AND t.assignee_id = ?'; params.push(assigneeId); }
  if (priority) { sql += ' AND t.priority = ?'; params.push(priority); }

  sql += ` ORDER BY CASE t.priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 WHEN 'low' THEN 3 END, t.created_at DESC LIMIT 50`;

  const result = await env.DB.prepare(sql).bind(...params).all();
  return Response.json({ success: true, tasks: result.results || [] }, { headers: corsHeaders });
}

async function handleGetTask(env, tenantId, id, corsHeaders) {
  const task = await env.DB.prepare(
    `SELECT t.*, tt.name as task_type_name, tt.secteur, tt.description as type_description
     FROM tasks t LEFT JOIN task_types tt ON tt.id = t.task_type_id
     WHERE t.id = ? AND t.tenant_id = ?`
  ).bind(id, tenantId).first();

  if (!task) {
    return Response.json({ error: 'Tâche introuvable' }, { status: 404, headers: corsHeaders });
  }
  return Response.json({ success: true, task }, { headers: corsHeaders });
}

async function handleUpdateTask(request, env, tenantId, id, corsHeaders) {
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Body JSON invalide' }, { status: 400, headers: corsHeaders }); }

  const { status, assignee_id, assignee_name } = body;

  const existing = await env.DB.prepare('SELECT id FROM tasks WHERE id = ? AND tenant_id = ?').bind(id, tenantId).first();
  if (!existing) {
    return Response.json({ error: 'Tâche introuvable' }, { status: 404, headers: corsHeaders });
  }

  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
    if (status === 'resolved') {
      updates.push("resolved_at = datetime('now')");
    }
  }
  if (assignee_id) { updates.push('assignee_id = ?'); params.push(assignee_id); }
  if (assignee_name) { updates.push('assignee_name = ?'); params.push(assignee_name); }

  if (updates.length === 0) {
    return Response.json({ error: 'Aucun champ à mettre à jour' }, { status: 400, headers: corsHeaders });
  }

  updates.push("updated_at = datetime('now')");
  params.push(id, tenantId);

  await env.DB.prepare(
    `UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`
  ).bind(...params).run();

  return Response.json({ success: true }, { headers: corsHeaders });
}

async function handleGetTaskStats(env, tenantId, corsHeaders) {
  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open,
      SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) as resolved,
      SUM(CASE WHEN priority='high' AND status='open' THEN 1 ELSE 0 END) as urgent
    FROM tasks WHERE tenant_id = ?
  `).bind(tenantId).first();

  return Response.json({ success: true, stats: stats || { total: 0, open: 0, in_progress: 0, resolved: 0, urgent: 0 } }, { headers: corsHeaders });
}
