/**
 * Controller Voices - Gestion des voix ElevenLabs
 */

import { ElevenLabsService } from '../services/elevenlabs.js';
import { omniLogger } from '../utils/logger.js';

/**
 * GET /api/v1/omnichannel/agent/voices
 * Liste toutes les voix disponibles
 */
export async function getVoices(request, env) {
  try {
    const url = new URL(request.url);
    const language = url.searchParams.get('language'); // 'fr', 'en', etc.

    const elevenLabs = new ElevenLabsService(env);

    let voices;
    if (language === 'fr') {
      voices = await elevenLabs.getFrenchVoices();
    } else {
      voices = await elevenLabs.getVoices();
    }

    // Formatter les voix pour l'API
    const formattedVoices = voices.map(voice => ({
      voice_id: voice.voice_id,
      name: voice.name,
      preview_url: voice.preview_url,
      category: voice.category,
      labels: voice.labels,
      description: voice.description,
      samples: voice.samples?.map(s => s.sample_url) || []
    }));

    omniLogger.info('Voices retrieved', {
      count: formattedVoices.length,
      language
    });

    return new Response(JSON.stringify({
      success: true,
      voices: formattedVoices,
      count: formattedVoices.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to get voices', { error: error.message });
    return new Response(JSON.stringify({
      error: error.message,
      message: 'Impossible de récupérer les voix ElevenLabs'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/omnichannel/agent/voices/:voiceId
 * Détails d'une voix spécifique
 */
export async function getVoiceDetails(request, env, voiceId) {
  try {
    const elevenLabs = new ElevenLabsService(env);
    const voice = await elevenLabs.getVoice(voiceId);

    omniLogger.info('Voice details retrieved', { voiceId });

    return new Response(JSON.stringify({
      success: true,
      voice
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to get voice details', { voiceId, error: error.message });
    return new Response(JSON.stringify({
      error: error.message,
      message: 'Voix non trouvée'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/omnichannel/agent/voices/models
 * Liste des modèles ElevenLabs disponibles
 */
export async function getModels(request, env) {
  try {
    const elevenLabs = new ElevenLabsService(env);
    const models = await elevenLabs.getModels();

    omniLogger.info('Models retrieved', { count: models.length });

    return new Response(JSON.stringify({
      success: true,
      models
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to get models', { error: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
