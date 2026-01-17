/**
 * Controller Voices - Gestion des voix (Google TTS & ElevenLabs)
 */

import { ElevenLabsService } from '../services/elevenlabs.js';
import { GoogleTTSService } from '../services/google-tts.js';
import { omniLogger } from '../utils/logger.js';

/**
 * GET /api/v1/omnichannel/agent/voices
 * Liste toutes les voix disponibles
 */
export async function getVoices(request, env) {
  try {
    const url = new URL(request.url);
    const language = url.searchParams.get('language'); // 'fr', 'en', etc.

    let formattedVoices;
    let provider;

    // Pour le français, utiliser Google Cloud TTS (voix natives)
    if (language === 'fr') {
      provider = 'Google Cloud TTS';
      const googleTTS = new GoogleTTSService(env);
      const voices = await googleTTS.getFrenchVoices();

      // Extraire l'URL de base depuis la requête
      const baseUrl = new URL(request.url).origin;
      formattedVoices = googleTTS.formatVoicesForAPI(voices, baseUrl);
    }
    // Pour les autres langues, utiliser ElevenLabs
    else {
      provider = 'ElevenLabs';
      const elevenLabs = new ElevenLabsService(env);
      const voices = await elevenLabs.getVoices();

      formattedVoices = voices.map(voice => {
        return {
          voice_id: voice.voice_id,
          name: voice.name,
          preview_url: voice.preview_url,
          category: voice.category,
          labels: voice.labels,
          description: voice.description,
          samples: voice.samples?.map(s => s.sample_url) || [],
          is_native: false
        };
      });
    }

    omniLogger.info('Voices retrieved', {
      count: formattedVoices.length,
      language,
      provider
    });

    return new Response(JSON.stringify({
      success: true,
      voices: formattedVoices,
      count: formattedVoices.length,
      provider
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    omniLogger.error('Failed to get voices', { error: error.message });
    return new Response(JSON.stringify({
      error: error.message,
      message: 'Impossible de récupérer les voix'
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

/**
 * GET /api/v1/omnichannel/agent/voices/:voiceId/preview?assistantName=xxx
 * Génère un aperçu audio pour une voix Google Cloud TTS
 */
export async function getVoicePreview(request, env, voiceId) {
  try {
    const decodedVoiceId = decodeURIComponent(voiceId);

    // Récupérer le nom de l'assistant depuis les query params
    const url = new URL(request.url);
    const assistantName = url.searchParams.get('assistantName') || null;

    const googleTTS = new GoogleTTSService(env);
    const audioBase64 = await googleTTS.generatePreview(decodedVoiceId, assistantName);

    // Décoder le base64 en binaire
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    omniLogger.info('Voice preview generated', { voiceId: decodedVoiceId });

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400' // Cache 24h
      }
    });

  } catch (error) {
    omniLogger.error('Failed to generate voice preview', { voiceId, error: error.message });
    return new Response(JSON.stringify({
      error: error.message,
      message: 'Impossible de générer l\'aperçu audio'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
