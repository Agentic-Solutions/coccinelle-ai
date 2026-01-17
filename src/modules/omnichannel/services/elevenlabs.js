/**
 * Service ElevenLabs - Gestion des voix et TTS
 */

import { OmnichannelConfig } from '../config.js';
import { omniLogger } from '../utils/logger.js';

export class ElevenLabsService {
  constructor(env) {
    this.apiKey = OmnichannelConfig.elevenlabs.apiKey(env);
    this.baseUrl = OmnichannelConfig.elevenlabs.baseUrl;
  }

  /**
   * Récupérer toutes les voix disponibles
   */
  async getVoices() {
    try {
      const response = await fetch(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();
      return data.voices || [];
    } catch (error) {
      omniLogger.error('Failed to fetch ElevenLabs voices', { error: error.message });
      throw error;
    }
  }

  /**
   * Récupérer les voix françaises uniquement
   */
  async getFrenchVoices() {
    const allVoices = await this.getVoices();

    // Filtrer les voix qui supportent le français
    return allVoices.filter(voice => {
      // Vérifier dans verified_languages si la langue "fr" est supportée
      const verifiedLanguages = voice.verified_languages || [];
      const hasFrench = verifiedLanguages.some(lang =>
        lang.language === 'fr'
      );

      // Sinon, vérifier dans les labels en fallback
      if (!hasFrench) {
        const labels = voice.labels || {};
        return Object.values(labels).some(label =>
          typeof label === 'string' && label.toLowerCase().includes('french')
        );
      }

      return hasFrench;
    });
  }

  /**
   * Récupérer les détails d'une voix spécifique
   */
  async getVoice(voiceId) {
    try {
      const response = await fetch(`${this.baseUrl}/voices/${voiceId}`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      omniLogger.error('Failed to fetch ElevenLabs voice', { voiceId, error: error.message });
      throw error;
    }
  }

  /**
   * Supprimer les headers audio (ID3, MP3, etc.) pour obtenir le raw audio
   * @param {Uint8Array} audioBytes - Audio avec potentiellement des headers
   * @returns {Uint8Array} Audio RAW sans headers
   */
  stripAudioHeaders(audioBytes) {
    let offset = 0;

    // Détecter et skip ID3v2 header
    if (audioBytes.length > 10 &&
        audioBytes[0] === 0x49 && // 'I'
        audioBytes[1] === 0x44 && // 'D'
        audioBytes[2] === 0x33) { // '3'

      // Lire la taille du tag ID3 (synchsafe integer, bytes 6-9)
      const size = ((audioBytes[6] & 0x7F) << 21) |
                   ((audioBytes[7] & 0x7F) << 14) |
                   ((audioBytes[8] & 0x7F) << 7) |
                   (audioBytes[9] & 0x7F);

      offset = 10 + size; // Header (10 bytes) + tag data

      omniLogger.info('ID3 header detected and removed', {
        headerSize: offset,
        originalSize: audioBytes.length,
        newSize: audioBytes.length - offset
      });
    }

    // Retourner les bytes sans header
    return audioBytes.slice(offset);
  }

  /**
   * Générer de l'audio (TTS)
   * @param {string} text - Texte à convertir
   * @param {string} voiceId - ID de la voix ElevenLabs
   * @param {object} settings - Paramètres de la voix
   * @param {string} outputFormat - Format de sortie ('mp3_44100_128', 'ulaw_8000', etc.)
   * @returns {string} Audio encodé en base64
   */
  async textToSpeech(text, voiceId, settings = {}, outputFormat = 'ulaw_8000') {
    try {
      const response = await fetch(`${this.baseUrl}/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': outputFormat === 'ulaw_8000' ? 'audio/basic' : 'audio/mpeg'
        },
        body: JSON.stringify({
          text,
          model_id: settings.model_id || 'eleven_multilingual_v2',
          voice_settings: {
            stability: settings.stability || 0.5,
            similarity_boost: settings.similarity_boost || 0.75,
            style: settings.style || 0,
            use_speaker_boost: settings.use_speaker_boost !== false
          },
          output_format: outputFormat
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs TTS error ${response.status}: ${errorText}`);
      }

      // Récupérer l'audio en ArrayBuffer
      const audioArrayBuffer = await response.arrayBuffer();
      let audioBytes = new Uint8Array(audioArrayBuffer);

      omniLogger.info('Raw audio from ElevenLabs', {
        size: audioBytes.length,
        first10Bytes: Array.from(audioBytes.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      });

      // Pour ulaw_8000, supprimer les headers ID3/MP3 si présents
      if (outputFormat === 'ulaw_8000') {
        audioBytes = this.stripAudioHeaders(audioBytes);

        omniLogger.info('Audio after header stripping', {
          size: audioBytes.length,
          first10Bytes: Array.from(audioBytes.slice(0, 10)).map(b => b.toString(16).padStart(2, '0')).join(' ')
        });
      }

      // Convertir en base64
      let binary = '';
      for (let i = 0; i < audioBytes.length; i++) {
        binary += String.fromCharCode(audioBytes[i]);
      }
      const audioBase64 = btoa(binary);

      omniLogger.info('ElevenLabs TTS generated', {
        voiceId,
        textLength: text.length,
        audioSizeBytes: audioBytes.length,
        outputFormat
      });

      return audioBase64;

    } catch (error) {
      omniLogger.error('Failed to generate speech', { voiceId, error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir les modèles disponibles
   */
  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'xi-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      omniLogger.error('Failed to fetch ElevenLabs models', { error: error.message });
      throw error;
    }
  }
}

export default ElevenLabsService;
