// Module Communication Proactive Coccinelle.ai
// Declenche SMS ou appel vocal selon l'heure et le trigger metier
// Auth : X-VoixIA-Key pour trigger externe, JWT pour dashboard

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { logAudit } from '../auth/helpers.js';
import { requireVoixIAAuth } from '../voixia/auth.js';
import { requireAuth } from '../auth/helpers.js';

/**
 * Handler principal pour les routes /api/v1/proactive/*
 */
export async function handleProactiveRoutes(request, env, path, method, corsHeaders) {
  try {
    // POST /api/v1/proactive/trigger — declenchement externe (auth VoixIA)
    if (path === '/api/v1/proactive/trigger' && method === 'POST') {
      return await handleProactiveTrigger(request, env, corsHeaders);
    }

    // Routes dashboard (auth JWT)
    if (path === '/api/v1/proactive/logs' && method === 'GET') {
      return await handleProactiveLogs(request, env, corsHeaders);
    }

    if (path === '/api/v1/proactive/templates' && method === 'GET') {
      return await handleProactiveTemplates(request, env, corsHeaders);
    }

    if (path === '/api/v1/proactive/settings' && method === 'GET') {
      return await handleProactiveSettings(request, env, corsHeaders);
    }

    if (path === '/api/v1/proactive/settings' && method === 'PUT') {
      return await handleUpdateProactiveSettings(request, env, corsHeaders);
    }

    return null;

  } catch (error) {
    logger.error('Proactive route error', { error: error.message, path, method });
    return errorResponse('Erreur interne proactive', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/proactive/trigger — Declenchement notification proactive
// Auth : X-VoixIA-Key (appele par logiciel metier ou API externe)
// ═══════════════════════════════════════════════════════════════

async function handleProactiveTrigger(request, env, corsHeaders) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse('Body JSON requis', 400);
  }

  const { client_phone, client_name, trigger_type, sector, dossier_data } = body;

  if (!client_phone || !trigger_type) {
    return errorResponse('client_phone et trigger_type requis', 400);
  }

  // 1. Verifier settings tenant
  const settings = await env.DB.prepare(`
    SELECT * FROM proactive_settings WHERE tenant_id = ? AND is_active = 1
  `).bind(tenant_id).first();

  if (!settings) {
    return errorResponse('Notifications proactives desactivees', 403);
  }

  // 2. Recuperer le template
  const template = await env.DB.prepare(`
    SELECT * FROM proactive_templates
    WHERE tenant_id = ? AND sector = ? AND trigger_type = ? AND is_active = 1
  `).bind(tenant_id, sector || 'generic', trigger_type).first();

  if (!template) {
    return errorResponse('Template non trouve pour ce secteur et trigger', 404);
  }

  // 3. Recuperer infos tenant
  const tenant = await env.DB.prepare(`
    SELECT name, phone FROM tenants WHERE id = ?
  `).bind(tenant_id).first();

  // 4. Resoudre les variables du template
  const resolveVars = (text) => text
    .replace(/\{client_name\}/g, client_name || 'Cher client')
    .replace(/\{company_name\}/g, tenant?.name || 'notre equipe')
    .replace(/\{company_phone\}/g, tenant?.phone || '')
    .replace(/\{trigger_type\}/g, trigger_type);

  // 5. Decider canal selon heure (Paris)
  const heureParis = new Date().toLocaleString('fr-FR', {
    timeZone: 'Europe/Paris', hour: 'numeric', hour12: false
  });
  const heure = parseInt(heureParis);
  const channel = settings.preferred_channel === 'auto'
    ? 'sms'
    : settings.preferred_channel;

  // 6. Envoyer SMS via Twilio
  let result = { success: false };
  const message = resolveVars(template.message_sms);

  if (channel === 'sms') {
    try {
      const twilioAuth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${twilioAuth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: env.TWILIO_PHONE_NUMBER,
            To: client_phone,
            Body: message
          })
        }
      );
      const data = await resp.json();
      result = {
        success: resp.ok,
        channel: 'sms',
        message_sid: data.sid
      };
    } catch (error) {
      logger.error('Proactive SMS error', { error: error.message });
      result = { success: false, channel: 'sms', error: error.message };
    }
  }

  // 7. Logger dans D1
  await env.DB.prepare(`
    INSERT INTO proactive_logs
    (tenant_id, client_phone, client_name, trigger_type, sector, channel, status, message_sent, result, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    tenant_id,
    client_phone,
    client_name || null,
    trigger_type,
    sector || 'generic',
    channel,
    result.success ? 'sent' : 'failed',
    message,
    JSON.stringify(result)
  ).run();

  await logAudit(env, {
    tenant_id,
    user_id: 'proactive-system',
    action: 'proactive.trigger',
    resource_type: 'notification',
    changes: { client_phone, trigger_type, channel, success: result.success }
  });

  return successResponse({
    success: result.success,
    channel,
    message_sent: message,
    result
  });
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/proactive/logs — Historique des notifications (auth JWT)
// ═══════════════════════════════════════════════════════════════

async function handleProactiveLogs(request, env, corsHeaders) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const tenantId = authResult.tenant.id;

  const logs = await env.DB.prepare(`
    SELECT * FROM proactive_logs WHERE tenant_id = ? ORDER BY sent_at DESC LIMIT 50
  `).bind(tenantId).all();

  return Response.json({
    success: true,
    logs: logs.results || []
  }, { headers: corsHeaders });
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/proactive/templates — Templates du tenant (auth JWT)
// ═══════════════════════════════════════════════════════════════

async function handleProactiveTemplates(request, env, corsHeaders) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const tenantId = authResult.tenant.id;

  const templates = await env.DB.prepare(`
    SELECT * FROM proactive_templates WHERE tenant_id = ? AND is_active = 1 ORDER BY sector, trigger_type
  `).bind(tenantId).all();

  return Response.json({
    success: true,
    templates: templates.results || []
  }, { headers: corsHeaders });
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/proactive/settings — Settings du tenant (auth JWT)
// ═══════════════════════════════════════════════════════════════

async function handleProactiveSettings(request, env, corsHeaders) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const tenantId = authResult.tenant.id;

  const settings = await env.DB.prepare(`
    SELECT * FROM proactive_settings WHERE tenant_id = ?
  `).bind(tenantId).first();

  return Response.json({
    success: true,
    settings: settings || {
      is_active: 0,
      hours_start: 8,
      hours_end: 19,
      preferred_channel: 'auto'
    }
  }, { headers: corsHeaders });
}

// ═══════════════════════════════════════════════════════════════
// PUT /api/v1/proactive/settings — Mettre a jour settings (auth JWT)
// ═══════════════════════════════════════════════════════════════

async function handleUpdateProactiveSettings(request, env, corsHeaders) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const tenantId = authResult.tenant.id;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Body JSON requis' }, { status: 400, headers: corsHeaders });
  }

  const { is_active, hours_start, hours_end, preferred_channel } = body;

  await env.DB.prepare(`
    INSERT INTO proactive_settings (tenant_id, is_active, hours_start, hours_end, preferred_channel)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(tenant_id) DO UPDATE SET
    is_active = excluded.is_active,
    hours_start = excluded.hours_start,
    hours_end = excluded.hours_end,
    preferred_channel = excluded.preferred_channel
  `).bind(
    tenantId,
    is_active ?? 1,
    hours_start ?? 8,
    hours_end ?? 19,
    preferred_channel ?? 'auto'
  ).run();

  return Response.json({ success: true }, { headers: corsHeaders });
}
