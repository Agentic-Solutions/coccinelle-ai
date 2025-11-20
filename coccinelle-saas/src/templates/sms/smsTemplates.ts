/**
 * Templates SMS - Coccinelle.AI
 *
 * Templates de messages SMS pour différents cas d'usage
 */

export interface SMSTemplateData {
  companyName?: string;
  firstName?: string;
  lastName?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  agentName?: string;
  confirmationLink?: string;
  address?: string;
  phone?: string;
  propertyAddress?: string;
  price?: string;
  [key: string]: string | undefined;
}

export interface SMSTemplate {
  id: string;
  name: string;
  category: 'appointment' | 'notification' | 'marketing' | 'survey' | 'general';
  template: string;
  variables: string[];
  maxLength: number;
  description: string;
}

/**
 * Collection de templates SMS
 */
export const SMS_TEMPLATES: Record<string, SMSTemplate> = {
  // === RAPPELS RDV ===
  APPOINTMENT_REMINDER_24H: {
    id: 'appointment_reminder_24h',
    name: 'Rappel RDV 24h',
    category: 'appointment',
    template: 'Bonjour {firstName}, rappel de votre RDV demain à {appointmentTime} avec {companyName}. Besoin d\'annuler? Répondez ANNULER',
    variables: ['firstName', 'appointmentTime', 'companyName'],
    maxLength: 160,
    description: 'Rappel automatique 24h avant le RDV',
  },

  APPOINTMENT_REMINDER_2H: {
    id: 'appointment_reminder_2h',
    name: 'Rappel RDV 2h',
    category: 'appointment',
    template: 'RDV dans 2h avec {companyName} à {appointmentTime}. Adresse: {address}. À tout de suite!',
    variables: ['companyName', 'appointmentTime', 'address'],
    maxLength: 160,
    description: 'Rappel 2h avant le RDV avec adresse',
  },

  APPOINTMENT_CONFIRMATION: {
    id: 'appointment_confirmation',
    name: 'Confirmation RDV',
    category: 'appointment',
    template: 'RDV confirmé le {appointmentDate} à {appointmentTime} avec {agentName}. Vous recevrez un rappel 24h avant. {companyName}',
    variables: ['appointmentDate', 'appointmentTime', 'agentName', 'companyName'],
    maxLength: 160,
    description: 'Confirmation immédiate après prise de RDV',
  },

  APPOINTMENT_CANCELLATION: {
    id: 'appointment_cancellation',
    name: 'Annulation RDV',
    category: 'appointment',
    template: 'Votre RDV du {appointmentDate} à {appointmentTime} a été annulé. Besoin de reprendre RDV? Répondez OUI. {companyName}',
    variables: ['appointmentDate', 'appointmentTime', 'companyName'],
    maxLength: 160,
    description: 'Notification d\'annulation de RDV',
  },

  APPOINTMENT_RESCHEDULED: {
    id: 'appointment_rescheduled',
    name: 'RDV Reporté',
    category: 'appointment',
    template: 'Votre RDV a été reporté au {appointmentDate} à {appointmentTime}. Nouveau rappel 24h avant. {companyName}',
    variables: ['appointmentDate', 'appointmentTime', 'companyName'],
    maxLength: 160,
    description: 'Notification de report de RDV',
  },

  // === NOTIFICATIONS URGENTES ===
  URGENT_PROPERTY_AVAILABLE: {
    id: 'urgent_property_available',
    name: 'Bien Disponible Urgent',
    category: 'notification',
    template: '🏡 Nouveau! {propertyAddress} à {price}€. Visite possible aujourd\'hui. Intéressé(e)? Répondez OUI. {companyName}',
    variables: ['propertyAddress', 'price', 'companyName'],
    maxLength: 160,
    description: 'Alerte pour nouveau bien correspondant aux critères',
  },

  PRICE_DROP_ALERT: {
    id: 'price_drop_alert',
    name: 'Baisse de Prix',
    category: 'notification',
    template: '💰 Baisse de prix! {propertyAddress} maintenant {price}€. Visite rapide? Répondez OUI. {companyName}',
    variables: ['propertyAddress', 'price', 'companyName'],
    maxLength: 160,
    description: 'Notification de baisse de prix',
  },

  DOCUMENT_READY: {
    id: 'document_ready',
    name: 'Document Prêt',
    category: 'notification',
    template: 'Bonjour {firstName}, votre document est prêt. Consultez-le ici: {confirmationLink}. {companyName}',
    variables: ['firstName', 'confirmationLink', 'companyName'],
    maxLength: 160,
    description: 'Notification de document disponible',
  },

  // === ENQUÊTES DE SATISFACTION ===
  POST_APPOINTMENT_SURVEY: {
    id: 'post_appointment_survey',
    name: 'Enquête Post-RDV',
    category: 'survey',
    template: 'Merci pour votre visite! Notez votre expérience de 1 à 5. Répondez avec un chiffre. {companyName}',
    variables: ['companyName'],
    maxLength: 160,
    description: 'Enquête de satisfaction après RDV',
  },

  NPS_SURVEY: {
    id: 'nps_survey',
    name: 'Enquête NPS',
    category: 'survey',
    template: 'Sur une échelle de 0 à 10, recommanderiez-vous {companyName} à un proche? Répondez avec un chiffre.',
    variables: ['companyName'],
    maxLength: 160,
    description: 'Enquête Net Promoter Score',
  },

  // === MARKETING ===
  WELCOME_NEW_CLIENT: {
    id: 'welcome_new_client',
    name: 'Bienvenue Nouveau Client',
    category: 'marketing',
    template: 'Bienvenue {firstName}! Merci de faire confiance à {companyName}. Besoin d\'aide? Répondez INFO. STOP pour ne plus recevoir de SMS.',
    variables: ['firstName', 'companyName'],
    maxLength: 160,
    description: 'Message de bienvenue pour nouveaux clients',
  },

  MONTHLY_UPDATE: {
    id: 'monthly_update',
    name: 'Mise à Jour Mensuelle',
    category: 'marketing',
    template: '{firstName}, ce mois-ci: {companyName} a de nouvelles offres! Répondez OFFRES pour les découvrir. STOP=Désabonnement',
    variables: ['firstName', 'companyName'],
    maxLength: 160,
    description: 'Newsletter mensuelle par SMS',
  },

  // === CONVERSATIONNELS ===
  AGENT_RESPONSE: {
    id: 'agent_response',
    name: 'Réponse Agent',
    category: 'general',
    template: '{firstName}, {agentName} répond: {message}. Besoin d\'autre chose? {companyName}',
    variables: ['firstName', 'agentName', 'message', 'companyName'],
    maxLength: 320, // SMS long
    description: 'Réponse personnalisée d\'un agent',
  },

  AUTO_REPLY: {
    id: 'auto_reply',
    name: 'Réponse Automatique',
    category: 'general',
    template: 'Merci pour votre message! {companyName} vous répondra sous 2h. Urgence? Appelez le {phone}.',
    variables: ['companyName', 'phone'],
    maxLength: 160,
    description: 'Réponse automatique hors heures',
  },

  UNSUBSCRIBE_CONFIRMATION: {
    id: 'unsubscribe_confirmation',
    name: 'Confirmation Désabonnement',
    category: 'general',
    template: 'Vous êtes désabonné(e) des SMS marketing de {companyName}. Vous recevrez uniquement les rappels RDV. Pour vous réabonner, répondez REJOINDRE.',
    variables: ['companyName'],
    maxLength: 160,
    description: 'Confirmation après STOP',
  },
};

