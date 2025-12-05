/**
 * Validateurs pour le module Omnichannel
 */

export const validators = {
  // Valider un tenant ID
  tenantId: (tenantId) => {
    if (!tenantId || typeof tenantId !== 'string') {
      return { valid: false, error: 'Tenant ID requis' };
    }
    return { valid: true };
  },

  // Valider une config agent
  agentConfig: (config) => {
    const errors = [];

    if (config.agent_name && config.agent_name.length > 50) {
      errors.push('Nom agent trop long (max 50 caractères)');
    }

    if (config.agent_personality && !['professional', 'friendly', 'casual'].includes(config.agent_personality)) {
      errors.push('Personnalité invalide (professional, friendly, casual)');
    }

    if (config.voice_provider && !['elevenlabs', 'cartesia', 'google', 'amazon'].includes(config.voice_provider)) {
      errors.push('Provider vocal invalide');
    }

    if (config.voice_language && !/^[a-z]{2}-[A-Z]{2}$/.test(config.voice_language)) {
      errors.push('Langue invalide (format: fr-FR)');
    }

    return errors.length > 0
      ? { valid: false, errors }
      : { valid: true };
  },

  // Valider un numéro de téléphone
  phoneNumber: (phone) => {
    if (!phone) return { valid: false, error: 'Numéro requis' };
    // Format E.164 : +[country code][number]
    if (!/^\+[1-9]\d{1,14}$/.test(phone)) {
      return { valid: false, error: 'Format invalide (E.164: +33...)' };
    }
    return { valid: true };
  },

  // Valider un email
  email: (email) => {
    if (!email) return { valid: false, error: 'Email requis' };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { valid: false, error: 'Email invalide' };
    }
    return { valid: true };
  }
};

export default validators;
