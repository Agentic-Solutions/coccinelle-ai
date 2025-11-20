/**
 * WhatsApp Templates - Coccinelle.AI
 *
 * Templates de messages WhatsApp conformes aux guidelines WhatsApp Business
 *
 * IMPORTANT: Les templates WhatsApp doivent être pré-approuvés par WhatsApp
 * avant utilisation. Ces templates suivent les best practices WhatsApp.
 *
 * Référence: https://developers.facebook.com/docs/whatsapp/message-templates/guidelines
 */

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: 'appointment' | 'notification' | 'marketing' | 'survey' | 'general';
  language: string;
  template: string;
  variables: string[];
  mediaSupported: boolean;
  buttonSupported: boolean;
  description: string;
}

export type WhatsAppTemplateData = Record<string, string>;

/**
 * Templates WhatsApp
 *
 * Note: Pour utiliser en production, ces templates doivent être:
 * 1. Soumis à WhatsApp via Twilio Console
 * 2. Approuvés par WhatsApp (24-48h)
 * 3. Référencés par leur Content SID dans Twilio
 */
export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplate> = {
  // ============================================
  // RAPPELS DE RENDEZ-VOUS
  // ============================================

  APPOINTMENT_REMINDER_24H_WA: {
    id: 'appointment_reminder_24h_wa',
    name: 'Rappel RDV 24h - WhatsApp',
    category: 'appointment',
    language: 'fr',
    template: `Bonjour {{firstName}} 👋

📅 Rappel: Vous avez un rendez-vous demain à {{appointmentTime}}

📍 Adresse: {{address}}
👤 Avec: {{agentName}}
🏢 {{companyName}}

Merci de confirmer votre présence en répondant OUI ou NON.

Pour toute question, n'hésitez pas à nous écrire.`,
    variables: ['firstName', 'appointmentTime', 'address', 'agentName', 'companyName'],
    mediaSupported: false,
    buttonSupported: true,
    description: 'Rappel de RDV 24h avant avec demande de confirmation',
  },

  APPOINTMENT_CONFIRMATION_WA: {
    id: 'appointment_confirmation_wa',
    name: 'Confirmation RDV - WhatsApp',
    category: 'appointment',
    language: 'fr',
    template: `Bonjour {{firstName}} ✅

Votre rendez-vous est confirmé:

📅 Date: {{appointmentDate}}
⏰ Heure: {{appointmentTime}}
📍 Lieu: {{address}}
👤 Agent: {{agentName}}

Nous vous enverrons un rappel 24h avant.

À bientôt!
{{companyName}}`,
    variables: ['firstName', 'appointmentDate', 'appointmentTime', 'address', 'agentName', 'companyName'],
    mediaSupported: false,
    buttonSupported: false,
    description: 'Confirmation immédiate de RDV',
  },

  APPOINTMENT_REMINDER_2H_WA: {
    id: 'appointment_reminder_2h_wa',
    name: 'Rappel RDV 2h - WhatsApp',
    category: 'appointment',
    language: 'fr',
    template: `Bonjour {{firstName}} ⏰

Rappel: Votre RDV est dans 2 heures!

⏰ Heure: {{appointmentTime}}
📍 {{address}}

À tout de suite!
{{companyName}}`,
    variables: ['firstName', 'appointmentTime', 'address', 'companyName'],
    mediaSupported: false,
    buttonSupported: false,
    description: 'Rappel urgent 2h avant RDV',
  },

  APPOINTMENT_CANCELLED_WA: {
    id: 'appointment_cancelled_wa',
    name: 'RDV Annulé - WhatsApp',
    category: 'appointment',
    language: 'fr',
    template: `Bonjour {{firstName}},

Votre rendez-vous du {{appointmentDate}} à {{appointmentTime}} a bien été annulé.

Pour reprendre rendez-vous, répondez simplement à ce message.

Cordialement,
{{companyName}}`,
    variables: ['firstName', 'appointmentDate', 'appointmentTime', 'companyName'],
    mediaSupported: false,
    buttonSupported: false,
    description: 'Confirmation d\'annulation de RDV',
  },

  // ============================================
  // NOTIFICATIONS BIENS IMMOBILIERS
  // ============================================

  NEW_PROPERTY_ALERT_WA: {
    id: 'new_property_alert_wa',
    name: 'Nouveau Bien - WhatsApp',
    category: 'notification',
    language: 'fr',
    template: `🏠 Nouveau bien disponible!

{{propertyType}}
📍 {{propertyAddress}}
💰 {{propertyPrice}}

{{propertyDescription}}

{{propertyFeatures}}

Intéressé(e)? Répondez OUI pour programmer une visite.

{{companyName}}`,
    variables: ['propertyType', 'propertyAddress', 'propertyPrice', 'propertyDescription', 'propertyFeatures', 'companyName'],
    mediaSupported: true, // Peut inclure photo du bien
    buttonSupported: true,
    description: 'Alerte nouveau bien avec photo',
  },

  PRICE_DROP_ALERT_WA: {
    id: 'price_drop_alert_wa',
    name: 'Baisse de Prix - WhatsApp',
    category: 'notification',
    language: 'fr',
    template: `💰 Baisse de prix!

Le bien qui vous intéressait vient de baisser:

📍 {{propertyAddress}}
~~{{oldPrice}}~~ → {{newPrice}}
📉 Économie: {{savings}}

Cette opportunité ne durera pas!

Répondez VISITE pour planifier une visite.

{{companyName}}`,
    variables: ['propertyAddress', 'oldPrice', 'newPrice', 'savings', 'companyName'],
    mediaSupported: true,
    buttonSupported: true,
    description: 'Alerte baisse de prix urgente',
  },

  VIRTUAL_TOUR_AVAILABLE_WA: {
    id: 'virtual_tour_available_wa',
    name: 'Visite Virtuelle - WhatsApp',
    category: 'notification',
    language: 'fr',
    template: `🎥 Visite virtuelle disponible!

Bonjour {{firstName}},

La visite virtuelle du bien situé:
📍 {{propertyAddress}}

est maintenant disponible.

Visitez-le confortablement depuis chez vous!

{{companyName}}`,
    variables: ['firstName', 'propertyAddress', 'companyName'],
    mediaSupported: true, // Lien vers visite virtuelle
    buttonSupported: true,
    description: 'Notification visite virtuelle',
  },

  // ============================================
  // DOCUMENTS
  // ============================================

  DOCUMENT_READY_WA: {
    id: 'document_ready_wa',
    name: 'Document Prêt - WhatsApp',
    category: 'notification',
    language: 'fr',
    template: `📄 Document disponible

Bonjour {{firstName}},

Votre document "{{documentName}}" est prêt.

Type: {{documentType}}

Le document va vous être envoyé dans le prochain message.

{{companyName}}`,
    variables: ['firstName', 'documentName', 'documentType', 'companyName'],
    mediaSupported: true, // PDF envoyé séparément
    buttonSupported: false,
    description: 'Notification document prêt',
  },

  // ============================================
  // ENQUÊTES
  // ============================================

  POST_VISIT_SURVEY_WA: {
    id: 'post_visit_survey_wa',
    name: 'Enquête Post-Visite - WhatsApp',
    category: 'survey',
    language: 'fr',
    template: `Bonjour {{firstName}},

Merci pour votre visite du bien {{propertyAddress}}.

Votre avis compte! Sur une échelle de 1 à 5:

⭐ Répondez 1, 2, 3, 4 ou 5

1 = Pas intéressé
5 = Très intéressé

Merci!
{{companyName}}`,
    variables: ['firstName', 'propertyAddress', 'companyName'],
    mediaSupported: false,
    buttonSupported: true,
    description: 'Enquête rapide post-visite',
  },

  NPS_SURVEY_WA: {
    id: 'nps_survey_wa',
    name: 'NPS Survey - WhatsApp',
    category: 'survey',
    language: 'fr',
    template: `Bonjour {{firstName}},

Sur une échelle de 0 à 10, recommanderiez-vous {{companyName}} à un ami?

Répondez simplement avec un chiffre de 0 à 10.

0 = Pas du tout
10 = Absolument

Merci pour votre avis!`,
    variables: ['firstName', 'companyName'],
    mediaSupported: false,
    buttonSupported: false,
    description: 'Net Promoter Score',
  },

  // ============================================
  // BIENVENUE & GÉNÉRAL
  // ============================================

  WELCOME_NEW_CLIENT_WA: {
    id: 'welcome_new_client_wa',
    name: 'Bienvenue Client - WhatsApp',
    category: 'general',
    language: 'fr',
    template: `Bienvenue {{firstName}}! 👋

Merci de nous faire confiance pour votre projet immobilier.

Je suis {{agentName}}, votre assistant virtuel chez {{companyName}}.

Je suis là 24/7 pour:
✅ Répondre à vos questions
✅ Programmer des visites
✅ Vous alerter sur nouveaux biens

N'hésitez pas à m'écrire!`,
    variables: ['firstName', 'agentName', 'companyName'],
    mediaSupported: false,
    buttonSupported: false,
    description: 'Message de bienvenue nouveau prospect',
  },

  AGENT_RESPONSE_WA: {
    id: 'agent_response_wa',
    name: 'Réponse Agent - WhatsApp',
    category: 'general',
    language: 'fr',
    template: `Bonjour {{firstName}},

{{message}}

Cordialement,
{{agentName}}
{{companyName}}`,
    variables: ['firstName', 'message', 'agentName', 'companyName'],
    mediaSupported: true,
    buttonSupported: false,
    description: 'Réponse personnalisée d\'agent',
  },

  OUT_OF_HOURS_WA: {
    id: 'out_of_hours_wa',
    name: 'Hors Heures - WhatsApp',
    category: 'general',
    language: 'fr',
    template: `Bonjour,

Merci pour votre message.

Nos bureaux sont actuellement fermés.
🕐 Horaires: {{officeHours}}

Un agent vous répondra dès l'ouverture.

Pour une urgence, appelez le {{emergencyPhone}}.

{{companyName}}`,
    variables: ['officeHours', 'emergencyPhone', 'companyName'],
    mediaSupported: false,
    buttonSupported: false,
    description: 'Réponse automatique hors heures',
  },
};

