// Module VoixIA — Routes API dédiées
// Endpoints appelés par l'agent vocal VoixIA pendant les appels téléphoniques.
// Auth par clé API (X-VoixIA-Key) — pas de JWT/session.
// Chaque endpoint réutilise la logique métier existante sans la modifier.

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { generateId, logAudit } from '../auth/helpers.js';
import { requireVoixIAAuth } from './auth.js';
import { findOrCreateProspect } from '../prospects/dedup.js';
import { findPrestationByName, findPrestationDurationById } from '../shared/prestations.js';

/**
 * Handler principal pour les routes /api/v1/voixia/*
 */
export async function handleVoixIARoutes(request, env, path, method) {
  try {
    // ═══ Routes Agents (/api/v1/voixia/agents/*) ═══

    // POST /api/v1/voixia/agents/versions/:id/activate — Activer une version
    if (path.startsWith('/api/v1/voixia/agents/versions/') && path.endsWith('/activate') && method === 'POST') {
      const id = path.split('/').slice(-2)[0];
      return await handleActivateVersion(request, env, id);
    }

    // GET /api/v1/voixia/agents/versions — Historique versions
    if (path === '/api/v1/voixia/agents/versions' && method === 'GET') {
      return await handleGetAgentVersions(request, env);
    }

    // POST /api/v1/voixia/agents — Créer un agent
    if (path === '/api/v1/voixia/agents' && method === 'POST') {
      return await handleCreateAgentConfig(request, env);
    }

    // DELETE /api/v1/voixia/agents/:id — Supprimer un agent (soft)
    if (path.startsWith('/api/v1/voixia/agents/') && method === 'DELETE') {
      const id = path.split('/').pop();
      return await handleDeleteAgent(request, env, id);
    }

    // GET /api/v1/voixia/agents — Liste des agents
    if (path === '/api/v1/voixia/agents' && method === 'GET') {
      return await handleGetAgents(request, env);
    }

    // POST /api/v1/voixia/appointments — Prendre un RDV
    if (path === '/api/v1/voixia/appointments' && method === 'POST') {
      return await handleCreateAppointment(request, env);
    }

    // GET /api/v1/voixia/appointments/availability — Vérifier disponibilités
    if (path === '/api/v1/voixia/appointments/availability' && method === 'GET') {
      return await handleCheckAvailability(request, env);
    }

    // POST /api/v1/voixia/prospects — Créer un prospect
    if (path === '/api/v1/voixia/prospects' && method === 'POST') {
      return await handleCreateProspect(request, env);
    }

    // POST /api/v1/voixia/sms — Envoyer un SMS
    if (path === '/api/v1/voixia/sms' && method === 'POST') {
      return await handleSendSMS(request, env);
    }

    // GET /api/v1/voixia/products — Chercher dans le catalogue
    if (path === '/api/v1/voixia/products' && method === 'GET') {
      return await handleSearchProducts(request, env);
    }

    // POST /api/v1/voixia/knowledge — Chercher dans la base de connaissances
    if (path === '/api/v1/voixia/knowledge' && method === 'POST') {
      return await handleSearchKnowledge(request, env);
    }

    // POST /api/v1/voixia/transfer — Transférer vers un humain
    if (path === '/api/v1/voixia/transfer' && method === 'POST') {
      return await handleTransferToHuman(request, env);
    }

    // GET /api/v1/voixia/resolve-phone — Résoudre un numéro de téléphone vers un tenant
    if (path === '/api/v1/voixia/resolve-phone' && method === 'GET') {
      return await handleResolvePhone(request, env);
    }

    // POST /api/v1/voixia/log-call — Logger un appel terminé (appelé par agent Python)
    if (path === '/api/v1/voixia/log-call' && method === 'POST') {
      return await handleLogCall(request, env);
    }

    // POST /api/v1/voixia/create-task — Créer tâche + affectation intelligente (appelé par agent Python)
    if (path === '/api/v1/voixia/create-task' && method === 'POST') {
      return await handleCreateTask(request, env);
    }

    // ═══ Aliases /tools/* pour compatibilité documentée ═══
    if (path === '/api/v1/voixia/tools/availability' && method === 'GET') {
      return await handleCheckAvailability(request, env);
    }
    if (path === '/api/v1/voixia/tools/book-appointment' && method === 'POST') {
      return await handleCreateAppointment(request, env);
    }
    if (path === '/api/v1/voixia/tools/knowledge' && method === 'GET') {
      // Adapter GET → même logique que POST knowledge mais via query params
      return await handleSearchKnowledgeGET(request, env);
    }
    if (path === '/api/v1/voixia/tools/products' && method === 'GET') {
      return await handleSearchProducts(request, env);
    }
    if (path === '/api/v1/voixia/tools/prospect' && method === 'POST') {
      return await handleCreateProspect(request, env);
    }
    if (path === '/api/v1/voixia/tools/sms' && method === 'POST') {
      return await handleSendSMS(request, env);
    }
    if (path === '/api/v1/voixia/tools/transfer' && method === 'POST') {
      return await handleTransferToHuman(request, env);
    }

    return null;

  } catch (error) {
    logger.error('VoixIA route error', { error: error.message, path, method });
    return errorResponse('Erreur interne VoixIA', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/voixia/appointments — Prendre un rendez-vous
// ═══════════════════════════════════════════════════════════════

async function handleCreateAppointment(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;

  const body = await request.json();
  const { customer_name, customer_phone, date_time, service, agent_id, notes, type } = body;

  // Validation des champs requis
  if (!customer_name) return errorResponse('customer_name est requis', 400);
  if (!customer_phone) return errorResponse('customer_phone est requis', 400);
  if (!date_time) return errorResponse('date_time est requis (format ISO 8601)', 400);

  // 1. Créer ou retrouver le prospect (déduplication par téléphone)
  // Séparer prénom / nom — first_name est NOT NULL, last_name aussi
  const nameParts = customer_name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  let prospectResult;
  try {
    prospectResult = await findOrCreateProspect(env, tenant_id, {
      first_name: firstName,
      last_name: lastName,
      phone: customer_phone,
      source: 'voixia_appel',
      status: 'new'
    });
  } catch (error) {
    logger.error('VoixIA — erreur création prospect', { error: error.message, tenant_id });
    return errorResponse('Impossible de créer le prospect', 500);
  }

  // 2. Trouver la prestation (products type='service', fallback services) + sa durée
  let serviceId = null;
  let serviceDurationMinutes = null;
  if (service) {
    const prestation = await findPrestationByName(env, tenant_id, service);
    if (prestation) {
      serviceId = prestation.id;
      serviceDurationMinutes = prestation.duration_minutes;
    }
  }

  // 3. Résoudre l'agent_id (utiliser le premier agent actif si non fourni)
  let resolvedAgentId = agent_id || null;
  if (!resolvedAgentId) {
    try {
      const defaultAgent = await env.DB.prepare(
        'SELECT id FROM commercial_agents WHERE tenant_id = ? AND is_active = 1 LIMIT 1'
      ).bind(tenant_id).first();
      resolvedAgentId = defaultAgent?.id || null;
    } catch {
      // Pas d'agent — on continue sans
    }
  }

  // 4. Re-check atomique avant INSERT (BUG #009 + #014 — anti chevauchement)
  // Durée du nouveau RDV : body > service > défaut 60
  const newDuration = body.duration_minutes || serviceDurationMinutes || 60;
  try {
    // Plage du nouveau RDV : [date_time, date_time + newDuration[
    // Chevauchement : existing.début < new.fin ET new.début < existing.fin
    const conflict = await env.DB.prepare(`
      SELECT COUNT(*) as n FROM appointments
      WHERE tenant_id = ?
        AND status IN ('scheduled', 'confirmed', 'pending')
        AND datetime(scheduled_at) < datetime(?, '+' || ? || ' minutes')
        AND datetime(scheduled_at, '+' || COALESCE(duration_minutes, 60) || ' minutes') > datetime(?)
    `).bind(tenant_id, date_time, newDuration, date_time).first();
    if (conflict && conflict.n > 0) {
      return successResponse({
        message: `Ce creneau est deja pris. Souhaitez-vous un autre horaire ?`,
        conflict: true,
        requested_time: date_time
      }, 200);
    }
  } catch (checkErr) {
    logger.warn('VoixIA — conflict check failed, proceeding with insert', { error: checkErr.message });
  }

  // 5. Créer le rendez-vous
  const appointmentId = generateId('apt');
  // management_token est NOT NULL — utiliser crypto.randomUUID() pour un vrai UUID
  const managementToken = crypto.randomUUID();
  const now = new Date().toISOString();

  // Le champ "type" est NOT NULL dans la table appointments
  const appointmentType = type || service || 'rdv';

  try {
    await env.DB.prepare(`
      INSERT INTO appointments (id, tenant_id, prospect_id, agent_id, service_id, type, scheduled_at, duration_minutes, management_token, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `).bind(
      appointmentId, tenant_id, prospectResult.prospect.id,
      resolvedAgentId, serviceId, appointmentType, date_time, newDuration, managementToken,
      notes || `RDV pris via VoixIA — ${customer_name}`, now
    ).run();
  } catch (dbError) {
    // Fallback si certaines colonnes n'existent pas
    logger.warn('VoixIA — fallback insertion RDV', { error: dbError.message });
    try {
      await env.DB.prepare(`
        INSERT INTO appointments (id, tenant_id, prospect_id, agent_id, type, scheduled_at, duration_minutes, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
      `).bind(
        appointmentId, tenant_id, prospectResult.prospect.id,
        resolvedAgentId, appointmentType, date_time, newDuration,
        notes || `RDV pris via VoixIA — ${customer_name}`, now
      ).run();
    } catch (fallbackError) {
      logger.error('VoixIA — échec création RDV', { error: fallbackError.message });
      return errorResponse('Impossible de créer le rendez-vous : ' + fallbackError.message, 500);
    }
  }

  // 6. Audit log
  await logAudit(env, {
    tenant_id,
    user_id: 'voixia-agent',
    action: 'voixia.appointment.create',
    resource_type: 'appointment',
    resource_id: appointmentId,
    changes: { customer_name, customer_phone, date_time, service, agent_id: resolvedAgentId }
  });

  logger.info('VoixIA — RDV créé', { appointmentId, tenant_id, customer_phone });

  return successResponse({
    message: `Rendez-vous confirmé pour ${customer_name} le ${date_time}`,
    appointment: {
      id: appointmentId,
      prospect_id: prospectResult.prospect.id,
      prospect_merged: prospectResult.merged,
      agent_id: resolvedAgentId,
      service_id: serviceId,
      scheduled_at: date_time,
      status: 'scheduled'
    }
  }, 201);
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/voixia/appointments/availability — Disponibilités
// ═══════════════════════════════════════════════════════════════

async function handleCheckAvailability(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;
  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const service = url.searchParams.get('service');
  const serviceId = url.searchParams.get('service_id');
  const agentId = url.searchParams.get('agent_id');

  if (!date) return errorResponse('Paramètre date requis (format YYYY-MM-DD)', 400);

  // 1. Déterminer le jour de la semaine (1=lundi, 7=dimanche)
  const dateObj = new Date(date + 'T00:00:00Z');
  const jsDay = dateObj.getUTCDay(); // 0=dimanche
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // Convertir en 1=lundi...7=dimanche

  // 1b. Résoudre le service et les agents assignés
  let resolvedServiceId = serviceId || null;
  let serviceAgentIds = null; // null = pas de filtre par service
  let serviceDuration = null; // duree du service
  let agentCustomDurations = {}; // agent_id → custom_duration_minutes

  if (!resolvedServiceId && service) {
    // Résoudre la prestation par nom (products type='service', fallback services)
    const prestation = await findPrestationByName(env, tenant_id, service);
    if (prestation) {
      resolvedServiceId = prestation.id;
      serviceDuration = prestation.duration_minutes;
    }
  }

  if (resolvedServiceId) {
    // Récupérer la durée de la prestation si pas encore fait
    if (!serviceDuration) {
      serviceDuration = await findPrestationDurationById(env, tenant_id, resolvedServiceId);
    }

    // Récupérer les agents assignés à cette prestation
    try {
      const casResult = await env.DB.prepare(`
        SELECT cas.agent_id, cas.custom_duration_minutes
        FROM commercial_agent_services cas
        WHERE cas.service_id = ? AND cas.tenant_id = ? AND cas.is_active = 1
      `).bind(resolvedServiceId, tenant_id).all();
      const rows = casResult.results || [];
      if (rows.length > 0) {
        serviceAgentIds = rows.map(r => r.agent_id);
        for (const r of rows) {
          if (r.custom_duration_minutes) agentCustomDurations[r.agent_id] = r.custom_duration_minutes;
        }
      }
    } catch { /* continue sans filtre */ }
  }

  // Si service demandé mais aucun agent ne le propose → retourner liste vide
  if (resolvedServiceId && serviceAgentIds && serviceAgentIds.length === 0) {
    return successResponse({
      date,
      day_of_week: dayOfWeek,
      available_slots: [],
      count: 0,
      service_id: resolvedServiceId,
      message: 'Aucun membre ne propose cette prestation'
    });
  }

  // 2. Récupérer les créneaux de disponibilité des agents
  let query = `
    SELECT
      avs.agent_id,
      avs.day_of_week,
      avs.start_time,
      avs.end_time,
      avs.break_start,
      avs.break_end,
      avs.slot_duration,
      COALESCE(ca.first_name, '') || ' ' || COALESCE(ca.last_name, '') as agent_name
    FROM availability_slots avs
    LEFT JOIN commercial_agents ca ON avs.agent_id = ca.id
    WHERE avs.tenant_id = ?
      AND avs.day_of_week = ?
      AND avs.is_available = 1
  `;
  const params = [tenant_id, dayOfWeek];

  if (agentId) {
    query += ' AND avs.agent_id = ?';
    params.push(agentId);
  } else if (serviceAgentIds && serviceAgentIds.length > 0) {
    // Filtrer par agents qui proposent la prestation
    query += ` AND avs.agent_id IN (${serviceAgentIds.map(() => '?').join(',')})`;
    params.push(...serviceAgentIds);
  }

  let slots;
  try {
    const result = await env.DB.prepare(query).bind(...params).all();
    slots = result.results || [];
  } catch (error) {
    logger.error('VoixIA — erreur requête disponibilités', { error: error.message });
    return errorResponse('Erreur lors de la vérification des disponibilités', 500);
  }

  // 3. Récupérer les RDV déjà pris ce jour pour exclure les créneaux occupés
  // BUG #014 : inclure duration_minutes pour chevauchement de plage
  let existingAppointments = [];
  try {
    const appointmentsResult = await env.DB.prepare(`
      SELECT agent_id, scheduled_at, COALESCE(duration_minutes, 60) as duration_minutes
      FROM appointments
      WHERE tenant_id = ?
        AND DATE(scheduled_at) = ?
        AND status IN ('scheduled', 'confirmed', 'pending')
    `).bind(tenant_id, date).all();
    existingAppointments = appointmentsResult.results || [];
  } catch {
    // Table peut ne pas avoir la bonne structure — on continue
  }

  // 4. Construire les plages occupées en minutes depuis minuit (UTC)
  // BUG #009 : agent_id=null bloque tout. BUG #014 : plages [début, fin[.
  const bookedRangesByAgent = [];  // { agent_id, startMin, endMin }
  const bookedRangesGlobal = [];   // { startMin, endMin } — RDV sans agent

  for (const a of existingAppointments) {
    const d = new Date(a.scheduled_at);
    const startMin = d.getUTCHours() * 60 + d.getUTCMinutes();
    const endMin = startMin + (a.duration_minutes || 60);
    if (a.agent_id) {
      bookedRangesByAgent.push({ agent_id: a.agent_id, startMin, endMin });
    } else {
      bookedRangesGlobal.push({ startMin, endMin });
    }
  }

  // Helper : un slot [slotStart, slotEnd[ chevauche-t-il une plage occupée ?
  function isSlotOverlapping(agentId, slotStartMin, slotEndMin) {
    // Global ranges (VoixIA, agent_id=null) bloquent tous les agents
    for (const r of bookedRangesGlobal) {
      if (slotStartMin < r.endMin && r.startMin < slotEndMin) return true;
    }
    // Agent-specific ranges
    for (const r of bookedRangesByAgent) {
      if (r.agent_id === agentId && slotStartMin < r.endMin && r.startMin < slotEndMin) return true;
    }
    return false;
  }

  const availableSlots = [];

  for (const slot of slots) {
    // Priorité durée : custom par agent > service > slot_duration > 30min
    const duration = agentCustomDurations[slot.agent_id] || serviceDuration || slot.slot_duration || 30;
    const [startH, startM] = (slot.start_time || '09:00').split(':').map(Number);
    const [endH, endM] = (slot.end_time || '18:00').split(':').map(Number);
    const breakStart = slot.break_start ? slot.break_start.split(':').map(Number) : null;
    const breakEnd = slot.break_end ? slot.break_end.split(':').map(Number) : null;

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const breakStartMin = breakStart ? breakStart[0] * 60 + breakStart[1] : null;
    const breakEndMin = breakEnd ? breakEnd[0] * 60 + breakEnd[1] : null;

    while (currentMinutes + duration <= endMinutes) {
      // Vérifier si le créneau est pendant la pause
      if (breakStartMin !== null && breakEndMin !== null) {
        if (currentMinutes >= breakStartMin && currentMinutes < breakEndMin) {
          currentMinutes = breakEndMin;
          continue;
        }
      }

      const h = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
      const m = (currentMinutes % 60).toString().padStart(2, '0');
      const timeStr = `${h}:${m}`;

      // BUG #014 : chevauchement de plage [slotStart, slotEnd[
      const slotEndMin = currentMinutes + duration;
      const isBooked = isSlotOverlapping(slot.agent_id, currentMinutes, slotEndMin);

      if (!isBooked) {
        availableSlots.push({
          agent_id: slot.agent_id,
          agent_name: slot.agent_name?.trim() || null,
          time: timeStr,
          duration_minutes: duration
        });
      }

      currentMinutes += duration;
    }
  }

  logAudit(env, {
    tenant_id,
    user_id: 'voixia-agent',
    action: 'voixia.availability.check',
    resource_type: 'availability',
    changes: { date, service, service_id: resolvedServiceId, agent_id: agentId, slots_found: availableSlots.length }
  }).catch(() => {});

  return successResponse({
    date,
    day_of_week: dayOfWeek,
    available_slots: availableSlots,
    count: availableSlots.length,
    service_id: resolvedServiceId || null,
    message: availableSlots.length > 0
      ? `${availableSlots.length} créneau(x) disponible(s) le ${date}`
      : `Aucun créneau disponible le ${date}`
  });
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/voixia/prospects — Créer un prospect
// ═══════════════════════════════════════════════════════════════

async function handleCreateProspect(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;
  const body = await request.json();
  const { name, phone, email, source } = body;

  if (!name) return errorResponse('name est requis', 400);
  if (!phone && !email) return errorResponse('phone ou email est requis', 400);

  // Séparer prénom / nom — first_name est NOT NULL dans la table prospects
  const nameParts = name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ') || '';

  let result;
  try {
    result = await findOrCreateProspect(env, tenant_id, {
      first_name: firstName,
      last_name: lastName,
      email: email || null,
      phone: phone || null,
      source: source || 'voixia_appel',
      status: 'new'
    });
  } catch (error) {
    logger.error('VoixIA — erreur création prospect', { error: error.message, tenant_id });
    return errorResponse('Impossible de créer le prospect', 500);
  }

  await logAudit(env, {
    tenant_id,
    user_id: 'voixia-agent',
    action: result.merged ? 'voixia.prospect.merge' : 'voixia.prospect.create',
    resource_type: 'prospect',
    resource_id: result.prospect.id,
    changes: { name, phone, email, source: source || 'voixia_appel' }
  });

  const action = result.merged ? 'mis à jour (déjà existant)' : 'créé';
  logger.info(`VoixIA — prospect ${action}`, { prospectId: result.prospect.id, tenant_id });

  return successResponse({
    message: `Prospect ${action} : ${name}`,
    prospect: result.prospect,
    merged: result.merged
  }, result.merged ? 200 : 201);
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/voixia/sms — Envoyer un SMS
// ═══════════════════════════════════════════════════════════════

async function handleSendSMS(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;
  const body = await request.json();
  const { to, message } = body;

  if (!to) return errorResponse('to (numéro destinataire) est requis', 400);
  if (!message) return errorResponse('message est requis', 400);

  // Vérifier la configuration Twilio
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER || '+33939035760';

  if (!accountSid || !authToken) {
    return errorResponse('Service SMS non configuré (Twilio)', 503);
  }

  // Envoyer via l'API Twilio
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const formData = new URLSearchParams();
  formData.append('From', from);
  formData.append('To', to);
  formData.append('Body', message);

  try {
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
      logger.error('VoixIA — erreur envoi SMS Twilio', { error: data, tenant_id });
      return errorResponse(data.message || 'Échec de l\'envoi du SMS', 400);
    }

    // Sauvegarder en DB
    try {
      await env.DB.prepare(`
        INSERT INTO sms_messages (id, tenant_id, to_number, from_number, message, status, direction, twilio_sid, created_at)
        VALUES (?, ?, ?, ?, ?, 'sent', 'outbound', ?, datetime('now'))
      `).bind(
        generateId('sms'), tenant_id, to, from, message, data.sid
      ).run();
    } catch {
      // Table peut ne pas exister — non bloquant
    }

    await logAudit(env, {
      tenant_id,
      user_id: 'voixia-agent',
      action: 'voixia.sms.send',
      resource_type: 'sms',
      resource_id: data.sid,
      changes: { to, message_preview: message.substring(0, 50) }
    });

    logger.info('VoixIA — SMS envoyé', { messageSid: data.sid, to, tenant_id });

    return successResponse({
      message: `SMS envoyé à ${to}`,
      sms: {
        message_sid: data.sid,
        to,
        status: 'sent'
      }
    });

  } catch (error) {
    logger.error('VoixIA — erreur réseau envoi SMS', { error: error.message, tenant_id });
    return errorResponse('Erreur lors de l\'envoi du SMS : ' + error.message, 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/voixia/products — Chercher dans le catalogue
// ═══════════════════════════════════════════════════════════════

async function handleSearchProducts(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;
  const url = new URL(request.url);
  const search = url.searchParams.get('search') || url.searchParams.get('query') || '';
  const category = url.searchParams.get('category');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);

  let query = `
    SELECT
      id, title, description, short_description,
      category, type, price, price_currency,
      stock_status, available, location, attributes, images
    FROM products
    WHERE tenant_id = ? AND status = 'active'
  `;
  const params = [tenant_id];

  // Filtre par recherche textuelle
  if (search) {
    query += ` AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)`;
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  // Filtre par catégorie
  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(limit);

  try {
    const result = await env.DB.prepare(query).bind(...params).all();

    await logAudit(env, {
      tenant_id,
      user_id: 'voixia-agent',
      action: 'voixia.products.search',
      resource_type: 'product',
      changes: { search, category, results_count: result.results?.length || 0 }
    });

    return successResponse({
      products: (result.results || []).map(p => ({
        ...p,
        attributes: p.attributes ? JSON.parse(p.attributes) : null,
        images: p.images ? JSON.parse(p.images) : null
      })),
      count: result.results?.length || 0,
      message: result.results?.length > 0
        ? `${result.results.length} produit(s) trouvé(s)`
        : 'Aucun produit trouvé'
    });
  } catch (error) {
    logger.error('VoixIA — erreur recherche produits', { error: error.message, tenant_id });
    return errorResponse('Erreur lors de la recherche de produits', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/voixia/knowledge — Base de connaissances (RAG)
// ═══════════════════════════════════════════════════════════════

async function handleSearchKnowledge(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;
  const body = await request.json();
  const question = body.question || body.query || '';
  const topK = body.topK || 5;

  if (!question) return errorResponse('question ou query est requis', 400);

  // ── LightRAG (prioritaire, timeout 3s) ──
  const lightragEnabled = env.LIGHTRAG_ENABLED !== 'false' && env.LIGHTRAG_URL && env.LIGHTRAG_API_KEY;
  if (lightragEnabled) {
    try {
      const lrResult = await _searchKnowledgeLightRAG(env, question);
      if (lrResult) {
        console.log(`[KB] provenance=lightrag tenant=${tenant_id}`);
        return successResponse(lrResult);
      }
    } catch (err) {
      console.log(`[KB] lightrag_failed tenant=${tenant_id} err=${err.message}`);
    }
  }

  // ── Fallback : recherche locale (vectorielle + LIKE) ──
  // ── OPTIMISE BUG #011 : preparer la recherche textuelle en parallele de l'embedding ──
  // Splitter la question en mots significatifs (>= 3 caracteres) pour recherche OR
  const stopWords = new Set(['les', 'des', 'une', 'est', 'que', 'qui', 'dans', 'pour', 'sur', 'par', 'avec', 'son', 'ses', 'vos', 'nos', 'aux', 'ont', 'sont', 'quels', 'quel', 'quelle', 'quelles', 'comment', 'vous']);
  const searchWords = question
    .toLowerCase()
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));
  if (searchWords.length === 0) searchWords.push(question);

  // ── Lancer recherche textuelle ET vectorielle en parallele ──
  // La recherche textuelle est toujours prete comme fallback immediat
  const textSearchPromise = _searchKnowledgeText(env, tenant_id, searchWords, topK);

  let results = [];
  let searchType = 'text';

  // Recherche vectorielle (seulement si Workers AI et Vectorize disponibles)
  const targetVectorize = env.VECTORIZE_V2 || env.VECTORIZE;
  if (env.AI && targetVectorize) {
    try {
      const embeddingResult = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [question] });
      const queryEmbedding = embeddingResult?.data?.[0];

      if (queryEmbedding && Array.isArray(queryEmbedding) && queryEmbedding.length > 0) {
        const searchResults = await targetVectorize.query(queryEmbedding, {
          topK,
          returnMetadata: true,
          filter: { tenantId: tenant_id }
        });

        const chunkIds = (searchResults.matches || []).map(m => m.id);

        if (chunkIds.length > 0) {
          const placeholders = chunkIds.map(() => '?').join(',');
          const chunksResult = await env.DB.prepare(`
            SELECT
              kc.id, kc.content, kc.chunk_index,
              kd.title, kd.source_type, kd.source_url
            FROM knowledge_chunks kc
            LEFT JOIN knowledge_documents kd ON kc.document_id = kd.id
            WHERE kc.id IN (${placeholders})
          `).bind(...chunkIds).all();

          const scoreMap = {};
          for (const match of searchResults.matches) {
            scoreMap[match.id] = match.score;
          }

          results = (chunksResult.results || []).map(chunk => ({
            content: chunk.content,
            source_title: chunk.title,
            source_type: chunk.source_type,
            source_url: chunk.source_url,
            relevance_score: scoreMap[chunk.id] || 0
          }));
          searchType = 'semantic';
        }
      }
    } catch (error) {
      logger.warn('VoixIA — recherche vectorielle echouee, fallback texte', { error: error.message });
    }
  }

  // Si vectorielle n'a rien donne → utiliser le resultat textuel (deja en cours)
  if (results.length === 0) {
    results = await textSearchPromise;
    searchType = 'text';
  }

  // Audit non-bloquant (fire-and-forget)
  logAudit(env, {
    tenant_id,
    user_id: 'voixia-agent',
    action: 'voixia.knowledge.search',
    resource_type: 'knowledge',
    changes: { question: question.substring(0, 100), results_count: results.length }
  }).catch(() => {});

  // Selectionner la meilleure answer : source_type='text' en priorite, tronquee a 500 chars
  const textPriorityResults = results.filter(r => r.source_type === 'text');
  const bestResult = textPriorityResults.length > 0 ? textPriorityResults[0] : results[0];
  const answer = bestResult?.content?.substring(0, 500) || null;

  console.log(`[KB] provenance=fallback_like tenant=${tenant_id}`);
  return successResponse({
    results,
    count: results.length,
    answer,
    found: !!answer,
    search_type: searchType,
    message: results.length > 0
      ? `${results.length} résultat(s) trouvé(s)`
      : 'Aucun résultat trouvé dans la base de connaissances'
  });
}

/**
 * Recherche knowledge via LightRAG (RAG externe Mistral).
 * Timeout 3s, retourne null si reponse vide/inutilisable.
 */
async function _searchKnowledgeLightRAG(env, question) {
  const res = await fetch(`${env.LIGHTRAG_URL}/query`, {
    method: 'POST',
    headers: {
      'X-API-Key': env.LIGHTRAG_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: question, mode: 'hybrid' }),
    signal: AbortSignal.timeout(3000),
  });
  if (!res.ok) throw new Error(`LightRAG HTTP ${res.status}`);
  const data = await res.json();
  let answer = (data.response || '').trim();
  if (answer.length < 10) return null;
  // Nettoyer prefixes generiques du LLM
  answer = answer.replace(/^(Based on the (available )?knowledge[^.]*\.\s*)/i, '');
  if (answer.length > 500) answer = answer.substring(0, 500);
  return {
    answer,
    found: true,
    results: [{ source: 'lightrag', content: answer }],
    count: 1,
    search_type: 'lightrag',
    message: '1 résultat(s) trouvé(s)',
  };
}

/**
 * Recherche textuelle knowledge — 3 niveaux en parallele (chunks, documents, FAQ)
 * Utilisee comme fallback rapide ou recherche principale
 */
async function _searchKnowledgeText(env, tenant_id, searchWords, topK) {
  // Lancer les 3 niveaux de recherche en parallele
  const chunkLikeClauses = searchWords.map(() => 'kc.content LIKE ?').join(' OR ');
  const chunkParams = [tenant_id, ...searchWords.map(w => `%${w}%`), topK];

  const docLikeClauses = searchWords.map(() => '(title LIKE ? OR content LIKE ?)').join(' OR ');
  const docParams = [tenant_id, ...searchWords.flatMap(w => [`%${w}%`, `%${w}%`]), topK];

  const faqLikeClauses = searchWords.map(() => '(question LIKE ? OR answer LIKE ?)').join(' OR ');
  const faqParams = [tenant_id, ...searchWords.flatMap(w => [`%${w}%`, `%${w}%`]), topK];

  // ── Lancer les 3 requetes en parallele (Promise.allSettled) ──
  const [chunksRes, docsRes, faqRes] = await Promise.allSettled([
    env.DB.prepare(`
      SELECT kc.content, kc.chunk_index,
             kd.title, kd.source_type, kd.source_url,
             CASE WHEN kd.source_type = 'text' THEN 0 ELSE 1 END as priority
      FROM knowledge_chunks kc
      LEFT JOIN knowledge_documents kd ON kc.document_id = kd.id
      WHERE kd.tenant_id = ?
        AND (${chunkLikeClauses})
        AND kd.is_active = 1
      ORDER BY priority ASC, kd.created_at DESC
      LIMIT ?
    `).bind(...chunkParams).all(),

    env.DB.prepare(`
      SELECT title, content, source_url, source_type,
             CASE WHEN source_type = 'text' THEN 0 ELSE 1 END as priority
      FROM knowledge_documents
      WHERE tenant_id = ?
        AND is_active = 1
        AND (${docLikeClauses})
      ORDER BY priority ASC, created_at DESC
      LIMIT ?
    `).bind(...docParams).all(),

    env.DB.prepare(`
      SELECT question, answer
      FROM knowledge_faq
      WHERE tenant_id = ?
        AND (${faqLikeClauses})
      LIMIT ?
    `).bind(...faqParams).all()
  ]);

  // Priorite : chunks > documents > FAQ
  if (chunksRes.status === 'fulfilled' && chunksRes.value.results?.length > 0) {
    return chunksRes.value.results.map(chunk => ({
      content: chunk.content,
      source_title: chunk.title,
      source_type: chunk.source_type,
      source_url: chunk.source_url,
      relevance_score: null
    }));
  }

  if (docsRes.status === 'fulfilled' && docsRes.value.results?.length > 0) {
    return docsRes.value.results.map(doc => ({
      content: doc.content,
      source_title: doc.title,
      source_type: doc.source_type,
      source_url: doc.source_url,
      relevance_score: null
    }));
  }

  if (faqRes.status === 'fulfilled' && faqRes.value.results?.length > 0) {
    return faqRes.value.results.map(faq => ({
      content: `Q: ${faq.question}\nR: ${faq.answer}`,
      source_title: 'FAQ',
      source_type: 'faq',
      relevance_score: null
    }));
  }

  return [];
}

// ═══════════════════════════════════════════════════════════════
// RESOLVE PHONE — Résolution numéro de téléphone → tenant + prompt_type
// ═══════════════════════════════════════════════════════════════

/**
 * Le numero appele est-il le numero d'essai partage (QW8) ?
 * Compare en E.164 normalise (avec ou sans +, espaces ignores).
 * TRIAL_PHONE_NUMBER non defini → false : la branche d'essai reste inerte.
 */
function isTrialNumber(phone, env) {
  const trial = env.TRIAL_PHONE_NUMBER;
  if (!trial) return false;
  const norm = (v) => String(v).replace(/[\s.-]/g, '').replace(/^\+/, '');
  return norm(phone) === norm(trial);
}

/**
 * Resout le tenant d'un appelant en essai via son numero personnel verifie.
 * Retourne la MEME forme que la requete de mapping nominale (+ via_caller: true),
 * pour que la suite de handleResolvePhone (fallback template, reponse) soit commune.
 *
 * Seule exigence : users.phone_verified = 1 — le magic moment est conditionne a la verif
 * SMS, et a rien d'autre. Volontairement PAS de onboarding_completed = 1 : le numero est
 * affiche a l'ecran final, avant le clic qui marque l'onboarding termine ; l'exiger
 * rendrait l'appel impossible au moment precis ou on l'invite a appeler.
 * Un tenant sans prompt actif (parcours abandonne avant l'etape Agent) remonte quand meme :
 * l'aval retombe sur le template sectoriel, avec le bon nom d'entreprise.
 */
async function resolveTrialTenantByCaller(env, caller) {
  const normalizedCaller = String(caller).replace(/^\+/, '');
  const row = await env.DB.prepare(`
    SELECT
      t.id AS tenant_id, NULL AS phone_number, 1 AS is_active,
      t.name AS company_name, t.sector, t.api_key,
      vc.llm_provider, vc.llm_model, vc.voice_id,
      vc.active_prompt_id, vc.secteur AS vc_secteur,
      apv.system_prompt, apv.version AS prompt_version
    FROM users u
    INNER JOIN tenants t ON t.id = u.tenant_id
    LEFT JOIN voixia_configs vc ON vc.tenant_id = t.id
    LEFT JOIN ai_prompt_versions apv ON vc.active_prompt_id = apv.id
    WHERE (u.phone = ? OR u.phone = ?)
      AND u.phone_verified = 1
    ORDER BY t.created_at DESC
    LIMIT 1
  `).bind(caller, normalizedCaller).first();

  if (!row) return null;
  return { ...row, via_caller: true };
}

/**
 * GET /api/v1/voixia/resolve-phone?phone=+33...&caller=+33...
 * Résout un numéro de téléphone entrant vers le tenant associé et son prompt_type.
 * Utilisé par l'agent vocal pour adapter son comportement au secteur du client.
 *
 * `phone`  = numéro APPELÉ (résolution nominale via omni_phone_mappings).
 * `caller` = numéro APPELANT, optionnel. Utilisé UNIQUEMENT quand le numéro appelé est
 *            le numéro d'essai partagé (QW8 « magic moment ») : un nouvel inscrit n'a
 *            pas encore de numéro provisionné, on résout donc son tenant via son propre
 *            numéro vérifié. Absent/inconnu → comportement d'origine inchangé.
 */
async function handleResolvePhone(request, env) {
  // Authentification VoixIA (clé API)
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;

  // Extraction du paramètre phone
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');
  const caller = url.searchParams.get('caller');

  if (!phone) {
    return errorResponse('Le parametre phone est requis (ex: ?phone=+33939035761)', 400);
  }

  // Normalisation : retirer le + de tete pour couvrir les deux formats
  const normalizedPhone = String(phone).replace(/^\+/, '');

  try {
    // ── OPTIMISE BUG #010 : 1 seule requete JOIN au lieu de 3 sequentielles ──
    // Fusionne : omni_phone_mappings + tenants + voixia_configs + ai_prompt_versions
    let resolved = await env.DB.prepare(`
      SELECT
        m.tenant_id, m.phone_number, m.is_active,
        t.name AS company_name, t.sector, t.api_key,
        vc.llm_provider, vc.llm_model, vc.voice_id,
        vc.active_prompt_id, vc.secteur AS vc_secteur,
        apv.system_prompt, apv.version AS prompt_version
      FROM omni_phone_mappings m
      INNER JOIN tenants t ON m.tenant_id = t.id
      LEFT JOIN voixia_configs vc ON vc.tenant_id = m.tenant_id
      LEFT JOIN ai_prompt_versions apv ON vc.active_prompt_id = apv.id
      WHERE (m.phone_number = ? OR m.phone_number = ?)
        AND m.is_active = 1
        AND m.channel_type = 'voice'
      LIMIT 1
    `).bind(phone, normalizedPhone).first();

    // ── QW8 : numero d'essai partage → resolution par l'APPELANT ──
    // Un inscrit en essai n'a aucun numero provisionne (bundle Regulation FR requis pour
    // acheter un local FR). Il appelle donc le numero d'essai commun : on identifie son
    // tenant via son propre numero, verifie par SMS a l'etape 0 de l'onboarding.
    // Departage : le tenant le PLUS RECENT pour ce numero (un testeur multi-comptes veut
    // le compte qu'il vient de creer). Rendu identique a la branche nominale.
    if (!resolved && caller && isTrialNumber(phone, env)) {
      resolved = await resolveTrialTenantByCaller(env, caller);
    }

    // Audit non-bloquant (fire-and-forget) — ne retarde pas la reponse
    logAudit(env, {
      tenant_id,
      user_id: 'voixia-agent',
      action: 'voixia.resolve_phone',
      resource_type: 'phone_mapping',
      changes: { phone: phone, found: !!resolved, via_caller: !!resolved?.via_caller }
    }).catch(() => {});

    // Numero non trouve — retour par defaut avec template generaliste
    if (!resolved) {
      const defaultTemplate = await env.DB.prepare(`
        SELECT system_prompt, llm_provider, llm_model, voice_id
        FROM ai_sector_templates WHERE secteur = 'generaliste' LIMIT 1
      `).first();

      return successResponse({
        tenant_id: null,
        company_name: null,
        prompt_type: 'generaliste',
        api_key: null,
        llm_provider: defaultTemplate?.llm_provider || 'mistral',
        llm_model: defaultTemplate?.llm_model || 'mistral-large-latest',
        voice_id: defaultTemplate?.voice_id || 'cgSgspJ2msm6clMCkdW9',
        system_prompt: defaultTemplate?.system_prompt || null,
        message: 'Numero non associe a un tenant — config generaliste par defaut'
      });
    }

    // Si config tenant trouvee mais pas de system_prompt → fallback template sectoriel
    let systemPrompt = resolved.system_prompt || null;
    let llmProvider = resolved.llm_provider || 'mistral';
    let llmModel = resolved.llm_model || 'mistral-large-latest';
    let voiceId = resolved.voice_id || 'cgSgspJ2msm6clMCkdW9';
    // SOURCE UNIQUE : secteur vient de tenants.sector
    const secteur = resolved.sector || 'generaliste';

    if (!systemPrompt) {
      const template = await env.DB.prepare(`
        SELECT system_prompt, llm_provider, llm_model, voice_id
        FROM ai_sector_templates WHERE secteur = ? LIMIT 1
      `).bind(secteur).first();

      if (template) {
        systemPrompt = template.system_prompt;
        llmProvider = resolved.llm_provider || template.llm_provider;
        llmModel = resolved.llm_model || template.llm_model;
        voiceId = resolved.voice_id || template.voice_id;
      }
    }

    // Numero trouve — retourner config complete (format identique pour agent Python)
    return successResponse({
      tenant_id: resolved.tenant_id,
      company_name: resolved.company_name,
      sector: secteur,
      prompt_type: secteur,
      api_key: resolved.api_key,
      llm_provider: llmProvider,
      llm_model: llmModel,
      voice_id: voiceId,
      system_prompt: systemPrompt,
      active_prompt_id: resolved.active_prompt_id || null,
      prompt_version: resolved.prompt_version || null,
      message: 'Tenant resolu avec succes'
    });

  } catch (error) {
    logger.error('VoixIA resolve-phone error', { error: error.message, phone });
    return errorResponse('Erreur lors de la resolution du numero', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/voixia/transfer — Transférer vers un humain
// ═══════════════════════════════════════════════════════════════

async function handleTransferToHuman(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;

  let body = {};
  try {
    body = await request.json();
  } catch {
    // Body optionnel
  }
  const { reason, caller_phone } = body;

  // Verifier la config transfert dans voixia_configs
  let transferEnabled = false;
  let transferNumber = null;
  try {
    const config = await env.DB.prepare(`
      SELECT transfer_enabled, transfer_number FROM voixia_configs
      WHERE tenant_id = ?
    `).bind(tenant_id).first();
    transferEnabled = config?.transfer_enabled === 1;
    transferNumber = config?.transfer_number || null;
  } catch {
    // Non bloquant
  }

  // Logger le transfert
  await logAudit(env, {
    tenant_id,
    user_id: 'voixia-agent',
    action: 'voixia.transfer_to_human',
    resource_type: 'call',
    changes: { reason: reason || 'Demande client', caller_phone: caller_phone || null, transfer_enabled: transferEnabled }
  });

  // Si transfert actif et numero disponible → transferer
  if (transferEnabled && transferNumber) {
    logger.info('VoixIA — transfert actif vers humain', { tenant_id, reason, transferNumber });
    return successResponse({
      transfer_possible: true,
      transfer_number: transferNumber,
      message: 'Transfert vers un conseiller en cours',
      reason: reason || 'Demande client'
    });
  }

  // Sinon → proposer un rappel (callback)
  logger.info('VoixIA — transfert impossible, proposer rappel', { tenant_id, reason, transferEnabled });
  return successResponse({
    transfer_possible: false,
    action: 'propose_callback',
    message: 'Le transfert direct n est pas disponible. Proposez un rappel au client : demandez son nom, numero et creneau prefere. Utilisez ensuite create_prospect avec status callback_requested et send_sms pour confirmer.',
    reason: reason || 'Demande client'
  });
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/voixia/tools/knowledge — Alias GET pour knowledge
// ═══════════════════════════════════════════════════════════════

async function handleSearchKnowledgeGET(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || url.searchParams.get('question') || '';

  if (!query) return errorResponse('Paramètre query requis', 400);

  // Splitter la question en mots significatifs (>= 3 caracteres) pour recherche OR
  const getStopWords = new Set(['les', 'des', 'une', 'est', 'que', 'qui', 'dans', 'pour', 'sur', 'par', 'avec', 'son', 'ses', 'vos', 'nos', 'aux', 'ont', 'sont', 'quels', 'quel', 'quelle', 'quelles', 'comment', 'vous']);
  const getSearchWords = query
    .toLowerCase()
    .replace(/[^a-zA-ZÀ-ÿ\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !getStopWords.has(w));
  if (getSearchWords.length === 0) getSearchWords.push(query);

  // ── OPTIMISE BUG #011 : reutilise _searchKnowledgeText (3 niveaux en parallele) ──
  const results = await _searchKnowledgeText(env, tenant_id, getSearchWords, 5);

  // Selectionner la meilleure answer : source_type='text' en priorite, tronquee a 500 chars
  const textResults = results.filter(r => r.source_type === 'text');
  const bestResult = textResults.length > 0 ? textResults[0] : results[0];
  const answer = bestResult?.content?.substring(0, 500) || null;

  return successResponse({
    results,
    count: results.length,
    answer,
    found: !!answer,
    message: results.length > 0
      ? `${results.length} résultat(s) trouvé(s)`
      : 'Aucun résultat trouvé dans la base de connaissances'
  });
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/voixia/log-call — Logger un appel termine
// Appele par l'agent Python VoixIA a la fin de chaque appel
// ═══════════════════════════════════════════════════════════════

async function handleLogCall(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;

  let body = {};
  try {
    body = await request.json();
  } catch {
    return errorResponse('Body JSON requis', 400);
  }

  const {
    caller_phone,
    duration_seconds,
    status = 'completed',
    direction = 'inbound',
    transcript,
    summary
  } = body;

  if (!caller_phone) {
    return errorResponse('caller_phone requis', 400);
  }

  try {
    const callId = generateId('call');

    // 1. Inserer dans calls (table principale)
    await env.DB.prepare(`
      INSERT INTO calls (id, tenant_id, from_number, to_number, direction, status, duration, transcript, started_at, ended_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' seconds'), datetime('now'), datetime('now'))
    `).bind(
      callId,
      tenant_id,
      caller_phone,
      '',
      direction,
      status,
      duration_seconds || 0,
      transcript || null,
      duration_seconds || 0
    ).run();

    // 2. Inserer dans ai_interaction_logs (table analytics)
    await env.DB.prepare(`
      INSERT INTO ai_interaction_logs (tenant_id, canal, call_duration_seconds, success, transcript, created_at)
      VALUES (?, 'voice', ?, ?, ?, datetime('now'))
    `).bind(
      tenant_id,
      duration_seconds || 0,
      status === 'completed' ? 1 : 0,
      transcript || null
    ).run();

    // 3. Si summary, inserer dans call_summaries
    if (summary) {
      const summaryId = generateId('cs');
      await env.DB.prepare(`
        INSERT INTO call_summaries (id, call_id, tenant_id, summary, duration, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `).bind(summaryId, callId, tenant_id, summary, duration_seconds || 0).run();
    }

    // 4. Dedup prospect + lier au call
    if (caller_phone) {
      try {
        const { prospect } = await findOrCreateProspect(env, tenant_id, {
          phone: caller_phone,
          source: 'voixia_call'
        });
        if (prospect?.id) {
          await env.DB.prepare(
            `UPDATE calls SET prospect_id = ? WHERE id = ? AND tenant_id = ?`
          ).bind(prospect.id, callId, tenant_id).run();
        }
      } catch (e) {
        logger.warn('VoixIA log-call — dedup prospect echoue', { error: e.message });
      }
    }

    await logAudit(env, {
      tenant_id,
      user_id: 'voixia-agent',
      action: 'voixia.call.logged',
      resource_type: 'call',
      resource_id: callId,
      changes: { caller_phone, duration_seconds, status }
    });

    return successResponse({
      call_id: callId,
      logged: true,
      message: 'Appel logge avec succes'
    });

  } catch (error) {
    logger.error('VoixIA log-call error', { error: error.message });
    return errorResponse('Erreur lors du logging de l appel', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// AGENTS — Liste, création, versions, activation
// ═══════════════════════════════════════════════════════════════

async function handleGetAgents(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  try {
    const result = await env.DB.prepare(`
      SELECT
        vc.id,
        vc.agent_name,
        vc.agent_type,
        vc.llm_model,
        vc.llm_provider,
        vc.voice_id,
        vc.secteur,
        vc.active_prompt_id,
        vc.transfer_enabled,
        vc.transfer_number,
        vc.updated_at,
        apv.id as prompt_id,
        apv.secteur as prompt_secteur,
        apv.is_active,
        SUBSTR(apv.system_prompt, 1, 150) as prompt_preview,
        (SELECT COUNT(*) FROM ai_prompt_versions apv2
         WHERE apv2.tenant_id = vc.tenant_id) as versions_count
      FROM voixia_configs vc
      LEFT JOIN ai_prompt_versions apv ON apv.id = vc.active_prompt_id
      WHERE vc.tenant_id = ?
      ORDER BY vc.updated_at DESC
    `).bind(auth.tenant_id).all();

    return successResponse({ agents: result.results || [] });
  } catch (error) {
    logger.error('Get agents error', { error: error.message });
    return errorResponse('Erreur lors du chargement des agents', 500);
  }
}

async function handleGetAgentVersions(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  try {
    const result = await env.DB.prepare(`
      SELECT id, secteur, canal, version, is_active, created_at, activated_at,
        SUBSTR(system_prompt, 1, 200) as preview
      FROM ai_prompt_versions
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).bind(auth.tenant_id).all();

    return successResponse({ versions: result.results || [] });
  } catch (error) {
    logger.error('Get agent versions error', { error: error.message });
    return errorResponse('Erreur lors du chargement des versions', 500);
  }
}

async function handleCreateAgentConfig(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  let body;
  try { body = await request.json(); } catch { return errorResponse('Body JSON invalide', 400); }

  const {
    agent_name = 'Assistant',
    agent_type = 'single_prompt',
    template_id = null,
    secteur = 'generaliste',
    company_name = '',
    horaires = '',
    telephone = '',
  } = body;

  try {
    let systemPrompt = '';

    // 1. Récupérer le prompt depuis un template
    if (template_id && agent_type === 'single_prompt') {
      const tmpl = await env.DB.prepare(
        'SELECT system_prompt FROM ai_sector_templates WHERE secteur = ?'
      ).bind(template_id).first();
      if (tmpl) systemPrompt = tmpl.system_prompt;
    }
    if (template_id && agent_type === 'conversational_flow') {
      const tmpl = await env.DB.prepare(
        'SELECT greeting FROM voixia_templates WHERE id = ?'
      ).bind(template_id).first();
      if (tmpl) systemPrompt = tmpl.greeting || '';
    }

    // Fallback si pas de template
    if (!systemPrompt) {
      systemPrompt = `Tu es ${agent_name}, assistant vocal IA de ${company_name || 'votre entreprise'}.`;
    }

    // 2. Remplacer les variables
    systemPrompt = systemPrompt
      .replace(/\{ASSISTANT_NAME\}/g, agent_name)
      .replace(/\{NOM_AGENT\}/g, agent_name)
      .replace(/\{COMPANY_NAME\}/g, company_name || 'votre entreprise')
      .replace(/\{NOM_ENTREPRISE\}/g, company_name || 'votre entreprise')
      .replace(/\{HORAIRES\}/g, horaires || 'horaires habituels')
      .replace(/\{TELEPHONE\}/g, telephone || '');

    // 3. Trouver la version max
    const maxV = await env.DB.prepare(
      'SELECT MAX(version) as mv FROM ai_prompt_versions WHERE tenant_id = ? AND secteur = ?'
    ).bind(auth.tenant_id, secteur).first();
    const nextVersion = (maxV?.mv || 0) + 1;

    // 4. Créer le prompt
    const ins = await env.DB.prepare(`
      INSERT INTO ai_prompt_versions (tenant_id, canal, secteur, version, system_prompt, is_active, notes)
      VALUES (?, 'voice', ?, ?, ?, 0, ?)
    `).bind(auth.tenant_id, secteur, nextVersion, systemPrompt, `Agent ${agent_name} cree`).run();
    const promptId = ins.meta?.last_row_id;

    // 5. Désactiver tous les prompts + activer celui-ci
    await env.DB.prepare(
      'UPDATE ai_prompt_versions SET is_active = 0 WHERE tenant_id = ?'
    ).bind(auth.tenant_id).run();
    await env.DB.prepare(
      'UPDATE ai_prompt_versions SET is_active = 1, activated_at = datetime(\'now\') WHERE id = ?'
    ).bind(promptId).run();

    // 6. Upsert voixia_configs
    await env.DB.prepare(`
      INSERT INTO voixia_configs (tenant_id, agent_name, agent_type, active_prompt_id, secteur, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id) DO UPDATE SET
        agent_name = excluded.agent_name,
        agent_type = excluded.agent_type,
        active_prompt_id = excluded.active_prompt_id,
        secteur = excluded.secteur,
        updated_at = datetime('now')
    `).bind(auth.tenant_id, agent_name, agent_type, promptId, secteur).run();

    return successResponse({
      agent_name,
      agent_type,
      prompt_id: promptId,
      version: nextVersion,
      message: 'Agent cree avec succes'
    }, 201);
  } catch (error) {
    logger.error('Create agent error', { error: error.message });
    return errorResponse('Erreur lors de la creation de l agent', 500);
  }
}

async function handleDeleteAgent(request, env, agentId) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  try {
    // Soft delete : désactiver tous les prompts du tenant
    await env.DB.prepare(
      'UPDATE ai_prompt_versions SET is_active = 0 WHERE tenant_id = ?'
    ).bind(auth.tenant_id).run();

    // Retirer l'active_prompt_id
    await env.DB.prepare(
      'UPDATE voixia_configs SET active_prompt_id = NULL, updated_at = datetime(\'now\') WHERE id = ? AND tenant_id = ?'
    ).bind(agentId, auth.tenant_id).run();

    return successResponse({ message: 'Agent desactive' });
  } catch (error) {
    logger.error('Delete agent error', { error: error.message });
    return errorResponse('Erreur lors de la suppression', 500);
  }
}

async function handleActivateVersion(request, env, versionId) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  try {
    // Vérifier que la version appartient au tenant
    const version = await env.DB.prepare(
      'SELECT id, secteur FROM ai_prompt_versions WHERE id = ? AND tenant_id = ?'
    ).bind(versionId, auth.tenant_id).first();
    if (!version) return errorResponse('Version non trouvee', 404);

    // Désactiver toutes les versions
    await env.DB.prepare(
      'UPDATE ai_prompt_versions SET is_active = 0 WHERE tenant_id = ?'
    ).bind(auth.tenant_id).run();

    // Activer cette version
    await env.DB.prepare(
      'UPDATE ai_prompt_versions SET is_active = 1, activated_at = datetime(\'now\') WHERE id = ?'
    ).bind(versionId).run();

    // Mettre à jour voixia_configs
    await env.DB.prepare(`
      UPDATE voixia_configs SET active_prompt_id = ?, secteur = ?, updated_at = datetime('now')
      WHERE tenant_id = ?
    `).bind(versionId, version.secteur, auth.tenant_id).run();

    return successResponse({ activated: true, version_id: versionId });
  } catch (error) {
    logger.error('Activate version error', { error: error.message });
    return errorResponse('Erreur lors de l activation', 500);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/v1/voixia/create-task — Créer tâche + affectation intelligente
// ═══════════════════════════════════════════════════════════════════════════════

async function handleCreateTask(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);
  const tenant_id = auth.tenant_id;

  let body;
  try { body = await request.json(); } catch { return errorResponse('Body JSON invalide', 400); }

  const { contact_name, contact_phone, task_type_keywords, description, secteur, call_transcript, kb_response, kb_satisfied } = body;
  if (!description) return errorResponse('description requis', 400);

  try {
    // 1. Chercher task_type via keywords
    let taskType = null;
    if (task_type_keywords) {
      const words = task_type_keywords.split(/[\s,]+/).filter(w => w.length > 2);
      if (words.length > 0) {
        const conditions = words.slice(0, 5).map(() => "keywords LIKE '%' || ? || '%'");
        // FIX B3 : chercher dans task_types du tenant OU globaux (tenant_id = 'global')
        let sql, params;
        if (secteur) {
          sql = `SELECT * FROM task_types WHERE (tenant_id = ? OR tenant_id = 'global') AND secteur = ? AND (${conditions.join(' OR ')}) ORDER BY CASE WHEN tenant_id = ? THEN 0 ELSE 1 END, CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END LIMIT 1`;
          params = [tenant_id, secteur, ...words.slice(0, 5), tenant_id];
        } else {
          sql = `SELECT * FROM task_types WHERE (tenant_id = ? OR tenant_id = 'global') AND (${conditions.join(' OR ')}) ORDER BY CASE WHEN tenant_id = ? THEN 0 ELSE 1 END, CASE priority WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END LIMIT 1`;
          params = [tenant_id, ...words.slice(0, 5), tenant_id];
        }
        taskType = await env.DB.prepare(sql).bind(...params).first();
      }
    }

    // 2. Chercher assignee via member_skills (prioritaire) puis assignment_rules (fallback)
    let assigneeId = null;
    let assigneeName = null;
    let assigneePhone = null;

    if (taskType) {
      // Priorite 1: member_skills
      const skill = await env.DB.prepare(
        `SELECT ms.member_id, ca.first_name || ' ' || ca.last_name as assignee_name, ca.phone as assignee_phone
         FROM member_skills ms
         JOIN commercial_agents ca ON ca.id = ms.member_id AND ca.is_active = 1
         WHERE ms.tenant_id = ? AND ms.task_type_id = ? AND ms.skill_type = 'task' AND ms.is_active = 1
         ORDER BY ms.priority ASC LIMIT 1`
      ).bind(tenant_id, taskType.id).first();

      if (skill) {
        assigneeId = skill.member_id;
        assigneeName = skill.assignee_name;
        assigneePhone = skill.assignee_phone;
      } else {
        // Priorite 2: assignment_rules (retrocompatibilite)
        const rule = await env.DB.prepare(
          `SELECT ar.assignee_id, ar.assignee_name, ca.phone as assignee_phone
           FROM assignment_rules ar
           LEFT JOIN commercial_agents ca ON ca.id = ar.assignee_id
           WHERE ar.tenant_id = ? AND ar.task_type_id = ? AND ar.is_active = 1
           ORDER BY ar.priority ASC LIMIT 1`
        ).bind(tenant_id, taskType.id).first();

        if (rule) {
          assigneeId = rule.assignee_id;
          assigneeName = rule.assignee_name;
          assigneePhone = rule.assignee_phone;
        }
      }
    }

    // 3. Fallback — chercher par default_assignee_role
    if (!assigneeId && taskType && taskType.default_assignee_role) {
      const agent = await env.DB.prepare(
        `SELECT id, first_name || ' ' || last_name as name, phone
         FROM commercial_agents
         WHERE tenant_id = ? AND specialties LIKE '%' || ? || '%' AND is_active = 1
         LIMIT 1`
      ).bind(tenant_id, taskType.default_assignee_role).first();
      if (agent) {
        assigneeId = agent.id;
        assigneeName = agent.name;
        assigneePhone = agent.phone;
      }
    }

    // 4. Créer la tâche
    const taskId = generateId('task');
    const title = taskType ? `${taskType.name} — ${contact_name || 'Inconnu'}` : (description.slice(0, 80) || 'Nouvelle tâche');
    const priority = taskType ? taskType.priority : 'normal';

    await env.DB.prepare(
      `INSERT INTO tasks (id, tenant_id, task_type_id, title, description, priority, assignee_id, assignee_name, contact_name, contact_phone, source, call_transcript, kb_response, kb_satisfied)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'voixia', ?, ?, ?)`
    ).bind(
      taskId, tenant_id, taskType?.id || null, title, description, priority,
      assigneeId, assigneeName, contact_name || null, contact_phone || null,
      call_transcript || null, kb_response || null, kb_satisfied ? 1 : 0
    ).run();

    // 5. SMS à l'assignee (non-bloquant)
    let smsSent = false;
    if (assigneePhone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER) {
      const priorityLabel = priority === 'high' ? 'URGENT' : 'Normale';
      const smsBody = `Nouvelle tâche [${priorityLabel}] : ${title}\nContact : ${contact_name || 'Inconnu'} — ${contact_phone || 'N/A'}\nVia Coccinelle.ai`;
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
        const formData = new URLSearchParams();
        formData.append('To', assigneePhone);
        formData.append('From', env.TWILIO_PHONE_NUMBER);
        formData.append('Body', smsBody);
        const twilioResp = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });
        smsSent = twilioResp.ok;
      } catch (e) {
        logger.warn('Task SMS envoi échoué', { error: e.message });
      }
    }

    // Audit non-bloquant
    logAudit(env, {
      tenant_id, user_id: 'voixia-agent',
      action: 'voixia.create_task',
      resource_type: 'task', resource_id: taskId,
      changes: { task_type: taskType?.name, assignee: assigneeName, priority, sms_sent: smsSent }
    }).catch(() => {});

    logger.info('VoixIA task created', { taskId, taskType: taskType?.name, assignee: assigneeName, priority });

    return successResponse({
      task_id: taskId,
      task_type_name: taskType?.name || null,
      assignee_name: assigneeName || null,
      priority,
      sms_sent: smsSent,
    });
  } catch (error) {
    logger.error('VoixIA create-task error', { error: error.message });
    return errorResponse('Erreur création tâche', 500);
  }
}
