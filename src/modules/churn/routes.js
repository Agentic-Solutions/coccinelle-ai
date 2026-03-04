/**
 * Module Churn Feedback - Sondage avant annulation
 *
 * Endpoints:
 * - POST /api/v1/churn/feedback — Soumettre un feedback de churn
 * - GET  /api/v1/churn/feedback — Liste des feedbacks (admin)
 */

import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';

export async function handleChurnRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // POST /api/v1/churn/feedback
    if (path === '/api/v1/churn/feedback' && method === 'POST') {
      return await handleSubmitFeedback(request, env, corsHeaders);
    }

    // GET /api/v1/churn/feedback (admin)
    if (path === '/api/v1/churn/feedback' && method === 'GET') {
      return await handleListFeedback(request, env, corsHeaders);
    }

    return null;
  } catch (error) {
    logger.error('Churn route error', { error: error.message, path });
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ============================================
// POST /api/v1/churn/feedback
// ============================================
async function handleSubmitFeedback(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { user, tenant } = authResult;
  const body = await request.json();
  const { reason, details, would_recommend, plan_at_cancel } = body;

  if (!reason) {
    return Response.json({ success: false, error: 'La raison est requise' }, { status: 400, headers: corsHeaders });
  }

  const feedbackId = `churn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO churn_feedback (id, tenant_id, user_id, user_email, reason, details, would_recommend, plan_at_cancel, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    feedbackId,
    tenant.id,
    user.id,
    user.email || tenant.email,
    reason,
    details || null,
    would_recommend !== undefined ? would_recommend : null,
    plan_at_cancel || null,
    now
  ).run();

  logger.info('Churn feedback submitted', { feedbackId, tenantId: tenant.id, reason });

  return Response.json({
    success: true,
    message: 'Merci pour votre retour',
    feedback_id: feedbackId
  }, { status: 201, headers: corsHeaders });
}

// ============================================
// GET /api/v1/churn/feedback (admin)
// ============================================
async function handleListFeedback(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { user } = authResult;
  if (user.role !== 'admin') {
    return Response.json({ success: false, error: 'Permission refusee' }, { status: 403, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);

  const result = await env.DB.prepare(
    'SELECT * FROM churn_feedback ORDER BY created_at DESC LIMIT ?'
  ).bind(limit).all();

  return Response.json({
    success: true,
    feedbacks: result.results || [],
    total: (result.results || []).length
  }, { headers: corsHeaders });
}
