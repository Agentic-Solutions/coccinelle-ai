/**
 * Module Reports - Recap hebdomadaire (M13)
 *
 * GET  /api/v1/reports/weekly       — Preview du recap (auth JWT)
 * POST /api/v1/reports/weekly/send   — Envoie par email via Resend (auth JWT)
 * POST /api/v1/reports/weekly/cron   — Endpoint Cron Trigger (protege par CRON_SECRET)
 */

import { requireAuth } from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';

/**
 * Genere les donnees du recap hebdomadaire pour un tenant
 */
async function generateWeeklyReport(env, tenantId) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const weekAgoStr = weekAgo.toISOString();
  const twoWeeksAgoStr = twoWeeksAgo.toISOString();

  // Appels cette semaine
  let callsThisWeek = 0;
  let callsLastWeek = 0;
  try {
    const r1 = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM call_logs WHERE tenant_id = ? AND created_at >= ?'
    ).bind(tenantId, weekAgoStr).first();
    callsThisWeek = r1?.count || 0;

    const r2 = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM call_logs WHERE tenant_id = ? AND created_at >= ? AND created_at < ?'
    ).bind(tenantId, twoWeeksAgoStr, weekAgoStr).first();
    callsLastWeek = r2?.count || 0;
  } catch (e) { /* table may not exist */ }

  // RDV cette semaine
  let appointmentsThisWeek = 0;
  let appointmentsLastWeek = 0;
  try {
    const r1 = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM appointments WHERE tenant_id = ? AND created_at >= ?'
    ).bind(tenantId, weekAgoStr).first();
    appointmentsThisWeek = r1?.count || 0;

    const r2 = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM appointments WHERE tenant_id = ? AND created_at >= ? AND created_at < ?'
    ).bind(tenantId, twoWeeksAgoStr, weekAgoStr).first();
    appointmentsLastWeek = r2?.count || 0;
  } catch (e) { /* table may not exist */ }

  // Nouveaux prospects cette semaine
  let prospectsThisWeek = 0;
  let prospectsLastWeek = 0;
  try {
    const r1 = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM prospects WHERE tenant_id = ? AND created_at >= ?'
    ).bind(tenantId, weekAgoStr).first();
    prospectsThisWeek = r1?.count || 0;

    const r2 = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM prospects WHERE tenant_id = ? AND created_at >= ? AND created_at < ?'
    ).bind(tenantId, twoWeeksAgoStr, weekAgoStr).first();
    prospectsLastWeek = r2?.count || 0;
  } catch (e) { /* table may not exist */ }

  // Conversions (prospects -> customers)
  let conversionsThisWeek = 0;
  try {
    const r1 = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM customers WHERE tenant_id = ? AND created_at >= ?'
    ).bind(tenantId, weekAgoStr).first();
    conversionsThisWeek = r1?.count || 0;
  } catch (e) { /* table may not exist */ }

  // Top questions (FAQ les plus consultees)
  let topQuestions = [];
  try {
    const r = await env.DB.prepare(
      `SELECT question, view_count FROM knowledge_faq
       WHERE tenant_id = ?
       ORDER BY view_count DESC LIMIT 5`
    ).bind(tenantId).all();
    topQuestions = r?.results || [];
  } catch (e) { /* table may not exist */ }

  // Calculer les variations
  const callsDelta = callsLastWeek > 0
    ? Math.round(((callsThisWeek - callsLastWeek) / callsLastWeek) * 100)
    : callsThisWeek > 0 ? 100 : 0;

  const appointmentsDelta = appointmentsLastWeek > 0
    ? Math.round(((appointmentsThisWeek - appointmentsLastWeek) / appointmentsLastWeek) * 100)
    : appointmentsThisWeek > 0 ? 100 : 0;

  const prospectsDelta = prospectsLastWeek > 0
    ? Math.round(((prospectsThisWeek - prospectsLastWeek) / prospectsLastWeek) * 100)
    : prospectsThisWeek > 0 ? 100 : 0;

  return {
    period: {
      start: weekAgoStr.split('T')[0],
      end: now.toISOString().split('T')[0]
    },
    metrics: {
      calls: { current: callsThisWeek, previous: callsLastWeek, delta: callsDelta },
      appointments: { current: appointmentsThisWeek, previous: appointmentsLastWeek, delta: appointmentsDelta },
      prospects: { current: prospectsThisWeek, previous: prospectsLastWeek, delta: prospectsDelta },
      conversions: { current: conversionsThisWeek }
    },
    top_questions: topQuestions,
    generated_at: now.toISOString()
  };
}

/**
 * Genere le HTML de l'email de recap hebdomadaire
 */
