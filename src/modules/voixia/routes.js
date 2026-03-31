// Module VoixIA — Routes API dédiées
// Endpoints appelés par l'agent vocal VoixIA pendant les appels téléphoniques.
// Auth par clé API (X-VoixIA-Key) — pas de JWT/session.
// Chaque endpoint réutilise la logique métier existante sans la modifier.

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { generateId, logAudit } from '../auth/helpers.js';
import { requireVoixIAAuth } from './auth.js';
import { findOrCreateProspect } from '../prospects/dedup.js';

/**
 * Handler principal pour les routes /api/v1/voixia/*
 */
export async function handleVoixIARoutes(request, env, path, method) {
  try {
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

    // GET /api/v1/voixia/resolve-phone — Résoudre un numéro de téléphone vers un tenant
    if (path === '/api/v1/voixia/resolve-phone' && method === 'GET') {
      return await handleResolvePhone(request, env);
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

  // 2. Trouver le service_id si un nom de service est fourni
  let serviceId = null;
  if (service) {
    try {
      const serviceRow = await env.DB.prepare(
        'SELECT id FROM services WHERE tenant_id = ? AND name LIKE ? LIMIT 1'
      ).bind(tenant_id, `%${service}%`).first();
      serviceId = serviceRow?.id || null;
    } catch {
      // La table services peut ne pas exister — on continue sans
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

  // 4. Créer le rendez-vous
  const appointmentId = generateId('apt');
  // management_token est NOT NULL — utiliser crypto.randomUUID() pour un vrai UUID
  const managementToken = crypto.randomUUID();
  const now = new Date().toISOString();

  // Le champ "type" est NOT NULL dans la table appointments
  const appointmentType = type || service || 'rdv';

  try {
    await env.DB.prepare(`
      INSERT INTO appointments (id, tenant_id, prospect_id, agent_id, service_id, type, scheduled_at, management_token, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
    `).bind(
      appointmentId, tenant_id, prospectResult.prospect.id,
      resolvedAgentId, serviceId, appointmentType, date_time, managementToken,
      notes || `RDV pris via VoixIA — ${customer_name}`, now
    ).run();
  } catch (dbError) {
    // Fallback si certaines colonnes n'existent pas
    logger.warn('VoixIA — fallback insertion RDV', { error: dbError.message });
    try {
      await env.DB.prepare(`
        INSERT INTO appointments (id, tenant_id, prospect_id, agent_id, type, scheduled_at, status, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?)
      `).bind(
        appointmentId, tenant_id, prospectResult.prospect.id,
        resolvedAgentId, appointmentType, date_time,
        notes || `RDV pris via VoixIA — ${customer_name}`, now
      ).run();
    } catch (fallbackError) {
      logger.error('VoixIA — échec création RDV', { error: fallbackError.message });
      return errorResponse('Impossible de créer le rendez-vous : ' + fallbackError.message, 500);
    }
  }

  // 5. Audit log
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
  const agentId = url.searchParams.get('agent_id');

  if (!date) return errorResponse('Paramètre date requis (format YYYY-MM-DD)', 400);

  // 1. Déterminer le jour de la semaine (1=lundi, 7=dimanche)
  const dateObj = new Date(date + 'T00:00:00Z');
  const jsDay = dateObj.getUTCDay(); // 0=dimanche
  const dayOfWeek = jsDay === 0 ? 7 : jsDay; // Convertir en 1=lundi...7=dimanche

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
  let existingAppointments = [];
  try {
    const appointmentsResult = await env.DB.prepare(`
      SELECT agent_id, scheduled_at
      FROM appointments
      WHERE tenant_id = ?
        AND DATE(scheduled_at) = ?
        AND status IN ('scheduled', 'confirmed')
    `).bind(tenant_id, date).all();
    existingAppointments = appointmentsResult.results || [];
  } catch {
    // Table peut ne pas avoir la bonne structure — on continue
  }

  // 4. Construire les créneaux disponibles
  const bookedTimes = new Set(
    existingAppointments.map(a => {
      const d = new Date(a.scheduled_at);
      return `${a.agent_id}:${d.getUTCHours().toString().padStart(2, '0')}:${d.getUTCMinutes().toString().padStart(2, '0')}`;
    })
  );

  const availableSlots = [];

  for (const slot of slots) {
    const duration = slot.slot_duration || 30;
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
      const timeKey = `${slot.agent_id}:${h}:${m}`;

      if (!bookedTimes.has(timeKey)) {
        availableSlots.push({
          agent_id: slot.agent_id,
          agent_name: slot.agent_name?.trim() || null,
          time: `${h}:${m}`,
          duration_minutes: duration
        });
      }

      currentMinutes += duration;
    }
  }

  await logAudit(env, {
    tenant_id,
    user_id: 'voixia-agent',
    action: 'voixia.availability.check',
    resource_type: 'availability',
    changes: { date, service, agent_id: agentId, slots_found: availableSlots.length }
  });

  return successResponse({
    date,
    day_of_week: dayOfWeek,
    available_slots: availableSlots,
    count: availableSlots.length,
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
  const { question, topK = 5 } = body;

  if (!question) return errorResponse('question est requis', 400);

  // 1. Générer l'embedding de la question via Workers AI
  let queryEmbedding = null;
  let useTextFallback = false;

  try {
    if (env.AI) {
      const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [question] });
      if (result?.data?.[0] && Array.isArray(result.data[0]) && result.data[0].length > 0) {
        queryEmbedding = result.data[0];
      } else {
        useTextFallback = true;
      }
    } else {
      useTextFallback = true;
    }
  } catch (error) {
    logger.warn('VoixIA — Workers AI embedding échoué, fallback texte', { error: error.message });
    useTextFallback = true;
  }

  let results = [];

  // 2a. Recherche vectorielle si l'embedding est disponible
  if (!useTextFallback && queryEmbedding) {
    try {
      const targetVectorize = env.VECTORIZE_V2 || env.VECTORIZE;

      if (targetVectorize) {
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
              kd.title, kd.source_type, kd.url
            FROM knowledge_chunks kc
            LEFT JOIN knowledge_documents kd ON kc.document_id = kd.id
            WHERE kc.id IN (${placeholders})
          `).bind(...chunkIds).all();

          // Associer les scores aux résultats
          const scoreMap = {};
          for (const match of searchResults.matches) {
            scoreMap[match.id] = match.score;
          }

          results = (chunksResult.results || []).map(chunk => ({
            content: chunk.content,
            source_title: chunk.title,
            source_type: chunk.source_type,
            source_url: chunk.url,
            relevance_score: scoreMap[chunk.id] || 0
          }));
        }
      }
    } catch (error) {
      logger.warn('VoixIA — recherche vectorielle échouée, fallback texte', { error: error.message });
      useTextFallback = true;
    }
  }

  // 2b. Fallback : recherche textuelle si la vectorielle n'est pas disponible
  if (useTextFallback || results.length === 0) {
    try {
      const textResults = await env.DB.prepare(`
        SELECT
          kc.content, kc.chunk_index,
          kd.title, kd.source_type, kd.url
        FROM knowledge_chunks kc
        LEFT JOIN knowledge_documents kd ON kc.document_id = kd.id
        WHERE kd.tenant_id = ?
          AND kc.content LIKE ?
        LIMIT ?
      `).bind(tenant_id, `%${question}%`, topK).all();

      if (textResults.results?.length > 0) {
        results = textResults.results.map(chunk => ({
          content: chunk.content,
          source_title: chunk.title,
          source_type: chunk.source_type,
          source_url: chunk.url,
          relevance_score: null
        }));
      }
    } catch (error) {
      logger.error('VoixIA — recherche textuelle échouée', { error: error.message });
    }

    // Fallback supplémentaire : chercher dans les FAQ
    if (results.length === 0) {
      try {
        const faqResults = await env.DB.prepare(`
          SELECT question, answer
          FROM knowledge_faq
          WHERE tenant_id = ?
            AND (question LIKE ? OR answer LIKE ?)
          LIMIT ?
        `).bind(tenant_id, `%${question}%`, `%${question}%`, topK).all();

        if (faqResults.results?.length > 0) {
          results = faqResults.results.map(faq => ({
            content: `Q: ${faq.question}\nR: ${faq.answer}`,
            source_title: 'FAQ',
            source_type: 'faq',
            relevance_score: null
          }));
        }
      } catch {
        // Table FAQ peut ne pas exister — non bloquant
      }
    }
  }

  await logAudit(env, {
    tenant_id,
    user_id: 'voixia-agent',
    action: 'voixia.knowledge.search',
    resource_type: 'knowledge',
    changes: { question: question.substring(0, 100), results_count: results.length }
  });

  return successResponse({
    results,
    count: results.length,
    search_type: useTextFallback ? 'text' : 'semantic',
    message: results.length > 0
      ? `${results.length} résultat(s) trouvé(s)`
      : 'Aucun résultat trouvé dans la base de connaissances'
  });
}

// ═══════════════════════════════════════════════════════════════
// RESOLVE PHONE — Résolution numéro de téléphone → tenant + prompt_type
// ═══════════════════════════════════════════════════════════════

/**
 * GET /api/v1/voixia/resolve-phone?phone=+33...
 * Résout un numéro de téléphone entrant vers le tenant associé et son prompt_type.
 * Utilisé par l'agent vocal pour adapter son comportement au secteur du client.
 */
async function handleResolvePhone(request, env) {
  // Authentification VoixIA (clé API)
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;

  // Extraction du paramètre phone
  const url = new URL(request.url);
  const phone = url.searchParams.get('phone');

  if (!phone) {
    return errorResponse('Le parametre phone est requis (ex: ?phone=+33939035761)', 400);
  }

  // Normalisation : retirer le + de tete pour couvrir les deux formats
  const normalizedPhone = String(phone).replace(/^\+/, '');

  try {
    // 1. Recherche dans omni_phone_mappings avec jointure tenants
    //    SOURCE UNIQUE : company_name = t.name, secteur = t.sector
    const mapping = await env.DB.prepare(`
      SELECT m.tenant_id, m.phone_number, m.is_active,
             t.name AS company_name, t.sector, t.api_key
      FROM omni_phone_mappings m
      INNER JOIN tenants t ON m.tenant_id = t.id
      WHERE (m.phone_number = ? OR m.phone_number = ?)
        AND m.is_active = 1
      LIMIT 1
    `).bind(phone, normalizedPhone).first();

    // Audit de la resolution
    await logAudit(env, {
      tenant_id,
      user_id: 'voixia-agent',
      action: 'voixia.resolve_phone',
      resource_type: 'phone_mapping',
      changes: { phone: phone, found: !!mapping }
    });

    // Numero non trouve — retour par defaut avec template generaliste
    if (!mapping) {
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

    // 2. Recuperer la config VoixIA du tenant (voixia_configs)
    const config = await env.DB.prepare(`
      SELECT vc.llm_provider, vc.llm_model, vc.voice_id,
             vc.active_prompt_id, vc.secteur,
             apv.system_prompt, apv.version as prompt_version
      FROM voixia_configs vc
      LEFT JOIN ai_prompt_versions apv ON vc.active_prompt_id = apv.id
      WHERE vc.tenant_id = ?
      LIMIT 1
    `).bind(mapping.tenant_id).first();

    // 3. Si pas de config tenant, utiliser le template sectoriel
    let systemPrompt = config?.system_prompt || null;
    let llmProvider = config?.llm_provider || 'mistral';
    let llmModel = config?.llm_model || 'mistral-large-latest';
    let voiceId = config?.voice_id || 'cgSgspJ2msm6clMCkdW9';
    // SOURCE UNIQUE : secteur vient de tenants.sector (via mapping.sector)
    const secteur = mapping.sector || 'generaliste';

    if (!systemPrompt) {
      const template = await env.DB.prepare(`
        SELECT system_prompt, llm_provider, llm_model, voice_id
        FROM ai_sector_templates WHERE secteur = ? LIMIT 1
      `).bind(secteur).first();

      if (template) {
        systemPrompt = template.system_prompt;
        llmProvider = config?.llm_provider || template.llm_provider;
        llmModel = config?.llm_model || template.llm_model;
        voiceId = config?.voice_id || template.voice_id;
      }
    }

    // Numero trouve — retourner config complete
    return successResponse({
      tenant_id: mapping.tenant_id,
      company_name: mapping.company_name,
      prompt_type: secteur,
      api_key: mapping.api_key,
      llm_provider: llmProvider,
      llm_model: llmModel,
      voice_id: voiceId,
      system_prompt: systemPrompt,
      active_prompt_id: config?.active_prompt_id || null,
      prompt_version: config?.prompt_version || null,
      message: 'Tenant resolu avec succes'
    });

  } catch (error) {
    logger.error('VoixIA resolve-phone error', { error: error.message, phone });
    return errorResponse('Erreur lors de la resolution du numero', 500);
  }
}
