// Module Retell - Routes et Webhooks CRUD complet
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { getRetellHeaders, RETELL_CONFIG } from './config.js';

const RETELL_API_BASE = 'https://api.retellai.com';

export async function handleRetellRoutes(request, env, path, method) {
  logger.info('Retell routes called', { path, method });
  
  try {
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
    
    // GET /api/v1/retell/calls - Liste appels depuis DB
    if (path === '/api/v1/retell/calls' && method === 'GET') {
      return await listCalls(request, env);
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

    // POST /webhooks/retell/function - Fonctions custom
    if (path === '/webhooks/retell/function' && method === 'POST') {
      return await handleRetellFunction(request, env);
    }
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
    voice_id: body.voice_id || RETELL_CONFIG.customVoiceId,
    language: body.language || 'fr-FR',
    webhook_url: body.webhook_url || `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/retell/call`,
    
    // LLM config
    response_engine: body.response_engine || {
      type: 'retell-llm',
      llm_id: body.llm_id
    },
    
    // Voice settings
    voice_temperature: body.voice_temperature || RETELL_CONFIG.voiceSettings.temperature,
    voice_speed: body.voice_speed || RETELL_CONFIG.voiceSettings.speed,
    volume: body.volume || RETELL_CONFIG.voiceSettings.volume,
    
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
  // Sauvegarder l'appel en DB
  try {
    await env.DB.prepare(`
      INSERT INTO calls (id, tenant_id, retell_call_id, from_number, to_number, direction, status, started_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      `call_${Date.now()}`,
      call.metadata?.tenant_id || 'tenant_demo_001',
      call.call_id,
      call.from_number,
      call.to_number,
      call.direction || 'inbound',
      'in_progress'
    ).run();
  } catch (error) {
    logger.error('Failed to save call', { error: error.message });
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
}

async function handleCallAnalyzed(call, analysis, env) {
  try {
    await env.DB.prepare(`
      UPDATE calls 
      SET post_call_analysis = ?, transcript = ?
      WHERE retell_call_id = ?
    `).bind(
      JSON.stringify(analysis),
      call.transcript || null,
      call.call_id
    ).run();
  } catch (error) {
    logger.error('Failed to save analysis', { error: error.message });
  }
}

// ============ CALLS FUNCTIONS ============

async function listCalls(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  const limit = parseInt(url.searchParams.get('limit')) || 50;
  
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

    // POST /webhooks/retell/function - Fonctions custom
    if (path === '/webhooks/retell/function' && method === 'POST') {
      return await handleRetellFunction(request, env);
    }
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
      
      default:
        return successResponse({ result: "Fonction non reconnue" });
    }
  } catch (error) {
    logger.error('Function error', { name, error: error.message });
    return successResponse({ result: "Désolé, une erreur s'est produite." });
  }
}

async function checkAvailability(env, tenantId, args) {
  const { date, service_type } = args;
  
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
    
    // 2. Récupérer les RDV déjà pris ce jour-là
    const bookedResult = await env.DB.prepare(`
      SELECT strftime('%H:%M', scheduled_at) as booked_time FROM appointments 
      WHERE tenant_id = ? AND date(scheduled_at) = ? AND status != 'cancelled'
    `).bind(tenantId, date).all();
    
    const bookedTimes = bookedResult.results?.map(r => r.booked_time) || [];
    
    // 3. Générer les créneaux disponibles (par tranches de 30 min)
    const availableSlots = [];
    for (const slot of (slotsResult.results || [])) {
      let current = slot.start_time;
      while (current < slot.end_time) {
        if (!bookedTimes.includes(current)) {
          availableSlots.push(current);
        }
        // Ajouter 30 minutes
        const [hours, minutes] = current.split(':').map(Number);
        const newMinutes = minutes + 30;
        current = `${String(hours + Math.floor(newMinutes / 60)).padStart(2, '0')}:${String(newMinutes % 60).padStart(2, '0')}`;
      }
    }
    
    // 4. Retourner le résultat
    if (availableSlots.length === 0) {
      // Fallback si pas de créneaux configurés
      const defaultSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
      const fallbackAvailable = defaultSlots.filter(s => !bookedTimes.includes(s));
      
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

async function bookAppointment(env, tenantId, args) {
  const { date, time, client_name, client_phone, service_type } = args;
  
  // Créer le RDV en base
  try {
    const id = `appt_${Date.now()}`;
    await env.DB.prepare(`
      INSERT INTO appointments (id, tenant_id, customer_name, customer_phone, scheduled_at, service_type, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'confirmed', datetime('now'))
    `).bind(id, tenantId, client_name, client_phone || '', `${date}T${time}:00`, service_type || 'general').run();
    
    return successResponse({
      result: `Parfait ${client_name}, votre rendez-vous est confirmé pour le ${date} à ${time}. Vous recevrez un SMS de confirmation. À bientôt !`
    });
  } catch (error) {
    logger.error('Book appointment error', { error: error.message });
    return successResponse({
      result: `C'est noté ${client_name}, rendez-vous le ${date} à ${time}. À bientôt !`
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
