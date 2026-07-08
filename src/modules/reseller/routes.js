// src/modules/reseller/routes.js
// ============================================================================
// Portail revendeur VoixIA.io (Sprint J1-J2)
// ----------------------------------------------------------------------------
// Le revendeur est un tenant Coccinelle normal (role admin). Chaque "agent"
// vocal qu'il crée depuis le portail voixia.io est un TENANT ENFANT dédié,
// relié via tenants.parent_tenant_id (migration 0073). On réutilise ainsi tout
// le modèle per-tenant existant (voixia_configs, ai_prompt_versions,
// resolve-phone, calls) SANS aucun refactor.
//
// Auth : requireAuth (JWT Coccinelle) — le tenant du token = le revendeur.
//
// Routes :
//   GET  /api/v1/reseller/agents        -> liste des agents (tenants enfants)
//   POST /api/v1/reseller/agents        -> crée un agent (tenant enfant + prompt + config)
//   GET  /api/v1/tenant/api-key         -> clé API du revendeur (tenants.api_key)
// ============================================================================

import * as auth from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// --- Achat self-service Twilio : helpers ---------------------------------

// Auth + base API Twilio PAR RÉGION (les régions Twilio sont isolées : un
// credential us1 échoue en 401 sur un endpoint IE1, et réciproquement).
// - region 'us1' : inventaire global (AvailablePhoneNumbers) → api.twilio.com + Auth Token us1.
// - region 'ie1' : achat + trunk (data residency RGPD) → api.dublin.ie1.twilio.com
//                  + API Key IE1 (TWILIO_IE1_KEY_SID/SECRET) ou Auth Token IE1 (TWILIO_IE1_AUTH_TOKEN).
// L'Account SID reste dans l'URL ; le FQDN régional DOIT inclure l'edge (dublin.ie1).
function twilioAuth(env, region) {
  const sid = env.TWILIO_ACCOUNT_SID;
  if (!sid) return null;
  if (region === 'ie1') {
    const base = (env.TWILIO_API_BASE || 'https://api.dublin.ie1.twilio.com').replace(/\/$/, '');
    if (env.TWILIO_IE1_KEY_SID && env.TWILIO_IE1_KEY_SECRET) {
      return { sid, base, header: 'Basic ' + btoa(`${env.TWILIO_IE1_KEY_SID}:${env.TWILIO_IE1_KEY_SECRET}`) };
    }
    if (env.TWILIO_IE1_AUTH_TOKEN) {
      return { sid, base, header: 'Basic ' + btoa(`${sid}:${env.TWILIO_IE1_AUTH_TOKEN}`) };
    }
    return null;
  }
  // us1 (défaut)
  if (!env.TWILIO_AUTH_TOKEN) return null;
  return { sid, base: 'https://api.twilio.com', header: 'Basic ' + btoa(`${sid}:${env.TWILIO_AUTH_TOKEN}`) };
}

// Seuls les comptes listés dans RESELLER_ADMIN_EMAILS peuvent acheter
// (l'achat débite le compte Twilio ; pas de facturation Stripe encore).
// Défaut = personne (fail-safe) tant que la variable n'est pas configurée.
function isPurchaseAdmin(authResult, env) {
  const allow = (env.RESELLER_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const email = (authResult.user?.email || '').toLowerCase();
  return allow.length > 0 && allow.includes(email);
}

// --- LiveKit : ajout d'un numéro à l'allowlist du trunk entrant (Option B) --

function b64url(bytes) {
  let s = typeof bytes === 'string' ? btoa(bytes) : btoa(String.fromCharCode(...new Uint8Array(bytes)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Jeton d'admin LiveKit (JWT HS256, grant sip.admin) signé côté Worker.
async function livekitToken(apiKey, apiSecret) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: apiKey, sub: 'voixia-purchase', nbf: now - 5, exp: now + 60,
    sip: { admin: true },
  }));
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return `${data}.${b64url(sig)}`;
}

