// Module Retell - Configuration
export const RETELL_CONFIG = {
  API_BASE_URL: 'https://api.retellai.com',
  CUSTOM_VOICE_ID: 'custom_voice_a3a6b6afa440c43a3a0f06fe7b',
  VOICE_CONFIG: {
    language: 'fr-FR',
    voice_temperature: 1.0,
    voice_speed: 1.0,
    volume: 1.5,
    interruption_sensitivity: 0.9,
  },
};

export function getRetellApiKey(env) {
  return env.RETELL_API_KEY;
}

export function getRetellHeaders(env) {
  return {
    'Authorization': `Bearer ${getRetellApiKey(env)}`,
    'Content-Type': 'application/json',
  };
}

export function generateAgentPrompt(tenantConfig) {
  const companyName = tenantConfig.company_name || 'notre entreprise';
  const assistantName = tenantConfig.assistant_name || null;
  
  const nameIntro = assistantName 
    ? `Tu t'appelles ${assistantName} et tu es l'assistant(e) de ${companyName}.`
    : `Tu es l'assistant(e) virtuel(le) de ${companyName}.`;

  return `${nameIntro}
Tu réponds au téléphone de manière professionnelle et chaleureuse.
Tu parles en français, de manière naturelle et concise.`;
}

export default RETELL_CONFIG;
