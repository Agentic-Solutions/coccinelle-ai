/**
 * Module FAQ - CRUD items FAQ publiques
 *
 * Endpoints:
 * - GET    /api/v1/faq               — Liste FAQ (public, pas d'auth)
 * - GET    /api/v1/faq/:id           — Detail FAQ
 * - POST   /api/v1/faq               — Creer un item FAQ (admin)
 * - PUT    /api/v1/faq/:id           — Modifier un item FAQ (admin)
 * - DELETE /api/v1/faq/:id           — Supprimer un item FAQ (admin)
 */

import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';

export async function handleFaqRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // GET /api/v1/faq — public (no auth required)
    if (path === '/api/v1/faq' && method === 'GET') {
      return await handleListFaq(request, env, corsHeaders);
    }

    // GET /api/v1/faq/:id
    const idMatch = path.match(/^\/api\/v1\/faq\/([^/]+)$/);
    if (idMatch && method === 'GET') {
      return await handleGetFaqItem(request, env, idMatch[1], corsHeaders);
    }

    // POST /api/v1/faq (admin only)
    if (path === '/api/v1/faq' && method === 'POST') {
      return await handleCreateFaqItem(request, env, corsHeaders);
    }

    // PUT /api/v1/faq/:id (admin only)
    if (idMatch && method === 'PUT') {
      return await handleUpdateFaqItem(request, env, idMatch[1], corsHeaders);
    }

    // DELETE /api/v1/faq/:id (admin only)
    if (idMatch && method === 'DELETE') {
      return await handleDeleteFaqItem(request, env, idMatch[1], corsHeaders);
    }

    return null;
  } catch (error) {
    logger.error('FAQ route error', { error: error.message, path });
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ============================================
// GET /api/v1/faq
// ============================================
async function handleListFaq(request, env, corsHeaders) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');

  let query = 'SELECT * FROM faq_items WHERE is_active = 1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  query += ' ORDER BY sort_order ASC, created_at DESC';

  const result = await env.DB.prepare(query).bind(...params).all();
  const items = result.results || [];

  // Group by category
  const categories = [...new Set(items.map(i => i.category))];

  return Response.json({
    success: true,
    items,
    categories,
    total: items.length
  }, { headers: corsHeaders });
}

// ============================================
// GET /api/v1/faq/:id
// ============================================
async function handleGetFaqItem(request, env, itemId, corsHeaders) {
  const item = await env.DB.prepare(
    'SELECT * FROM faq_items WHERE id = ? AND is_active = 1'
  ).bind(itemId).first();

  if (!item) {
    return Response.json({ success: false, error: 'Article FAQ non trouve' }, { status: 404, headers: corsHeaders });
  }

  return Response.json({ success: true, item }, { headers: corsHeaders });
}

// ============================================
// POST /api/v1/faq (admin)
// ============================================
async function handleCreateFaqItem(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { user } = authResult;
  if (user.role !== 'admin') {
    return Response.json({ success: false, error: 'Permission refusee' }, { status: 403, headers: corsHeaders });
  }

  const body = await request.json();
  const { question, answer, category, sort_order } = body;

  if (!question || !answer) {
    return Response.json({ success: false, error: 'Question et reponse requises' }, { status: 400, headers: corsHeaders });
  }

  const itemId = `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO faq_items (id, question, answer, category, sort_order, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).bind(itemId, question, answer, category || 'general', sort_order || 0, now, now).run();

  return Response.json({
    success: true,
    item: { id: itemId, question, answer, category: category || 'general' }
  }, { status: 201, headers: corsHeaders });
}

// ============================================
// PUT /api/v1/faq/:id (admin)
// ============================================
async function handleUpdateFaqItem(request, env, itemId, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { user } = authResult;
  if (user.role !== 'admin') {
    return Response.json({ success: false, error: 'Permission refusee' }, { status: 403, headers: corsHeaders });
  }

  const existing = await env.DB.prepare('SELECT * FROM faq_items WHERE id = ?').bind(itemId).first();
  if (!existing) {
    return Response.json({ success: false, error: 'Article FAQ non trouve' }, { status: 404, headers: corsHeaders });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE faq_items
    SET question = ?, answer = ?, category = ?, sort_order = ?, is_active = ?, updated_at = ?
    WHERE id = ?
  `).bind(
    body.question || existing.question,
    body.answer || existing.answer,
    body.category || existing.category,
    body.sort_order !== undefined ? body.sort_order : existing.sort_order,
    body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
    now,
    itemId
  ).run();

  return Response.json({ success: true, message: 'Article FAQ mis a jour' }, { headers: corsHeaders });
}

// ============================================
// DELETE /api/v1/faq/:id (admin, soft delete)
// ============================================
async function handleDeleteFaqItem(request, env, itemId, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { user } = authResult;
  if (user.role !== 'admin') {
    return Response.json({ success: false, error: 'Permission refusee' }, { status: 403, headers: corsHeaders });
  }

  const existing = await env.DB.prepare('SELECT * FROM faq_items WHERE id = ?').bind(itemId).first();
  if (!existing) {
    return Response.json({ success: false, error: 'Article FAQ non trouve' }, { status: 404, headers: corsHeaders });
  }

  await env.DB.prepare(
    'UPDATE faq_items SET is_active = 0, updated_at = ? WHERE id = ?'
  ).bind(new Date().toISOString(), itemId).run();

  return Response.json({ success: true, message: 'Article FAQ supprime' }, { headers: corsHeaders });
}
