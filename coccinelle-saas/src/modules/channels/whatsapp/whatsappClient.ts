/**
 * WhatsApp Client - Coccinelle.AI
 *
 * Client pour gérer l'envoi/réception de messages WhatsApp via Twilio
 * Documentation: https://www.twilio.com/docs/whatsapp
 */

interface WhatsAppConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // Format: whatsapp:+33XXXXXXXXX
}

export interface WhatsAppMessage {
  to: string; // Format: whatsapp:+33XXXXXXXXX
  from?: string;
  body: string;
  mediaUrl?: string[]; // Images, videos, documents
  contentType?: string;
}

export interface WhatsAppResponse {
  sid: string;
  from: string;
  to: string;
  body: string;
  status: string;
  mediaUrl?: string[];
  errorMessage?: string;
  dateCreated: Date;
  dateSent?: Date;
  dateUpdated?: Date;
}

export class TwilioWhatsAppClient {
  private config: WhatsAppConfig;
  private baseUrl = 'https://api.twilio.com/2010-04-01';

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  /**
   * Envoyer un message WhatsApp
   */
  async sendMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
    // Formater les numéros au format WhatsApp
    const to = this.formatWhatsAppNumber(message.to);
    const from = message.from || this.config.phoneNumber;

    // Préparer le body de la requête
    const body = new URLSearchParams({
      From: from,
      To: to,
      Body: message.body,
    });

    // Ajouter les médias si présents
    if (message.mediaUrl && message.mediaUrl.length > 0) {
      message.mediaUrl.forEach((url, index) => {
        body.append(`MediaUrl${index}`, url);
      });
    }

