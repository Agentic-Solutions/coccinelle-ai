/**
 * WebSocket Handler - Twilio ConversationRelay
 * Gère la communication bidirectionnelle temps réel avec Claude AI
 */

import { omniLogger } from '../utils/logger.js';
import { queries } from '../db/queries.js';
import { ConversationOrchestrator } from '../services/conversation-orchestrator.js';

/**
 * GET /webhooks/omnichannel/conversation (WebSocket upgrade)
 * Handler WebSocket pour ConversationRelay de Twilio
 */
export async function handleConversationWebSocket(request, env) {
  const url = new URL(request.url);
  const conversationId = url.searchParams.get('conversationId');
  const callSid = url.searchParams.get('callSid');

  if (!conversationId || !callSid) {
    return new Response('Missing conversationId or callSid', { status: 400 });
  }

  // Vérifier si c'est une demande d'upgrade WebSocket
  const upgradeHeader = request.headers.get('Upgrade');
  if (upgradeHeader !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 });
  }

  // Créer la paire WebSocket
  const pair = new WebSocketPair();
  const client = pair[0];
  const server = pair[1];

  // Accepter la connexion WebSocket
  server.accept();

  omniLogger.info('WebSocket connected', { conversationId, callSid });

  // Récupérer la configuration de l'agent pour ce tenant
  let agentConfig = await env.DB.prepare(`
    SELECT * FROM omni_agent_configs
    WHERE tenant_id = (
      SELECT tenant_id FROM omni_conversations WHERE id = ?
    )
  `).bind(conversationId).first();

  // Utiliser une config par défaut si aucune n'est trouvée dans la DB
  if (!agentConfig) {
    omniLogger.warn('No agent config found in DB, using default config', { conversationId });
    agentConfig = {
      agent_name: 'Sara',
      agent_personality: 'friendly',
      voice_provider: 'google',
      voice_id: 'fr-FR-Neural2-A',
      voice_language: 'fr-FR',
      greeting_message: 'Bonjour ! Je suis Sara, votre assistante virtuelle chez Agentic Solutions. Comment puis-je vous aider ?',
      fallback_message: 'Pardon, pouvez-vous répéter ?',
      transfer_message: 'Je vous transfère vers un conseiller.',
      goodbye_message: 'Au revoir !'
    };
  }

  // Créer l'orchestrateur de conversation
  let orchestrator = null;
  let greetingSent = false;

  // Gérer les événements WebSocket
  server.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);
      const eventType = data.type || data.event; // Twilio utilise 'type', pas 'event'

      omniLogger.info('WebSocket message received', {
        conversationId,
        eventType,
        rawData: JSON.stringify(data)
      });

      // Gérer les différents types de messages ConversationRelay
      switch (eventType) {
        case 'setup':
          // Événement de configuration initial de Twilio
          omniLogger.info('WebSocket setup received', {
            conversationId,
            sessionId: data.sessionId,
            callSid: data.callSid
          });

          // Initialiser l'orchestrateur seulement si pas déjà fait
          if (!orchestrator) {
            orchestrator = new ConversationOrchestrator(conversationId, agentConfig, env);
            await orchestrator.initialize(server, data);
            omniLogger.info('Orchestrator initialized on setup', { conversationId });
          }

          // Envoyer le message de bienvenue si pas déjà envoyé
          if (!greetingSent) {
            const greetingText = agentConfig.greeting_message || "Bonjour ! Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?";
            await orchestrator.speakResponse(greetingText);
            greetingSent = true;
            omniLogger.info('Greeting sent', { conversationId, greetingText });
          }
          break;

        case 'start':
          // Événement de démarrage du stream
          omniLogger.info('Conversation start event received', {
            conversationId,
            streamSid: data.streamSid,
            callSid: data.callSid
          });

          // Initialiser l'orchestrateur seulement si pas déjà fait
          if (!orchestrator) {
            orchestrator = new ConversationOrchestrator(conversationId, agentConfig, env);
            await orchestrator.initialize(server, data);
            omniLogger.info('Orchestrator initialized on start', { conversationId });
          } else {
            // Mettre à jour le streamSid si l'orchestrateur existe déjà
            orchestrator.streamSid = data.streamSid;
            orchestrator.callSid = data.callSid;
            omniLogger.info('Orchestrator updated with streamSid', {
              conversationId,
              streamSid: data.streamSid
            });
          }

          // Mettre à jour la DB avec le streamSid
          await env.DB.prepare(`
            UPDATE omni_conversations
            SET conversation_sid = ?,
                updated_at = datetime('now')
            WHERE id = ?
          `).bind(data.streamSid, conversationId).run();

          // Envoyer le greeting si pas encore fait
          if (!greetingSent) {
            const greetingText = agentConfig.greeting_message || "Bonjour ! Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?";
            await orchestrator.speakResponse(greetingText);
            greetingSent = true;
            omniLogger.info('Greeting sent on start', { conversationId, greetingText });
          }
          break;

        case 'media':
          // Twilio envoie l'audio du client (non utilisé avec ConversationRelay)
          if (orchestrator) {
            await orchestrator.handleAudioChunk(data.media);
          } else {
            omniLogger.warn('Received media before setup', { conversationId });
          }
          break;

        case 'prompt':
          // ConversationRelay envoie les transcriptions de l'utilisateur
          if (orchestrator && data.voicePrompt && data.last) {
            omniLogger.info('User transcript received', {
              conversationId,
              transcript: data.voicePrompt,
              language: data.lang
            });

            // Traiter la transcription avec Claude et répondre
            await orchestrator.onTranscript(data.voicePrompt, 1.0);
          }
          break;

        case 'dtmf':
          // Touches DTMF pressées par l'utilisateur
          if (orchestrator) {
            await orchestrator.handleDTMF(data.dtmf.digit);
          }
          break;

        case 'interrupt':
          // L'utilisateur a interrompu Sara en parlant
          if (orchestrator) {
            omniLogger.info('User interrupted assistant', {
              conversationId,
              utteranceUntilInterrupt: data.utteranceUntilInterrupt,
              durationMs: data.durationUntilInterruptMs
            });

            // Arrêter le traitement en cours si existant
            orchestrator.isProcessing = false;
          }
          break;

        case 'stop':
          if (orchestrator) {
            orchestrator.cleanup();
          }
          await handleStop(server, data, conversationId, env);
          break;

        case 'error':
          // Erreur reçue de Twilio
          omniLogger.error('WebSocket error from Twilio', {
            conversationId,
            description: data.description
          });
          break;

        default:
          omniLogger.warn('Unknown event type', { eventType });
      }
    } catch (error) {
      omniLogger.error('WebSocket message error', {
        error: error.message,
        conversationId
      });
    }
  });

  server.addEventListener('close', (event) => {
    omniLogger.info('WebSocket closed', {
      conversationId,
      code: event.code,
      reason: event.reason
    });
  });

  server.addEventListener('error', (event) => {
    omniLogger.error('WebSocket error', {
      conversationId,
      error: event.message
    });
  });

  // Retourner la réponse WebSocket avec status 101 (obligatoire)
  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

