/**
 * Conversation Orchestrator - Gestion complète du flux ConversationRelay
 *
 * Twilio WebSocket → Deepgram → OpenAI GPT-4 → Twilio TTS
 */

import { omniLogger } from '../utils/logger.js';
import { AudioBufferManager } from './audio-buffer.js';
import { DeepgramService } from './deepgram.js';
import { ClaudeAIService } from './claude-ai.js';
import { ElevenLabsService } from './elevenlabs.js';

export class ConversationOrchestrator {
  constructor(conversationId, agentConfig, env) {
    this.conversationId = conversationId;
    this.agentConfig = agentConfig;
    this.env = env;

    // Services
    this.audioBuffer = new AudioBufferManager(conversationId);
    this.deepgram = new DeepgramService(env.DEEPGRAM_API_KEY);
    this.claude = new ClaudeAIService(env.OPENAI_API_KEY);
    this.elevenlabs = new ElevenLabsService(env); // ElevenLabsService prend env en paramètre

    // État de la conversation
    this.twilioWs = null;
    this.deepgramWs = null;
    this.claudeSession = null;
    this.streamSid = null;
    this.callSid = null;
    this.isProcessing = false;
    this.lastTranscript = null;

    omniLogger.info('Conversation orchestrator initialized', { conversationId });
  }

  /**
   * Initialiser la conversation avec Twilio et démarrer les services
   */
  async initialize(twilioWs, startData) {
    this.twilioWs = twilioWs;
    this.streamSid = startData.streamSid;
    this.callSid = startData.callSid;

    omniLogger.info('Initializing conversation', {
      conversationId: this.conversationId,
      streamSid: this.streamSid,
      callSid: this.callSid
    });

    // Initialiser la session Claude AI
    this.claudeSession = await this.claude.createSession(this.agentConfig);

    omniLogger.info('Claude session created', {
      sessionId: this.claudeSession.sessionId
    });

    // TODO: Créer la connexion WebSocket Deepgram pour transcription en temps réel
    // Note: Désactivé temporairement car Cloudflare Workers a des limitations sur les WebSocket sortants
    // On va utiliser l'API REST de Deepgram à la place en accumulant des chunks
    /*
    this.deepgramWs = this.deepgram.createLiveTranscriptionSession(
      this.agentConfig.language || 'fr',
      (transcript, confidence) => this.onTranscript(transcript, confidence),
      (error) => this.onDeepgramError(error)
    );
    */

    omniLogger.info('Orchestrator initialized (Deepgram WebSocket disabled)', {
      conversationId: this.conversationId
    });
  }

  /**
   * Traiter un chunk audio reçu de Twilio
   */
  async handleAudioChunk(mediaData) {
    const { payload, timestamp, chunk } = mediaData;

    // Ajouter au buffer local
    this.audioBuffer.addChunk(payload, timestamp);

    omniLogger.debug('Audio chunk buffered', {
      conversationId: this.conversationId,
      chunk,
      bufferSize: this.audioBuffer.buffer.length
    });

    // Détecter le silence pour déclencher la transcription
    if (this.audioBuffer.isSilenceDetected(1000)) { // 1 seconde de silence
      await this.processBufferedAudio();
    }
  }

  /**
   * Traiter l'audio bufferisé avec Deepgram REST API
   */
  async processBufferedAudio() {
    if (this.isProcessing || this.audioBuffer.buffer.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Obtenir le buffer audio continu
      const audioBase64 = this.audioBuffer.getContinuousBuffer();

      if (!audioBase64) {
        this.isProcessing = false;
        return;
      }

      omniLogger.info('Processing buffered audio with Deepgram', {
        conversationId: this.conversationId,
        audioSize: audioBase64.length
      });

      // Décoder le base64 en buffer
      const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));

      // Transcription avec Deepgram REST API
      const result = await this.deepgram.transcribeAudioBuffer(
        audioBuffer,
        this.agentConfig.language || 'fr'
      );

      if (result.transcript && result.transcript.trim()) {
        await this.onTranscript(result.transcript, result.confidence);
      }

