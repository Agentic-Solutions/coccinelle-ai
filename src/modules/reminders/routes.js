/**
 * Module Reminders - Rappels RDV + Suivi post-RDV
 *
 * Endpoints:
 * - POST /api/v1/appointments/send-reminders   — Envoi rappels 24h avant
 * - POST /api/v1/appointments/send-followups    — Envoi feedback post-RDV
 * - POST /api/v1/feedback                       — Soumission feedback (public)
 * - GET  /api/v1/feedback/:token                — Infos RDV pour page feedback (public)
 */

import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';
import { createNotification } from '../../utils/notifications.js';

export async function handleRemindersRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // POST /api/v1/appointments/send-reminders
    if (path === '/api/v1/appointments/send-reminders' && method === 'POST') {
      return await handleSendReminders(request, env, corsHeaders);
    }

    // POST /api/v1/appointments/send-followups
    if (path === '/api/v1/appointments/send-followups' && method === 'POST') {
      return await handleSendFollowups(request, env, corsHeaders);
    }

    // POST /api/v1/feedback (public)
    if (path === '/api/v1/feedback' && method === 'POST') {
      return await handleSubmitFeedback(request, env, corsHeaders);
    }

    // GET /api/v1/feedback/:token (public)
    const feedbackMatch = path.match(/^\/api\/v1\/feedback\/([^/]+)$/);
    if (feedbackMatch && method === 'GET') {
      return await handleGetFeedback(request, env, feedbackMatch[1], corsHeaders);
    }

    return null;
  } catch (error) {
    logger.error('Reminders route error', { error: error.message, path });
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ============================================
// POST /api/v1/appointments/send-reminders
// ============================================
async function handleSendReminders(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;

  // Chercher les RDV dans les 24 prochaines heures, non rappeles, status 'scheduled'
  const appointments = await env.DB.prepare(`
    SELECT a.*, p.first_name, p.last_name, p.email as contact_email, p.phone as contact_phone
    FROM appointments a
    LEFT JOIN prospects p ON a.prospect_id = p.id
    WHERE a.tenant_id = ?
      AND a.scheduled_at BETWEEN datetime('now') AND datetime('now', '+24 hours')
      AND (a.reminder_sent = 0 OR a.reminder_sent IS NULL)
      AND a.status = 'scheduled'
  `).bind(tenant.id).all();

  const rdvs = appointments.results || [];
  let remindersSent = 0;

  for (const rdv of rdvs) {
    const phone = rdv.contact_phone;
    const email = rdv.contact_email;
    const scheduledDate = new Date(rdv.scheduled_at);
    const heureFormatted = scheduledDate.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
    const dateFormatted = scheduledDate.toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Europe/Paris' });
    const contactName = `${rdv.first_name || ''} ${rdv.last_name || ''}`.trim() || 'Client';

    // SMS via Twilio
    if (phone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
        const body = new URLSearchParams({
          From: env.TWILIO_PHONE_NUMBER,
          To: phone,
          Body: `Bonjour ${contactName}, rappel : vous avez un rendez-vous demain le ${dateFormatted} a ${heureFormatted}. A bientot !`
        });

        await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        });
        logger.info('SMS reminder sent', { phone, appointmentId: rdv.id });
      } catch (smsErr) {
        logger.error('SMS reminder error', { error: smsErr.message, appointmentId: rdv.id });
      }
    }

// ── LE RAPPEL PAR E-MAIL AU CONTACT EST SUPPRIME (15/08/2026) ──
    //
    // Ce bloc envoyait « Rappel de votre rendez-vous » en HTML a l'adresse du
    // contact. Coccinelle ne parle jamais d'e-mail a ses clients : le rappel part
    // en SMS, juste au-dessus.
    //
    // A ne pas confondre avec le rappel J-1 de `cron/reminders.js`, qui est le
    // rappel REEL du produit et n'a jamais envoye d'e-mail. Celui-ci vit derriere
    // `POST /api/v1/appointments/send-reminders`, qu'aucune page n'appelle — mais
    // la route repondait, et l'e-mail partait.

    // Marquer comme rappele
    await env.DB.prepare(
      'UPDATE appointments SET reminder_sent = 1 WHERE id = ?'
    ).bind(rdv.id).run();

    remindersSent++;
  }

  return Response.json({ success: true, reminders_sent: remindersSent }, { headers: corsHeaders });
}

