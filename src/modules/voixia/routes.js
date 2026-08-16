// Module VoixIA — Routes API dédiées
// Endpoints appelés par l'agent vocal VoixIA pendant les appels téléphoniques.
// Auth par clé API (X-VoixIA-Key) — pas de JWT/session.
// Chaque endpoint réutilise la logique métier existante sans la modifier.

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { generateId, logAudit } from '../auth/helpers.js';
import { minutesDepuisMinuit, jourSemaineNaive } from '../shared/dates.js';
import { requireVoixIAAuth } from './auth.js';
import { findOrCreateProspect } from '../prospects/dedup.js';
import { findPrestationByName, findPrestationDurationById } from '../shared/prestations.js';
import {
  buildSectorPrompt,
  applyPromptVariables,
  normalizeSector,
} from '../shared/sector-prompts.js';
// L'envoi tracé remplace l'appel Twilio direct : il porte la règle du lien,
// la compaction GSM-7 et la trace en conversation. `enrichirSmsAvecLien` n'est
// plus importée ici — la redécider à ce niveau serait la dupliquer.
import { envoyerSmsTrace } from '../shared/sms-envoi.js';
import {
  classerFiches,
  detecterAmbiguite,
  plier as plierFiche,
} from '../shared/kb-fiches.js';

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
        message: `Ce créneau est déjà pris. Souhaitez-vous un autre horaire ?`,
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

  // 1. Jour de la semaine, canonique 1=lundi … 7=dimanche.
  // La conversion 0→7 vit desormais dans `shared/dates.js` : elle etait recopiee a la
  // main dans quatre fichiers, et c'est precisement dans le quatrieme
  // (`twilio/conversation.js`) qu'elle avait ete oubliee — le dimanche y etait
  // toujours annonce indisponible.
  const dayOfWeek = jourSemaineNaive(date);

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
    // ── Durcissement (chantier DATES, 16/08/2026) ──
    // Avant : `new Date(a.scheduled_at)` puis `getUTCHours()`. C'etait JUSTE, mais par
    // COMPENSATION : un Worker tourne en UTC, donc les composantes d'une heure murale
    // y sont posees en UTC, et les relire en UTC rend le bon chiffre. Deux erreurs qui
    // s'annulent. Le jour ou le runtime ne serait plus en UTC, ce calcul basculerait
    // sans bruit, et rien dans le code ne disait qu'il en dependait.
    // `minutesDepuisMinuit()` lit le TEXTE : aucune dependance au fuseau.
    const startMin = minutesDepuisMinuit(a.scheduled_at);
    if (startMin === null) continue;   // ligne abimee : on ne la traite pas au hasard
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

  // ── Envoi TRACÉ (chantier CX-3, 15/08/2026) ──
  //
  // C'est le chemin du DEVIS : l'agent vocal envoie ici ses devis, ses réponses
  // tarifaires et ses récapitulatifs d'appel. Le message le plus important du
  // produit, et il n'était enregistré NULLE PART.
  //
  // Ce bloc faisait son propre appel Twilio puis un
  // `INSERT INTO sms_messages` — une table qui N'EXISTE PAS dans
  // `coccinelle-db-eu`. L'erreur était avalée par un `catch {}` commenté « Table
  // peut ne pas exister — non bloquant ». Et même si elle avait existé, la ligne
  // stockait `message` (le texte brut) et non le corps réellement parti : ni le
  // lien de réservation, ni la compaction GSM-7. La trace aurait été fausse.
  //
  // `envoyerSmsTrace` fait les trois choses en une : la règle du lien
  // (`shared/sms-booking-link.js`), l'envoi, et la trace dans
  // omni_conversations / omni_messages — donc la visibilité dans la fiche du
  // contact et dans « Mes communications ».
  //
  // ⚠️ `body.type` reste le type par défaut `information` : l'outil Python
  // (`voixia/agent/tools/messaging.py:78`) n'envoie que `{to, message}`. Lui
  // faire passer `devis` demande un déploiement de l'agent — hors de ce lot.
  const envoi = await envoyerSmsTrace(env, {
    tenantId: tenant_id,
    to,
    message,
    type: body.type || 'information',
    nomContact: body.nom_contact || null,
  });

  if (!envoi.envoye) {
    logger.error('VoixIA — échec envoi SMS', { erreur: envoi.erreur, tenant_id });
    return errorResponse(envoi.erreur || 'Échec de l\'envoi du SMS', 400);
  }

  await logAudit(env, {
    tenant_id,
    user_id: 'voixia-agent',
    action: 'voixia.sms.send',
    resource_type: 'sms',
    resource_id: envoi.sid,
    // Le corps RÉEL, celui qui est parti — pas le brut reçu en entrée.
    changes: { to, message_preview: (envoi.corps || message).substring(0, 50) }
  });

  logger.info('VoixIA — SMS envoyé', { messageSid: envoi.sid, to, tenant_id });

  return successResponse({
    message: `SMS envoyé à ${to}`,
    sms: {
      message_sid: envoi.sid,
      to,
      status: 'sent',
      segments: envoi.segments,
    }
  });
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

  // ── LightRAG : COUPE PAR DEFAUT (fail-safe, 08/08/2026) ──
  //
  // L'index LightRAG n'est PAS multi-tenant : rien n'y ingere jamais la KB d'un
  // client (aucun code d'ingestion dans ce depot) et la requete ne portait ni
  // tenant_id ni workspace. Tous les tenants recevaient donc le meme index, qui
  // ne contenait que la documentation commerciale de Coccinelle.ai : un garage
  // s'est vu repondre « Tarif Essentiel 79 euros par mois » sur une question de
  // vidange, puis a invente ses propres tarifs et un faux numero.
  //
  // Le flag etait fail-open (`!== 'false'` + variable absente = actif). Il est
  // desormais fail-safe : SEUL `LIGHTRAG_ENABLED = "true"` le reactive. Ne pas
  // le remettre sans (a) une ingestion par tenant et (b) un filtre par tenant
  // cote LightRAG — sinon la fuite inter-tenant revient telle quelle.
  const lightragEnabled = env.LIGHTRAG_ENABLED === 'true' && env.LIGHTRAG_URL && env.LIGHTRAG_API_KEY;
  let lightragAnswer = null;
  if (lightragEnabled) {
    try {
      lightragAnswer = await _searchKnowledgeLightRAG(env, question);
    } catch (err) {
      console.log(`[KB] lightrag_failed tenant=${tenant_id} err=${err.message}`);
    }
  }

  // ── Fallback : recherche locale (vectorielle + LIKE) ──
  // ── OPTIMISE BUG #011 : preparer la recherche textuelle en parallele de l'embedding ──
  // Splitter la question en mots significatifs (>= 3 caracteres) pour recherche OR
  const stopWords = new Set(['les', 'des', 'une', 'est', 'que', 'qui', 'dans', 'pour', 'sur', 'par', 'avec', 'son', 'ses', 'vos', 'nos', 'aux', 'ont', 'sont', 'quels', 'quel', 'quelle', 'quelles', 'comment', 'vous', 'chez', 'une', 'dune', 'cest', 'pouvez', 'faites', 'propose', 'proposez']);
  // Les mots de recherche sont DESACCENTUES (08/08/2026) : le LIKE de SQLite est
  // insensible a la casse ASCII mais PAS aux accents. « delai » ne matchait pas
  // « Delai » et inversement — une question sur le delai d'une courroie ne
  // trouvait rien alors que la reponse etait dans le document. Le contenu est
  // desaccentue symetriquement cote SQL (_foldSql).
  // Les CHIFFRES sont conserves (11/08/2026). Avec `[^a-z\s]`, « R1234yf »
  // devenait « r yf » puis disparaissait : le seul mot qui distingue la
  // recharge a 129 euros de celle a 79 euros n'atteignait jamais la recherche.
  // Le probleme touche toute reference technique — 5W30, un millesime, une
  // reference piece, un numero de modele.
  const searchWords = _foldAccents(question)
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));
  if (searchWords.length === 0) searchWords.push(_foldAccents(question));

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

  // ── NIVEAU 1 : les fiches (11/08/2026) ──
  // Quand la KB du client est un tableau (CSV export tableur, Markdown, PDF
  // converti), l'ingestion en a fait des FICHES : une ligne = un libelle + son
  // prix, indivisibles. On interroge ce niveau AVANT toute extraction par
  // fenetre de caracteres, qui coupait entre une prestation et son tarif et
  // faisait annoncer le prix de la ligne voisine (« montage equilibrage » a
  // 15 EUR repondu 25 EUR, le 11/08).
  const reponseFiche = await _repondreDepuisFiches(env, tenant_id, searchWords);
  if (reponseFiche) {
    console.log(`[KB] provenance=fiche tenant=${tenant_id} ambigu=${reponseFiche.ambigu}`);
    return successResponse({
      results,
      count: results.length,
      answer: reponseFiche.answer,
      found: true,
      ambiguous: reponseFiche.ambigu,
      search_type: 'fiche',
      source: reponseFiche.source,
      message: `${results.length} résultat(s) trouvé(s)`,
    });
  }

  // ── Selection de la reponse ──
  // Priorite source_type='text' (saisie manuelle du client) puis ordre de la requete.
  const textPriorityResults = results.filter(r => r.source_type === 'text');
  const ordered = textPriorityResults.length > 0
    ? [...textPriorityResults, ...results.filter(r => r.source_type !== 'text')]
    : results;

  // MULTI-PASSAGES (08/08/2026) : jusqu'a 2 extraits pertinents concatenes.
  // Une question a deux facettes (« le delai ET le tarif d'une courroie »)
  // trouvait sa reponse eclatee dans deux sections du meme document ; un seul
  // extrait de 500 caracteres n'en rapportait qu'une moitie.
  //
  // SEUIL DE PERTINENCE : un extrait n'est retenu que s'il couvre reellement la
  // question. Sans ce seuil, un OR sur un mot courant (« changement »,
  // « distribution ») suffisait a declarer found=true avec un passage hors sujet
  // — l'agent recevait « j'ai trouve » + du texte inutile et inventait un prix
  // (les 69 euros du 08/08). Desormais : hors sujet => found=false => porte de
  // sortie, qui elle fonctionne.
  // Les deux extraits peuvent venir du MEME document : une question a deux
  // facettes (« le delai ET le tarif d'une courroie ») a sa reponse eclatee
  // entre deux sections d'une meme fiche. Ne prendre qu'un extrait par document
  // renvoyait la section DELAIS sans la ligne courroie, et le seuil de
  // pertinence rejetait le tout — l'agent partait sur la porte de sortie alors
  // que la reponse etait en base.
  //
  // Le PREMIER extrait doit etre franchement pertinent (c'est lui qui autorise
  // found=true) ; le SECOND ne sert que de complement et se contente d'un mot
  // recherche, sinon on perd la moitie des reponses a deux facettes.
  const passages = [];
  // Le resultat qui a fourni le PREMIER passage : c'est lui qui porte la
  // reponse, donc lui que le dashboard doit proposer de corriger.
  let porteur = null;
  for (const r of ordered) {
    if (passages.length >= 2) break;
    for (const p of _extractPassages(r.content, searchWords, 2 - passages.length)) {
      if (passages.includes(p)) continue;
      const gardeFou = passages.length === 0
        ? _passageEstPertinent(p, searchWords)
        : _contientUnMotRecherche(p, searchWords);
      if (gardeFou) {
        if (!porteur) porteur = r;
        passages.push(p);
      }
      if (passages.length >= 2) break;
    }
  }
  let answer = passages.length > 0 ? passages.join(' … ') : null;
  let source = answer ? _sourceDePassage(porteur) : null;

  // Un resultat LightRAG ne sert que de COMPLEMENT quand la KB du tenant n'a rien
  // — jamais de court-circuit. Avant, il etait consulte en premier et renvoye tel
  // quel des qu'il faisait 10 caracteres, « je n'ai pas assez d'informations »
  // compris : la KB du client n'etait alors jamais lue.
  if (!answer && lightragAnswer) {
    answer = lightragAnswer;
    searchType = 'lightrag';
    // LightRAG n'est pas multi-tenant : sa reponse ne correspond a AUCUN
    // document du client, donc a rien de corrigeable.
    source = null;
  }

  // Coordonnees du tenant : elles vivent dans `tenants`, PAS dans la KB. Un
  // client qui demande « quel est votre numero ? » ne trouvait donc rien, et
  // l'agent inventait un numero plausible (05 61 ... a Toulouse le 08/08).
  if (!answer) {
    const contact = await _answerFromTenantContact(env, tenant_id, question);
    if (contact) {
      answer = contact;
      searchType = 'tenant_contact';
      // Ces coordonnees vivent dans `tenants`, pas dans la base de
      // connaissances : elles se corrigent depuis « Mon Assistant ».
      source = { type: 'tenant', libelle: 'coordonnées de l\'entreprise' };
    }
  }

  const found = !!answer;
  console.log(`[KB] provenance=${searchType} tenant=${tenant_id} found=${found} results=${results.length}`);
  return successResponse({
    results,
    count: results.length,
    answer,
    source: found ? source : null,
    // `found` reflete une VRAIE reponse. Un `found: true` sur un « je ne sais pas »
    // pousse l'agent a inventer : MOTS INTERDITS lui interdit de dire qu'il ignore.
    found,
    search_type: searchType,
    message: found
      ? `${results.length} résultat(s) trouvé(s)`
      : 'Aucun résultat trouvé dans la base de connaissances'
  });
}

