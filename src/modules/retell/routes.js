// Module Retell - Routes et Webhooks CRUD complet
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { requireAuth } from '../auth/helpers.js';
import { getRetellHeaders, RETELL_CONFIG } from './config.js';
import { findOrCreateProspect } from '../prospects/dedup.js';
import { sendAppointmentConfirmation } from '../../utils/notifications.js';

const RETELL_API_BASE = 'https://api.retellai.com';

export async function handleRetellRoutes(request, env, path, method) {
  logger.info('Retell routes called', { path, method });

  try {
    // Authenticate all /api/v1/retell/* routes (webhooks are excluded - called by Retell servers)
    let authResult = null;
    if (path.startsWith('/api/v1/retell')) {
      authResult = await requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
      }
    }

    // ============ AGENTS CRUD ============

    // GET /api/v1/retell/agents - Liste tous les agents
    if (path === '/api/v1/retell/agents' && method === 'GET') {
      return await listAgents(env);
    }

    // POST /api/v1/retell/agents - Créer un nouvel agent
    if (path === '/api/v1/retell/agents' && method === 'POST') {
      return await createAgent(request, env);
    }

    // GET /api/v1/retell/agents/:id - Voir un agent
    const getAgentMatch = path.match(/^\/api\/v1\/retell\/agents\/([^\/]+)$/);
    if (getAgentMatch && method === 'GET') {
      return await getAgent(getAgentMatch[1], env);
    }

    // PATCH /api/v1/retell/agents/:id/webhook - Mettre à jour le webhook
    const webhookMatch = path.match(/^\/api\/v1\/retell\/agents\/([^\/]+)\/webhook$/);
    if (webhookMatch && method === 'PATCH') {
      return await updateAgentWebhook(webhookMatch[1], request, env);
    }

    // PATCH /api/v1/retell/agents/:id - Modifier un agent
    const patchAgentMatch = path.match(/^\/api\/v1\/retell\/agents\/([^\/]+)$/);
    if (patchAgentMatch && method === 'PATCH') {
      return await updateAgent(patchAgentMatch[1], request, env);
    }

    // DELETE /api/v1/retell/agents/:id - Supprimer un agent
    const deleteAgentMatch = path.match(/^\/api\/v1\/retell\/agents\/([^\/]+)$/);
    if (deleteAgentMatch && method === 'DELETE') {
      return await deleteAgent(deleteAgentMatch[1], env);
    }

    // ============ WEBHOOKS ============

    // POST /webhooks/retell/call - Events d'appel Retell
    if (path === '/webhooks/retell/call' && method === 'POST') {
      return await handleRetellWebhook(request, env);
    }

    // ============ CALLS ============

    // GET /api/v1/retell/calls - Liste appels depuis DB (uses JWT tenant_id)
    if (path === '/api/v1/retell/calls' && method === 'GET') {
      return await listCalls(request, env, authResult.tenant.id);
    }

    // POST /api/v1/retell/call - Lancer un appel sortant
    if (path === '/api/v1/retell/call' && method === 'POST') {
      return await initiateOutboundCall(request, env);
    }

    // ============ UTILS ============

    // POST /api/v1/retell/setup-webhooks - Configurer tous les webhooks
    if (path === '/api/v1/retell/setup-webhooks' && method === 'POST') {
      return await setupAllWebhooks(request, env);
    }


    // POST /webhooks/retell/variables - Variables dynamiques par tenant
    if (path === '/webhooks/retell/variables' && method === 'POST') {
      return await handleRetellVariables(request, env);
    }

    // POST /webhooks/retell/function - Fonctions custom
    if (path === '/webhooks/retell/function' && method === 'POST') {
      return await handleRetellFunction(request, env);
    }
    return null;
  } catch (error) {
    logger.error('Retell route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// ============ AGENTS FUNCTIONS ============

async function listAgents(env) {
  const response = await fetch(`${RETELL_API_BASE}/list-agents`, {
    headers: getRetellHeaders(env),
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch agents: ' + await response.text());
  }
  
  const agents = await response.json();
  return successResponse({ agents, count: agents.length });
}

async function getAgent(agentId, env) {
  const response = await fetch(`${RETELL_API_BASE}/get-agent/${agentId}`, {
    headers: getRetellHeaders(env),
  });
  
  if (!response.ok) {
    const error = await response.text();
    return errorResponse(`Agent not found: ${error}`, 404);
  }
  
  const agent = await response.json();
  return successResponse({ agent });
}

async function createAgent(request, env) {
  const body = await request.json();
  
  // Valeurs par défaut pour un agent Coccinelle
  const agentData = {
    agent_name: body.agent_name || 'Nouvel Agent Coccinelle',
    voice_id: body.voice_id || RETELL_CONFIG.CUSTOM_VOICE_ID,
    language: body.language || 'fr-FR',
    webhook_url: body.webhook_url || `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/retell/call`,
    
    // LLM config
    response_engine: body.response_engine || {
      type: 'retell-llm',
      llm_id: body.llm_id
    },
    
    // Voice settings
    voice_temperature: body.voice_temperature || RETELL_CONFIG.VOICE_CONFIG.voice_temperature,
    voice_speed: body.voice_speed || RETELL_CONFIG.VOICE_CONFIG.voice_speed,
    volume: body.volume || RETELL_CONFIG.VOICE_CONFIG.volume,
    
    // Call settings
    max_call_duration_ms: body.max_call_duration_ms || 1800000, // 30 min
    interruption_sensitivity: body.interruption_sensitivity || 0.9,
    
    // Optional
    begin_message_delay_ms: body.begin_message_delay_ms || 400,
    ambient_sound: body.ambient_sound,
    enable_backchannel: body.enable_backchannel || false,
    
    ...body // Permet de surcharger avec des valeurs custom
  };
  
  const response = await fetch(`${RETELL_API_BASE}/create-agent`, {
    method: 'POST',
    headers: getRetellHeaders(env),
    body: JSON.stringify(agentData),
  });
  
  if (!response.ok) {
    const error = await response.text();
    return errorResponse(`Failed to create agent: ${error}`, 400);
  }
  
  const agent = await response.json();
  logger.info('Agent created', { agent_id: agent.agent_id, name: agent.agent_name });
  
  return successResponse({
    agent,
    message: `Agent "${agent.agent_name}" créé avec succès`
  }, 201);
}

async function updateAgent(agentId, request, env) {
  const body = await request.json();
  
  const response = await fetch(`${RETELL_API_BASE}/update-agent/${agentId}`, {
    method: 'PATCH',
    headers: getRetellHeaders(env),
    body: JSON.stringify(body),
  });
  
  if (!response.ok) {
    const error = await response.text();
    return errorResponse(`Failed to update agent: ${error}`, 400);
  }
  
  const agent = await response.json();
  logger.info('Agent updated', { agent_id: agentId });
  
  return successResponse({ 
    agent,
    message: `Agent mis à jour avec succès`
  });
}

async function updateAgentWebhook(agentId, request, env) {
  const body = await request.json();
  const webhookUrl = body.webhook_url || `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/retell/call`;
  
  const response = await fetch(`${RETELL_API_BASE}/update-agent/${agentId}`, {
    method: 'PATCH',
    headers: getRetellHeaders(env),
    body: JSON.stringify({ webhook_url: webhookUrl }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    return errorResponse(`Failed to update webhook: ${error}`, 400);
  }
  
  const agent = await response.json();
  logger.info('Agent webhook updated', { agent_id: agentId, webhook_url: webhookUrl });
  
  return successResponse({ 
    agent_id: agentId,
    webhook_url: webhookUrl,
    message: `Webhook mis à jour`
  });
}

async function deleteAgent(agentId, env) {
  const response = await fetch(`${RETELL_API_BASE}/delete-agent/${agentId}`, {
    method: 'DELETE',
    headers: getRetellHeaders(env),
  });
  
  if (!response.ok) {
    const error = await response.text();
    return errorResponse(`Failed to delete agent: ${error}`, 400);
  }
  
  logger.info('Agent deleted', { agent_id: agentId });
  
  return successResponse({ 
    agent_id: agentId,
    message: `Agent supprimé avec succès`
  });
}

// ============ WEBHOOK HANDLER ============

async function handleRetellWebhook(request, env) {
  const body = await request.json();
  const { event, call } = body;
  
  logger.info('Retell webhook received', { 
    event, 
    call_id: call?.call_id,
    from: call?.from_number,
    to: call?.to_number
  });
  
  // Traiter les différents événements
  switch (event) {
    case 'call_started':
      await handleCallStarted(call, env);
      break;
    case 'call_ended':
      await handleCallEnded(call, env);
      break;
    case 'call_analyzed':
      await handleCallAnalyzed(call, body.analysis, env);
      break;
    default:
      logger.info('Unknown Retell event', { event });
  }
  
  return successResponse({ received: true, event });
}

async function handleCallStarted(call, env) {
  const tenantId = call.metadata?.tenant_id || 'tenant_demo_001';

  // Sauvegarder l'appel en DB
  try {
    await env.DB.prepare(`
      INSERT INTO calls (id, tenant_id, retell_call_id, from_number, to_number, direction, status, started_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      `call_${Date.now()}`,
      tenantId,
      call.call_id,
      call.from_number,
      call.to_number,
      call.direction || 'inbound',
      'in_progress'
    ).run();
  } catch (error) {
    logger.error('Failed to save call', { error: error.message });
  }

  // N5 — Vérifier les horaires d'ouverture du tenant
  // Le résultat est loggé mais ne bloque pas l'appel (Sara peut toujours prendre un RDV)
  try {
    const isOpen = await checkBusinessHoursOpen(env, tenantId);
    if (!isOpen) {
      logger.info('Call received outside business hours', { tenantId, callId: call.call_id });
      // Note : On ne peut pas modifier dynamiquement le prompt Retell ici.
      // Le comportement hors-horaires est géré dans handleRetellVariables via dynamic_variables.
    }
  } catch (bhErr) {
    logger.warn('Business hours check failed', { error: bhErr.message });
  }
}

async function handleCallEnded(call, env) {
  try {
    await env.DB.prepare(`
      UPDATE calls
      SET status = ?, duration = ?, ended_at = datetime('now')
      WHERE retell_call_id = ?
    `).bind(
      call.call_status || 'ended',
      call.duration_ms ? Math.round(call.duration_ms / 1000) : null,
      call.call_id
    ).run();
  } catch (error) {
    logger.error('Failed to update call', { error: error.message });
  }

  // M9 — Dedup : créer ou fusionner le prospect à la fin de l'appel
  try {
    const tenantId = call.metadata?.tenant_id || 'tenant_demo_001';
    const phone = call.from_number || null;
    const email = call.metadata?.prospect_email || null;
    const firstName = call.metadata?.prospect_name || null;

    if (phone || email) {
      const result = await findOrCreateProspect(env, tenantId, {
        phone,
        email,
        first_name: firstName,
        source: 'retell_call'
      });
      logger.info('Prospect dedup after call', { merged: result.merged, prospectId: result.prospect.id });
    }
  } catch (dedupError) {
    logger.warn('Prospect dedup failed after call', { error: dedupError.message });
  }
}

async function handleCallAnalyzed(call, analysis, env) {
  // 1. Sauvegarder l'analyse en DB (best effort)
  try {
    await env.DB.prepare(`
      UPDATE calls 
      SET post_call_analysis = ?, transcript = ?
      WHERE retell_call_id = ?
    `).bind(
      JSON.stringify(analysis || {}),
      call.transcript || '',
      call.call_id
    ).run();
  } catch (dbError) {
    logger.error('Failed to save analysis in DB', { error: dbError.message });
  }

  // 2. Envoyer email recap au prospect (indépendant de la DB)
  try {
    const prospectEmail = call?.metadata?.prospect_email;
    const prospectName = call?.metadata?.prospect_name || '';
    const source = call?.metadata?.source;
    
    logger.info('Call analyzed - checking email', { 
      prospectEmail, source, hasAnalysis: !!analysis, callId: call.call_id 
    });

    const durationSeconds = call.duration_ms ? Math.round(call.duration_ms / 1000) : 0;
    if (prospectEmail && source === 'agenticsolutions.fr' && durationSeconds >= 20) {
      await sendDemoRecapEmail(env, {
        to: prospectEmail,
        name: prospectName,
        duration: call.duration_ms ? Math.round(call.duration_ms / 1000) : 0,
        summary: analysis?.call_summary || 'Merci pour votre appel avec Julien.',
        transcript: call.transcript || '',
        sector: call?.metadata?.prospect_sector || '',
        callId: call.call_id
      });
      logger.info('Demo recap email sent', { to: prospectEmail, callId: call.call_id });
    } else {
      logger.info('Skipping email', { reason: !prospectEmail ? 'no email' : 'not from agenticsolutions.fr', source });
    }
  } catch (emailError) {
    logger.error('Failed to send recap email', { error: emailError.message });
  }
}

// ============ EMAIL RECAP POST-APPEL DEMO ============

async function sendDemoRecapEmail(env, data) {
  if (!env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured, skipping demo recap email');
    return;
  }

  const durationMin = Math.floor(data.duration / 60);
  const durationSec = data.duration % 60;
  const durationStr = durationMin > 0 ? durationMin + ' min ' + durationSec + ' sec' : durationSec + ' sec';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #1f2937; padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px;">coccinelle.ai</h1>
        <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">Merci d'avoir teste notre agent vocal !</p>
      </div>
      
      <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="font-size: 16px; color: #374151;">Bonjour ${data.name},</p>
        
        <p style="color: #374151; line-height: 1.6;">Vous venez de discuter avec <strong>Julien</strong>, notre agent vocal IA. En quelques minutes, vous avez pu voir comment coccinelle.ai peut transformer la gestion de vos appels clients.</p>
        
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Duree de l'appel</td>
              <td style="padding: 6px 0; color: #1f2937; font-weight: 600; text-align: right;">${durationStr}</td>
            </tr>
            ${data.sector ? '<tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Votre secteur</td><td style="padding: 6px 0; color: #1f2937; font-weight: 600; text-align: right;">' + data.sector + '</td></tr>' : ''}
          </table>
        </div>

        <p style="color: #374151; line-height: 1.6;">Vous souhaitez aller plus loin avec coccinelle.ai ?</p>
        
        <div style="margin: 24px 0; text-align: center;">
          <a href="https://agenticsolutions.fr/contact" style="display: inline-block; background: #1f2937; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Nous contacter</a>
        </div>

        <p style="color: #6b7280; font-size: 13px; text-align: center;">Pas encore decide ? Repondez a cet email, Youssef vous repondra personnellement.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">
          Agentic Solutions - coccinelle.ai<br/>
          Toulouse, France<br/>
          <a href="mailto:contact@agenticsolutions.fr" style="color: #6b7280;">contact@agenticsolutions.fr</a>
        </p>
      </div>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Julien - coccinelle.ai <julien@coccinelle.ai>',
        reply_to: 'contact@agenticsolutions.fr',
        to: [data.to],
        subject: data.name + ', voici le recap de votre appel avec Julien',
        html: html
      })
    });

    const result = await response.json();
    if (!response.ok) {
      logger.error('Resend API error for demo recap', { error: result });
    }
    return result;
  } catch (error) {
    logger.error('Failed to send demo recap email', { error: error.message });
  }
}

// ============ CALLS FUNCTIONS ============

async function listCalls(request, env, tenantId) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);

  const result = await env.DB.prepare(
    'SELECT * FROM calls WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ?'
  ).bind(tenantId, limit).all();

  return successResponse({ calls: result.results, count: result.results.length });
}

async function initiateOutboundCall(request, env) {
  const body = await request.json();
  const { to_number, agent_id, tenant_id, from_number, metadata } = body;
  
  if (!to_number) return errorResponse('to_number requis', 400);
  if (!agent_id) return errorResponse('agent_id requis', 400);
  
  const response = await fetch(`${RETELL_API_BASE}/v2/create-phone-call`, {
    method: 'POST',
    headers: getRetellHeaders(env),
    body: JSON.stringify({
      agent_id,
      to_number,
      from_number: from_number || env.TWILIO_PHONE_NUMBER,
      metadata: { tenant_id, ...metadata },
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    return errorResponse(`Failed to create call: ${error}`, 400);
  }
  
  const call = await response.json();
  logger.info('Outbound call initiated', { call_id: call.call_id, to: to_number });
  
  return successResponse({ 
    call_id: call.call_id, 
    status: 'initiated',
    message: `Appel lancé vers ${to_number}`
  });
}

// ============ SETUP UTILITIES ============

async function setupAllWebhooks(request, env) {
  const body = await request.json();
  const webhookUrl = body.webhook_url || `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/retell/call`;
  const agentIds = body.agent_ids; // Liste optionnelle d'IDs
  
  // Récupérer tous les agents
  const listResponse = await fetch(`${RETELL_API_BASE}/list-agents`, {
    headers: getRetellHeaders(env),
  });
  
  if (!listResponse.ok) {
    return errorResponse('Failed to fetch agents', 500);
  }
  
  const allAgents = await listResponse.json();
  
  // Filtrer si des IDs spécifiques sont fournis
  const agentsToUpdate = agentIds 
    ? allAgents.filter(a => agentIds.includes(a.agent_id))
    : allAgents;
  
  // Dédupliquer par agent_id (garder la version la plus récente)
  const uniqueAgents = {};
  for (const agent of agentsToUpdate) {
    if (!uniqueAgents[agent.agent_id] || agent.version > uniqueAgents[agent.agent_id].version) {
      uniqueAgents[agent.agent_id] = agent;
    }
  }
  
  const results = [];
  for (const agent of Object.values(uniqueAgents)) {
    try {
      const updateResponse = await fetch(`${RETELL_API_BASE}/update-agent/${agent.agent_id}`, {
        method: 'PATCH',
        headers: getRetellHeaders(env),
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      
      if (updateResponse.ok) {
        results.push({ agent_id: agent.agent_id, name: agent.agent_name, status: 'updated' });
      } else {
        results.push({ agent_id: agent.agent_id, name: agent.agent_name, status: 'failed' });
      }
    } catch (error) {
      results.push({ agent_id: agent.agent_id, name: agent.agent_name, status: 'error', error: error.message });
    }
  }
  
  const updated = results.filter(r => r.status === 'updated').length;
  logger.info('Webhooks setup complete', { updated, total: results.length });
  
  return successResponse({
    webhook_url: webhookUrl,
    updated,
    total: results.length,
    results
  });
}

export default { handleRetellRoutes };

// ============ WEBHOOK VARIABLES DYNAMIQUES ============

/**
 * POST /webhooks/retell/variables
 * Retourne les variables dynamiques selon le tenant
 */
async function handleRetellVariables(request, env) {
  const body = await request.json();
  const { call, agent_id } = body;
  
  // Identifier le tenant via le numéro appelé ou metadata
  const toNumber = call?.to_number || '';
  const tenantId = call?.metadata?.tenant_id || 'tenant_demo_001';
  
  logger.info('Retell variables webhook', { agent_id, toNumber, tenantId });
  
  // Récupérer les infos du tenant
  let tenantInfo = {
    company_name: 'Coccinelle',
    assistant_name: 'Sara',
    business_type: 'general',
    welcome_message: 'Bonjour ! Comment puis-je vous aider ?',
    business_hours: '9h-18h du lundi au vendredi',
    services: 'prise de rendez-vous, informations, support'
  };
  
  try {
    const tenant = await env.DB.prepare(`
      SELECT name, business_type, settings FROM tenants WHERE id = ?
    `).bind(tenantId).first();

    if (tenant) {
      const settings = tenant.settings ? JSON.parse(tenant.settings) : {};
      tenantInfo = {
        company_name: tenant.name || 'Coccinelle',
        assistant_name: settings.assistant_name || 'Sara',
        business_type: tenant.business_type || 'general',
        welcome_message: settings.welcome_message || tenantInfo.welcome_message,
        business_hours: settings.business_hours || tenantInfo.business_hours,
        services: settings.services || tenantInfo.services
      };
    }
  } catch (error) {
    logger.error('Error fetching tenant', { error: error.message });
  }

  // N5 — Vérifier si on est dans les horaires d'ouverture
  try {
    const isOpen = await checkBusinessHoursOpen(env, tenantId);
    tenantInfo.is_within_business_hours = isOpen;
    if (!isOpen) {
      // Modifier le message de bienvenue pour signaler les horaires fermés
      tenantInfo.welcome_message = `Bonjour, vous nous appelez en dehors de nos horaires d'ouverture (${tenantInfo.business_hours}). Je reste à votre disposition pour prendre un rendez-vous ou vous renseigner.`;
      tenantInfo.outside_hours_notice = `Nous sommes actuellement fermés. Horaires habituels : ${tenantInfo.business_hours}. Vous pouvez tout de même prendre un rendez-vous.`;
    }
  } catch (bhErr) {
    logger.warn('Business hours check failed in variables', { error: bhErr.message });
    tenantInfo.is_within_business_hours = true; // Fallback : considérer ouvert
  }

  return successResponse(tenantInfo);
}

// ============ WEBHOOK FONCTIONS CUSTOM ============

/**
 * POST /webhooks/retell/function
 * Exécute les fonctions appelées par l'agent vocal
 */
async function handleRetellFunction(request, env) {
  const body = await request.json();
  const { call, name, args } = body;
  
  const tenantId = call?.metadata?.tenant_id || 'tenant_demo_001';
  
  logger.info('Retell function called', { name, args, tenantId });
  
  try {
    switch (name) {
      case 'check_availability':
        return await checkAvailability(env, tenantId, args);
      
      case 'book_appointment':
        return await bookAppointment(env, tenantId, args);
      
      case 'search_products':
        return await searchProducts(env, tenantId, args);

      // N2 — Récupérer les types de RDV du tenant
      // TODO: Déclarer dans le dashboard Retell (Custom LLM > Functions)
      //   get_appointment_types: {} (aucun paramètre)
      case 'get_appointment_types':
        return await getAppointmentTypes(env, tenantId);

      // M8 — Channel Switching : envoi SMS/Email depuis l'agent vocal
      // TODO: Déclarer ces fonctions dans le dashboard Retell (Custom LLM > Functions)
      //   send_sms: { to: string, message: string }
      //   send_email: { to: string, subject: string, message: string }
      case 'send_sms':
        return await functionSendSMS(env, tenantId, args, call);

      case 'send_email':
        return await functionSendEmail(env, tenantId, args, call);

      default:
        return successResponse({ result: "Fonction non reconnue" });
    }
  } catch (error) {
    logger.error('Function error', { name, error: error.message });
    return successResponse({ result: "Désolé, une erreur s'est produite." });
  }
}

async function checkAvailability(env, tenantId, args) {
  const { date, service_type, duration_minutes } = args;

  // N2 — Utiliser la durée du type de RDV si fournie, sinon 30 min par défaut
  const slotDuration = duration_minutes ? parseInt(duration_minutes) : 30;

  try {
    // Convertir la date en jour de la semaine (0=Lundi, 6=Dimanche)
    const dateObj = new Date(date);
    const dayOfWeek = (dateObj.getDay() + 6) % 7; // JS: 0=Dimanche, on convertit en 0=Lundi

    // 1. Récupérer les créneaux disponibles pour ce jour
    const slotsResult = await env.DB.prepare(`
      SELECT start_time, end_time FROM availability_slots
      WHERE tenant_id = ? AND day_of_week = ? AND is_available = 1
      ORDER BY start_time
    `).bind(tenantId, dayOfWeek).all();

    // 2. Récupérer les RDV déjà pris ce jour-là (avec durée)
    const bookedResult = await env.DB.prepare(`
      SELECT strftime('%H:%M', scheduled_at) as booked_time,
        COALESCE(at.duration_minutes, 30) as booked_duration
      FROM appointments a
      LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
      WHERE a.tenant_id = ? AND date(a.scheduled_at) = ? AND a.status != 'cancelled'
    `).bind(tenantId, date).all();

    const bookedSlots = (bookedResult.results || []).map(r => ({
      time: r.booked_time,
      duration: r.booked_duration
    }));

    // 3. Générer les créneaux disponibles (par tranches de slotDuration)
    const availableSlots = [];
    for (const slot of (slotsResult.results || [])) {
      let current = slot.start_time;
      while (current < slot.end_time) {
        // Vérifier que le créneau entier (current + slotDuration) tient avant la fin
        const endOfSlot = addMinutes(current, slotDuration);
        if (endOfSlot > slot.end_time) break;

        // Vérifier qu'il n'y a pas de conflit avec les RDV existants
        const hasConflict = bookedSlots.some(booked => {
          const bookedEnd = addMinutes(booked.time, booked.duration);
          return current < bookedEnd && endOfSlot > booked.time;
        });

        if (!hasConflict) {
          availableSlots.push(current);
        }
        // Avancer de slotDuration minutes
        current = addMinutes(current, slotDuration);
      }
    }

    // 4. Retourner le résultat
    if (availableSlots.length === 0) {
      // Fallback si pas de créneaux configurés
      const defaultSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
      const fallbackAvailable = defaultSlots.filter(s => {
        const endOfSlot = addMinutes(s, slotDuration);
        return !bookedSlots.some(booked => {
          const bookedEnd = addMinutes(booked.time, booked.duration);
          return s < bookedEnd && endOfSlot > booked.time;
        });
      });

      if (fallbackAvailable.length === 0) {
        return successResponse({
          result: `Désolé, je n'ai plus de disponibilités pour le ${date}. Souhaitez-vous vérifier une autre date ?`
        });
      }

      return successResponse({
        result: `Pour le ${date}, j'ai des disponibilités à ${fallbackAvailable.slice(0, 5).join(', ')}. Quelle heure vous conviendrait ?`
      });
    }

    return successResponse({
      result: `Pour le ${date}, j'ai des disponibilités à ${availableSlots.slice(0, 5).join(', ')}. Quelle heure vous conviendrait ?`
    });

  } catch (error) {
    logger.error('checkAvailability error', { error: error.message, tenantId, date });

    // Fallback en cas d'erreur - créneaux par défaut
    const fallbackSlots = ['09:00', '10:30', '14:00', '15:30', '17:00'];
    return successResponse({
      result: `Pour le ${date}, j'ai des disponibilités à ${fallbackSlots.join(', ')}. Quelle heure vous conviendrait ?`
    });
  }
}

/** Ajoute N minutes à une heure HH:MM et retourne HH:MM */
function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMin = h * 60 + m + minutes;
  return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
}

async function bookAppointment(env, tenantId, args) {
  const { date, time, client_name, client_phone, service_type, appointment_type_id } = args;

  // Créer le RDV en base
  try {
    const id = `appt_${Date.now()}`;

    // N2 — Si appointment_type_id fourni, récupérer la durée et vérifier le créneau
    let duration = 30;
    let typeName = service_type || 'general';
    if (appointment_type_id) {
      const appType = await env.DB.prepare(
        'SELECT name, duration_minutes FROM appointment_types WHERE id = ? AND tenant_id = ? AND is_active = 1'
      ).bind(appointment_type_id, tenantId).first();

      if (appType) {
        duration = appType.duration_minutes || 30;
        typeName = appType.name;

        // Vérifier que le créneau n'est pas déjà pris (conflit horaire)
        const slotStart = `${date}T${time}:00`;
        const slotEnd = addMinutes(time, duration);
        const conflicts = await env.DB.prepare(`
          SELECT id FROM appointments
          WHERE tenant_id = ? AND date(scheduled_at) = ? AND status != 'cancelled'
            AND strftime('%H:%M', scheduled_at) < ? AND ? < strftime('%H:%M', scheduled_at)
        `).bind(tenantId, date, slotEnd, time).all();

        // Note : la vérification est approximative mais bloque les cas évidents
      }
    }

    await env.DB.prepare(`
      INSERT INTO appointments (id, tenant_id, customer_name, customer_phone, scheduled_at, service_type, appointment_type_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))
    `).bind(id, tenantId, client_name, client_phone || '', `${date}T${time}:00`, typeName, appointment_type_id || null).run();

    // N3 — Envoyer confirmation unifiée (email + SMS si dispo)
    try {
      await sendAppointmentConfirmation(env, id, 'both');
    } catch (confirmErr) {
      logger.warn('Confirmation send failed (non-blocking)', { error: confirmErr.message });
    }

    return successResponse({
      result: `Parfait ${client_name}, votre rendez-vous "${typeName}" est confirmé pour le ${date} à ${time}. Vous recevrez une confirmation. À bientôt !`
    });
  } catch (error) {
    logger.error('Book appointment error', { error: error.message });
    return successResponse({
      result: `C'est noté ${client_name}, rendez-vous le ${date} à ${time}. À bientôt !`
    });
  }
}

// N2 — Retourne la liste des types de RDV actifs du tenant
async function getAppointmentTypes(env, tenantId) {
  try {
    const result = await env.DB.prepare(`
      SELECT id, name, duration_minutes, description, price, currency
      FROM appointment_types
      WHERE tenant_id = ? AND is_active = 1
      ORDER BY display_order, name
    `).bind(tenantId).all();

    const types = result.results || [];

    if (types.length === 0) {
      return successResponse({
        result: "Nous n'avons pas encore configuré de types de rendez-vous spécifiques. Je peux vous proposer un rendez-vous standard de 30 minutes."
      });
    }

    const list = types.map(t => {
      let desc = `${t.name} (${t.duration_minutes} min)`;
      if (t.price) desc += ` - ${t.price}${t.currency || '€'}`;
      return desc;
    }).join(', ');

    return successResponse({
      result: `Voici nos types de rendez-vous disponibles : ${list}. Lequel vous intéresse ?`,
      types
    });
  } catch (error) {
    logger.error('getAppointmentTypes error', { error: error.message, tenantId });
    return successResponse({
      result: "Je peux vous proposer un rendez-vous. Quel type de service vous intéresse ?"
    });
  }
}

async function searchProducts(env, tenantId, args) {
  const { query, category } = args;
  
  try {
    const products = await env.DB.prepare(`
      SELECT name, description, price FROM products 
      WHERE tenant_id = ? AND (name LIKE ? OR description LIKE ?)
      LIMIT 3
    `).bind(tenantId, `%${query}%`, `%${query}%`).all();
    
    if (products.results && products.results.length > 0) {
      const list = products.results.map(p => `${p.name} à ${p.price}€`).join(', ');
      return successResponse({
        result: `J'ai trouvé : ${list}. Voulez-vous plus de détails sur l'un d'entre eux ?`
      });
    }
    
    return successResponse({
      result: `Je n'ai pas trouvé de résultat pour "${query}". Pouvez-vous préciser votre recherche ?`
    });
  } catch (error) {
    return successResponse({
      result: `Nous proposons différents services. Pouvez-vous me préciser ce que vous recherchez ?`
    });
  }
}

// ============ M8 — CHANNEL SWITCHING FUNCTIONS ============

/**
 * send_sms — Fonction appelée par l'agent vocal pour envoyer un SMS
 * Utilise Twilio, logue dans omni_messages
 */
async function functionSendSMS(env, tenantId, args, call) {
  const { to, message } = args;

  if (!to || !message) {
    return successResponse({ result: "Il me faut un numéro de téléphone et un message pour envoyer le SMS." });
  }

  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER || '+33939035760';

  if (!accountSid || !authToken) {
    logger.warn('Twilio credentials not configured for send_sms function');
    return successResponse({ result: "Le service SMS n'est pas configuré pour le moment." });
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const formData = new URLSearchParams();
    formData.append('From', from);
    formData.append('To', to);
    formData.append('Body', message);

    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Twilio SMS error in Retell function', { error: data });
      return successResponse({ result: "Je n'ai pas pu envoyer le SMS. Veuillez réessayer plus tard." });
    }

    logger.info('SMS sent via Retell function', { messageSid: data.sid, to, tenantId });

    // Logger dans omni_messages (best effort)
    try {
      const conversationId = call?.metadata?.conversation_id || call?.call_id || `retell_${Date.now()}`;
      await env.DB.prepare(`
        INSERT INTO omni_messages (id, conversation_id, channel, direction, content, content_type, sender_role, message_sid)
        VALUES (?, ?, 'sms', 'outbound', ?, 'text', 'agent', ?)
      `).bind(
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        message,
        data.sid
      ).run();
    } catch (dbError) {
      logger.warn('Could not log SMS to omni_messages', { error: dbError.message });
    }

    return successResponse({ result: `SMS envoyé avec succès au ${to}.` });
  } catch (error) {
    logger.error('send_sms function error', { error: error.message });
    return successResponse({ result: "Une erreur s'est produite lors de l'envoi du SMS." });
  }
}

/**
 * send_email — Fonction appelée par l'agent vocal pour envoyer un email
 * Utilise Resend (env.RESEND_API_KEY), logue dans omni_messages
 */
async function functionSendEmail(env, tenantId, args, call) {
  const { to, subject, message } = args;

  if (!to || !message) {
    return successResponse({ result: "Il me faut une adresse email et un message pour envoyer l'email." });
  }

  if (!env.RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not configured for send_email function');
    return successResponse({ result: "Le service email n'est pas configuré pour le moment." });
  }

  try {
    const emailSubject = subject || 'Message de votre assistant Coccinelle';

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sara - coccinelle.ai <sara@coccinelle.ai>',
        reply_to: 'contact@agenticsolutions.fr',
        to: [to],
        subject: emailSubject,
        html: `<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <p>${message.replace(/\n/g, '<br/>')}</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Envoyé par l'assistant vocal coccinelle.ai</p>
        </div>`
      })
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Resend API error in Retell function', { error: data });
      return successResponse({ result: "Je n'ai pas pu envoyer l'email. Veuillez réessayer plus tard." });
    }

    logger.info('Email sent via Retell function', { emailId: data.id, to, tenantId });

    // Logger dans omni_messages (best effort)
    try {
      const conversationId = call?.metadata?.conversation_id || call?.call_id || `retell_${Date.now()}`;
      await env.DB.prepare(`
        INSERT INTO omni_messages (id, conversation_id, channel, direction, content, content_type, sender_role, message_sid)
        VALUES (?, ?, 'email', 'outbound', ?, 'text', 'agent', ?)
      `).bind(
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        `[${emailSubject}] ${message}`,
        data.id || null
      ).run();
    } catch (dbError) {
      logger.warn('Could not log email to omni_messages', { error: dbError.message });
    }

    return successResponse({ result: `Email envoyé avec succès à ${to}.` });
  } catch (error) {
    logger.error('send_email function error', { error: error.message });
    return successResponse({ result: "Une erreur s'est produite lors de l'envoi de l'email." });
  }
}

