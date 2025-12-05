/**
 * Audio Buffer Manager - Gestion des chunks audio mulaw pour ConversationRelay
 */

import { omniLogger } from '../utils/logger.js';

export class AudioBufferManager {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.buffer = [];
    this.maxBufferSize = 100; // Nombre max de chunks à garder
    this.sampleRate = 8000; // Twilio ConversationRelay utilise 8kHz
    this.bytesReceived = 0;
    this.chunksReceived = 0;
  }

  /**
   * Ajouter un chunk audio au buffer
   * @param {string} payload - Audio encodé en base64 (mulaw)
   * @param {number} timestamp - Timestamp du chunk
   */
  addChunk(payload, timestamp) {
    this.buffer.push({
      payload,
      timestamp,
      receivedAt: Date.now()
    });

    this.chunksReceived++;
    this.bytesReceived += payload.length;

    // Limiter la taille du buffer
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }

    omniLogger.debug('Audio chunk added to buffer', {
      sessionId: this.sessionId,
      bufferSize: this.buffer.length,
      totalChunks: this.chunksReceived
    });
  }

  /**
   * Récupérer tous les chunks depuis un timestamp donné
   */
  getChunksSince(timestamp) {
    return this.buffer.filter(chunk => chunk.timestamp >= timestamp);
  }

  /**
   * Récupérer les N derniers chunks
   */
  getLastChunks(count) {
    return this.buffer.slice(-count);
  }

  /**
   * Convertir les chunks en un seul buffer audio continu
   * @returns {string} Buffer audio concaténé en base64
   */
  getContinuousBuffer() {
    if (this.buffer.length === 0) return '';

    // Décoder chaque chunk base64, les combiner, puis ré-encoder
    try {
      const audioBuffers = this.buffer.map(chunk => {
        return atob(chunk.payload);
      });

      const concatenated = audioBuffers.join('');
      return btoa(concatenated);

    } catch (error) {
      omniLogger.error('Error concatenating audio buffer', {
        sessionId: this.sessionId,
        error: error.message
      });
      return '';
    }
  }

  /**
   * Vider le buffer
   */
  clear() {
    const clearedCount = this.buffer.length;
    this.buffer = [];

    omniLogger.debug('Audio buffer cleared', {
      sessionId: this.sessionId,
      clearedChunks: clearedCount
    });
  }

  /**
   * Obtenir les statistiques du buffer
   */
  getStats() {
    return {
      sessionId: this.sessionId,
      bufferSize: this.buffer.length,
      totalChunksReceived: this.chunksReceived,
      totalBytesReceived: this.bytesReceived,
      estimatedDurationSeconds: (this.chunksReceived * 20) / 1000 // Environ 20ms par chunk
    };
  }

  /**
   * Détecter si l'utilisateur a fini de parler (silence detection)
   * Basé sur le temps écoulé depuis le dernier chunk
   */
  isSilenceDetected(silenceThresholdMs = 800) {
    if (this.buffer.length === 0) return false;

    const lastChunk = this.buffer[this.buffer.length - 1];
    const timeSinceLastChunk = Date.now() - lastChunk.receivedAt;

    return timeSinceLastChunk >= silenceThresholdMs;
  }

  /**
   * Encoder du texte en audio mulaw (pour TTS response)
   * Note: En réalité, on utilise ElevenLabs pour générer l'audio
   * Cette fonction est un placeholder pour la structure
   */
  static encodeTextToMulaw(audioData) {
    // L'audio vient déjà d'ElevenLabs en format PCM ou autre
    // Il faut le convertir en mulaw 8kHz pour Twilio
    // Pour l'instant, on retourne tel quel (à implémenter avec conversion)
    return audioData;
  }

  /**
   * Découper un long buffer audio en chunks de taille appropriée pour Twilio
   * Twilio recommande des chunks de ~20ms d'audio
   */
  static splitIntoChunks(audioBase64, chunkSizeBytes = 160) {
    try {
      const audioData = atob(audioBase64);
      const chunks = [];

      for (let i = 0; i < audioData.length; i += chunkSizeBytes) {
        const chunk = audioData.slice(i, i + chunkSizeBytes);
        chunks.push(btoa(chunk));
      }

      return chunks;

    } catch (error) {
      omniLogger.error('Error splitting audio into chunks', { error: error.message });
      return [];
    }
  }
}
