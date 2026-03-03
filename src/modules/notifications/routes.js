/**
 * Module Notifications - CRUD notifications
 *
 * Endpoints:
 * - GET /api/v1/notifications         — Liste notifications (filtrable unread)
 * - PUT /api/v1/notifications/:id/read — Marquer une notification comme lue
 * - PUT /api/v1/notifications/read-all — Marquer toutes les notifications comme lues
 */

import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';

export async function handleNotificationsRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // GET /api/v1/notifications
    if (path === '/api/v1/notifications' && method === 'GET') {
      return await handleListNotifications(request, env, corsHeaders);
    }

    // PUT /api/v1/notifications/read-all (must be before :id/read to avoid conflict)
    if (path === '/api/v1/notifications/read-all' && method === 'PUT') {
      return await handleReadAllNotifications(request, env, corsHeaders);
    }

    // PUT /api/v1/notifications/:id/read
    const readMatch = path.match(/^\/api\/v1\/notifications\/([^/]+)\/read$/);
    if (readMatch && method === 'PUT') {
      return await handleReadNotification(request, env, readMatch[1], corsHeaders);
    }

    return null;
  } catch (error) {
    logger.error('Notifications route error', { error: error.message, path });
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ============================================
// GET /api/v1/notifications
// ============================================
async function handleListNotifications(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get('unread') === 'true';
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);

  let query = 'SELECT * FROM notifications WHERE tenant_id = ?';
  const params = [tenant.id];

  if (unreadOnly) {
    query += ' AND read = 0';
  }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(limit);

  const result = await env.DB.prepare(query).bind(...params).all();
  const notifications = result.results || [];

  // Compter les non-lues
  const unreadResult = await env.DB.prepare(
    'SELECT COUNT(*) as count FROM notifications WHERE tenant_id = ? AND read = 0'
  ).bind(tenant.id).first();

  return Response.json({
    success: true,
    notifications,
    unread_count: unreadResult?.count || 0
  }, { headers: corsHeaders });
}

// ============================================
// PUT /api/v1/notifications/:id/read
// ============================================
async function handleReadNotification(request, env, notificationId, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;

  await env.DB.prepare(
    'UPDATE notifications SET read = 1 WHERE id = ? AND tenant_id = ?'
  ).bind(notificationId, tenant.id).run();

  return Response.json({ success: true, message: 'Notification marquee comme lue' }, { headers: corsHeaders });
}

// ============================================
// PUT /api/v1/notifications/read-all
// ============================================
async function handleReadAllNotifications(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;

  await env.DB.prepare(
    'UPDATE notifications SET read = 1 WHERE tenant_id = ? AND read = 0'
  ).bind(tenant.id).run();

  return Response.json({ success: true, message: 'Toutes les notifications marquees comme lues' }, { headers: corsHeaders });
}