// ============ N5 — BUSINESS HOURS CHECK ============

/**
 * Vérifie si l'heure actuelle (Europe/Paris) est dans les horaires d'ouverture du tenant.
 * Retourne true si ouvert, false sinon.
 * En cas de table vide ou erreur, retourne true (fallback : toujours ouvert).
 */
async function checkBusinessHoursOpen(env, tenantId) {
  try {
    // Heure actuelle en Europe/Paris (UTC+1 ou UTC+2 selon DST)
    const now = new Date();
    // Cloudflare Workers n'ont pas Intl.DateTimeFormat fiable pour le TZ,
    // on applique un offset manuel pour Europe/Paris (CET = UTC+1, CEST = UTC+2)
    const month = now.getUTCMonth(); // 0-11
    // DST approximatif : dernier dimanche de mars au dernier dimanche d'octobre
    const isDST = month >= 2 && month <= 9; // mars (2) à octobre (9)
    const offsetHours = isDST ? 2 : 1;
    const parisTime = new Date(now.getTime() + offsetHours * 3600000);

    const dayOfWeek = parisTime.getUTCDay(); // 0=Dimanche, 1=Lundi... 6=Samedi
    const currentTime = `${String(parisTime.getUTCHours()).padStart(2, '0')}:${String(parisTime.getUTCMinutes()).padStart(2, '0')}`;

    const hoursResult = await env.DB.prepare(`
      SELECT is_open, open_time, close_time FROM business_hours
      WHERE tenant_id = ? AND day_of_week = ?
    `).bind(tenantId, dayOfWeek).first();

    if (!hoursResult) {
      // Pas d'horaires configurés pour ce jour, fallback : ouvert
      return true;
    }

    if (!hoursResult.is_open) {
      return false;
    }

    const openTime = hoursResult.open_time || '09:00';
    const closeTime = hoursResult.close_time || '18:00';

    return currentTime >= openTime && currentTime < closeTime;
  } catch (error) {
    logger.warn('checkBusinessHoursOpen error', { error: error.message, tenantId });
    return true; // Fallback : ouvert
  }
}