// Lecture read-only du trunk entrant LiveKit (santé + numéros).
// Retourne { ok, trunk, url, token, error }.
async function livekitList(env) {
  const url = (env.LIVEKIT_API_URL || '').replace(/\/$/, '');
  const key = env.LIVEKIT_API_KEY;
  const secret = env.LIVEKIT_API_SECRET;
  const trunkId = env.LIVEKIT_SIP_TRUNK_ID;
  if (!url || !key || !secret || !trunkId) return { ok: false, error: 'LiveKit non configuré' };
  try {
    const token = await livekitToken(key, secret);
    const listRes = await fetch(`${url}/twirp/livekit.SIP/ListSIPInboundTrunk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!listRes.ok) {
      const b = await listRes.text().catch(() => '');
      return { ok: false, error: `LiveKit list ${listRes.status} ${b.slice(0, 120)}` };
    }
    const list = await listRes.json();
    // Le Twirp LiveKit renvoie en snake_case (sip_trunk_id).
    const trunk = (list.items || []).find((t) => t.sip_trunk_id === trunkId);
    if (!trunk) return { ok: false, error: 'Trunk LiveKit introuvable' };
    return { ok: true, trunk, url, token };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Ajoute (idempotent) un numéro au champ Numbers du trunk entrant LiveKit,
// pour que resolve-phone puisse router les appels vers cet agent.
// Retourne { ok, already?, error? }.
async function livekitEnsureNumber(env, phone) {
  const l = await livekitList(env);
  if (!l.ok) return { ok: false, error: l.error };
  const numbers = l.trunk.numbers || [];
  if (numbers.includes(phone)) return { ok: true, already: true };
  try {
    // Update partiel via ListUpdate (add) : ne touche PAS les autres champs du trunk.
    const upRes = await fetch(`${l.url}/twirp/livekit.SIP/UpdateSIPInboundTrunk`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${l.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sip_trunk_id: env.LIVEKIT_SIP_TRUNK_ID, update: { numbers: { add: [phone] } } }),
    });
    if (!upRes.ok) {
      const b = await upRes.text().catch(() => '');
      return { ok: false, error: `LiveKit update ${upRes.status} ${b.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Slug lisible + suffixe unique (dérivé du tenant_id, déjà unique) pour
// respecter l'index UNIQUE tenants.slug.
function makeSlug(name, tenantId) {
  const base = (name || 'agent')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 40) || 'agent';
  const suffix = tenantId.split('_').pop().substring(0, 8);
  return `${base}-${suffix}`;
}

/**
 * Point d'entrée du module revendeur.
 * Retourne une Response, ou null si le path ne concerne pas ce module.
 */
export async function handleResellerRoutes(request, env, path, method, corsHeaders) {
  // ------------------------------------------------------------------
  // GET /api/v1/tenant/api-key — clé API du revendeur (affichage seul)
  // ------------------------------------------------------------------
  if (path === '/api/v1/tenant/api-key' && method === 'GET') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);

    return json({
      success: true,
      api_key: authResult.tenant.api_key,
      tenant_id: authResult.tenant.id,
    }, 200, corsHeaders);
  }

  // ------------------------------------------------------------------
  // GET /api/v1/reseller/agents — liste des agents (tenants enfants)
  // ------------------------------------------------------------------
  if (path === '/api/v1/reseller/agents' && method === 'GET') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);

    try {
      const parentId = authResult.tenant.id;
      const { results } = await env.DB.prepare(`
        SELECT
          t.id,
          t.name,
          t.company_name,
          t.sector,
          t.status,
          t.created_at,
          vc.voice_id       AS voice_id,
          vc.llm_provider   AS llm_provider,
          vc.llm_model      AS llm_model,
          vc.agent_name     AS agent_name,
          m.phone_number    AS phone_number
        FROM tenants t
        LEFT JOIN voixia_configs vc ON vc.tenant_id = t.id
        LEFT JOIN omni_phone_mappings m
               ON m.tenant_id = t.id AND m.channel_type = 'voice' AND m.is_active = 1
        WHERE t.parent_tenant_id = ?
        ORDER BY t.created_at DESC
      `).bind(parentId).all();

      return json({ success: true, agents: results || [], count: (results || []).length }, 200, corsHeaders);
    } catch (error) {
      logger.error('Reseller list agents error', { error: error.message });
      return json({ success: false, error: 'Erreur lors du chargement des agents' }, 500, corsHeaders);
    }
  }

  // ------------------------------------------------------------------
  // POST /api/v1/reseller/agents — crée un agent (tenant enfant)
  // ------------------------------------------------------------------
  if (path === '/api/v1/reseller/agents' && method === 'POST') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);

    try {
      let body;
      try { body = await request.json(); } catch { body = {}; }

      const agentName = (body.agent_name || body.name || '').trim();
      const companyName = (body.company_name || agentName).trim();
      const sector = (body.sector || 'generaliste').trim();
      // Le frontend a déjà substitué les variables ({} interdits en DB — règle i.4).
      const providedPrompt = (body.system_prompt || '').trim();
      const voiceId = body.voice_id || null;
      const llmProvider = body.llm_provider || null;
      const llmModel = body.llm_model || null;

      if (!agentName || agentName.length < 2) {
        return json({ success: false, error: "Le nom de l'agent est requis (min 2 caractères)" }, 400, corsHeaders);
      }

      const parentId = authResult.tenant.id;
      const tenantId = auth.generateId('tenant');
      const now = new Date().toISOString();
      const apiKey = 'sk_' + auth.generateId('').substring(0, 32);
      // email est NOT NULL + UNIQUE : on génère une valeur synthétique unique
      // (l'agent enfant n'a pas d'utilisateur propre — il est piloté par le revendeur).
      const syntheticEmail = `${tenantId}@agents.voixia.io`;
      const slug = makeSlug(agentName, tenantId);

      // 1) Tenant enfant
      await env.DB.prepare(`
        INSERT INTO tenants (id, name, company_name, email, api_key, slug, sector, parent_tenant_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `).bind(tenantId, agentName, companyName, syntheticEmail, apiKey, slug, sector, parentId, now).run();

      // 2) Résoudre le prompt : fourni par le portail, sinon fallback template sectoriel
      let systemPrompt = providedPrompt;
      let resolvedProvider = llmProvider;
      let resolvedModel = llmModel;
      let resolvedVoice = voiceId;

      if (!systemPrompt || !resolvedProvider || !resolvedModel || !resolvedVoice) {
        const tpl = await env.DB.prepare(`
          SELECT system_prompt, llm_provider, llm_model, voice_id
          FROM ai_sector_templates
          WHERE secteur = ? OR secteur = 'generaliste'
          ORDER BY CASE WHEN secteur = ? THEN 1 ELSE 2 END
          LIMIT 1
        `).bind(sector, sector).first();

        if (tpl) {
          if (!systemPrompt) {
            systemPrompt = (tpl.system_prompt || '')
              .replace(/\{ASSISTANT_NAME\}/g, 'Assistant')
              .replace(/\{COMPANY_NAME\}/g, companyName);
          }
          resolvedProvider = resolvedProvider || tpl.llm_provider || 'mistral';
          resolvedModel = resolvedModel || tpl.llm_model || 'mistral-large-latest';
          resolvedVoice = resolvedVoice || tpl.voice_id || 'cgSgspJ2msm6clMCkdW9';
        }
      }
      // Garde-fous si aucun template n'existe
      resolvedProvider = resolvedProvider || 'mistral';
      resolvedModel = resolvedModel || 'mistral-large-latest';
      resolvedVoice = resolvedVoice || 'cgSgspJ2msm6clMCkdW9';
      systemPrompt = systemPrompt || `Tu es l'assistant vocal de ${companyName}.`;

      // 3) Prompt actif (is_active=1 — un seul par tenant, ici le tout premier)
      const promptResult = await env.DB.prepare(`
        INSERT INTO ai_prompt_versions (tenant_id, canal, secteur, version, system_prompt, is_active, created_at)
        VALUES (?, 'voice', ?, 1, ?, 1, ?)
      `).bind(tenantId, sector, systemPrompt, now).run();
      const promptId = promptResult.meta?.last_row_id;

      // 4) voixia_config lié au prompt actif
      await env.DB.prepare(`
        INSERT INTO voixia_configs (tenant_id, llm_provider, llm_model, voice_id, secteur, active_prompt_id, agent_name, agent_type, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'single_prompt', ?)
      `).bind(tenantId, resolvedProvider, resolvedModel, resolvedVoice, sector, promptId, agentName, now).run();

      logger.info('Reseller agent created', { parentId, tenantId, sector });

      return json({
        success: true,
        agent: {
          id: tenantId,
          name: agentName,
          company_name: companyName,
          sector,
          voice_id: resolvedVoice,
          llm_provider: resolvedProvider,
          llm_model: resolvedModel,
          active_prompt_id: promptId,
          api_key: apiKey,
          created_at: now,
        },
      }, 201, corsHeaders);
    } catch (error) {
      logger.error('Reseller create agent error', { error: error.message, stack: error.stack });
      return json({ success: false, error: "Erreur lors de la création de l'agent" }, 500, corsHeaders);
    }
  }

  // ==================================================================
  // J3 — NUMÉROS (pool manuel → attribution à un agent)
  // ==================================================================

  // ------------------------------------------------------------------
  // GET /api/v1/reseller/numbers — pool dispo + numéros de MES agents
  // ------------------------------------------------------------------
  if (path === '/api/v1/reseller/numbers' && method === 'GET') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);

    try {
      const parentId = authResult.tenant.id;
      // Numéros disponibles (pool global partagé)
      const available = await env.DB.prepare(`
        SELECT phone_number, label, country
        FROM number_pool
        WHERE status = 'available'
        ORDER BY created_at ASC, phone_number ASC
      `).all();
      // Numéros déjà attribués à MES agents (tenants enfants)
      const assigned = await env.DB.prepare(`
        SELECT np.phone_number, np.label, np.assigned_tenant_id, t.name AS agent_name
        FROM number_pool np
        JOIN tenants t ON t.id = np.assigned_tenant_id
        WHERE np.status = 'assigned' AND t.parent_tenant_id = ?
        ORDER BY np.assigned_at DESC
      `).bind(parentId).all();

      return json({
        success: true,
        available: available.results || [],
        assigned: assigned.results || [],
      }, 200, corsHeaders);
    } catch (error) {
      logger.error('Reseller list numbers error', { error: error.message });
      return json({ success: false, error: 'Erreur lors du chargement des numéros' }, 500, corsHeaders);
    }
  }

  // ------------------------------------------------------------------
  // POST /api/v1/reseller/agents/:id/number — attribue un numéro
  // DELETE /api/v1/reseller/agents/:id/number — libère le numéro
  // ------------------------------------------------------------------
  const numberMatch = path.match(/^\/api\/v1\/reseller\/agents\/([^/]+)\/number$/);
  if (numberMatch && (method === 'POST' || method === 'DELETE')) {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);

    const parentId = authResult.tenant.id;
    const agentId = decodeURIComponent(numberMatch[1]);

    // L'agent doit être un tenant enfant du revendeur authentifié.
    const agent = await env.DB.prepare(
      'SELECT id, name FROM tenants WHERE id = ? AND parent_tenant_id = ?'
    ).bind(agentId, parentId).first();
    if (!agent) {
      return json({ success: false, error: 'Agent introuvable' }, 404, corsHeaders);
    }

    const now = new Date().toISOString();

    // ---- Attribution ----
    if (method === 'POST') {
      try {
        let body;
        try { body = await request.json(); } catch { body = {}; }
        const requestedNumber = (body.phone_number || '').trim();

        // Numéro déjà attribué à cet agent ?
        const existing = await env.DB.prepare(
          "SELECT phone_number FROM omni_phone_mappings WHERE tenant_id = ? AND channel_type = 'voice' AND is_active = 1"
        ).bind(agentId).first();
        if (existing) {
          return json({ success: false, error: 'Cet agent a déjà un numéro attribué' }, 409, corsHeaders);
        }

        // Choisir le numéro : celui demandé (s'il est dispo) sinon le 1er dispo.
        let poolRow;
        if (requestedNumber) {
          poolRow = await env.DB.prepare(
            "SELECT id, phone_number FROM number_pool WHERE phone_number = ? AND status = 'available'"
          ).bind(requestedNumber).first();
          if (!poolRow) {
            return json({ success: false, error: "Ce numéro n'est pas disponible" }, 409, corsHeaders);
          }
        } else {
          poolRow = await env.DB.prepare(
            "SELECT id, phone_number FROM number_pool WHERE status = 'available' ORDER BY created_at ASC, phone_number ASC LIMIT 1"
          ).first();
          if (!poolRow) {
            return json({ success: false, error: 'Aucun numéro disponible dans le pool' }, 409, corsHeaders);
          }
        }

        // Réserver le numéro (garde anti-course : ne prend que s'il est encore 'available').
        const reserve = await env.DB.prepare(
          "UPDATE number_pool SET status = 'assigned', assigned_tenant_id = ?, assigned_at = ? WHERE phone_number = ? AND status = 'available'"
        ).bind(agentId, now, poolRow.phone_number).run();
        if (!reserve.meta || reserve.meta.changes !== 1) {
          return json({ success: false, error: 'Ce numéro vient d\'être pris, réessayez' }, 409, corsHeaders);
        }

        // Créer/activer la ligne omni_phone_mappings voice (ce qui rend l'agent joignable).
        const mappingId = auth.generateId('map');
        await env.DB.prepare(`
          INSERT INTO omni_phone_mappings (id, phone_number, tenant_id, channel_type, is_active, created_at, updated_at)
          VALUES (?, ?, ?, 'voice', 1, ?, ?)
          ON CONFLICT(phone_number) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            channel_type = 'voice',
            is_active = 1,
            updated_at = excluded.updated_at
        `).bind(mappingId, poolRow.phone_number, agentId, now, now).run();

        logger.info('Reseller number assigned', { parentId, agentId, phone: poolRow.phone_number });
        return json({ success: true, phone_number: poolRow.phone_number, agent_id: agentId }, 200, corsHeaders);
      } catch (error) {
        logger.error('Reseller assign number error', { error: error.message, stack: error.stack });
        return json({ success: false, error: "Erreur lors de l'attribution du numéro" }, 500, corsHeaders);
      }
    }

    // ---- Libération ----
    if (method === 'DELETE') {
      try {
        const mapping = await env.DB.prepare(
          "SELECT phone_number FROM omni_phone_mappings WHERE tenant_id = ? AND channel_type = 'voice' AND is_active = 1"
        ).bind(agentId).first();
        if (!mapping) {
          return json({ success: false, error: 'Aucun numéro attribué à cet agent' }, 404, corsHeaders);
        }
        // Retirer le routage puis rendre le numéro au pool.
        await env.DB.prepare(
          "DELETE FROM omni_phone_mappings WHERE tenant_id = ? AND phone_number = ? AND channel_type = 'voice'"
        ).bind(agentId, mapping.phone_number).run();
        await env.DB.prepare(
          "UPDATE number_pool SET status = 'available', assigned_tenant_id = NULL, assigned_at = NULL WHERE phone_number = ?"
        ).bind(mapping.phone_number).run();

        logger.info('Reseller number released', { parentId, agentId, phone: mapping.phone_number });
        return json({ success: true, released: mapping.phone_number }, 200, corsHeaders);
      } catch (error) {
        logger.error('Reseller release number error', { error: error.message, stack: error.stack });
        return json({ success: false, error: 'Erreur lors de la libération du numéro' }, 500, corsHeaders);
      }
    }
  }

  // ==================================================================
  // J4 — CONSOMMATION (minutes d'appel agrégées sur les agents)
  // ==================================================================

  // ------------------------------------------------------------------
  // GET /api/v1/reseller/usage?month=YYYY-MM — conso du mois
  // ------------------------------------------------------------------
  if (path === '/api/v1/reseller/usage' && method === 'GET') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);

    try {
      const parentId = authResult.tenant.id;
      const url = new URL(request.url);

      // Mois cible : ?month=YYYY-MM, sinon mois courant (UTC).
      const now = new Date();
      let year = now.getUTCFullYear();
      let month = now.getUTCMonth() + 1; // 1-12
      const requested = url.searchParams.get('month');
      const m = requested && /^\d{4}-\d{2}$/.test(requested) ? requested : null;
      if (m) {
        year = parseInt(m.slice(0, 4), 10);
        month = parseInt(m.slice(5, 7), 10);
      }
      const pad = (n) => String(n).padStart(2, '0');
      const monthLabel = `${year}-${pad(month)}`;
      // Bornes lexicographiques (calls.created_at = 'YYYY-MM-DD HH:MM:SS').
      const start = `${monthLabel}-01 00:00:00`;
      const nextYear = month === 12 ? year + 1 : year;
      const nextMonth = month === 12 ? 1 : month + 1;
      const end = `${nextYear}-${pad(nextMonth)}-01 00:00:00`;

      // Agrégat par agent (tenants enfants du revendeur).
      const perAgentRes = await env.DB.prepare(`
        SELECT c.tenant_id, t.name AS agent_name,
               COUNT(*) AS calls,
               COALESCE(SUM(c.duration), 0) AS seconds
        FROM calls c
        JOIN tenants t ON t.id = c.tenant_id
        WHERE t.parent_tenant_id = ?
          AND c.created_at >= ? AND c.created_at < ?
        GROUP BY c.tenant_id, t.name
        ORDER BY seconds DESC
      `).bind(parentId, start, end).all();

      // Série journalière (minutes par jour).
      const dailyRes = await env.DB.prepare(`
        SELECT substr(c.created_at, 1, 10) AS day,
               COALESCE(SUM(c.duration), 0) AS seconds
        FROM calls c
        JOIN tenants t ON t.id = c.tenant_id
        WHERE t.parent_tenant_id = ?
          AND c.created_at >= ? AND c.created_at < ?
        GROUP BY day
        ORDER BY day ASC
      `).bind(parentId, start, end).all();

      const round1 = (x) => Math.round(x * 10) / 10;
      const perAgentRows = perAgentRes.results || [];
      let totalCalls = 0;
      let totalSeconds = 0;
      const perAgent = perAgentRows.map((r) => {
        totalCalls += r.calls;
        totalSeconds += r.seconds;
        return {
          tenant_id: r.tenant_id,
          agent_name: r.agent_name,
          calls: r.calls,
          minutes: round1(r.seconds / 60),
        };
      });
      const totalMinutes = round1(totalSeconds / 60);

      const daily = (dailyRes.results || []).map((r) => ({
        date: r.day,
        minutes: round1(r.seconds / 60),
      }));

      return json({
        success: true,
        period: { month: monthLabel, start, end },
        total: {
          calls: totalCalls,
          minutes: totalMinutes,
          seconds: totalSeconds,
          estimated_cost_eur: Math.round(totalMinutes * 0.10 * 100) / 100, // 0,10 €/min (estimation)
        },
        per_agent: perAgent,
        daily,
      }, 200, corsHeaders);
    } catch (error) {
      logger.error('Reseller usage error', { error: error.message, stack: error.stack });
      return json({ success: false, error: 'Erreur lors du chargement de la consommation' }, 500, corsHeaders);
    }
  }

  // ------------------------------------------------------------------
  // GET /api/v1/reseller/pool-numbers — liste des numéros du pool.
  // Auth = clé VoixIA (X-VoixIA-Key). Consommé par le script de sync
  // LiveKit sur le serveur VoixIA (server-pull : réconcilie trunk.Numbers).
  // ------------------------------------------------------------------
  if (path === '/api/v1/reseller/pool-numbers' && method === 'GET') {
    const key = request.headers.get('X-VoixIA-Key') || '';
    if (!env.VOIXIA_API_KEY || key !== env.VOIXIA_API_KEY) {
      return json({ success: false, error: 'unauthorized' }, 401, corsHeaders);
    }
    try {
      const { results } = await env.DB.prepare('SELECT phone_number FROM number_pool').all();
      return json({ success: true, numbers: (results || []).map((r) => r.phone_number) }, 200, corsHeaders);
    } catch (error) {
      logger.error('pool-numbers error', { error: error.message });
      return json({ success: false, error: 'Erreur' }, 500, corsHeaders);
    }
  }

  // ==================================================================
  // ACHAT SELF-SERVICE DE NUMÉROS TWILIO (admin only)
  // ==================================================================

  // ------------------------------------------------------------------
  // GET /api/v1/reseller/numbers/search?country=FR&contains=&area=&type=
  // Cherche des numéros disponibles à l'achat (voix), avec prix mensuel.
  // ------------------------------------------------------------------
  if (path === '/api/v1/reseller/numbers/search' && method === 'GET') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);
    if (!isPurchaseAdmin(authResult, env)) {
      return json({ success: false, error: "Réservé à l'administrateur" }, 403, corsHeaders);
    }
    // Recherche = inventaire GLOBAL (us1).
    const tw = twilioAuth(env, 'us1');
    if (!tw) return json({ success: false, error: 'Téléphonie non configurée' }, 500, corsHeaders);

    try {
      const url = new URL(request.url);
      const country = (url.searchParams.get('country') || 'FR').toUpperCase().slice(0, 2);
      const type = (url.searchParams.get('type') || 'Local').replace(/[^A-Za-z]/g, '') || 'Local';
      const contains = url.searchParams.get('contains') || '';
      const area = url.searchParams.get('area') || '';
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10) || 10, 30);

      const q = new URLSearchParams({ VoiceEnabled: 'true', PageSize: String(limit) });
      if (contains) q.set('Contains', contains);
      if (area) q.set('AreaCode', area);

      const twUrl = `${tw.base}/2010-04-01/Accounts/${tw.sid}/AvailablePhoneNumbers/${country}/${type}.json?${q.toString()}`;
      const res = await fetch(twUrl, { headers: { Authorization: tw.header } });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        logger.warn('Number search failed', { status: res.status, body: body.slice(0, 300) });
        return json({ success: false, error: 'Recherche indisponible pour le moment' }, 502, corsHeaders);
      }
      const data = await res.json();

      // Prix mensuel du pays (best-effort, non bloquant).
      let monthlyPrice = null;
      let currency = 'EUR';
      try {
        const priceRes = await fetch(`https://pricing.twilio.com/v1/PhoneNumbers/Countries/${country}`, {
          headers: { Authorization: tw.header },
        });
        if (priceRes.ok) {
          const pd = await priceRes.json();
          currency = pd.price_unit || 'EUR';
          const match = (pd.phone_number_prices || []).find(
            (p) => (p.number_type || '').toLowerCase() === type.toLowerCase()
          ) || (pd.phone_number_prices || [])[0];
          if (match) monthlyPrice = parseFloat(match.current_price ?? match.base_price);
        }
      } catch { /* prix optionnel */ }

      const available = (data.available_phone_numbers || []).map((n) => ({
        phone_number: n.phone_number,
        friendly_name: n.friendly_name,
        locality: n.locality || null,
        region: n.region || null,
        monthly_price: monthlyPrice,
        currency,
        capabilities: n.capabilities || {},
      }));

      return json({ success: true, country, type, available }, 200, corsHeaders);
    } catch (error) {
      logger.error('Reseller number search error', { error: error.message });
      return json({ success: false, error: 'Erreur lors de la recherche' }, 500, corsHeaders);
    }
  }

  // ------------------------------------------------------------------
  // GET /api/v1/reseller/numbers/livekit-status — santé LiveKit (read-only)
  // Vérifie que le backend joint LiveKit + renvoie les numéros du trunk.
  // ------------------------------------------------------------------
  if (path === '/api/v1/reseller/numbers/livekit-status' && method === 'GET') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);
    if (!isPurchaseAdmin(authResult, env)) {
      return json({ success: false, error: "Réservé à l'administrateur" }, 403, corsHeaders);
    }
    const l = await livekitList(env);
    if (!l.ok) return json({ success: true, reachable: false, error: l.error }, 200, corsHeaders);
    return json({
      success: true,
      reachable: true,
      trunk_id: l.trunk.sip_trunk_id,
      numbers: l.trunk.numbers || [],
    }, 200, corsHeaders);
  }

  // ------------------------------------------------------------------
  // POST /api/v1/reseller/numbers/purchase  { phone_number }
  // Flux régional (RGPD) : 1) achat us1 → 2) région du numéro en ie1 →
  // 3) attache au trunk IE1 VoixIA-EU → pool. Routage LiveKit assuré par le
  // cron server-pull (~1 min).
  // ------------------------------------------------------------------
  if (path === '/api/v1/reseller/numbers/purchase' && method === 'POST') {
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) return json({ success: false, error: authResult.error }, authResult.status, corsHeaders);
    if (!isPurchaseAdmin(authResult, env)) {
      return json({ success: false, error: "Réservé à l'administrateur" }, 403, corsHeaders);
    }
    const twUs1 = twilioAuth(env, 'us1');
    const twIe1 = twilioAuth(env, 'ie1');
    if (!twUs1 || !twIe1) return json({ success: false, error: 'Téléphonie non configurée' }, 500, corsHeaders);
    if (!env.TWILIO_TRUNK_SID) {
      return json({ success: false, error: 'Configuration téléphonie incomplète' }, 500, corsHeaders);
    }

    try {
      let body;
      try { body = await request.json(); } catch { body = {}; }
      const phone = (body.phone_number || '').trim();
      if (!/^\+\d{6,15}$/.test(phone)) {
        return json({ success: false, error: 'Numéro invalide (format E.164 attendu)' }, 400, corsHeaders);
      }

      // Déjà dans le pool ?
      const dup = await env.DB.prepare('SELECT phone_number FROM number_pool WHERE phone_number = ?').bind(phone).first();
      if (dup) return json({ success: false, error: 'Numéro déjà dans le pool' }, 409, corsHeaders);

      // ÉTAPE 1 — ACHAT en us1 (la création de numéro est une opération GLOBALE ;
      // l'endpoint ie1 renvoie 405). + bundle/adresse réglementaires FR.
      const buyForm = new URLSearchParams({ PhoneNumber: phone });
      if (env.TWILIO_FR_BUNDLE_SID) buyForm.set('BundleSid', env.TWILIO_FR_BUNDLE_SID);
      if (env.TWILIO_FR_ADDRESS_SID) buyForm.set('AddressSid', env.TWILIO_FR_ADDRESS_SID);
      const buyRes = await fetch(`${twUs1.base}/2010-04-01/Accounts/${twUs1.sid}/IncomingPhoneNumbers.json`, {
        method: 'POST',
        headers: { Authorization: twUs1.header, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: buyForm.toString(),
      });
      const buyBody = await buyRes.json().catch(() => ({}));
      if (!buyRes.ok) {
        logger.warn('Purchase step buy(us1) failed', { phone, status: buyRes.status, code: buyBody.code, message: buyBody.message });
        return json({
          success: false,
          error: "Achat impossible pour ce numéro. Réessayez ou choisissez-en un autre.",
        }, 502, corsHeaders);
      }
      const twilioSid = buyBody.sid;

      // ÉTAPE 2 — Région IE1 (data residency RGPD) : traite les appels entrants en IE1.
      let regOk = false; let regDbg = null;
      try {
        const regRes = await fetch(`https://routes.dublin.ie1.twilio.com/v2/PhoneNumbers/${encodeURIComponent(phone)}`, {
          method: 'POST',
          headers: { Authorization: twIe1.header, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'VoiceRegion=ie1',
        });
        regOk = regRes.ok;
        if (!regOk) { const rb = await regRes.json().catch(() => ({})); regDbg = { status: regRes.status, message: rb.message || null }; logger.warn('Purchase step region(ie1) failed', { phone, twilioSid, ...regDbg }); }
      } catch (e) { regDbg = { error: e.message }; }

      // ÉTAPE 3 — Attache au trunk IE1 (VoixIA-EU).
      let attOk = false; let attDbg = null;
      try {
        const attRes = await fetch(`https://trunking.dublin.ie1.twilio.com/v1/Trunks/${env.TWILIO_TRUNK_SID}/PhoneNumbers`, {
          method: 'POST',
          headers: { Authorization: twIe1.header, 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `PhoneNumberSid=${encodeURIComponent(twilioSid)}`,
        });
        const attBody = await attRes.json().catch(() => ({}));
        attOk = attRes.ok;
        if (!attOk) { attDbg = { status: attRes.status, code: attBody.code || null, message: attBody.message || null }; logger.warn('Purchase step attach(ie1 trunk) failed', { phone, twilioSid, ...attDbg }); }
      } catch (e) { attDbg = { error: e.message }; }
      // Le routage LiveKit (trunk.Numbers) est assuré par le cron server-pull (~1 min).

      // 2) Prix mensuel (best-effort).
      let monthlyPrice = null;
      let currency = 'EUR';
      try {
        const country = (phone.startsWith('+33') ? 'FR' : (buyBody.iso_country || 'FR'));
        // Pricing = API globale (us1).
        const priceRes = await fetch(`https://pricing.twilio.com/v1/PhoneNumbers/Countries/${country}`, {
          headers: { Authorization: twUs1.header },
        });
        if (priceRes.ok) {
          const pd = await priceRes.json();
          currency = pd.price_unit || 'EUR';
          const match = (pd.phone_number_prices || []).find((p) => (p.number_type || '').toLowerCase() === 'local')
            || (pd.phone_number_prices || [])[0];
          if (match) monthlyPrice = parseFloat(match.current_price ?? match.base_price);
        }
      } catch { /* optionnel */ }

      // 3) Insertion au pool (disponible).
      const now = new Date().toISOString();
      const poolId = auth.generateId('pool');
      try {
        await env.DB.prepare(`
          INSERT INTO number_pool (id, phone_number, label, country, twilio_sid, status, monthly_price, currency, purchased_at, purchased_by, created_at)
          VALUES (?, ?, ?, ?, ?, 'available', ?, ?, ?, ?, ?)
        `).bind(poolId, phone, body.label || null, phone.startsWith('+33') ? 'FR' : null, twilioSid, monthlyPrice, currency, now, authResult.tenant.id, now).run();
      } catch (dbErr) {
        // Numéro acheté + attaché mais échec DB : on le signale pour rattrapage manuel (pas de perte d'argent silencieuse).
        logger.error('Purchase pool insert failed (number bought, attached, NOT in pool)', { phone, twilioSid, error: dbErr.message });
        return json({
          success: false,
          error: "Numéro acheté et attaché au trunk, mais échec d'enregistrement au pool. Contactez le support avec ce SID.",
          twilio_sid: twilioSid,
          phone_number: phone,
        }, 500, corsHeaders);
      }

      logger.info('Reseller number purchased', { phone, twilioSid, by: authResult.user?.email, regOk, attOk });
      return json({
        success: true,
        phone_number: phone,
        twilio_sid: twilioSid,
        monthly_price: monthlyPrice,
        currency,
        status: 'available',
        note: attOk
          ? 'Numéro acheté et attaché. Routage actif d’ici ~1 minute.'
          : 'Numéro acheté. Finalisation de la mise en route en cours.',
      }, 201, corsHeaders);
    } catch (error) {
      logger.error('Reseller purchase error', { error: error.message, stack: error.stack });
      return json({ success: false, error: "Erreur lors de l'achat" }, 500, corsHeaders);
    }
  }

  return null;
}