/**
 * Desaccentue et met en minuscules — normalisation commune a la question et au
 * contenu. Sans elle, `LIKE '%delai%'` ne trouve pas « Delai » et `'%délai%'`
 * ne trouve pas « delai » : le LIKE de SQLite ignore la casse ASCII, pas les
 * accents.
 */
// Remplacement caractere par caractere (1:1) et NON via NFD : la normalisation
// NFD raccourcit la chaine (« é » -> « e » + accent combinant supprime), ce qui
// decalerait toutes les positions utilisees par l'extraction de passage.
const _CARTE_ACCENTS = {
  'á': 'a', 'à': 'a', 'â': 'a', 'ä': 'a', 'ã': 'a', 'å': 'a',
  'é': 'e', 'è': 'e', 'ê': 'e', 'ë': 'e',
  'í': 'i', 'ì': 'i', 'î': 'i', 'ï': 'i',
  'ó': 'o', 'ò': 'o', 'ô': 'o', 'ö': 'o', 'õ': 'o',
  'ú': 'u', 'ù': 'u', 'û': 'u', 'ü': 'u',
  'ç': 'c', 'ñ': 'n', 'ÿ': 'y',
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVENANCE DE LA REPONSE (chantier CX-2)
//
// L'endpoint renvoyait `answer` sans jamais dire d'ou elle venait. Le dashboard
// ne pouvait donc ni afficher « Source : … », ni proposer de corriger la valeur,
// ni supprimer l'information fautive. Ces trois actions sont toute la page
// « Ce que sait votre assistant ».
//
// Ajout STRICTEMENT additif : l'agent Python lit `answer` et `found`, il ignore
// les cles qu'il ne connait pas.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * D'ou vient un document, en langage client. Reprend les libelles de la maquette
 * (« tarifs.csv », « garage-martin.fr », « Google Business », « ajouté
 * manuellement ») — jamais de vocabulaire technique (regle i.15).
 */
function _origineDocument({ title, source_type, source_url } = {}) {
  if (source_type === 'google_business') return 'Google Business';
  if (source_url) {
    try { return new URL(source_url).hostname.replace(/^www\./, ''); } catch { /* titre */ }
  }
  if (source_type === 'text' || source_type === 'manual') return title || 'ajouté manuellement';
  return title || 'base de connaissances';
}

/** Provenance d'une reponse portee par une fiche : corrigeable ligne a ligne. */
function _sourceDeFiche(fiche) {
  if (!fiche) return null;
  const origine = _origineDocument({
    title: fiche.titre, source_type: fiche.source_type, source_url: fiche.source_url,
  });
  return {
    type: 'fiche',
    document_id: fiche.document_id || null,
    chunk_id: fiche.chunk_id || null,
    titre: fiche.titre || null,
    source_type: fiche.source_type || null,
    source_url: fiche.source_url || null,
    libelle: fiche.libelle || null,
    prix: fiche.prix || null,
    // `ligne` absent = fiche indexee avant CX-2 : lisible, mais pas corrigeable
    // en ligne tant que le document n'a pas ete re-ingere.
    ligne: Number.isInteger(fiche.ligne) ? fiche.ligne : null,
    modifiable: Number.isInteger(fiche.ligne) && !!fiche.document_id,
    label: `${origine} — fiche ${fiche.libelle || ''}`.trim(),
  };
}

/** Provenance d'une reponse extraite d'un texte redige : le document entier. */
function _sourceDePassage(resultat) {
  if (!resultat || !resultat.document_id) return null;
  const origine = _origineDocument({
    title: resultat.source_title,
    source_type: resultat.source_type,
    source_url: resultat.source_url,
  });
  return {
    type: 'document',
    document_id: resultat.document_id,
    chunk_id: resultat.chunk_id || null,
    titre: resultat.source_title || null,
    source_type: resultat.source_type || null,
    source_url: resultat.source_url || null,
    libelle: null,
    prix: null,
    ligne: null,
    // Un texte redige se corrige en entier, pas ligne a ligne : le dashboard
    // ouvre le document au lieu de proposer l'edition en ligne.
    modifiable: false,
    label: origine,
  };
}

/**
 * NIVEAU FICHE — repond depuis les lignes normalisees d'un tableau.
 *
 * Une fiche est indivisible : « Montage equilibrage : 15 euros (par pneu). »
 * Elle ne peut donc pas etre tronquee entre le libelle et le prix, ce qui etait
 * la cause du 25 EUR annonce a la place du 15 EUR.
 *
 * Retourne null si aucune fiche ne repond — le chemin prose existant prend
 * alors le relais, inchange.
 */
async function _repondreDepuisFiches(env, tenant_id, searchWords) {
  if (!searchWords.length) return null;

  let lignes = [];
  try {
    const clauses = searchWords.map(() => `${_foldSql('kc.content')} LIKE ?`).join(' OR ');
    const res = await env.DB.prepare(`
      SELECT kc.id AS chunk_id, kc.document_id, kc.content, kc.metadata,
             kd.title, kd.source_type, kd.source_url
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kd.id = kc.document_id
      WHERE kc.tenant_id = ?
        AND kd.is_active = 1
        AND (${clauses})
      LIMIT 60
    `).bind(tenant_id, ...searchWords.map(w => `%${w}%`)).all();
    lignes = res.results || [];
  } catch (error) {
    logger.warn('VoixIA — niveau fiche indisponible, repli sur le texte', { error: error.message });
    return null;
  }

  const fiches = [];
  for (const l of lignes) {
    let meta = null;
    try { meta = JSON.parse(l.metadata || '{}'); } catch { meta = null; }
    if (!meta || meta.type !== 'fiche') continue;
    fiches.push({
      libelle: meta.libelle || '',
      prix: meta.prix || '',
      details: meta.details || '',
      categorie: meta.categorie || '',
      texte: l.content,
      index: fiches.length,
      // Provenance (CX-2). classerFiches() propage ces cles telles quelles.
      chunk_id: l.chunk_id,
      document_id: l.document_id,
      titre: l.title,
      source_type: l.source_type,
      source_url: l.source_url,
      // `ligne` peut manquer sur les fiches indexees avant CX-2 : elles restent
      // consultables, seule la correction en ligne leur est refusee.
      ligne: Number.isInteger(meta.ligne) ? meta.ligne : null,
    });
  }
  if (!fiches.length) return null;

  const classees = classerFiches(fiches, searchWords);
  const meilleure = classees[0];
  if (!meilleure || meilleure.score <= 0) return null;

  // Garde-fou : un mot de la question doit toucher le LIBELLE. Un mot trouve
  // seulement dans la colonne « details » ou « categorie » ne designe pas la
  // prestation demandee — repondre la-dessus, c'est repondre a cote avec
  // l'assurance d'un found=true.
  const libellePlie = plierFiche(meilleure.libelle);
  if (!searchWords.some(w => libellePlie.includes(w))) return null;

  const ambigu = detecterAmbiguite(classees);
  if (ambigu) {
    // Deux prestations proches a prix differents : l'agent doit demander
    // laquelle (regle 2bis du prompt) plutot que d'en choisir une au hasard.
    return {
      answer: `Deux prestations correspondent : ${ambigu[0].texte} ${ambigu[1].texte}`,
      ambigu: true,
      // Aucune source : la reponse porte DEUX fiches, en designer une seule
      // ferait corriger la mauvaise.
      source: null,
    };
  }

  return { answer: meilleure.texte, ambigu: false, source: _sourceDeFiche(meilleure) };
}

export function _foldAccents(texte) {
  return String(texte || '')
    .toLowerCase()
    .replace(/[áàâäãåéèêëíìîïóòôöõúùûüçñÿ]/g, (c) => _CARTE_ACCENTS[c] || c);
}

// Couples (accentue, ascii) appliques cote SQL pour desaccentuer le contenu.
// Limite aux caracteres reellement presents en francais : chaque paire ajoute
// un REPLACE imbrique a la requete.
const _ACCENTS_SQL = [
  ['é', 'e'], ['è', 'e'], ['ê', 'e'], ['ë', 'e'],
  ['à', 'a'], ['â', 'a'], ['ä', 'a'],
  ['î', 'i'], ['ï', 'i'],
  ['ô', 'o'], ['ö', 'o'],
  ['ù', 'u'], ['û', 'u'], ['ü', 'u'],
  ['ç', 'c'],
];

/**
 * Expression SQL desaccentuant une colonne : LOWER(REPLACE(REPLACE(col,'é','e')…)).
 * Utilisee des deux cotes de la comparaison pour que la recherche soit
 * symetrique. Le volume concerne est faible (quelques dizaines de documents par
 * tenant) : le cout d'un balayage sans index est negligeable devant une reponse
 * fausse.
 */
function _foldSql(colonne) {
  let expr = `LOWER(${colonne})`;
  for (const [accent, ascii] of _ACCENTS_SQL) {
    expr = `REPLACE(${expr}, '${accent}', '${ascii}')`;
  }
  return expr;
}

/**
 * Un passage repond-il vraiment a la question ?
 *
 * Regle : au moins DEUX mots recherches distincts presents, ou UN SEUL s'il est
 * suffisamment discriminant (>= 7 caracteres, ex. « climatisation »,
 * « distribution »). Un mot court isole (« prix », « chez ») ne suffit plus.
 */
/** Au moins un mot recherche present — garde-fou du passage COMPLEMENTAIRE. */
export function _contientUnMotRecherche(passage, searchWords) {
  const texte = _foldAccents(passage);
  return searchWords.some(mot => mot && texte.includes(mot));
}

/**
 * Extrait jusqu'a `maxPassages` zones pertinentes d'un MEME document.
 *
 * La deuxieme zone est cherchee en dehors de la fenetre deja retenue : sur une
 * fiche tarifaire, « le delai » et « la courroie » vivent dans deux sections
 * eloignees, et n'en rapporter qu'une revient a repondre a moitie.
 */
export function _extractPassages(content, searchWords, maxPassages = 2, windowSize = 500) {
  const texte = String(content || '').trim();
  if (!texte) return [];
  if (texte.length <= windowSize) return [texte];

  const passages = [];
  const zonesPrises = [];

  for (let i = 0; i < maxPassages; i++) {
    const extrait = _extractRelevantPassage(texte, searchWords, windowSize, zonesPrises);
    if (!extrait) break;
    passages.push(extrait.texte);
    zonesPrises.push([extrait.debut, extrait.fin]);
  }
  return passages;
}

export function _passageEstPertinent(passage, searchWords) {
  const texte = _foldAccents(passage);
  const trouves = new Set();
  for (const mot of searchWords) {
    if (mot && texte.includes(mot)) trouves.add(mot);
  }
  if (trouves.size >= 2) return true;
  return [...trouves].some(m => m.length >= 7);
}

/**
 * Repond aux questions de coordonnees depuis la fiche du tenant.
 *
 * Le telephone, l'adresse et l'email professionnels sont dans `tenants` — jamais
 * dans `knowledge_documents`. search_knowledge ne les exposait pas : l'agent,
 * a qui MOTS INTERDITS interdit de dire qu'il ne sait pas, inventait.
 * Retourne null si la question ne porte pas sur les coordonnees, ou si la donnee
 * demandee est absente en base (on prefere « rien trouve » a une invention).
 */
async function _answerFromTenantContact(env, tenantId, question) {
  const q = String(question || '').toLowerCase();

  const veutTelephone = /(telephone|téléphone|numero|numéro|joindre|rappeler|appeler|portable)/.test(q);
  const veutAdresse = /(adresse|situe|situé|ou etes|où êtes|ou se trouve|où se trouve|acces|accès|venir)/.test(q);
  const veutEmail = /(email|e-mail|mail|courriel)/.test(q);
  if (!veutTelephone && !veutAdresse && !veutEmail) return null;

  let t = null;
  try {
    t = await env.DB.prepare(
      'SELECT name, phone, address, email_pro FROM tenants WHERE id = ?'
    ).bind(tenantId).first();
  } catch (e) {
    logger.warn('VoixIA — lecture coordonnees tenant echouee', { error: e.message, tenantId });
    return null;
  }
  if (!t) return null;

  const parts = [];
  if (veutTelephone && t.phone) parts.push(`Notre numéro est le ${_formatPhoneFr(t.phone)}.`);
  if (veutAdresse && t.address) parts.push(`Notre adresse est ${t.address}.`);
  if (veutEmail && t.email_pro) parts.push(`Notre adresse email est ${t.email_pro}.`);

  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * +33760762153 → « 07 60 76 21 53 » (le TTS lit les paires, pas l'E.164).
 * Tout format non reconnu est renvoye tel quel.
 */
export function _formatPhoneFr(phone) {
  const raw = String(phone || '').replace(/[\s.-]/g, '');
  const national = raw.startsWith('+33') ? '0' + raw.slice(3) : raw;
  if (!/^0\d{9}$/.test(national)) return String(phone || '');
  return national.match(/\d{2}/g).join(' ');
}

/**
 * Extrait le passage le plus pertinent d'un document pour la question posee.
 *
 * Fenetre de ~500 caracteres centree sur la zone qui concentre le plus de mots
 * recherches, elargie aux frontieres de phrase pour ne pas couper en plein mot
 * (le texte part vers un TTS : une phrase tronquee s'entend).
 * Retourne null si le document est vide — l'appelant en deduit « rien trouve ».
 */
export function _extractRelevantPassage(content, searchWords, windowSize = 500, zonesPrises = []) {
  const text = String(content || '').trim();
  if (!text) return null;
  if (text.length <= windowSize) {
    return zonesPrises.length > 0 ? null : { texte: text, debut: 0, fin: text.length };
  }

  // Desaccentue en conservant les positions (cf. _CARTE_ACCENTS) : les mots
  // recherches arrivent deja desaccentues.
  const lower = _foldAccents(text);

  // Position de chaque occurrence de chaque mot recherche.
  const hits = [];
  for (const word of searchWords) {
    const w = String(word).toLowerCase();
    if (!w) continue;
    let from = 0;
    let idx = lower.indexOf(w, from);
    while (idx !== -1) {
      hits.push(idx);
      from = idx + w.length;
      idx = lower.indexOf(w, from);
    }
  }

  // Ecarter les occurrences deja couvertes par un passage precedent : c'est ce
  // qui permet au 2e extrait de porter sur une AUTRE section du document.
  const dejaPris = (pos) => zonesPrises.some(([d, f]) => pos >= d && pos < f);
  const restants = hits.filter(pos => !dejaPris(pos));

  // Aucun mot trouve dans ce document (il a matche sur le titre) → debut du doc,
  // et seulement s'il s'agit du premier extrait.
  if (hits.length === 0) {
    return zonesPrises.length > 0 ? null : _snapToSentence(text, 0, windowSize);
  }
  if (restants.length === 0) return null;

  // Meilleur point d'ancrage : l'occurrence qui a le plus de voisines dans une
  // fenetre de la taille demandee (la zone qui parle le plus du sujet). A
  // egalite de voisinage, on prefere le mot le plus discriminant — sinon
  // « delai », present deux fois dans la section DELAIS, l'emporte sur
  // « courroie » qui porte pourtant la reponse.
  let bestPos = restants[0];
  let bestScore = -1;
  for (const pos of restants) {
    const voisins = restants.filter(h => h >= pos - windowSize / 2 && h <= pos + windowSize / 2).length;
    const motLePlusLong = Math.max(
      ...searchWords.map(w => (lower.startsWith(w, pos) ? w.length : 0)),
    );
    const score = voisins * 10 + motLePlusLong;
    if (score > bestScore) {
      bestScore = score;
      bestPos = pos;
    }
  }

  // Petit recul seulement (~100 car.) : le budget de la fenetre doit servir a ce
  // qui SUIT le mot trouve, c'est la que se trouve la reponse. Un recul d'un tiers
  // de fenetre gaspillait le budget en contexte amont et coupait la reponse.
  const start = Math.max(0, bestPos - 100);
  return _snapToSentence(text, start, windowSize);
}

/**
 * Decoupe [start, start+len] en s'alignant sur des frontieres de phrase.
 * Prefixe « … » si on ne demarre pas au debut du document.
 */
export function _snapToSentence(text, start, len) {
  let from = start;
  if (from > 0) {
    // Reculer jusqu'a la fin de phrase precedente (dans une limite raisonnable).
    const before = text.lastIndexOf('.', from);
    if (before !== -1 && from - before < 120) from = before + 1;
  }
  let slice = text.slice(from, from + len).trim();

  // Couper a la derniere phrase complete (regle 8 : pas de phrase tronquee au TTS).
  if (from + len < text.length) {
    const lastStop = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('!'), slice.lastIndexOf('?'));
    if (lastStop > len / 3) slice = slice.slice(0, lastStop + 1);
  }
  // On renvoie AUSSI les bornes : l'extraction du 2e passage doit savoir quelle
  // zone du document est deja couverte.
  return {
    texte: from > 0 ? `… ${slice}` : slice,
    debut: from,
    fin: from + slice.length,
  };
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

  // Retirer la section « References » : elle est destinee a un affichage ecrit,
  // elle est lue a voix haute par l'agent.
  answer = answer.replace(/\n#{1,6}\s*R[ée]f[ée]rences?[\s\S]*$/i, '').trim();
  // Nettoyer prefixes generiques du LLM
  answer = answer.replace(/^(Based on the (available )?knowledge[^.]*\.\s*)/i, '');
  // Markdown → texte parlable (regles 8 et 9 : ni symbole ni titre au TTS).
  answer = answer
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/\n{2,}/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Une NON-REPONSE n'est pas une reponse. LightRAG repond volontiers « je n'ai
  // pas assez d'informations » : renvoyer ce texte a l'agent, alors que MOTS
  // INTERDITS lui interdit de dire qu'il ignore, le pousse mecaniquement a
  // inventer (c'est l'origine des faux tarifs et du faux numero du 08/08).
  if (_isNonAnswer(answer)) return null;
  if (answer.length < 10) return null;
  if (answer.length > 500) answer = answer.substring(0, 500);
  return answer;
}

/**
 * Detecte les formulations par lesquelles un RAG dit qu'il n'a pas trouve.
 * Volontairement large : un faux positif fait retomber sur la KB du tenant
 * (comportement souhaite), un faux negatif fait halluciner l'agent.
 */
export function _isNonAnswer(text) {
  const t = String(text || '').toLowerCase();
  if (!t) return true;
  const marqueurs = [
    "n'ai pas assez d'informations",
    "n'ai pas d'informations",
    "n'ai pas accès",
    "n'ai pas accès",
    'ne dispose pas',
    'aucune information',
    'aucune reference disponible',
    'aucune référence disponible',
    'pas en mesure de repondre',
    'pas en mesure de répondre',
    "don't have enough information",
    'no relevant information',
    'i do not have',
  ];
  return marqueurs.some(m => t.includes(m));
}

/**
 * Recherche textuelle knowledge — 3 niveaux en parallele (chunks, documents, FAQ)
 * Utilisee comme fallback rapide ou recherche principale
 */
async function _searchKnowledgeText(env, tenant_id, searchWords, topK) {
  // Lancer les 3 niveaux de recherche en parallele.
  // Les comparaisons se font sur du contenu DESACCENTUE des deux cotes
  // (_foldSql cote colonne, mots deja desaccentues cote parametre).
  const chunkLikeClauses = searchWords.map(() => `${_foldSql('kc.content')} LIKE ?`).join(' OR ');
  const chunkParams = [tenant_id, ...searchWords.map(w => `%${w}%`), topK];

  const docLikeClauses = searchWords
    .map(() => `(${_foldSql('title')} LIKE ? OR ${_foldSql('content')} LIKE ?)`).join(' OR ');
  const docParams = [tenant_id, ...searchWords.flatMap(w => [`%${w}%`, `%${w}%`]), topK];

  const faqLikeClauses = searchWords
    .map(() => `(${_foldSql('question')} LIKE ? OR ${_foldSql('answer')} LIKE ?)`).join(' OR ');
  const faqParams = [tenant_id, ...searchWords.flatMap(w => [`%${w}%`, `%${w}%`]), topK];

  // ── Lancer les 3 requetes en parallele (Promise.allSettled) ──
  const [chunksRes, docsRes, faqRes] = await Promise.allSettled([
    env.DB.prepare(`
      SELECT kc.id AS chunk_id, kc.document_id, kc.content, kc.chunk_index,
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
      SELECT id, title, content, source_url, source_type,
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
      // Provenance (CX-2) : le dashboard doit pouvoir afficher « Source : … » et
      // ouvrir la bonne fiche a la correction. L'agent Python ignore ces cles.
      document_id: chunk.document_id,
      chunk_id: chunk.chunk_id,
      relevance_score: null
    }));
  }

  if (docsRes.status === 'fulfilled' && docsRes.value.results?.length > 0) {
    return docsRes.value.results.map(doc => ({
      content: doc.content,
      source_title: doc.title,
      source_type: doc.source_type,
      source_url: doc.source_url,
      document_id: doc.id,
      chunk_id: null,
      relevance_score: null
    }));
  }

  if (faqRes.status === 'fulfilled' && faqRes.value.results?.length > 0) {
    return faqRes.value.results.map(faq => ({
      content: `Q: ${faq.question}\nR: ${faq.answer}`,
      source_title: 'FAQ',
      source_type: 'faq',
      // Une entree de FAQ ne vit pas dans knowledge_documents : elle n'est donc
      // ni corrigeable ni supprimable depuis le fil de test. Le dashboard le
      // voit a `document_id: null` et masque les deux boutons plutot que de
      // proposer une action qui echouerait.
      document_id: null,
      chunk_id: null,
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

    // Numero non trouve — retour par defaut avec prompt generaliste GENERE.
    // Avant : on renvoyait le template brut de ai_sector_templates, variables
    // {COMPANY_NAME} comprises — l'agent les lisait a voix haute.
    if (!resolved) {
      const defaultTemplate = await env.DB.prepare(`
        SELECT llm_provider, llm_model, voice_id
        FROM ai_sector_templates WHERE secteur = 'generaliste' LIMIT 1
      `).first().catch(() => null);

      return successResponse({
        tenant_id: null,
        company_name: null,
        prompt_type: 'generaliste',
        api_key: null,
        llm_provider: defaultTemplate?.llm_provider || 'mistral',
        llm_model: defaultTemplate?.llm_model || 'mistral-large-latest',
        voice_id: defaultTemplate?.voice_id || 'cgSgspJ2msm6clMCkdW9',
        system_prompt: buildSectorPrompt({ secteur: 'generaliste' }),
        message: 'Numéro non associé à un tenant — config généraliste par défaut'
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
      // Prompt GENERE, substitue avec la raison sociale du tenant : le template
      // D1 ne sert plus qu'au reglage LLM/voix. Un tenant sans prompt actif
      // recevait auparavant le template brut, non conforme et truffe de {}.
      systemPrompt = buildSectorPrompt({
        secteur,
        companyName: resolved.company_name || '',
      });

      const template = await env.DB.prepare(`
        SELECT llm_provider, llm_model, voice_id
        FROM ai_sector_templates WHERE secteur = ? LIMIT 1
      `).bind(secteur).first().catch(() => null);

      if (template) {
        llmProvider = resolved.llm_provider || template.llm_provider || llmProvider;
        llmModel = resolved.llm_model || template.llm_model || llmModel;
        voiceId = resolved.voice_id || template.voice_id || voiceId;
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
      // Filet : un prompt historique peut encore porter des {} en base — on ne
      // les laisse pas partir vers le LLM (ils seraient lus a voix haute).
      system_prompt: applyPromptVariables(systemPrompt, {
        companyName: resolved.company_name || '',
      }),
      active_prompt_id: resolved.active_prompt_id || null,
      prompt_version: resolved.prompt_version || null,
      message: 'Tenant résolu avec succès'
    });

  } catch (error) {
    logger.error('VoixIA resolve-phone error', { error: error.message, phone });
    return errorResponse('Erreur lors de la résolution du numéro', 500);
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
    message: 'Le transfert direct n est pas disponible. Proposez un rappel au client : demandez son nom, numéro et créneau préféré. Utilisez ensuite create_prospect avec status callback_requested et send_sms pour confirmer.',
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
      message: 'Appel loggé avec succès'
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

    // 1. Flow conversationnel : le texte vient du template de flow (voixia_templates).
    if (template_id && agent_type === 'conversational_flow') {
      const tmpl = await env.DB.prepare(
        'SELECT greeting FROM voixia_templates WHERE id = ?'
      ).bind(template_id).first();
      if (tmpl) systemPrompt = tmpl.greeting || '';
    }

    // 2. Prompt unique : GÉNÉRÉ depuis la source unique (shared/sector-prompts.js).
    //    `template_id` porte ici une clé de secteur (l'appelant envoyait cette clé
    //    à ai_sector_templates) : elle prime sur `secteur` si elle est fournie.
    if (!systemPrompt) {
      systemPrompt = buildSectorPrompt({
        secteur: normalizeSector(template_id || secteur),
        agentName: agent_name,
        companyName: company_name,
        horaires,
        telephone,
      });
    } else {
      // Le greeting d'un flow peut porter des variables : on les substitue et on
      // garantit qu'aucun {} ne part en base (CLAUDE.md § f).
      systemPrompt = applyPromptVariables(systemPrompt, {
        agentName: agent_name,
        companyName: company_name,
        horaires,
        telephone,
      });
    }

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
      message: 'Agent créé avec succès'
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