/**
 * Rendre un template WhatsApp avec des données
 */
export function renderWhatsAppTemplate(
  templateId: string,
  data: WhatsAppTemplateData
): string {
  const template = WHATSAPP_TEMPLATES[templateId];

  if (!template) {
    throw new Error(`WhatsApp template not found: ${templateId}`);
  }

  let rendered = template.template;

  // Remplacer les variables
  Object.entries(data).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value);
  });

  return rendered;
}

/**
 * Valider les données d'un template
 */
export function validateWhatsAppTemplateData(
  templateId: string,
  data: WhatsAppTemplateData
): { valid: boolean; missingVariables: string[] } {
  const template = WHATSAPP_TEMPLATES[templateId];

  if (!template) {
    throw new Error(`WhatsApp template not found: ${templateId}`);
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
 * Obtenir un template par catégorie
 */
export function getWhatsAppTemplatesByCategory(
  category: WhatsAppTemplate['category']
): WhatsAppTemplate[] {
  return Object.values(WHATSAPP_TEMPLATES).filter(
    template => template.category === category
  );
}

/**
 * Obtenir tous les templates
 */
export function getAllWhatsAppTemplates(): WhatsAppTemplate[] {
  return Object.values(WHATSAPP_TEMPLATES);
}

/**
 * Formater un message avec emojis pour WhatsApp
 */
export function formatWhatsAppMessage(text: string): string {
  // WhatsApp supporte les emojis et le markdown limité
  return text;
}

/**
 * Guidelines WhatsApp pour les templates
 *
 * 1. Pas de contenu promotionnel agressif
 * 2. Pas de demandes de paiement directes
 * 3. Messages clairs et concis
 * 4. Valeur ajoutée pour l'utilisateur
 * 5. Opt-out facile
 * 6. Pas de spam
 * 7. Respect vie privée
 */
export const WHATSAPP_GUIDELINES = {
  maxLength: 4096, // caractères
  mediaTypes: ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'],
  maxMediaSize: 16 * 1024 * 1024, // 16 MB
  buttonLimit: 3,
  approvalRequired: true,
  categories: ['appointment', 'notification', 'marketing', 'survey', 'general'],
};
