/**
 * Module Support Tickets - CRUD tickets de support
 *
 * Endpoints:
 * - GET    /api/v1/support/tickets          — Liste des tickets du tenant
 * - GET    /api/v1/support/tickets/:id      — Detail d'un ticket
 * - POST   /api/v1/support/tickets          — Creer un ticket
 * - PUT    /api/v1/support/tickets/:id      — Mettre a jour un ticket
 * - DELETE /api/v1/support/tickets/:id      — Fermer un ticket
 */

import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';

export async function handleSupportRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // GET /api/v1/support/tickets
    if (path === '/api/v1/support/tickets' && method === 'GET') {
      return await handleListTickets(request, env, corsHeaders);
    }

    // POST /api/v1/support/tickets
    if (path === '/api/v1/support/tickets' && method === 'POST') {
      return await handleCreateTicket(request, env, corsHeaders);
    }

    // GET /api/v1/support/tickets/:id
    const idMatch = path.match(/^\/api\/v1\/support\/tickets\/([^/]+)$/);
    if (idMatch && method === 'GET') {
      return await handleGetTicket(request, env, idMatch[1], corsHeaders);
    }

    // PUT /api/v1/support/tickets/:id
    if (idMatch && method === 'PUT') {
      return await handleUpdateTicket(request, env, idMatch[1], corsHeaders);
    }

    // DELETE /api/v1/support/tickets/:id
    if (idMatch && method === 'DELETE') {
      return await handleCloseTicket(request, env, idMatch[1], corsHeaders);
    }

    return null;
  } catch (error) {
    logger.error('Support route error', { error: error.message, path });
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ============================================
// GET /api/v1/support/tickets
// ============================================
async function handleListTickets(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);
  const offset = parseInt(url.searchParams.get('offset')) || 0;

  let query = 'SELECT * FROM support_tickets WHERE tenant_id = ?';
  const params = [tenant.id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const result = await env.DB.prepare(query).bind(...params).all();
  const tickets = result.results || [];

  // Compter le total
  let countQuery = 'SELECT COUNT(*) as total FROM support_tickets WHERE tenant_id = ?';
  const countParams = [tenant.id];
  if (status) {
    countQuery += ' AND status = ?';
    countParams.push(status);
  }
  const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();

  return Response.json({
    success: true,
    tickets,
    total: countResult?.total || 0,
    limit,
    offset
  }, { headers: corsHeaders });
}

// ============================================
// GET /api/v1/support/tickets/:id
// ============================================
async function handleGetTicket(request, env, ticketId, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;

  const ticket = await env.DB.prepare(
    'SELECT * FROM support_tickets WHERE id = ? AND tenant_id = ?'
  ).bind(ticketId, tenant.id).first();

  if (!ticket) {
    return Response.json({ success: false, error: 'Ticket non trouve' }, { status: 404, headers: corsHeaders });
  }

  return Response.json({ success: true, ticket }, { headers: corsHeaders });
}

// ============================================
// POST /api/v1/support/tickets
// ============================================
async function handleCreateTicket(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { user, tenant } = authResult;
  const body = await request.json();
  const { subject, message, category, priority } = body;

  if (!subject || !message) {
    return Response.json({ success: false, error: 'Sujet et message requis' }, { status: 400, headers: corsHeaders });
  }

  const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO support_tickets (id, tenant_id, user_id, user_email, subject, message, category, priority, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).bind(
    ticketId, tenant.id, user.id, user.email || tenant.email,
    subject, message,
    category || 'general',
    priority || 'normal',
    now, now
  ).run();

  // Email notification si RESEND_API_KEY existe
  if (env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Coccinelle.AI Support <support@coccinelle.ai>',
          to: [user.email || tenant.email],
          subject: `[Ticket #${ticketId.slice(-6)}] ${subject} - Confirmation`,
          html: `
            <h2>Votre ticket a bien ete cree</h2>
            <p><strong>Sujet :</strong> ${subject}</p>
            <p><strong>Categorie :</strong> ${category || 'general'}</p>
            <p><strong>Priorite :</strong> ${priority || 'normal'}</p>
            <p>Nous reviendrons vers vous dans les meilleurs delais.</p>
            <p>— L'equipe Coccinelle.AI</p>
          `
        }),
      });
      logger.info('Support ticket email sent', { ticketId, to: user.email || tenant.email });
    } catch (emailError) {
      logger.error('Failed to send support ticket email', { error: emailError.message, ticketId });
    }
  } else {
    logger.info('Support ticket created (no RESEND_API_KEY, email skipped)', { ticketId });
  }

  return Response.json({
    success: true,
    ticket: { id: ticketId, subject, status: 'open', category: category || 'general', priority: priority || 'normal' }
  }, { status: 201, headers: corsHeaders });
}

// ============================================
// PUT /api/v1/support/tickets/:id
// ============================================
async function handleUpdateTicket(request, env, ticketId, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;

  const existing = await env.DB.prepare(
    'SELECT * FROM support_tickets WHERE id = ? AND tenant_id = ?'
  ).bind(ticketId, tenant.id).first();

  if (!existing) {
    return Response.json({ success: false, error: 'Ticket non trouve' }, { status: 404, headers: corsHeaders });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  await env.DB.prepare(`
    UPDATE support_tickets
    SET subject = ?, message = ?, category = ?, priority = ?, status = ?, admin_response = ?, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(
    body.subject || existing.subject,
    body.message || existing.message,
    body.category || existing.category,
    body.priority || existing.priority,
    body.status || existing.status,
    body.admin_response !== undefined ? body.admin_response : existing.admin_response,
    now,
    ticketId, tenant.id
  ).run();

  return Response.json({ success: true, message: 'Ticket mis a jour' }, { headers: corsHeaders });
}

// ============================================
// DELETE /api/v1/support/tickets/:id (close)
// ============================================
async function handleCloseTicket(request, env, ticketId, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;

  const existing = await env.DB.prepare(
    'SELECT * FROM support_tickets WHERE id = ? AND tenant_id = ?'
  ).bind(ticketId, tenant.id).first();

  if (!existing) {
    return Response.json({ success: false, error: 'Ticket non trouve' }, { status: 404, headers: corsHeaders });
  }

  await env.DB.prepare(
    'UPDATE support_tickets SET status = ?, updated_at = ? WHERE id = ? AND tenant_id = ?'
  ).bind('closed', new Date().toISOString(), ticketId, tenant.id).run();

  return Response.json({ success: true, message: 'Ticket ferme' }, { headers: corsHeaders });
}