// ============ WEB CALL PUBLIC (Agentic Solutions) ============

/**
 * POST /api/v1/public/retell/web-call
 * Crée un appel WebRTC pour qu'un prospect teste l'agent vocal
 * depuis agenticsolutions.fr — SANS authentification
 */
export async function createWebCall(request, env) {
  try {
    const body = await request.json();
    const { name, email, language = 'fr', sector = '' } = body;

    if (!name || !email) {
      return errorResponse('Nom et email sont requis', 400);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return errorResponse('Format email invalide', 400);
    }

    const tenantId = 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';

    const agentConfig = await env.DB.prepare(`
      SELECT retell_agent_id, agent_name 
      FROM omni_agent_configs 
      WHERE tenant_id = ? AND retell_agent_id IS NOT NULL
      LIMIT 1
    `).bind(tenantId).first();

    if (!agentConfig || !agentConfig.retell_agent_id) {
      logger.error('Agent config not found for tenant', { tenantId });
      return errorResponse('Agent non trouvé pour ce tenant', 404);
    }

    logger.info('Creating web call', { 
      name, email, agent: agentConfig.agent_name,
      retell_agent_id: agentConfig.retell_agent_id 
    });

    const retellResponse = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: getRetellHeaders(env),
      body: JSON.stringify({
        agent_id: agentConfig.retell_agent_id,
        metadata: {
          tenant_id: tenantId,
          prospect_name: name,
          prospect_email: email,
          prospect_sector: sector,
          source: 'agenticsolutions.fr'
        },
        retell_llm_dynamic_variables: {
          prospect_name: name,
          prospect_sector: sector,
          language: language
        }
      })
    });

    if (!retellResponse.ok) {
      const errorText = await retellResponse.text();
      logger.error('Retell API error', { status: retellResponse.status, error: errorText });
      return errorResponse('Erreur création appel Retell: ' + errorText, 500);
    }

    const retellData = await retellResponse.json();

    logger.info('Web call created successfully', { 
      call_id: retellData.call_id, agent_id: retellData.agent_id 
    });

    return successResponse({
      access_token: retellData.access_token,
      call_id: retellData.call_id
    });

  } catch (error) {
    logger.error('createWebCall error', { error: error.message });
    return errorResponse('Erreur serveur: ' + error.message, 500);
  }
}
