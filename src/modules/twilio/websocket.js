// Twilio ConversationRelay WebSocket Handler
// Gère la communication bidirectionnelle audio/texte avec Twilio
import { logger } from '../../utils/logger.js';
import { ConversationManager } from './conversation.js';

export async function handleConversationWebSocket(request, env) {
  // Extraire les paramètres de l'URL
  const url = new URL(request.url);
  const callId = url.searchParams.get('callId');
  const tenantId = url.searchParams.get('tenantId');

  // Vérifier que c'est bien une demande WebSocket
  const upgradeHeader = request.headers.get('Upgrade');

  logger.info('WebSocket connection request', {
    callId,
    tenantId,
    upgrade: upgradeHeader,
    headers: Object.fromEntries(request.headers.entries())
  });

  if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
    logger.warn('Not a WebSocket request', { upgradeHeader });
    return new Response('Expected WebSocket. Headers: ' + JSON.stringify(Object.fromEntries(request.headers.entries())), { status: 426 });
  }

  // Créer la paire WebSocket
  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  // Accepter la connexion
  server.accept();

  // Initialiser le gestionnaire de conversation
  const conversationManager = new ConversationManager(env, {
    callId,
    tenantId,
    websocket: server
  });

  // Gérer les messages entrants
  server.addEventListener('message', async (event) => {
    try {
      const message = JSON.parse(event.data);
      await handleWebSocketMessage(message, conversationManager, server, env);
    } catch (error) {
      logger.error('WebSocket message error', { error: error.message, callId });
    }
  });

  // Gérer la fermeture
  server.addEventListener('close', async (event) => {
    logger.info('WebSocket closed', { callId, code: event.code, reason: event.reason });
    await conversationManager.endConversation();
  });

  // Gérer les erreurs
  server.addEventListener('error', (event) => {
    logger.error('WebSocket error', { callId, error: event.message });
  });

  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

// Traiter les messages WebSocket selon le protocole ConversationRelay
async function handleWebSocketMessage(message, conversationManager, websocket, env) {
  const { type } = message;

  logger.debug('WebSocket message received', { type, callId: conversationManager.callId });

  switch (type) {
    // Session initiée par Twilio
    case 'setup':
      await handleSetup(message, conversationManager, websocket);
      break;

    // Transcription vocale reçue (STT)
    case 'prompt':
      await handlePrompt(message, conversationManager, websocket, env);
      break;

    // DTMF reçu
    case 'dtmf':
      await handleDtmf(message, conversationManager, websocket);
      break;

    // Interruption par l'utilisateur
    case 'interrupt':
      await handleInterrupt(message, conversationManager, websocket);
      break;

    // Fin de parole de l'assistant (TTS terminé)
    case 'playbackComplete':
      await handlePlaybackComplete(message, conversationManager);
      break;

    // Erreur de transcription/synthèse
    case 'error':
      await handleError(message, conversationManager);
      break;

    // Conversation terminée
    case 'end':
      await handleEnd(message, conversationManager, websocket);
      break;

    default:
      logger.warn('Unknown message type', { type });
  }
}

// Setup initial de la session
async function handleSetup(message, conversationManager, websocket) {
  const { callSid, streamSid } = message;

  logger.info('ConversationRelay setup', { callSid, streamSid });

  conversationManager.setSessionInfo({
    callSid,
    streamSid,
    startTime: Date.now()
  });

  // Envoyer un message de configuration optionnel
  sendMessage(websocket, {
    type: 'setup_ack',
    callSid: callSid
  });
}

// Traiter la transcription vocale de l'utilisateur
async function handlePrompt(message, conversationManager, websocket, env) {
  const { voicePrompt, lang, confidence } = message;

  logger.info('User prompt received', {
    callId: conversationManager.callId,
    prompt: voicePrompt,
    confidence
  });

  // Ignorer les prompts vides ou de faible confiance
  if (!voicePrompt || voicePrompt.trim().length === 0) {
    return;
  }

  // Sauvegarder le message utilisateur
  await conversationManager.addMessage('user', voicePrompt);

  // Générer la réponse via Claude/GPT
  try {
    const response = await conversationManager.generateResponse(voicePrompt, env);

    // Envoyer la réponse pour synthèse vocale (TTS)
    sendMessage(websocket, {
      type: 'text',
      token: response.text,
      last: true
    });

    // Sauvegarder la réponse assistant
    await conversationManager.addMessage('assistant', response.text);

    // Si des actions sont à effectuer
    if (response.actions && response.actions.length > 0) {
      for (const action of response.actions) {
        await processAction(action, conversationManager, websocket, env);
      }
    }

  } catch (error) {
    logger.error('Response generation error', { error: error.message });

    // Réponse d'erreur générique
    sendMessage(websocket, {
      type: 'text',
      token: "Je suis désolé, j'ai rencontré un problème technique. Pouvez-vous répéter votre question ?",
      last: true
    });
  }
}

