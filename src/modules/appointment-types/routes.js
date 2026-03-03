// Module Appointment Types - Types de RDV configurables
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';

export async function handleAppointmentTypesRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // GET /api/v1/appointment-types
    if (path === '/api/v1/appointment-types' && method === 'GET') {
      return await handleListTypes(request, env);
    }

    // POST /api/v1/appointment-types
    if (path === '/api/v1/appointment-types' && method === 'POST') {
      return await handleCreateType(request, env);
    }

    // PUT /api/v1/appointment-types/:id
    if (path.match(/^\/api\/v1\/appointment-types\/[^/]+$/) && method === 'PUT') {
      const typeId = path.split('/')[4];
      return await handleUpdateType(request, env, typeId);
    }

    // DELETE /api/v1/appointment-types/:id
    if (path.match(/^\/api\/v1\/appointment-types\/[^/]+$/) && method === 'DELETE') {
      const typeId = path.split('/')[4];
      return await handleDeleteType(request, env, typeId);
    }

    return null;

  } catch (error) {
    logger.error('Appointment types route error', { error: error.message, path });
    return errorResponse(error.message, 500, request);
  }
}

// GET /api/v1/appointment-types
async function handleListTypes(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { tenant } = authResult;

  const result = await env.DB.prepare(
    'SELECT * FROM appointment_types WHERE tenant_id = ? AND is_active = 1 ORDER BY display_order, name'
  ).bind(tenant.id).all();

  return successResponse({ types: result.results || [] }, 200, request);
}

// POST /api/v1/appointment-types
async function handleCreateType(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { tenant } = authResult;
  const body = await request.json();
  const { name, duration_minutes, description, price, color } = body;

  if (!name) {
    return errorResponse('Le nom est requis', 400, request);
  }

  const typeId = auth.generateId('atype');
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO appointment_types (id, tenant_id, name, duration_minutes, description, price, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    typeId,
    tenant.id,
    name,
    duration_minutes || 30,
    description || null,
    price || null,
    color || '#3B82F6',
    now,
    now
  ).run();

  const type = {
    id: typeId,
    tenant_id: tenant.id,
    name,
    duration_minutes: duration_minutes || 30,
    description: description || null,
    price: price || null,
    color: color || '#3B82F6',
    is_active: 1,
    created_at: now,
    updated_at: now
  };

  return successResponse({ type }, 201, request);
}

// PUT /api/v1/appointment-types/:id
async function handleUpdateType(request, env, typeId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { tenant } = authResult;

  const existing = await env.DB.prepare(
    'SELECT * FROM appointment_types WHERE id = ? AND tenant_id = ?'
  ).bind(typeId, tenant.id).first();

  if (!existing) {
    return errorResponse('Type de RDV non trouve', 404, request);
  }

  const body = await request.json();
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE appointment_types
    SET name = COALESCE(?, name),
        duration_minutes = COALESCE(?, duration_minutes),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        color = COALESCE(?, color),
        display_order = COALESCE(?, display_order),
        updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.name || null,
    body.duration_minutes || null,
    body.description || null,
    body.price !== undefined ? body.price : null,
    body.color || null,
    body.display_order !== undefined ? body.display_order : null,
    now,
    typeId,
    tenant.id
  ).run();

  return successResponse({ message: 'Type de RDV mis a jour' }, 200, request);
}

// DELETE /api/v1/appointment-types/:id (soft delete)
async function handleDeleteType(request, env, typeId) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return jsonResponse({ success: false, error: authResult.error }, authResult.status, request);
  }

  const { tenant } = authResult;

  const existing = await env.DB.prepare(
    'SELECT * FROM appointment_types WHERE id = ? AND tenant_id = ?'
  ).bind(typeId, tenant.id).first();

  if (!existing) {
    return errorResponse('Type de RDV non trouve', 404, request);
  }

  await env.DB.prepare(
    'UPDATE appointment_types SET is_active = 0, updated_at = ? WHERE id = ? AND tenant_id = ?'
  ).bind(new Date().toISOString(), typeId, tenant.id).run();

  return successResponse({ message: 'Type de RDV supprime' }, 200, request);
}