function generateWeeklyEmailHTML(report, tenantName) {
  const { metrics, period, top_questions } = report;

  const deltaIcon = (delta) => {
    if (delta > 0) return `<span style="color:#16a34a;">+${delta}%</span>`;
    if (delta < 0) return `<span style="color:#dc2626;">${delta}%</span>`;
    return '<span style="color:#6b7280;">0%</span>';
  };

  const questionsHTML = top_questions.length > 0
    ? top_questions.map((q, i) => `<li style="margin-bottom:4px;">${q.question}</li>`).join('')
    : '<li>Aucune question cette semaine</li>';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
  <div style="background:white;border-radius:12px;padding:32px;border:1px solid #e5e7eb;">
    <h1 style="color:#111827;font-size:24px;margin-bottom:4px;">Recap Hebdomadaire</h1>
    <p style="color:#6b7280;font-size:14px;margin-top:0;">
      ${tenantName} &mdash; ${period.start} au ${period.end}
    </p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">

    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="padding:16px;text-align:center;background:#eff6ff;border-radius:8px;">
          <div style="font-size:28px;font-weight:bold;color:#1e40af;">${metrics.calls.current}</div>
          <div style="color:#6b7280;font-size:13px;">Appels</div>
          <div style="font-size:12px;margin-top:4px;">${deltaIcon(metrics.calls.delta)} vs semaine derniere</div>
        </td>
        <td style="width:12px;"></td>
        <td style="padding:16px;text-align:center;background:#f0fdf4;border-radius:8px;">
          <div style="font-size:28px;font-weight:bold;color:#166534;">${metrics.appointments.current}</div>
          <div style="color:#6b7280;font-size:13px;">Rendez-vous</div>
          <div style="font-size:12px;margin-top:4px;">${deltaIcon(metrics.appointments.delta)} vs semaine derniere</div>
        </td>
      </tr>
      <tr><td colspan="3" style="height:12px;"></td></tr>
      <tr>
        <td style="padding:16px;text-align:center;background:#fef3c7;border-radius:8px;">
          <div style="font-size:28px;font-weight:bold;color:#92400e;">${metrics.prospects.current}</div>
          <div style="color:#6b7280;font-size:13px;">Nouveaux prospects</div>
          <div style="font-size:12px;margin-top:4px;">${deltaIcon(metrics.prospects.delta)} vs semaine derniere</div>
        </td>
        <td style="width:12px;"></td>
        <td style="padding:16px;text-align:center;background:#fdf2f8;border-radius:8px;">
          <div style="font-size:28px;font-weight:bold;color:#9d174d;">${metrics.conversions.current}</div>
          <div style="color:#6b7280;font-size:13px;">Conversions</div>
        </td>
      </tr>
    </table>

    ${top_questions.length > 0 ? `
    <div style="margin-top:24px;">
      <h3 style="color:#111827;font-size:16px;">Top questions posees</h3>
      <ol style="color:#374151;font-size:14px;padding-left:20px;">
        ${questionsHTML}
      </ol>
    </div>
    ` : ''}

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <div style="text-align:center;">
      <a href="https://coccinelle-saas.pages.dev/dashboard/analytics"
         style="display:inline-block;padding:12px 24px;background:#111827;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
        Voir le dashboard complet
      </a>
    </div>
    <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:20px;">
      Coccinelle.ai &mdash; Votre assistant IA<br>
      <a href="https://coccinelle-saas.pages.dev/dashboard/settings/notifications" style="color:#9ca3af;">
        Se desabonner du recap hebdomadaire
      </a>
    </p>
  </div>
</body>
</html>`;
}

/**
 * Envoie le recap par email via Resend
 */
async function sendWeeklyEmail(env, email, report, tenantName) {
  const html = generateWeeklyEmailHTML(report, tenantName);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL || 'noreply@coccinelle.ai',
      to: email,
      subject: `Recap hebdomadaire - ${tenantName}`,
      html
    })
  });

  return response.ok;
}

/**
 * Router principal du module Reports
 */
export async function handleReportsRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ========================================
  // GET /api/v1/reports/weekly — Preview du recap
  // ========================================
  if (path === '/api/v1/reports/weekly' && method === 'GET') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const report = await generateWeeklyReport(env, authResult.tenant.id);

      return new Response(JSON.stringify({
        success: true,
        report,
        tenant_name: authResult.tenant.name || authResult.tenant.company_name
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Weekly report preview error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur generation recap' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // POST /api/v1/reports/weekly/send — Envoie par email
  // ========================================
  if (path === '/api/v1/reports/weekly/send' && method === 'POST') {
    try {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const tenantName = authResult.tenant.name || authResult.tenant.company_name || 'Coccinelle.ai';
      const report = await generateWeeklyReport(env, authResult.tenant.id);
      const sent = await sendWeeklyEmail(env, authResult.user.email, report, tenantName);

      return new Response(JSON.stringify({
        success: sent,
        message: sent ? 'Recap envoye par email' : 'Erreur envoi email'
      }), {
        status: sent ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Weekly report send error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur envoi recap' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // POST /api/v1/reports/weekly/cron — Cron Trigger (protege par CRON_SECRET)
  // ========================================
  if (path === '/api/v1/reports/weekly/cron' && method === 'POST') {
    try {
      // Verifier CRON_SECRET
      const cronSecret = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
      if (!cronSecret || cronSecret !== env.CRON_SECRET) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Recuperer tous les tenants avec des users qui ont weekly_report_enabled = 1
      const users = await env.DB.prepare(`
        SELECT u.email, u.name, u.tenant_id, t.name as tenant_name, t.company_name
        FROM users u
        JOIN tenants t ON u.tenant_id = t.id
        WHERE u.weekly_report_enabled = 1
          AND u.is_active = 1
          AND u.role = 'admin'
      `).all();

      let sent = 0;
      let errors = 0;

      for (const user of (users?.results || [])) {
        try {
          const report = await generateWeeklyReport(env, user.tenant_id);
          const tenantName = user.tenant_name || user.company_name || 'Coccinelle.ai';
          const ok = await sendWeeklyEmail(env, user.email, report, tenantName);
          if (ok) sent++;
          else errors++;
        } catch (e) {
          errors++;
          logger.error('Cron weekly report error for user', { email: user.email, error: e.message });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        sent,
        errors,
        total: users?.results?.length || 0
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      logger.error('Weekly report cron error', { error: error.message });
      return new Response(JSON.stringify({ success: false, error: 'Erreur cron recap' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return null;
}