/**
 * Gérer l'événement 'start' - Début de la conversation
 */
async function handleStart(ws, data, conversationId, agentConfig, env, setOrchestrator) {
  omniLogger.info('Conversation started', {
    conversationId,
    streamSid: data.streamSid,
    callSid: data.callSid
  });

  // Mettre à jour la conversation avec le streamSid
  await env.DB.prepare(`
    UPDATE omni_conversations
    SET conversation_sid = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(data.streamSid, conversationId).run();

  // Créer et initialiser l'orchestrateur
  const orchestrator = new ConversationOrchestrator(conversationId, agentConfig, env);
  await orchestrator.initialize(ws, data);

  // Stocker l'orchestrateur via le callback
  setOrchestrator(orchestrator);

  omniLogger.info('Conversation orchestrator initialized', {
    conversationId,
    streamSid: data.streamSid
  });
}

/**
 * Gérer l'événement 'stop' - Fin de la conversation
 */
async function handleStop(ws, data, conversationId, env) {
  omniLogger.info('Conversation stopped', {
    conversationId,
    streamSid: data.streamSid
  });

  // Mettre à jour le statut de la conversation
  await env.DB.prepare(`
    UPDATE omni_conversations
    SET status = 'closed',
        closed_reason = 'completed',
        updated_at = datetime('now')
    WHERE id = ?
  `).bind(conversationId).run();

  // TODO: Terminer la session Claude AI

  // Fermer le WebSocket proprement
  ws.close(1000, 'Conversation ended');
}