// ============================================
// POST /api/v1/appointments/send-followups
// ============================================
/**
 * POST /api/v1/appointments/send-followups — NEUTRALISEE le 15/08/2026.
 *
 * Elle demandait un avis au CONTACT par e-mail apres un rendez-vous termine,
 * avec un lien `/feedback?token=…`. Coccinelle ne parle jamais d'e-mail a ses
 * clients : cette demande ne part plus.
 *
 * Pourquoi neutraliser la route ENTIERE plutot que le seul envoi : elle creait
 * d'abord une ligne `feedback` porteuse du jeton, PUIS envoyait l'e-mail. Retirer
 * l'envoi seul aurait produit des jetons que personne n'est invite a remplir —
 * des lignes orphelines, et un compteur `followups_sent` qui compte des envois
 * qui n'ont pas lieu.
 *
 * ⚠️ CONSEQUENCE A CONNAITRE : toute la fonction « avis apres rendez-vous » ne
 * vivait QUE par cet e-mail. `feedback` compte 0 ligne, son unique ecrivain etait
 * ici, et le seul chemin vers la page publique `/feedback` etait le lien de ce
 * message. La page reste en ligne mais ne recevra plus de jeton. A trancher au
 * backlog : la faire revivre par SMS, ou la retirer avec sa page.
 */
async function handleSendFollowups(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  // 200 et non 404 : la route existe, elle ne fait simplement plus rien. Un 404
  // laisserait croire a une erreur de chemin ; `followups_sent: 0` avec un motif
  // explicite dit ce qui se passe.
  return Response.json({
    success: true,
    followups_sent: 0,
    indisponible: 'La demande d\'avis par e-mail est suspendue : Coccinelle ne contacte plus les clients par e-mail.',
  }, { headers: corsHeaders });
}

async function handleSubmitFeedback(request, env, corsHeaders) {
  const body = await request.json();
  const { token, rating, comment } = body;

  if (!token) {
    return Response.json({ success: false, error: 'Token requis' }, { status: 400, headers: corsHeaders });
  }

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return Response.json({ success: false, error: 'La note doit etre entre 1 et 5' }, { status: 400, headers: corsHeaders });
  }

  const feedback = await env.DB.prepare(
    'SELECT * FROM feedback WHERE token = ?'
  ).bind(token).first();

  if (!feedback) {
    return Response.json({ success: false, error: 'Token de feedback invalide' }, { status: 404, headers: corsHeaders });
  }

  if (feedback.rating !== null) {
    return Response.json({ success: false, error: 'Feedback deja soumis' }, { status: 400, headers: corsHeaders });
  }

  await env.DB.prepare(`
    UPDATE feedback SET rating = ?, comment = ?, created_at = datetime('now')
    WHERE token = ?
  `).bind(rating || null, comment || null, token).run();

  // Notification pour le tenant
  await createNotification(env, {
    tenant_id: feedback.tenant_id,
    type: 'feedback_received',
    title: 'Nouveau feedback recu',
    message: `Nouveau feedback : ${rating}/5 etoiles${comment ? ' - "' + comment.substring(0, 100) + '"' : ''}`,
    data: { feedback_id: feedback.id, rating, appointment_id: feedback.appointment_id }
  });

  return Response.json({ success: true, message: 'Merci pour votre avis !' }, { headers: corsHeaders });
}

// ============================================
// GET /api/v1/feedback/:token (public)
// ============================================
async function handleGetFeedback(request, env, token, corsHeaders) {
  const feedback = await env.DB.prepare(`
    SELECT f.*, a.scheduled_at, a.status as appointment_status,
           p.first_name as prospect_first_name, p.last_name as prospect_last_name
    FROM feedback f
    LEFT JOIN appointments a ON f.appointment_id = a.id
    LEFT JOIN prospects p ON a.prospect_id = p.id
    WHERE f.token = ?
  `).bind(token).first();

  if (!feedback) {
    return Response.json({ success: false, error: 'Token invalide' }, { status: 404, headers: corsHeaders });
  }

  return Response.json({
    success: true,
    feedback: {
      appointment_date: feedback.scheduled_at,
      already_submitted: feedback.rating !== null,
      rating: feedback.rating,
      comment: feedback.comment
    }
  }, { headers: corsHeaders });
}
