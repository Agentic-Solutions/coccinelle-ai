/**
 * Service Deepgram - Transcription audio en temps réel
 */

import { omniLogger } from '../utils/logger.js';

export class DeepgramService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.wsUrl = 'wss://api.deepgram.com/v1/listen';
  }

  /**
   * Créer une connexion WebSocket Deepgram pour transcription temps réel
   */
  createLiveTranscriptionSession(language = 'fr', onTranscript, onError) {
    const params = new URLSearchParams({
      encoding: 'mulaw',
      sample_rate: '8000',
      channels: '1',
      language: language,
      model: 'nova-2',
      punctuate: 'true',
      interim_results: 'false',
      endpointing: '500' // Détection de fin de phrase (500ms)
    });

    const wsUrl = `${this.wsUrl}?${params.toString()}`;

    omniLogger.info('Creating Deepgram WebSocket connection', { language });

    const ws = new WebSocket(wsUrl, {
      headers: {
        'Authorization': `Token ${this.apiKey}`
      }
    });

    ws.addEventListener('open', () => {
      omniLogger.info('Deepgram WebSocket connected');
    });

    ws.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.channel?.alternatives?.[0]?.transcript) {
          const transcript = data.channel.alternatives[0].transcript;
          const isFinal = data.is_final;
          const confidence = data.channel.alternatives[0].confidence;

          if (transcript.trim() && isFinal) {
            omniLogger.info('Deepgram transcript', {
              transcript,
              confidence: confidence.toFixed(2)
            });

            onTranscript(transcript, confidence);
          }
        }
      } catch (error) {
        omniLogger.error('Deepgram message parse error', { error: error.message });
      }
    });

    ws.addEventListener('error', (error) => {
      omniLogger.error('Deepgram WebSocket error', { error: error.message });
      if (onError) onError(error);
    });

    ws.addEventListener('close', () => {
      omniLogger.info('Deepgram WebSocket closed');
    });

    return ws;
  }

  /**
   * Transcription simple (non-streaming) à partir d'un buffer audio
   */
  async transcribeAudioBuffer(audioBuffer, language = 'fr') {
    try {
      const params = new URLSearchParams({
        encoding: 'mulaw',
        sample_rate: '8000',
        channels: '1',
        language: language,
        model: 'nova-2',
        punctuate: 'true'
      });

      const response = await fetch(`https://api.deepgram.com/v1/listen?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${this.apiKey}`,
          'Content-Type': 'audio/mulaw'
        },
        body: audioBuffer
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Deepgram API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

      omniLogger.info('Deepgram transcription successful', {
        transcript,
        confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
      });

      return {
        transcript,
        confidence: data.results?.channels?.[0]?.alternatives?.[0]?.confidence || 0
      };

    } catch (error) {
      omniLogger.error('Deepgram transcription error', { error: error.message });
      return { transcript: '', confidence: 0 };
    }
  }
}
