/**
 * Service Google Cloud Text-to-Speech - Gestion des voix et TTS
 */

import { OmnichannelConfig } from '../config.js';
import { omniLogger } from '../utils/logger.js';

export class GoogleTTSService {
  constructor(env) {
    this.apiKey = OmnichannelConfig.googleTTS.apiKey(env);
    this.baseUrl = OmnichannelConfig.googleTTS.baseUrl;
  }

  /**
   * Récupérer toutes les voix disponibles
   */
  async getVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices?key=${this.apiKey}`);

      if (!response.ok) {
        throw new Error(`Google TTS API error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      omniLogger.error('Failed to fetch Google TTS voices', { error: error.message });
      throw error;
    }
  }

  /**
   * Récupérer les voix françaises natives uniquement
   * Retourne les voix de haute qualité (Wavenet, Neural2, Chirp, Studio)
   */
  async getFrenchVoices() {
    const allVoices = await this.getVoices();

    // Filtrer pour ne garder que les voix:
    // 1. De langue française (fr-FR)
    // 2. De qualité professionnelle (Wavenet, Neural2, Chirp, Studio)
    const frenchVoices = allVoices.filter(voice => {
      const isFrench = voice.languageCodes.includes('fr-FR');
      const isHighQuality = voice.name.includes('Wavenet') ||
                           voice.name.includes('Neural2') ||
                           voice.name.includes('Chirp') ||
                           voice.name.includes('Studio');
      // Exclure les voix Standard et Polyglot (qualité inférieure)
      const isLowQuality = voice.name.includes('Standard') || voice.name.includes('Polyglot');
      return isFrench && isHighQuality && !isLowQuality;
    });

    // Trier par type (Neural2 d'abord, puis Wavenet) et par nom
    frenchVoices.sort((a, b) => {
      const aIsNeural = a.name.includes('Neural2');
      const bIsNeural = b.name.includes('Neural2');

      if (aIsNeural && !bIsNeural) return -1;
      if (!aIsNeural && bIsNeural) return 1;

      return a.name.localeCompare(b.name);
    });

    omniLogger.info('French voices filtered', {
      total: allVoices.length,
      french: frenchVoices.length
    });

    return frenchVoices;
  }

  /**
   * Formater les voix pour l'API (compatible avec le format ElevenLabs)
   */
  formatVoicesForAPI(voices, baseUrl = '') {
    return voices.map(voice => {
      // Extraire le type de voix
      let voiceType = 'Unknown';
      if (voice.name.includes('Neural2')) voiceType = 'Neural2';
      else if (voice.name.includes('Wavenet')) voiceType = 'Wavenet';
      else if (voice.name.includes('Chirp3-HD')) voiceType = 'Chirp3-HD';
      else if (voice.name.includes('Chirp-HD')) voiceType = 'Chirp-HD';
      else if (voice.name.includes('Studio')) voiceType = 'Studio';

      // Extraire l'identifiant de la voix (dernière partie du nom)
      const voiceId = voice.name.split('-').pop();

      // Créer un nom lisible
      const gender = voice.ssmlGender === 'MALE' ? 'Homme' : 'Femme';
      const displayName = `${gender} ${voiceId} (${voiceType})`;

      // Générer l'URL de preview dynamique
      const previewUrl = `${baseUrl}/api/v1/omnichannel/agent/voices/${encodeURIComponent(voice.name)}/preview`;

      return {
        voice_id: voice.name,
        name: displayName,
        preview_url: previewUrl,
        category: voiceType,
        labels: {
          language: 'fr',
          gender: voice.ssmlGender.toLowerCase(),
          type: voiceType
        },
        description: `Voix ${gender} française native - ${voiceType}`,
        samples: [],
        is_native: true, // Toutes les voix fr-FR sont natives
        language_codes: voice.languageCodes,
        ssml_gender: voice.ssmlGender,
        natural_sample_rate_hertz: voice.naturalSampleRateHertz
      };
    });
  }

  /**
   * Générer un aperçu audio pour une voix
   * @param {string} voiceName - Nom de la voix Google
   * @param {string|null} assistantName - Nom personnalisé de l'assistant (optionnel)
   */
  async generatePreview(voiceName, assistantName = null) {
    // Texte personnalisé si un nom est fourni, sinon texte générique
    const sampleText = assistantName
      ? `Bonjour, je suis ${assistantName}, votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?`
      : "Bonjour, je suis votre assistant virtuel. Comment puis-je vous aider aujourd'hui ?";

    try {
      const requestBody = {
        input: { text: sampleText },
        voice: {
          languageCode: 'fr-FR',
          name: voiceName
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate: 1.0,
          pitch: 0.0
        }
      };

      const response = await fetch(`${this.baseUrl}/text:synthesize?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Google TTS preview error: ${response.status}`);
      }

      const data = await response.json();
      return data.audioContent; // Base64 encoded MP3
    } catch (error) {
      omniLogger.error('Failed to generate preview', { voiceName, error: error.message });
      throw error;
    }
  }

  /**
   * Générer de l'audio (TTS)
   * @param {string} text - Texte à convertir
   * @param {string} voiceName - Nom de la voix Google (ex: fr-FR-Wavenet-D)
   * @param {object} settings - Paramètres de la voix
   * @returns {string} Audio encodé en base64
   */
  async textToSpeech(text, voiceName, settings = {}) {
    try {
      const requestBody = {
        input: {
          text: text
        },
        voice: {
          languageCode: 'fr-FR',
          name: voiceName,
          ssmlGender: settings.ssmlGender || 'FEMALE'
        },
        audioConfig: {
          audioEncoding: settings.audioEncoding || 'MULAW', // MULAW pour téléphonie (8kHz)
          sampleRateHertz: settings.sampleRateHertz || 8000,
          speakingRate: settings.speakingRate || 1.0,
          pitch: settings.pitch || 0.0,
          volumeGainDb: settings.volumeGainDb || 0.0
        }
      };

      const response = await fetch(`${this.baseUrl}/text:synthesize?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google TTS error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      omniLogger.info('Google TTS generated', {
        voiceName,
        textLength: text.length,
        audioEncoding: requestBody.audioConfig.audioEncoding
      });

      // L'API Google retourne déjà l'audio en base64
      return data.audioContent;

    } catch (error) {
      omniLogger.error('Failed to generate speech', { voiceName, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les détails d'une voix spécifique
   */
  async getVoice(voiceName) {
    const voices = await this.getVoices();
    const voice = voices.find(v => v.name === voiceName);

    if (!voice) {
      throw new Error(`Voice ${voiceName} not found`);
    }

    return voice;
  }
}

export default GoogleTTSService;
