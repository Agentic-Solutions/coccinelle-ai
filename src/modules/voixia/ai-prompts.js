// Module VoixIA — Endpoints gestion des prompts IA
// GET  /api/v1/ai/prompts          → liste les prompts d'un tenant
// POST /api/v1/ai/prompts          → crée un nouveau prompt
// PUT  /api/v1/ai/prompts/:id      → modifie un prompt
// POST /api/v1/ai/prompts/activate/:id → active un prompt
// GET  /api/v1/ai/templates        → retourne les templates sectoriels
// GET  /api/v1/ai/analytics        → stats des appels
// POST /api/v1/ai/voice-preview    → preview audio d'une voix ElevenLabs

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { getCorsHeaders } from '../../config/cors.js';
import { requireVoixIAAuth } from './auth.js';

// ═══════════════════════════════════════════════════════════════
// Router principal IA
// ═══════════════════════════════════════════════════════════════

export async function handleAIRoutes(request, env, path, method) {
  try {

    // GET /api/v1/ai/templates — Templates sectoriels
    if (path === '/api/v1/ai/templates' && method === 'GET') {
      return await handleGetTemplates(request, env);
    }

    // GET /api/v1/ai/prompts — Liste les prompts du tenant
    if (path === '/api/v1/ai/prompts' && method === 'GET') {
      return await handleGetPrompts(request, env);
    }

    // POST /api/v1/ai/prompts — Créer un prompt
    if (path === '/api/v1/ai/prompts' && method === 'POST') {
      return await handleCreatePrompt(request, env);
    }

    // POST /api/v1/ai/prompts/activate/:id — Activer un prompt
    if (path.startsWith('/api/v1/ai/prompts/activate/') && method === 'POST') {
      const id = path.split('/').pop();
      return await handleActivatePrompt(request, env, id);
    }

    // GET /api/v1/ai/analytics — Stats des appels
    if (path === '/api/v1/ai/analytics' && method === 'GET') {
      return await handleGetAnalytics(request, env);
    }

    // POST /api/v1/ai/voice-preview — Preview audio d'une voix
    if (path === '/api/v1/ai/voice-preview' && method === 'POST') {
      return await handleVoicePreview(request, env);
    }

    // POST /api/v1/ai/simulate — Simuler une conversation avec le prompt
    if (path === '/api/v1/ai/simulate' && method === 'POST') {
      return await handleSimulate(request, env);
    }

    return null;

  } catch (error) {
    logger.error('AI route error', { error: error.message, path, method });
    return errorResponse('Erreur interne AI', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/ai/templates
// ═══════════════════════════════════════════════════════════════

async function handleGetTemplates(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  try {
    const result = await env.DB.prepare(`
      SELECT id, secteur, label, system_prompt, llm_provider, llm_model, voice_id
      FROM ai_sector_templates
      ORDER BY secteur ASC
    `).all();

    return successResponse({
      templates: result.results || [],
      count: result.results?.length || 0
    });
  } catch (error) {
    logger.error('AI templates error', { error: error.message });
    return errorResponse('Erreur lors de la récupération des templates', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/ai/prompts
// ═══════════════════════════════════════════════════════════════

async function handleGetPrompts(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;
  const url = new URL(request.url);
  const secteur = url.searchParams.get('secteur');
  const canal = url.searchParams.get('canal');

  let query = `
    SELECT id, tenant_id, canal, secteur, version, system_prompt,
           is_active, performance_score, created_at, activated_at, notes
    FROM ai_prompt_versions
    WHERE tenant_id = ?
  `;
  const params = [tenant_id];

  if (secteur) { query += ' AND secteur = ?'; params.push(secteur); }
  if (canal)   { query += ' AND canal = ?';   params.push(canal); }

  query += ' ORDER BY version DESC';

  try {
    const result = await env.DB.prepare(query).bind(...params).all();
    return successResponse({
      prompts: result.results || [],
      count: result.results?.length || 0
    });
  } catch (error) {
    logger.error('AI get prompts error', { error: error.message });
    return errorResponse('Erreur lors de la récupération des prompts', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/ai/prompts
// ═══════════════════════════════════════════════════════════════

async function handleCreatePrompt(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;
  const body = await request.json();
  const { system_prompt, secteur, canal, notes } = body;

  if (!system_prompt) return errorResponse('system_prompt est requis', 400);

  // Calculer le numéro de version suivant pour ce tenant/secteur/canal
  const lastVersion = await env.DB.prepare(`
    SELECT MAX(version) as max_version
    FROM ai_prompt_versions
    WHERE tenant_id = ? AND secteur = ? AND canal = ?
  `).bind(tenant_id, secteur || 'generaliste', canal || 'voice').first();

  const nextVersion = (lastVersion?.max_version || 0) + 1;

  try {
    const result = await env.DB.prepare(`
      INSERT INTO ai_prompt_versions
        (tenant_id, canal, secteur, version, system_prompt, is_active, notes)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `).bind(
      tenant_id,
      canal || 'voice',
      secteur || 'generaliste',
      nextVersion,
      system_prompt,
      notes || null
    ).run();

    return successResponse({
      message: 'Prompt créé avec succès',
      prompt_id: result.meta?.last_row_id,
      version: nextVersion
    }, 201);
  } catch (error) {
    logger.error('AI create prompt error', { error: error.message });
    return errorResponse('Erreur lors de la création du prompt', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/ai/prompts/activate/:id
// ═══════════════════════════════════════════════════════════════

async function handleActivatePrompt(request, env, promptId) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;

  // Lire le body optionnel (voice_id, llm_provider, llm_model)
  const body = await request.json().catch(() => ({}));

  // Vérifier que le prompt appartient bien à ce tenant
  const prompt = await env.DB.prepare(`
    SELECT id, secteur, canal FROM ai_prompt_versions
    WHERE id = ? AND tenant_id = ?
  `).bind(promptId, tenant_id).first();

  if (!prompt) return errorResponse('Prompt non trouvé', 404);

  try {
    // Désactiver TOUS les prompts du tenant (un seul prompt actif à la fois)
    await env.DB.prepare(`
      UPDATE ai_prompt_versions
      SET is_active = 0
      WHERE tenant_id = ?
    `).bind(tenant_id).run();

    // Activer le prompt demandé
    await env.DB.prepare(`
      UPDATE ai_prompt_versions
      SET is_active = 1, activated_at = datetime('now')
      WHERE id = ?
    `).bind(promptId).run();

    // Mettre à jour voixia_configs avec le prompt actif
    await env.DB.prepare(`
      INSERT INTO voixia_configs (tenant_id, active_prompt_id, secteur, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(tenant_id) DO UPDATE SET
        active_prompt_id = excluded.active_prompt_id,
        secteur = excluded.secteur,
        updated_at = datetime('now')
    `).bind(tenant_id, promptId, prompt.secteur).run();

    // Si voice/LLM fournis dans le body, mettre à jour la config
    if (body.voice_id || body.llm_provider || body.llm_model) {
      await env.DB.prepare(`
        UPDATE voixia_configs SET
          voice_id = COALESCE(?, voice_id),
          llm_provider = COALESCE(?, llm_provider),
          llm_model = COALESCE(?, llm_model),
          updated_at = datetime('now')
        WHERE tenant_id = ?
      `).bind(
        body.voice_id || null,
        body.llm_provider || null,
        body.llm_model || null,
        tenant_id
      ).run();
    }

    return successResponse({
      message: 'Prompt activé avec succès',
      prompt_id: promptId,
      secteur: prompt.secteur,
      canal: prompt.canal
    });
  } catch (error) {
    logger.error('AI activate prompt error', { error: error.message });
    return errorResponse('Erreur lors de l\'activation du prompt', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/v1/ai/analytics
// ═══════════════════════════════════════════════════════════════

async function handleGetAnalytics(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const { tenant_id } = auth;

  try {
    // Nombre total d'appels
    const totalCalls = await env.DB.prepare(`
      SELECT COUNT(*) as total,
             AVG(call_duration_seconds) as avg_duration,
             SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful
      FROM ai_interaction_logs
      WHERE tenant_id = ?
    `).bind(tenant_id).first();

    // Stats par canal
    const byCanal = await env.DB.prepare(`
      SELECT canal, COUNT(*) as count
      FROM ai_interaction_logs
      WHERE tenant_id = ?
      GROUP BY canal
    `).bind(tenant_id).all();

    // Prompts actifs
    const activePrompts = await env.DB.prepare(`
      SELECT secteur, canal, version, performance_score, activated_at
      FROM ai_prompt_versions
      WHERE tenant_id = ? AND is_active = 1
    `).bind(tenant_id).all();

    return successResponse({
      calls: {
        total: totalCalls?.total || 0,
        successful: totalCalls?.successful || 0,
        avg_duration_seconds: Math.round(totalCalls?.avg_duration || 0),
        success_rate: totalCalls?.total > 0
          ? Math.round((totalCalls.successful / totalCalls.total) * 100)
          : 0
      },
      by_canal: byCanal.results || [],
      active_prompts: activePrompts.results || []
    });
  } catch (error) {
    logger.error('AI analytics error', { error: error.message });
    return errorResponse('Erreur lors de la récupération des analytics', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/ai/voice-preview
// ═══════════════════════════════════════════════════════════════

async function handleVoicePreview(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const corsHeaders = getCorsHeaders(request);

  if (!env.ELEVENLABS_API_KEY) {
    return errorResponse('ELEVENLABS_API_KEY non configurée', 500);
  }

  const body = await request.json().catch(() => ({}));
  const { voice_id, text } = body;

  if (!voice_id) return errorResponse('voice_id est requis', 400);

  const previewText = text || 'Bonjour, bienvenue ! Comment puis-je vous aider aujourd\'hui ?';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text: previewText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error('ElevenLabs voice preview error', { status: response.status, error: errText });
      return errorResponse('Erreur ElevenLabs', response.status);
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    logger.error('Voice preview error', { error: error.message });
    return errorResponse('Erreur lors de la génération du preview', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// POST /api/v1/ai/simulate — Simuler une conversation
// ═══════════════════════════════════════════════════════════════

async function handleSimulate(request, env) {
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  const body = await request.json().catch(() => ({}));
  const { system_prompt, messages, llm_provider } = body;

  if (!system_prompt) return errorResponse('system_prompt est requis', 400);
  if (!messages || !messages.length) return errorResponse('messages est requis', 400);

  try {
    let reply = '';

    if (llm_provider === 'mistral' && env.MISTRAL_API_KEY) {
      // Mistral API
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.MISTRAL_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'mistral-large-latest',
          messages: [
            { role: 'system', content: system_prompt },
            ...messages,
          ],
          max_tokens: 300,
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      reply = data.choices?.[0]?.message?.content || '';
    } else if (env.ANTHROPIC_API_KEY) {
      // Anthropic Claude (default)
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: system_prompt,
          messages: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      const data = await res.json();
      reply = data.content?.[0]?.text || '';
    } else {
      return errorResponse('Aucune clé API LLM configurée (ANTHROPIC_API_KEY ou MISTRAL_API_KEY)', 500);
    }

    if (!reply) {
      return errorResponse('Le LLM n\'a pas généré de réponse', 500);
    }

    return successResponse({ reply });
  } catch (error) {
    logger.error('AI simulate error', { error: error.message });
    return errorResponse('Erreur lors de la simulation', 500);
  }
}
