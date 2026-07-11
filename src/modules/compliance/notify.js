// src/modules/compliance/notify.js
// ============================================================================
// Notification email au changement de statut d'un bundle de conformité.
// Envoi via Resend, brandé VoixIA, au compte revendeur (tenant parent).
// ----------------------------------------------------------------------------
// Déclenché par refreshBundleStatus() (cron quotidien + refresh manuel) quand
// un bundle passe à 'approved' ou 'rejected'. Best-effort : ne jamais bloquer
// la réconciliation (les erreurs d'envoi sont loguées, pas propagées).
//
// From : env.VOIXIA_FROM_EMAIL sinon défaut @voixia.io. ⚠️ voixia.io doit être
// un domaine vérifié dans Resend (DKIM/SPF) pour une bonne délivrabilité.
// ============================================================================

import { logger } from '../../utils/logger.js';

const PORTAL_URL = 'https://voixia.io';
const DEFAULT_FROM = 'VoixIA <notifications@voixia.io>';

// Résout le destinataire (email du revendeur parent) + les libellés, puis
// envoie l'email correspondant au statut. Retourne true si un email est parti.
export async function notifyBundleStatus(env, agentId, status) {
  if (status !== 'approved' && status !== 'rejected') return false;
  if (!env.RESEND_API_KEY) {
    logger.warn('Bundle notify skipped: RESEND_API_KEY manquant', { agentId });
    return false;
  }

  // Agent (tenant enfant) + dossier de conformité.
  const agent = await env.DB.prepare(`
    SELECT t.name AS agent_name, t.parent_tenant_id,
           c.company_name, c.rejection_reason
    FROM tenants t
    LEFT JOIN client_compliance c ON c.tenant_id = t.id
    WHERE t.id = ?
  `).bind(agentId).first();
  if (!agent || !agent.parent_tenant_id) {
    logger.warn('Bundle notify skipped: agent/parent introuvable', { agentId });
    return false;
  }

  // Email du revendeur : on privilégie l'utilisateur admin réel, fallback tenants.email.
  const owner = await env.DB.prepare(
    "SELECT email, name FROM users WHERE tenant_id = ? ORDER BY CASE WHEN role='admin' THEN 0 ELSE 1 END, created_at ASC LIMIT 1"
  ).bind(agent.parent_tenant_id).first();
  const parent = await env.DB.prepare('SELECT name, email FROM tenants WHERE id = ?')
    .bind(agent.parent_tenant_id).first();
  const toEmail = owner?.email || parent?.email;
  if (!toEmail) {
    logger.warn('Bundle notify skipped: email revendeur introuvable', { agentId, parent: agent.parent_tenant_id });
    return false;
  }

  const companyName = agent.company_name || agent.agent_name || 'votre client';
  const resellerName = owner?.name || parent?.name || '';
  const { subject, html, text } = status === 'approved'
    ? approvedTemplate(companyName, resellerName)
    : rejectedTemplate(companyName, resellerName, agent.rejection_reason);

  const from = env.VOIXIA_FROM_EMAIL || DEFAULT_FROM;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        reply_to: 'contact@voixia.io',
        subject,
        html,
        text,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      logger.warn('Bundle notify email failed', { agentId, status, httpStatus: res.status, message: d?.message });
      return false;
    }
    logger.info('Bundle notify email sent', { agentId, status, to: toEmail });
    return true;
  } catch (e) {
    logger.warn('Bundle notify email error', { agentId, status, error: e.message });
    return false;
  }
}

// --- Templates (HTML inline, mobile-first, brandé VoixIA) --------------------

function shell(title, bodyHtml) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#0b1220;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="padding:22px 28px;border-bottom:1px solid #eef1f5;">
      <span style="font-size:19px;font-weight:800;letter-spacing:-0.02em;color:#0b1220;">Voix<span style="color:#4f46e5;">IA</span></span>
    </div>
    <div style="padding:28px;color:#1f2937;font-size:15px;line-height:1.6;">
      ${bodyHtml}
    </div>
    <div style="padding:18px 28px;border-top:1px solid #eef1f5;color:#9ca3af;font-size:12px;line-height:1.5;">
      VoixIA — agents vocaux IA souverains, hébergés en Union Européenne.<br>
      Vous recevez cet email en tant que gestionnaire de compte. Répondez à contact@voixia.io.
    </div>
  </div>
</body></html>`;
}

function button(href, label) {
  return `<a href="${href}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">${label}</a>`;
}

function approvedTemplate(companyName, resellerName) {
  const hi = resellerName ? `Bonjour ${escapeHtml(resellerName)},` : 'Bonjour,';
  const subject = `Votre dossier ${companyName} est validé ✅`;
  const html = shell(subject, `
    <p style="margin:0 0 14px;">${hi}</p>
    <p style="margin:0 0 14px;">Bonne nouvelle : le dossier de conformité de
      <strong>${escapeHtml(companyName)}</strong> a été <strong style="color:#16a34a;">approuvé</strong>.</p>
    <p style="margin:0 0 22px;">Vous pouvez dès maintenant <strong>attribuer un numéro</strong> à cet agent.</p>
    <p style="margin:0 0 8px;">${button(`${PORTAL_URL}/numbers`, 'Attribuer un numéro')}</p>
  `);
  const text = `${hi}\n\nLe dossier de conformité de ${companyName} a été approuvé. Vous pouvez désormais attribuer un numéro à cet agent : ${PORTAL_URL}/numbers\n\n— VoixIA`;
  return { subject, html, text };
}

function rejectedTemplate(companyName, resellerName, reason) {
  const hi = resellerName ? `Bonjour ${escapeHtml(resellerName)},` : 'Bonjour,';
  const subject = `Action requise — dossier ${companyName}`;
  const motif = reason
    ? `<p style="margin:0 0 14px;padding:12px 14px;background:#fef2f2;border-radius:10px;color:#b91c1c;">Motif : ${escapeHtml(reason)}</p>`
    : '';
  const html = shell(subject, `
    <p style="margin:0 0 14px;">${hi}</p>
    <p style="margin:0 0 14px;">Le dossier de conformité de
      <strong>${escapeHtml(companyName)}</strong> n'a pas pu être validé en l'état.</p>
    ${motif}
    <p style="margin:0 0 22px;">Corrigez les informations ou pièces concernées, puis relancez la vérification.</p>
    <p style="margin:0 0 8px;">${button(`${PORTAL_URL}/compliance`, 'Corriger le dossier')}</p>
  `);
  const text = `${hi}\n\nLe dossier de conformité de ${companyName} n'a pas pu être validé.${reason ? `\nMotif : ${reason}` : ''}\n\nCorrigez puis relancez la vérification : ${PORTAL_URL}/compliance\n\n— VoixIA`;
  return { subject, html, text };
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
