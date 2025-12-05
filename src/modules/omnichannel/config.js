/**
 * Configuration du module Omnichannel
 */

export const OmnichannelConfig = {
  // Module activé ?
  isEnabled: (env) => env.OMNICHANNEL_ENABLED === 'true',

  // Préfixes
  routePrefix: '/api/v1/omnichannel',
  webhookPrefix: '/webhooks/omnichannel',
  tablePrefix: 'omni_',

  // Services externes
  elevenlabs: {
    apiKey: (env) => env.ELEVENLABS_API_KEY,
    baseUrl: 'https://api.elevenlabs.io/v1',
    defaultVoiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel (EN)
    defaultVoiceIdFR: 'pNInz6obpgDQGcFmaJgB' // Antoine (FR)
  },

  twilio: {
    accountSid: (env) => env.TWILIO_ACCOUNT_SID,
    authToken: (env) => env.TWILIO_AUTH_TOKEN,
    conversationsServiceSid: (env) => env.TWILIO_CONVERSATIONS_SERVICE_SID
  },

  // Canaux supportés
  channels: {
    voice: true,
    sms: true,
    whatsapp: true,
    email: true
  },

  // Limites par défaut
  defaults: {
    maxConversationDuration: 1800, // 30 minutes
    maxMessagesPerConversation: 500,
    voiceLanguage: 'fr-FR',
    agentName: 'Sara',
    agentPersonality: 'professional'
  }
};

export default OmnichannelConfig;