// Traiter les actions (tool calls)
async function processAction(action, conversationManager, websocket, env) {
  logger.info('Processing action', { action: action.type, callId: conversationManager.callId });

  switch (action.type) {
    case 'transfer':
      // Transférer l'appel à un humain
      sendMessage(websocket, {
        type: 'action',
        action: 'transfer',
        destination: action.destination || conversationManager.config.transferNumber
      });
      break;

    case 'hangup':
      // Terminer l'appel
      sendMessage(websocket, {
        type: 'action',
        action: 'hangup'
      });
      break;

    case 'sendSms':
      // Envoyer un SMS de confirmation
      await sendSmsConfirmation(action.data, env, conversationManager);
      break;

    case 'bookAppointment':
      // Réserver un rendez-vous (déjà traité dans generateResponse)
      break;
  }
}

// Traiter les DTMF
async function handleDtmf(message, conversationManager, websocket) {
  const { digit } = message;

  logger.info('DTMF received', { digit, callId: conversationManager.callId });

  // Mapper les DTMF à des actions
  const dtmfActions = {
    '0': 'transfer_to_human',
    '1': 'repeat_last',
    '9': 'end_call'
  };

  const action = dtmfActions[digit];
  if (action) {
    switch (action) {
      case 'transfer_to_human':
        sendMessage(websocket, {
          type: 'text',
          token: "Je vous transfère immédiatement à un conseiller. Veuillez patienter.",
          last: true
        });
        setTimeout(() => {
          sendMessage(websocket, {
            type: 'action',
            action: 'transfer',
            destination: conversationManager.config.transferNumber
          });
        }, 2000);
        break;

      case 'repeat_last':
        const lastAssistantMessage = conversationManager.getLastAssistantMessage();
        if (lastAssistantMessage) {
          sendMessage(websocket, {
            type: 'text',
            token: lastAssistantMessage,
            last: true
          });
        }
        break;

      case 'end_call':
        sendMessage(websocket, {
          type: 'text',
          token: "Merci de votre appel. Au revoir et à bientôt !",
          last: true
        });
        setTimeout(() => {
          sendMessage(websocket, { type: 'action', action: 'hangup' });
        }, 2000);
        break;
    }
  }
}

// Gérer l'interruption
async function handleInterrupt(message, conversationManager, websocket) {
  logger.info('User interrupted', { callId: conversationManager.callId });
  conversationManager.interruptCurrentResponse();
}

// Fin de lecture TTS
async function handlePlaybackComplete(message, conversationManager) {
  logger.debug('Playback complete', { callId: conversationManager.callId });
  conversationManager.onPlaybackComplete();
}

// Gérer les erreurs
async function handleError(message, conversationManager) {
  logger.error('ConversationRelay error', {
    callId: conversationManager.callId,
    error: message.error,
    description: message.description
  });
}

// Fin de conversation
async function handleEnd(message, conversationManager, websocket) {
  const { reason } = message;

  logger.info('Conversation ended', {
    callId: conversationManager.callId,
    reason
  });

  await conversationManager.endConversation(reason);

  websocket.close(1000, 'Conversation ended');
}

// Envoyer un SMS de confirmation
async function sendSmsConfirmation(data, env, conversationManager) {
  try {
    const accountSid = env.TWILIO_ACCOUNT_SID;
    const authToken = env.TWILIO_AUTH_TOKEN;
    const fromNumber = env.TWILIO_SMS_NUMBER || conversationManager.config.smsNumber;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: data.to,
          Body: data.message
        })
      }
    );

    if (!response.ok) {
      throw new Error(`SMS send failed: ${response.status}`);
    }

    logger.info('SMS confirmation sent', { to: data.to });

  } catch (error) {
    logger.error('SMS send error', { error: error.message });
  }
}

// Utilitaire pour envoyer un message WebSocket
function sendMessage(websocket, message) {
  try {
    websocket.send(JSON.stringify(message));
  } catch (error) {
    logger.error('WebSocket send error', { error: error.message });
  }
}