      // Vider le buffer après traitement
      this.audioBuffer.clear();

    } catch (error) {
      omniLogger.error('Error processing buffered audio', {
        conversationId: this.conversationId,
        error: error.message
      });
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Callback quand Deepgram envoie une transcription
   */
  async onTranscript(transcript, confidence) {
    omniLogger.info('Transcript received', {
      conversationId: this.conversationId,
      transcript,
      confidence
    });

    // Éviter de traiter plusieurs fois le même transcript
    if (this.lastTranscript === transcript || this.isProcessing) {
      return;
    }

    this.lastTranscript = transcript;
    this.isProcessing = true;

    try {
      // Enregistrer le message utilisateur dans la DB (non-bloquant)
      try {
        const userMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.env.DB.prepare(`
          INSERT INTO omni_messages (
            id, conversation_id, channel, direction, content,
            sender_role, transcript, created_at
          ) VALUES (?, ?, 'voice', 'inbound', ?, 'client', ?, datetime('now'))
        `).bind(
          userMessageId,
          this.conversationId,
          transcript,
          transcript
        ).run();
      } catch (dbError) {
        omniLogger.warn('Failed to save user message to DB (non-blocking)', {
          conversationId: this.conversationId,
          error: dbError.message
        });
      }

      // Vérifier si l'utilisateur veut transférer ou terminer
      if (this.claude.shouldTransfer(transcript)) {
        await this.handleTransferRequest();
        return;
      }

      if (this.claude.shouldEndConversation(transcript)) {
        await this.handleEndConversation();
        return;
      }

      // Générer une réponse avec Claude AI
      const response = await this.claude.streamResponse(this.claudeSession, transcript);

      omniLogger.info('Claude response generated', {
        conversationId: this.conversationId,
        response: response.substring(0, 100) + '...'
      });

      // Enregistrer la réponse de l'assistant dans la DB (non-bloquant)
      try {
        const assistantMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await this.env.DB.prepare(`
          INSERT INTO omni_messages (
            id, conversation_id, channel, direction, content,
            sender_role, created_at
          ) VALUES (?, ?, 'voice', 'outbound', ?, 'assistant', datetime('now'))
        `).bind(
          assistantMessageId,
          this.conversationId,
          response
        ).run();
      } catch (dbError) {
        omniLogger.warn('Failed to save assistant message to DB (non-blocking)', {
          conversationId: this.conversationId,
          error: dbError.message
        });
      }

      // Convertir la réponse texte en audio avec ElevenLabs
      await this.speakResponse(response);

    } catch (error) {
      omniLogger.error('Error processing transcript', {
        conversationId: this.conversationId,
        error: error.message
      });

      // Réponse de fallback
      await this.speakResponse(
        this.agentConfig.fallback_message || "Je n'ai pas bien compris, pouvez-vous reformuler ?"
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Envoyer du texte à Twilio pour synthèse vocale (TTS)
   * Utilise ElevenLabs pour une qualité vocale premium
   */
  async speakResponse(text) {
    try {
      if (!this.twilioWs || this.twilioWs.readyState !== 1) {
        omniLogger.warn('WebSocket not ready to send response', {
          conversationId: this.conversationId,
          readyState: this.twilioWs?.readyState
        });
        return;
      }

      // Vérifier si ElevenLabs est configuré
      const useElevenLabs = this.agentConfig.voice_provider === 'elevenlabs' &&
                           this.env.ELEVENLABS_API_KEY;

      if (useElevenLabs) {
        // Générer l'audio avec ElevenLabs
        omniLogger.info('Generating audio with ElevenLabs', {
          conversationId: this.conversationId,
          textLength: text.length,
          voiceId: this.agentConfig.voice_id
        });

        try {
          // Générer l'audio (format MP3)
          const audioBase64 = await this.elevenlabs.textToSpeech(
            text,
            this.agentConfig.voice_id || 'pNInz6obpgDQGcFmaJgB',
            this.agentConfig.voice_settings || {},
            'mp3_44100_128'
          );

          // Décoder base64 en ArrayBuffer
          const audioBuffer = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));

          // Stocker dans R2 avec un ID unique
          const audioId = `${this.conversationId}_${Date.now()}.mp3`;
          await this.env.AUDIO_BUCKET.put(audioId, audioBuffer.buffer, {
            httpMetadata: {
              contentType: 'audio/mpeg'
            },
            customMetadata: {
              conversationId: this.conversationId,
              createdAt: new Date().toISOString()
            }
          });

          // Construire l'URL publique de l'audio
          const audioUrl = `https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/omnichannel/audio/${audioId}`;

          // Envoyer le message 'play' à Twilio
          this.twilioWs.send(JSON.stringify({
            type: 'play',
            url: audioUrl
          }));

          omniLogger.info('ElevenLabs audio sent to Twilio', {
            conversationId: this.conversationId,
            audioId,
            audioSize: audioBuffer.length
          });

        } catch (elevenLabsError) {
          omniLogger.error('ElevenLabs generation failed, falling back to Twilio TTS', {
            conversationId: this.conversationId,
            error: elevenLabsError.message
          });

          // Fallback sur TTS natif Twilio
          this.twilioWs.send(JSON.stringify({
            type: 'text',
            token: text
          }));
        }

      } else {
        // Utiliser TTS natif Twilio (Google Neural2-A)
        omniLogger.info('Sending text to Twilio for TTS', {
          conversationId: this.conversationId,
          textLength: text.length
        });

        this.twilioWs.send(JSON.stringify({
          type: 'text',
          token: text
        }));

        omniLogger.info('Text sent to Twilio', {
          conversationId: this.conversationId,
          text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        });
      }

    } catch (error) {
      omniLogger.error('Error sending text response', {
        conversationId: this.conversationId,
        error: error.message
      });
    }
  }

  /**
   * Gérer une demande de transfert vers un humain
   */
  async handleTransferRequest() {
    omniLogger.info('Transfer request detected', {
      conversationId: this.conversationId
    });

    await this.speakResponse(
      "Je vous transfère vers un conseiller. Veuillez patienter un instant."
    );

    // Mettre à jour le statut de la conversation
    await this.env.DB.prepare(`
      UPDATE omni_conversations
      SET status = 'transfer_pending',
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(this.conversationId).run();

    // TODO: Implémenter la logique de transfert Twilio
    // Pour l'instant, on termine juste la conversation
    await this.sleep(2000);
    await this.handleEndConversation();
  }

  /**
   * Terminer la conversation proprement
   */
  async handleEndConversation() {
    omniLogger.info('Ending conversation', {
      conversationId: this.conversationId
    });

    await this.speakResponse(
      this.agentConfig.goodbye_message || "Au revoir et bonne journée !"
    );

    // Attendre que l'audio soit joué
    await this.sleep(3000);

    // Fermer les connexions
    this.cleanup();

    // Mettre à jour le statut
    await this.env.DB.prepare(`
      UPDATE omni_conversations
      SET status = 'closed',
          closed_reason = 'completed',
          updated_at = datetime('now')
      WHERE id = ?
    `).bind(this.conversationId).run();
  }

  /**
   * Gérer une erreur Deepgram
   */
  onDeepgramError(error) {
    omniLogger.error('Deepgram error', {
      conversationId: this.conversationId,
      error: error.message
    });
  }

  /**
   * Gérer un DTMF (touche pressée)
   */
  async handleDTMF(digit) {
    omniLogger.info('DTMF received', {
      conversationId: this.conversationId,
      digit
    });

    // Enregistrer dans la DB
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.env.DB.prepare(`
      INSERT INTO omni_messages (
        id, conversation_id, channel, direction, content,
        sender_role, created_at
      ) VALUES (?, ?, 'voice', 'inbound', ?, 'client', datetime('now'))
    `).bind(
      messageId,
      this.conversationId,
      `DTMF: ${digit}`
    ).run();

    // TODO: Gérer les commandes DTMF (ex: 0 pour transférer)
    if (digit === '0') {
      await this.handleTransferRequest();
    }
  }

  /**
   * Nettoyer les ressources
   */
  cleanup() {
    omniLogger.info('Cleaning up conversation resources', {
      conversationId: this.conversationId
    });

    // Fermer le WebSocket Deepgram si il existe
    if (this.deepgramWs) {
      try {
        if (this.deepgramWs.readyState === 1) {
          this.deepgramWs.close();
        }
      } catch (error) {
        omniLogger.error('Error closing Deepgram WebSocket', {
          conversationId: this.conversationId,
          error: error.message
        });
      }
    }

    // Vider le buffer audio
    this.audioBuffer.clear();

    // Le WebSocket Twilio sera fermé par le handler principal
  }

  /**
   * Utilitaire: sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
