// Module Agents - Routes avec permissions et filtrage par équipe
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';
import { getVisibleAgents, canViewAgent } from '../../utils/teams.js';
import { hasPermission } from '../../utils/permissions.js';

export async function handleAgentsRoutes(request, env, path, method) {
  try {
    // GET /api/v1/agents
    if (path === '/api/v1/agents' && method === 'GET') {
      return await handleListAgents(request, env);
    }

    // GET /api/v1/agents/:id
    if (path.match(/^\/api\/v1\/agents\/[^/]+$/) && method === 'GET') {
      const agentId = path.split('/')[4];
      return await handleGetAgent(request, env, agentId);
    }

    // POST /api/v1/agents
    if (path === '/api/v1/agents' && method === 'POST') {
      return await handleCreateAgent(request, env);
    }

    // PUT /api/v1/agents/:id
    if (path.match(/^\/api\/v1\/agents\/[^/]+$/) && method === 'PUT') {
      const agentId = path.split('/')[4];
      return await handleUpdateAgent(request, env, agentId);
    }

    // DELETE /api/v1/agents/:id
    if (path.match(/^\/api\/v1\/agents\/[^/]+$/) && method === 'DELETE') {
      const agentId = path.split('/')[4];
      return await handleDeleteAgent(request, env, agentId);
    }

    return null;

  } catch (error) {
    logger.error('Agents route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// Liste les agents visibles par l'utilisateur
async function handleListAgents(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;
  
  // Utiliser getVisibleAgents pour filtrer selon le rôle
  const agents = await getVisibleAgents(env, tenant.id, user.id, user.role);

  return successResponse({
    agents,
    count: agents.length
  });
}

// Récupère un agent spécifique
async function handleGetAgent(request, env, agentId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  // Vérifier si l'utilisateur peut voir cet agent
  const canView = await canViewAgent(env, tenant.id, user.id, user.role, agentId);
  if (!canView) {
    return jsonResponse({ success: false, error: 'Accès non autorisé à cet agent' }, 403);
  }

  const agent = await env.DB.prepare(`
    SELECT a.*, t.name as team_name
    FROM agents a
    LEFT JOIN team_members tm ON a.id = tm.agent_id
    LEFT JOIN teams t ON tm.team_id = t.id
    WHERE a.id = ? AND a.tenant_id = ?
  `).bind(agentId, tenant.id).first();

  if (!agent) {
    return jsonResponse({ success: false, error: 'Agent non trouvé' }, 404);
  }

  // Récupérer les services de l'agent
  const services = await env.DB.prepare(`
    SELECT s.id, s.name, s.duration_minutes, s.price, ags.proficiency_level
    FROM agent_services ags
    JOIN services s ON ags.service_id = s.id
    WHERE ags.agent_id = ? AND ags.is_active = 1
  `).bind(agentId).all();

  return successResponse({
    agent: {
      ...agent,
      services: services.results || []
    }
  });
}

// Crée un nouvel agent
async function handleCreateAgent(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  // Vérifier permission manage_employees
  const canManage = await hasPermission(env, tenant.id, user.role, 'manage_employees');
  if (!canManage) {
    return jsonResponse({ success: false, error: 'Permission refusée' }, 403);
  }

  const body = await request.json();
  const { first_name, last_name, email, phone, title, user_id, team_id } = body;

  if (!first_name || !last_name) {
    return jsonResponse({ success: false, error: 'Prénom et nom requis' }, 400);
  }

  const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO agents (id, tenant_id, user_id, first_name, last_name, email, phone, title, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).bind(agentId, tenant.id, user_id || null, first_name, last_name, email || null, phone || null, title || null, now).run();

  // Si une équipe est spécifiée, ajouter l'agent à l'équipe
  if (team_id) {
    const memberId = `tm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await env.DB.prepare(`
      INSERT INTO team_members (id, team_id, agent_id, role_in_team)
      VALUES (?, ?, ?, 'member')
    `).bind(memberId, team_id, agentId).run();
  }

  // Log audit
  await auth.logAudit(env, {
    tenant_id: tenant.id,
    user_id: user.id,
    action: 'agent.create',
    resource_type: 'agent',
    resource_id: agentId,
    changes: { first_name, last_name, email, team_id }
  });

  return jsonResponse({
    success: true,
    message: 'Agent créé avec succès',
    agent: { id: agentId, first_name, last_name, email, phone, title }
  }, 201);
}

// Met à jour un agent
async function handleUpdateAgent(request, env, agentId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  // Vérifier permission manage_employees
  const canManage = await hasPermission(env, tenant.id, user.role, 'manage_employees');
  if (!canManage) {
    return jsonResponse({ success: false, error: 'Permission refusée' }, 403);
  }

  // Vérifier que l'agent existe et appartient au tenant
  const existing = await env.DB.prepare(`
    SELECT id FROM agents WHERE id = ? AND tenant_id = ?
  `).bind(agentId, tenant.id).first();

  if (!existing) {
    return jsonResponse({ success: false, error: 'Agent non trouvé' }, 404);
  }

  const body = await request.json();
  const { first_name, last_name, email, phone, title, is_active } = body;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE agents 
    SET first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        title = COALESCE(?, title),
        is_active = COALESCE(?, is_active),
        updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(first_name, last_name, email, phone, title, is_active, now, agentId, tenant.id).run();

  // Log audit
  await auth.logAudit(env, {
    tenant_id: tenant.id,
    user_id: user.id,
    action: 'agent.update',
    resource_type: 'agent',
    resource_id: agentId,
    changes: { first_name, last_name, email, phone, title, is_active }
  });

  return successResponse({
    message: 'Agent mis à jour avec succès'
  });
}

// Supprime (désactive) un agent
async function handleDeleteAgent(request, env, agentId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status);
  }

  const { user, tenant } = authResult;

  // Vérifier permission manage_employees
  const canManage = await hasPermission(env, tenant.id, user.role, 'manage_employees');
  if (!canManage) {
    return jsonResponse({ success: false, error: 'Permission refusée' }, 403);
  }

  // Soft delete
  await env.DB.prepare(`
    UPDATE agents SET is_active = 0, updated_at = ? WHERE id = ? AND tenant_id = ?
  `).bind(new Date().toISOString(), agentId, tenant.id).run();

  // Log audit
  await auth.logAudit(env, {
    tenant_id: tenant.id,
    user_id: user.id,
    action: 'agent.delete',
    resource_type: 'agent',
    resource_id: agentId
  });

  return successResponse({
    message: 'Agent supprimé avec succès'
  });
}
