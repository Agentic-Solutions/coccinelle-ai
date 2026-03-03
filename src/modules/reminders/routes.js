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

    // Email via Resend
    if (email && env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: env.RESEND_FROM_EMAIL || 'noreply@coccinelle.ai',
            to: [email],
            subject: 'Rappel de votre rendez-vous',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #E53E3E;">Rappel de rendez-vous</h2>
                <p>Bonjour ${contactName},</p>
                <p>Nous vous rappelons que vous avez un rendez-vous prevu :</p>
                <div style="background: #F7FAFC; border-left: 4px solid #E53E3E; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 5px 0;"><strong>Date :</strong> ${dateFormatted}</p>
                  <p style="margin: 5px 0;"><strong>Heure :</strong> ${heureFormatted}</p>
                </div>
                <p>A bientot !</p>
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #E2E8F0;" />
                <p style="font-size: 12px; color: #A0AEC0;">Cet email a ete envoye automatiquement par Coccinelle.ai</p>
              </div>
            `
          })
        });
        logger.info('Email reminder sent', { email, appointmentId: rdv.id });
      } catch (emailErr) {
        logger.error('Email reminder error', { error: emailErr.message, appointmentId: rdv.id });
      }
    }

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
async function handleSendFollowups(request, env, corsHeaders) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ success: false, error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const { tenant } = authResult;

  // RDV termines sans feedback
  const appointments = await env.DB.prepare(`
    SELECT a.*, p.first_name, p.last_name, p.email as contact_email
    FROM appointments a
    LEFT JOIN prospects p ON a.prospect_id = p.id
    WHERE a.tenant_id = ?
      AND a.status = 'completed'
      AND NOT EXISTS (SELECT 1 FROM feedback WHERE appointment_id = a.id)
  `).bind(tenant.id).all();

  const rdvs = appointments.results || [];
  let followupsSent = 0;

  for (const rdv of rdvs) {
    const email = rdv.contact_email;
    if (!email || !env.RESEND_API_KEY) continue;

    const feedbackToken = crypto.randomUUID();
    const feedbackId = auth.generateId('fb');
    const contactName = `${rdv.first_name || ''} ${rdv.last_name || ''}`.trim() || 'Client';

    // Creer l'entree feedback avec le token
    await env.DB.prepare(`
      INSERT INTO feedback (id, appointment_id, tenant_id, token, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).bind(feedbackId, rdv.id, tenant.id, feedbackToken).run();

    // Envoyer l'email de suivi
    const feedbackUrl = `https://coccinelle-saas.pages.dev/feedback?token=${feedbackToken}`;

    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL || 'noreply@coccinelle.ai',
          to: [email],
          subject: 'Comment s\'est passe votre rendez-vous ?',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #E53E3E;">Votre avis nous interesse</h2>
              <p>Bonjour ${contactName},</p>
              <p>Nous esperons que votre rendez-vous s'est bien passe. Votre avis est precieux pour nous aider a ameliorer nos services.</p>
              <div style="text-align: center; margin: 30px 0;">
                <p style="font-size: 36px; margin: 10px 0;">&#11088;&#11088;&#11088;&#11088;&#11088;</p>
                <a href="${feedbackUrl}" style="display: inline-block; background: #E53E3E; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">
                  Donner mon avis
                </a>
              </div>
              <p>Cela ne prend que 30 secondes !</p>
              <hr style="margin-top: 30px; border: none; border-top: 1px solid #E2E8F0;" />
              <p style="font-size: 12px; color: #A0AEC0;">Cet email a ete envoye automatiquement par Coccinelle.ai</p>
            </div>
          `
        })
      });
      logger.info('Followup email sent', { email, appointmentId: rdv.id });
      followupsSent++;
    } catch (emailErr) {
      logger.error('Followup email error', { error: emailErr.message, appointmentId: rdv.id });
    }
  }

  return Response.json({ success: true, followups_sent: followupsSent }, { headers: corsHeaders });
}

// ============================================
// POST /api/v1/feedback (public, pas d'auth)
// ============================================
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