    // Authentification Basic
    const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);

    // Envoyer la requête
    const response = await fetch(
      `${this.baseUrl}/Accounts/${this.config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio WhatsApp API Error: ${data.message || 'Unknown error'}`);
    }

    return {
      sid: data.sid,
      from: data.from,
      to: data.to,
      body: data.body,
      status: data.status,
      errorMessage: data.error_message,
      dateCreated: new Date(data.date_created),
      dateSent: data.date_sent ? new Date(data.date_sent) : undefined,
      dateUpdated: new Date(data.date_updated),
    };
  }

  /**
   * Envoyer un message avec image
   */
  async sendMessageWithImage(
    to: string,
    body: string,
    imageUrl: string
  ): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to,
      body,
      mediaUrl: [imageUrl],
    });
  }

  /**
   * Envoyer un message avec document
   */
  async sendMessageWithDocument(
    to: string,
    body: string,
    documentUrl: string,
    contentType?: string
  ): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to,
      body,
      mediaUrl: [documentUrl],
      contentType,
    });
  }

  /**
   * Envoyer un message avec vidéo
   */
  async sendMessageWithVideo(
    to: string,
    body: string,
    videoUrl: string
  ): Promise<WhatsAppResponse> {
    return this.sendMessage({
      to,
      body,
      mediaUrl: [videoUrl],
    });
  }

  /**
   * Envoyer un message avec template approuvé
   *
   * Note: WhatsApp Business API requiert des templates pré-approuvés
   * pour les messages sortants initiaux
   */
  async sendTemplateMessage(params: {
    to: string;
    templateSid: string;
    contentVariables: Record<string, string>;
  }): Promise<WhatsAppResponse> {
    const to = this.formatWhatsAppNumber(params.to);
    const from = this.config.phoneNumber;

    // Construire le content variables JSON
    const contentVariables = JSON.stringify(params.contentVariables);

    const body = new URLSearchParams({
      From: from,
      To: to,
      ContentSid: params.templateSid,
      ContentVariables: contentVariables,
    });

    const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);

    const response = await fetch(
      `${this.baseUrl}/Accounts/${this.config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio WhatsApp API Error: ${data.message || 'Unknown error'}`);
    }

    return {
      sid: data.sid,
      from: data.from,
      to: data.to,
      body: data.body,
      status: data.status,
      dateCreated: new Date(data.date_created),
    };
  }

  /**
   * Obtenir le statut d'un message
   */
  async getMessageStatus(messageSid: string): Promise<WhatsAppResponse> {
    const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);

    const response = await fetch(
      `${this.baseUrl}/Accounts/${this.config.accountSid}/Messages/${messageSid}.json`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio API Error: ${data.message || 'Unknown error'}`);
    }

    return {
      sid: data.sid,
      from: data.from,
      to: data.to,
      body: data.body,
      status: data.status,
      errorMessage: data.error_message,
      dateCreated: new Date(data.date_created),
      dateSent: data.date_sent ? new Date(data.date_sent) : undefined,
      dateUpdated: new Date(data.date_updated),
    };
  }

  /**
   * Lister les messages récents
   */
  async listMessages(params?: {
    to?: string;
    from?: string;
    limit?: number;
  }): Promise<WhatsAppResponse[]> {
    const auth = btoa(`${this.config.accountSid}:${this.config.authToken}`);

    const queryParams = new URLSearchParams();
    if (params?.to) queryParams.append('To', this.formatWhatsAppNumber(params.to));
    if (params?.from) queryParams.append('From', params.from);
    if (params?.limit) queryParams.append('PageSize', params.limit.toString());

    const response = await fetch(
      `${this.baseUrl}/Accounts/${this.config.accountSid}/Messages.json?${queryParams}`,
      {
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio API Error: ${data.message || 'Unknown error'}`);
    }

    return data.messages.map((msg: any) => ({
      sid: msg.sid,
      from: msg.from,
      to: msg.to,
      body: msg.body,
      status: msg.status,
      dateCreated: new Date(msg.date_created),
      dateSent: msg.date_sent ? new Date(msg.date_sent) : undefined,
    }));
  }

  /**
   * Formater un numéro au format WhatsApp (whatsapp:+33XXXXXXXXX)
   */
  formatWhatsAppNumber(phoneNumber: string): string {
    // Si déjà au format whatsapp:
    if (phoneNumber.startsWith('whatsapp:')) {
      return phoneNumber;
    }

    // Nettoyer le numéro
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // Ajouter + si absent
    if (!cleaned.startsWith('+')) {
      // Supposer France (+33) si pas de code pays
      if (cleaned.startsWith('0')) {
        cleaned = '+33' + cleaned.substring(1);
      } else if (cleaned.startsWith('33')) {
        cleaned = '+' + cleaned;
      } else {
        cleaned = '+33' + cleaned;
      }
    }

    return `whatsapp:${cleaned}`;
  }

  /**
   * Valider un numéro WhatsApp
   */
  validateWhatsAppNumber(phoneNumber: string): boolean {
    // WhatsApp utilise le format E.164 standard
    const e164Regex = /^\+[1-9]\d{1,14}$/;

    // Si format whatsapp:+..., extraire le numéro
    const number = phoneNumber.replace('whatsapp:', '');

    return e164Regex.test(number);
  }

  /**
   * Envoyer un message à plusieurs destinataires
   */
  async sendBulkMessages(
    recipients: string[],
    body: string,
    mediaUrl?: string[]
  ): Promise<WhatsAppResponse[]> {
    const promises = recipients.map(to =>
      this.sendMessage({ to, body, mediaUrl })
    );

    return Promise.all(promises);
  }

  /**
   * Vérifier si un numéro WhatsApp est disponible/actif
   * Note: Cette fonctionnalité nécessite l'API WhatsApp Business
   */
  async checkNumberAvailability(phoneNumber: string): Promise<boolean> {
    // TODO: Implémenter avec WhatsApp Business API
    // Pour l'instant, on valide juste le format
    return this.validateWhatsAppNumber(phoneNumber);
  }
}

/**
 * Helper pour créer un client depuis les variables d'environnement
 */
export function createWhatsAppClientFromEnv(env: any): TwilioWhatsAppClient {
  const config: WhatsAppConfig = {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_WHATSAPP_NUMBER || `whatsapp:${env.TWILIO_PHONE_NUMBER}`,
  };

  if (!config.accountSid || !config.authToken || !config.phoneNumber) {
    throw new Error('Missing required Twilio WhatsApp configuration in environment variables');
  }

  return new TwilioWhatsAppClient(config);
}

/**
 * Types de statut WhatsApp
 */
export const WHATSAPP_STATUS = {
  QUEUED: 'queued',
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed',
  UNDELIVERED: 'undelivered',
} as const;
