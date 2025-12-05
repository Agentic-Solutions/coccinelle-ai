/**
 * Webhook Voice - Gestion des appels entrants via ConversationRelay
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';

/**
 * POST /webhooks/omnichannel/voice
 * Webhook Twilio pour les appels entrants
 */
export async function handleIncomingCall(request, env) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid');
    const from = formData.get('From');
    const to = formData.get('To');

    omniLogger.info('Incoming call', { callSid, from, to });

    // TODO: Récupérer la config agent du tenant basée sur le numéro 'to'
    // Pour l'instant, utiliser config par défaut (sans requête DB pour éviter les erreurs D1)

    // Config agent par défaut avec ElevenLabs (qualité vocale premium)
    const agentConfig = {
      agent_name: 'Sara',
      agent_personality: 'friendly',
      voice_provider: 'elevenlabs',
      voice_id: 'pNInz6obpgDQGcFmaJgB', // Adam - voix française naturelle
      voice_language: 'fr-FR',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.2,
        use_speaker_boost: true
      },
      greeting_message: 'Bonjour ! Je suis Sara. Comment puis-je vous aider ?',
      fallback_message: 'Pardon, pouvez-vous répéter ?',
      transfer_message: 'Je vous transfère vers un conseiller.',
      goodbye_message: 'Au revoir !'
    };

    // Créer la conversation dans DB
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    await env.DB.prepare(queries.createConversation).bind(
      conversationId,
      null, // conversation_sid (sera mis à jour après)
      'tenant_mihmuebzieaxehi7qv',
      from,
      null, // email
      null, // name
      JSON.stringify(['voice']),
      'voice',
      JSON.stringify({}),
      callSid,
      now,
      now
    ).run();

    // Construire l'URL WebSocket
    const wsUrl = `wss://${new URL(request.url).host}/webhooks/omnichannel/conversation?conversationId=${conversationId}&amp;callSid=${callSid}`;

    // Générer le TwiML avec ConversationRelay
    const twiml = generateConversationRelayTwiML(wsUrl, agentConfig);

    omniLogger.info('TwiML generated', { conversationId, callSid });

    return new Response(twiml, {
      headers: { 'Content-Type': 'application/xml' }
    });

  } catch (error) {
    omniLogger.error('Failed to handle incoming call', { error: error.message });
    return new Response(generateErrorTwiML('Erreur système'), {
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}

/**
 * Générer le TwiML avec ConversationRelay
 */
function generateConversationRelayTwiML(wsUrl, agentConfig) {
  const {
    voice_provider = 'amazon',
    voice_id,
    voice_language = 'fr-FR',
    greeting_message = 'Bonjour, je suis votre assistante virtuelle. Comment puis-je vous aider ?'
  } = agentConfig;

  // Configuration basée sur le provider
  let voiceAttr, ttsProvider;

  if (voice_provider === 'google') {
    // Google Cloud TTS - Voix Neural de très haute qualité
    voiceAttr = voice_id || 'fr-FR-Neural2-A';  // Voix féminine Neural2 (meilleure qualité)
    ttsProvider = 'google';
  } else if (voice_provider === 'amazon') {
    voiceAttr = voice_id || 'Gabrielle';  // Gabrielle Neural (meilleure que Lea)
    ttsProvider = 'amazon';
  } else {
    // Fallback sur Google Neural2 (meilleure qualité)
    voiceAttr = 'fr-FR-Neural2-A';
    ttsProvider = 'google';
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      voice="${voiceAttr}"
      ttsProvider="${ttsProvider}"
      transcriptionLanguage="${voice_language}"
      transcriptionProvider="Deepgram"
      speechModel="nova-2"
      dtmfDetection="true">
      <Language code="${voice_language}" ttsProvider="${ttsProvider}" voice="${voiceAttr}" transcriptionProvider="Deepgram" />
    </ConversationRelay>
  </Connect>
</Response>`;
}

/**
 * TwiML d'erreur
 */
function generateErrorTwiML(message) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="Polly.Lea-Neural">${escapeXml(message)}. Au revoir.</Say>
  <Hangup/>
</Response>`;
}

/**
 * Escape XML
 */
function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Récupérer la config agent (fallback sur défaut)
 */
async function getAgentConfig(env, tenantId) {
  try {
    const config = await env.DB.prepare(queries.getAgentConfig)
      .bind(tenantId)
      .first();

    if (config) {
      // Parser JSON fields
      if (config.voice_settings) {
        config.voice_settings = JSON.parse(config.voice_settings);
      }
      return config;
    }
  } catch (error) {
    omniLogger.warn('Failed to load agent config, using defaults', { error: error.message });
  }

  // Fallback: config par défaut
  return {
    agent_name: 'Sara',
    agent_personality: 'professional',
    voice_provider: 'elevenlabs',
    voice_id: 'pNInz6obpgDQGcFmaJgB',
    voice_language: 'fr-FR',
    greeting_message: 'Bonjour, je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?',
    fallback_message: 'Je n\'ai pas bien compris, pouvez-vous reformuler ?',
    transfer_message: 'Je vous transfère vers un conseiller.'
  };
}

export { generateConversationRelayTwiML, escapeXml };
