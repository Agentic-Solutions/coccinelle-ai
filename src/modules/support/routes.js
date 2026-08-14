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

/**
 * Boite de reception des demandes d'aide. Adresse verifiee le 14/08/2026
 * (routage Cloudflare vers la boite de Youssef, test recu).
 */
const SUPPORT_EMAIL = 'support@coccinelle.ai';

/**
 * Le sujet et le message viennent du client et partent dans un e-mail HTML que
 * NOUS lisons. Sans echappement, un `<script>` ou une balise cassee traverse
 * jusqu'a notre boite.
 */
function echapper(valeur) {
  return String(valeur ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

  // ─────────────────────────────────────────────────────────────────────
  // Notification — DEUX envois distincts (14/08/2026)
  //
  // Avant, l'unique e-mail partait `to: [user.email]` : le client recevait un
  // accuse de reception promettant « nous reviendrons vers vous dans les
  // meilleurs delais », et PERSONNE chez Coccinelle n'etait prevenu.
  // `support@coccinelle.ai` n'apparaissait que dans le `from`. Rattraper par la
  // base etait impossible : `GET /support/tickets` filtre sur `tenant_id`, donc
  // meme un admin ne voit que les tickets de son propre tenant, et aucune page
  // back-office ne lit `support_tickets`. Zero ticket en base avait cache le
  // defaut depuis le debut.
  //
  // Deux envois et non un `to` a deux adresses : sinon le client voit l'adresse
  // interne, et un « repondre a tous » lui expedie nos echanges.
  // ─────────────────────────────────────────────────────────────────────
  const clientEmail = user.email || tenant.email;
  const numero = ticketId.slice(-6);

  if (env.RESEND_API_KEY) {
    // 1. Vers l'equipe. `reply_to` = le client : repondre part droit chez lui.
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Coccinelle.ai <support@coccinelle.ai>',
          to: [SUPPORT_EMAIL],
          reply_to: clientEmail,
          subject: `[Ticket #${numero}] ${subject}`,
          html: `
            <p><strong>${echapper(tenant.name || tenant.id)}</strong> — ${echapper(clientEmail)}</p>
            <p>Categorie : ${echapper(category || 'general')} &middot; Priorite : ${echapper(priority || 'normal')}</p>
            <hr />
            <p style="white-space:pre-wrap">${echapper(message)}</p>
            <hr />
            <p style="color:#888;font-size:12px">Ticket ${echapper(ticketId)} &middot; tenant ${echapper(tenant.id)}</p>
          `,
        }),
      });
      if (!res.ok) {
        // Un ticket que personne ne recoit doit laisser une trace bruyante.
        logger.error('Support ticket NOT delivered to team', {
          ticketId, to: SUPPORT_EMAIL, status: res.status,
        });
      } else {
        logger.info('Support ticket sent to team', { ticketId, to: SUPPORT_EMAIL });
      }
    } catch (e) {
      logger.error('Support ticket NOT delivered to team', { ticketId, error: e.message });
    }

    // 2. Vers le client — l'accuse de reception, inchange sur le fond.
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Coccinelle.ai <support@coccinelle.ai>',
          to: [clientEmail],
          reply_to: SUPPORT_EMAIL,
          subject: `[Ticket #${numero}] ${subject} - Confirmation`,
          html: `
            <h2>Votre demande est bien arrivee</h2>
            <p><strong>Sujet :</strong> ${echapper(subject)}</p>
            <p><strong>Categorie :</strong> ${echapper(category || 'general')}</p>
            <p>Nous revenons vers vous des que possible. Vous pouvez repondre
               directement a cet e-mail pour completer votre demande.</p>
            <p>— L'equipe Coccinelle.ai</p>
          `,
        }),
      });
      logger.info('Support ticket confirmation sent', { ticketId, to: clientEmail });
    } catch (e) {
      // L'accuse est un confort ; son echec ne merite pas le meme niveau que
      // le precedent, ou c'est la demande elle-meme qui se perd.
      logger.warn('Support ticket confirmation failed', { ticketId, error: e.message });
    }
  } else {
    // WARN et non INFO : sans cle, le ticket est en base et PERSONNE ne le
    // sait. Un ticket perdu en silence est pire qu'une erreur visible.
    logger.warn('RESEND_API_KEY absente — ticket enregistre mais AUCUN e-mail envoye, personne n\'est prevenu', {
      ticketId, tenant: tenant.id, subject,
    });
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
