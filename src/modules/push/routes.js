/**
 * Push Notifications Routes
 * POST /api/v1/push/subscribe — Register a push subscription
 * POST /api/v1/push/unsubscribe — Remove a push subscription
 * GET  /api/v1/push/vapid-key — Get VAPID public key
 * POST /api/v1/push/test — Send a test push notification
 * POST /api/v1/push/generate-vapid-keys — Generate new VAPID keys (admin only)
 */
import { logger } from '../../utils/logger.js';
import { verifyToken } from '../auth/helpers.js';
import { getCorsHeaders } from '../../config/cors.js';
import { sendPushToTenant, generateVapidKeys } from './push-service.js';

export async function handlePushRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/v1/push/vapid-key — public key for PushManager.subscribe
  if (path === '/api/v1/push/vapid-key' && method === 'GET') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }
    const payload = verifyToken(authHeader.replace('Bearer ', ''), env.JWT_SECRET);
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }

    if (!env.VAPID_PUBLIC_KEY) {
      return Response.json({ error: 'VAPID keys not configured' }, { status: 500, headers: corsHeaders });
    }

    return Response.json({ publicKey: env.VAPID_PUBLIC_KEY }, { headers: corsHeaders });
  }

  // POST /api/v1/push/subscribe
  if (path === '/api/v1/push/subscribe' && method === 'POST') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }
    const payload = verifyToken(authHeader.replace('Bearer ', ''), env.JWT_SECRET);
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { endpoint, keys } = body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return Response.json({ error: 'Invalid subscription: endpoint, keys.p256dh, keys.auth required' }, { status: 400, headers: corsHeaders });
    }

    const id = `push_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userAgent = request.headers.get('User-Agent') || '';

    await env.DB.prepare(`
      INSERT OR REPLACE INTO push_subscriptions (id, tenant_id, user_id, endpoint, p256dh, auth, user_agent, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(id, payload.tenant_id, payload.id || null, endpoint, keys.p256dh, keys.auth, userAgent).run();

    logger.info('Push subscription registered', { tenantId: payload.tenant_id, endpoint: endpoint.substring(0, 50) });

    return Response.json({ success: true, id }, { status: 201, headers: corsHeaders });
  }

  // POST /api/v1/push/unsubscribe
  if (path === '/api/v1/push/unsubscribe' && method === 'POST') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }
    const payload = verifyToken(authHeader.replace('Bearer ', ''), env.JWT_SECRET);
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return Response.json({ error: 'endpoint required' }, { status: 400, headers: corsHeaders });
    }

    await env.DB.prepare(
      'DELETE FROM push_subscriptions WHERE tenant_id = ? AND endpoint = ?'
    ).bind(payload.tenant_id, endpoint).run();

    logger.info('Push subscription removed', { tenantId: payload.tenant_id });

    return Response.json({ success: true }, { headers: corsHeaders });
  }

  // POST /api/v1/push/test
  if (path === '/api/v1/push/test' && method === 'POST') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }
    const payload = verifyToken(authHeader.replace('Bearer ', ''), env.JWT_SECRET);
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }

    const result = await sendPushToTenant(env, payload.tenant_id, {
      title: 'Coccinelle.ai',
      body: 'Les notifications push fonctionnent correctement !',
      url: '/dashboard',
      tag: 'test',
    });

    return Response.json({ success: true, ...result }, { headers: corsHeaders });
  }

  // POST /api/v1/push/generate-vapid-keys (admin helper)
  if (path === '/api/v1/push/generate-vapid-keys' && method === 'POST') {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return Response.json({ error: 'Authorization required' }, { status: 401, headers: corsHeaders });
    }
    const payload = verifyToken(authHeader.replace('Bearer ', ''), env.JWT_SECRET);
    if (!payload) {
      return Response.json({ error: 'Invalid token' }, { status: 401, headers: corsHeaders });
    }

    const keys = await generateVapidKeys();

    return Response.json({
      message: 'Add these to your wrangler.toml [vars] section',
      VAPID_PUBLIC_KEY: keys.publicKey,
      VAPID_PRIVATE_KEY_JWK: keys.privateKeyJwk,
    }, { headers: corsHeaders });
  }

  return null;
}
