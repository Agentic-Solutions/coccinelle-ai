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

  return null;
}
