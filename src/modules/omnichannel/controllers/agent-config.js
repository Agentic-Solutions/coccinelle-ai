/**
 * Controller Agent Config - CRUD configuration agent par tenant
 */

import { queries } from '../db/queries.js';
import { validators } from '../utils/validator.js';
import { omniLogger } from '../utils/logger.js';

/**
 * GET /api/v1/omnichannel/agent/config?tenantId=xxx
 */
export async function getAgentConfig(request, env) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');

    // Validation
    const validation = validators.tenantId(tenantId);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer la config
    const config = await env.DB.prepare(queries.getAgentConfig)
      .bind(tenantId)
      .first();

    if (!config) {
      return new Response(JSON.stringify({
        error: 'Configuration non trouvée',
        tenantId
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parser les champs JSON
    if (config.voice_settings) {
      config.voice_settings = JSON.parse(config.voice_settings);
    }
    if (config.channels_config) {
      config.channels_config = JSON.parse(config.channels_config);
    }

    omniLogger.info('Agent config retrieved', { tenantId });

    return new Response(JSON.stringify({ success: true, config }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to get agent config', { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PUT /api/v1/omnichannel/agent/config
 */
export async function updateAgentConfig(request, env) {
  try {
    const body = await request.json();
    const { tenantId, ...config } = body;

    // Validation tenant
    const tenantValidation = validators.tenantId(tenantId);
    if (!tenantValidation.valid) {
      return new Response(JSON.stringify({ error: tenantValidation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validation config
    const configValidation = validators.agentConfig(config);
    if (!configValidation.valid) {
      return new Response(JSON.stringify({
        error: 'Configuration invalide',
        details: configValidation.errors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier si la config existe
    const existing = await env.DB.prepare(queries.getAgentConfig)
      .bind(tenantId)
      .first();

    const configId = existing?.id || `cfg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Préparer les valeurs
    const voiceSettings = config.voice_settings ? JSON.stringify(config.voice_settings) : null;
    const channelsConfig = config.channels_config ? JSON.stringify(config.channels_config) : null;

    if (existing) {
      // UPDATE
      await env.DB.prepare(queries.updateAgentConfig).bind(
        config.agent_name || 'Sara',
        config.agent_personality || 'professional',
        config.voice_provider || 'elevenlabs',
        config.voice_id || null,
        voiceSettings,
        config.voice_language || 'fr-FR',
        config.system_prompt || null,
        config.greeting_message || 'Bonjour, je suis Sara, votre assistante virtuelle.',
        config.fallback_message || 'Je n\'ai pas bien compris, pouvez-vous reformuler ?',
        config.transfer_message || 'Je vous transfère vers un conseiller.',
        channelsConfig,
        config.max_conversation_duration || 600,
        config.interruption_enabled !== false ? 1 : 0,
        config.auto_noise_detection !== false ? 1 : 0,
        config.sentiment_analysis_enabled === true ? 1 : 0,
        tenantId
      ).run();

      omniLogger.info('Agent config updated', { tenantId });
    } else {
      // CREATE
      await env.DB.prepare(queries.createAgentConfig).bind(
        configId,
        tenantId,
        config.agent_name || 'Sara',
        config.agent_personality || 'professional',
        config.voice_provider || 'elevenlabs',
        config.voice_id || null,
        voiceSettings,
        config.voice_language || 'fr-FR',
        config.system_prompt || null,
        config.greeting_message || 'Bonjour, je suis Sara, votre assistante virtuelle.',
        config.fallback_message || 'Je n\'ai pas bien compris, pouvez-vous reformuler ?',
        config.transfer_message || 'Je vous transfère vers un conseiller.',
        channelsConfig,
        config.max_conversation_duration || 600,
        config.interruption_enabled !== false ? 1 : 0,
        config.auto_noise_detection !== false ? 1 : 0,
        config.sentiment_analysis_enabled === true ? 1 : 0
      ).run();

      omniLogger.info('Agent config created', { tenantId, configId });
    }

    return new Response(JSON.stringify({
      success: true,
      message: existing ? 'Configuration mise à jour' : 'Configuration créée',
      configId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to update agent config', { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * DELETE /api/v1/omnichannel/agent/config?tenantId=xxx
 */
export async function deleteAgentConfig(request, env) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');

    const validation = validators.tenantId(tenantId);
    if (!validation.valid) {
      return new Response(JSON.stringify({ error: validation.error }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(queries.deleteAgentConfig)
      .bind(tenantId)
      .run();

    omniLogger.info('Agent config deleted', { tenantId });

    return new Response(JSON.stringify({
      success: true,
      message: 'Configuration supprimée'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to delete agent config', { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
