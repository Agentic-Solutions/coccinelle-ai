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

  return null;
}