/**
 * Fonction pour rendre un template avec les données
 */
export function renderSMSTemplate(
  templateId: string,
  data: SMSTemplateData
): string {
  const template = SMS_TEMPLATES[templateId];

  if (!template) {
    throw new Error(`Template SMS "${templateId}" non trouvé`);
  }

  let rendered = template.template;

  // Remplacer les variables
  template.variables.forEach(variable => {
    const value = data[variable] || '';
    const placeholder = `{${variable}}`;
    rendered = rendered.replace(new RegExp(placeholder, 'g'), value);
  });

  // Vérifier la longueur
  if (rendered.length > template.maxLength) {
    console.warn(
      `SMS trop long (${rendered.length} caractères). Limite: ${template.maxLength}`
    );
  }

  return rendered;
}

/**
 * Obtenir tous les templates d'une catégorie
 */
export function getTemplatesByCategory(
  category: SMSTemplate['category']
): SMSTemplate[] {
  return Object.values(SMS_TEMPLATES).filter(t => t.category === category);
}

/**
 * Valider les données pour un template
 */
export function validateTemplateData(
  templateId: string,
  data: SMSTemplateData
): { valid: boolean; missingVariables: string[] } {
  const template = SMS_TEMPLATES[templateId];

  if (!template) {
    throw new Error(`Template "${templateId}" non trouvé`);
  }

  const missingVariables = template.variables.filter(
    variable => !data[variable]
  );

  return {
    valid: missingVariables.length === 0,
    missingVariables,
  };
}

/**
 * Calculer le nombre de segments SMS (1 segment = 160 caractères)
 */
export function calculateSMSSegments(message: string): number {
  if (message.length === 0) return 0;
  if (message.length <= 160) return 1;

  // Les SMS longs sont divisés en segments de 153 caractères
  // (7 caractères réservés pour la concaténation)
  return Math.ceil(message.length / 153);
}

/**
 * Calculer le coût estimé d'un SMS
 */
export function estimateSMSCost(
  message: string,
  pricePerSegment: number = 0.05
): number {
  const segments = calculateSMSSegments(message);
  return segments * pricePerSegment;
}
