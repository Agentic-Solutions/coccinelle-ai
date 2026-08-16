/**
 * Module Reminders - Rappels RDV + Suivi post-RDV
 *
 * Endpoints:
 * - POST /api/v1/appointments/send-followups    — NEUTRALISEE (voir plus bas)
 * - POST /api/v1/feedback                       — Soumission feedback (public)
 * - GET  /api/v1/feedback/:token                — Infos RDV pour page feedback (public)
 *
 * ⛔ `send-reminders` a ete SUPPRIMEE le 16/08/2026 : c'etait un doublon vivant du
 * rappel J-1 de `src/cron/reminders.js`, avec l'heure fausse et sans garde atomique.
 * Le rappel J-1 du produit vit dans le cron, et lui seul.
 */

import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';
import { createNotification } from '../../utils/notifications.js';

export async function handleRemindersRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // ⛔ POST /api/v1/appointments/send-reminders — SUPPRIMEE le 16/08/2026.
    //
    // C'etait un SECOND envoyeur de rappels J-1, doublon de `cron/reminders.js`,
    // et il portait trois defauts que le cron ne porte plus :
    //   1. l'heure fausse — `new Date(scheduled_at)` puis `toLocaleString` avec
    //      `timeZone: 'Europe/Paris'` sur une date-heure NAIVE et deja locale
    //      (regle 10quinquies) : un RDV de 14h30 etait annonce pour 16h30 en ete ;
    //   2. le marquage NON atomique — `SELECT` puis `UPDATE … SET reminder_sent = 1`
    //      sans condition, donc deux appels simultanes rappelaient deux fois ;
    //   3. ni plafond quotidien de SMS, ni trace dans la conversation du contact,
    //      ni l'exception « reserve il y a moins de 24 h ».
    //
    // Verifie avant de couper : AUCUN appelant. Ni frontend, ni portail revendeur,
    // ni script, ni cron (`wrangler.toml` ne declare que `0 17 * * *`, qui appelle
    // `cron/reminders.js`). Elle exigeait un JWT, donc n'etait pas ouverte au monde
    // — mais n'importe quel client connecte pouvait la declencher sur son tenant et
    // recevoir un doublon a la mauvaise heure.
    //
    // Le rappel J-1 REEL du produit vit dans `src/cron/reminders.js`, et lui seul.
    // On ne laisse pas ici de 404 explicite : une route morte que rien n'appelle
    // n'a pas besoin d'exister pour dire qu'elle n'existe pas.

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
    return Response.json({ success: false, error: 'La note doit être entre 1 et 5' }, { status: 400, headers: corsHeaders });
  }

  const feedback = await env.DB.prepare(
    'SELECT * FROM feedback WHERE token = ?'
  ).bind(token).first();

  if (!feedback) {
    return Response.json({ success: false, error: 'Token de feedback invalide' }, { status: 404, headers: corsHeaders });
  }

  if (feedback.rating !== null) {
    return Response.json({ success: false, error: 'Feedback déjà soumis' }, { status: 400, headers: corsHeaders });
  }

  await env.DB.prepare(`
    UPDATE feedback SET rating = ?, comment = ?, created_at = datetime('now')
    WHERE token = ?
  `).bind(rating || null, comment || null, token).run();

  // Notification pour le tenant
  await createNotification(env, {
    tenant_id: feedback.tenant_id,
    type: 'feedback_received',
    title: 'Nouveau feedback reçu',
    message: `Nouveau feedback : ${rating}/5 étoiles${comment ? ' - "' + comment.substring(0, 100) + '"' : ''}`,
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
