// Module Prospects - Routes SÉCURISÉES
import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';
import { hasPermission } from '../../utils/permissions.js';
import { successResponse, errorResponse } from '../../utils/response.js';

export async function handleProspectsRoutes(request, env, path, method) {
  try {
    // GET /api/v1/prospects - Liste des prospects
    if (path === '/api/v1/prospects' && method === 'GET') {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
      }
      request.user = authResult.user;
      return await handleListProspects(request, env);
    }
    
    // POST /api/v1/prospects - Créer un prospect
    if (path === '/api/v1/prospects' && method === 'POST') {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
      }
      request.user = authResult.user;
      return await handleCreateProspect(request, env);
    }
    
    // GET /api/v1/prospects/:id - Détail d'un prospect
    const getMatch = path.match(/^\/api\/v1\/prospects\/([^\/]+)$/);
    if (getMatch && method === 'GET') {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
      }
      request.user = authResult.user;
      return await handleGetProspect(request, env, getMatch[1]);
    }
    
    // PUT /api/v1/prospects/:id - Modifier un prospect
    const putMatch = path.match(/^\/api\/v1\/prospects\/([^\/]+)$/);
    if (putMatch && method === 'PUT') {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
      }
      request.user = authResult.user;
      const hasPerm = await hasPermission(env, authResult.user.tenant_id, authResult.user.role, 'manage_employees');
      if (!hasPerm) {
        return errorResponse('Permission denied', 403);
      }
      return await handleUpdateProspect(request, env, putMatch[1]);
    }
    
    // DELETE /api/v1/prospects/:id - Supprimer un prospect
    const deleteMatch = path.match(/^\/api\/v1\/prospects\/([^\/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
      }
      request.user = authResult.user;
      const hasPerm = await hasPermission(env, authResult.user.tenant_id, authResult.user.role, 'manage_employees');
      if (!hasPerm) {
        return errorResponse('Permission denied', 403);
      }
      return await handleDeleteProspect(request, env, deleteMatch[1]);
    }
    
    return null;
    
  } catch (error) {
    logger.error('Prospects route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// ===== HANDLERS =====

async function handleListProspects(request, env) {
  const tenantId = request.user.tenant_id;
  
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  const offset = parseInt(url.searchParams.get('offset')) || 0;
  
  let query = `
    SELECT id, first_name, last_name, email, phone, status, source, created_at, updated_at
    FROM prospects
    WHERE tenant_id = ?
  `;
  const params = [tenantId];
  
  if (status) {
    query += ` AND status = ?`;
    params.push(status);
  }
  
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);
  
  const result = await env.DB.prepare(query).bind(...params).all();
  
  let countQuery = `SELECT COUNT(*) as total FROM prospects WHERE tenant_id = ?`;
  const countParams = [tenantId];
  if (status) {
    countQuery += ` AND status = ?`;
    countParams.push(status);
  }
  const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();
  
  return successResponse({
    prospects: result.results,
    count: result.results.length,
    total: countResult.total,
    limit,
    offset
  });
}

async function handleCreateProspect(request, env) {
  const tenantId = request.user.tenant_id;
  const body = await request.json();
  
  const { first_name, last_name, email, phone, source, status = 'new' } = body;
  
  if (!first_name || !email) {
    return errorResponse('first_name and email are required', 400);
  }
  
  const existing = await env.DB.prepare(`
    SELECT id FROM prospects WHERE tenant_id = ? AND email = ?
  `).bind(tenantId, email).first();
  
  if (existing) {
    return errorResponse('A prospect with this email already exists', 409);
  }
  
  const prospectId = `prospect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();
  
  await env.DB.prepare(`
    INSERT INTO prospects (id, tenant_id, first_name, last_name, email, phone, status, source, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    prospectId, 
    tenantId, 
    first_name, 
    last_name || null,
    email, 
    phone || null, 
    status, 
    source || null,
    now,
    now
  ).run();
  
  logger.info('Prospect created', { prospectId, tenantId, email });
  
  return successResponse({
    success: true,
    prospect: {
      id: prospectId,
      tenant_id: tenantId,
      first_name,
      last_name: last_name || null,
      email,
      phone: phone || null,
      status,
      source: source || null,
      created_at: now
    }
  }, 201);
}

async function handleGetProspect(request, env, prospectId) {
  const tenantId = request.user.tenant_id;
  
  const prospect = await env.DB.prepare(`
    SELECT * FROM prospects WHERE id = ? AND tenant_id = ?
  `).bind(prospectId, tenantId).first();
  
  if (!prospect) {
    return errorResponse('Prospect not found', 404);
  }
  
  return successResponse({ prospect });
}

async function handleUpdateProspect(request, env, prospectId) {
  const tenantId = request.user.tenant_id;
  const body = await request.json();
  
  const existing = await env.DB.prepare(`
    SELECT * FROM prospects WHERE id = ? AND tenant_id = ?
  `).bind(prospectId, tenantId).first();
  
  if (!existing) {
    return errorResponse('Prospect not found', 404);
  }
  
  const first_name = body.first_name || existing.first_name;
  const last_name = body.last_name !== undefined ? body.last_name : existing.last_name;
  const email = body.email || existing.email;
  const phone = body.phone !== undefined ? body.phone : existing.phone;
  const status = body.status || existing.status;
  const source = body.source !== undefined ? body.source : existing.source;
  const now = new Date().toISOString();
  
  await env.DB.prepare(`
    UPDATE prospects 
    SET first_name = ?, last_name = ?, email = ?, phone = ?, status = ?, source = ?, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(
    first_name, last_name, email, phone, status, source, now,
    prospectId, tenantId
  ).run();
  
  logger.info('Prospect updated', { prospectId, tenantId });
  
  return successResponse({
    success: true,
    prospect: { id: prospectId, tenant_id: tenantId, first_name, last_name, email, phone, status, source, updated_at: now }
  });
}

async function handleDeleteProspect(request, env, prospectId) {
  const tenantId = request.user.tenant_id;
  
  const existing = await env.DB.prepare(`
    SELECT id FROM prospects WHERE id = ? AND tenant_id = ?
  `).bind(prospectId, tenantId).first();
  
  if (!existing) {
    return errorResponse('Prospect not found', 404);
  }
  
  await env.DB.prepare(`
    DELETE FROM prospects WHERE id = ? AND tenant_id = ?
  `).bind(prospectId, tenantId).run();
  
  logger.info('Prospect deleted', { prospectId, tenantId });
  
  return successResponse({ success: true, message: 'Prospect deleted successfully' });
}
