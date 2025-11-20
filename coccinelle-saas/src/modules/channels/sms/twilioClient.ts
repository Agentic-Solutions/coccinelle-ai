/**
 * Twilio SMS Client - Coccinelle.AI
 *
 * Client pour gérer l'envoi et la réception de SMS via Twilio
 */

interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string; // Numéro Twilio principal
  messagingServiceSid?: string; // Messaging Service SID (optionnel, recommandé pour la France)
}

interface SMSMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrls?: string[]; // Pour MMS
}

interface TwilioResponse {
  sid: string;
  status: string;
  to: string;
  from: string;
  body: string;
  dateCreated: string;
  price?: string;
  errorCode?: number;
  errorMessage?: string;
}

export class TwilioSMSClient {
  private config: TwilioConfig;
  private baseUrl = 'https://api.twilio.com/2010-04-01';

  constructor(config: TwilioConfig) {
    this.config = config;
  }

  /**
   * Envoyer un SMS
   */
  async sendSMS(message: SMSMessage): Promise<TwilioResponse> {
    const body = new URLSearchParams({
      To: message.to,
      Body: message.body,
    });

    // Utiliser le Messaging Service si disponible (recommandé pour la France)
    // Sinon utiliser le numéro directement
    if (this.config.messagingServiceSid) {
      body.append('MessagingServiceSid', this.config.messagingServiceSid);
    } else {
      const from = message.from || this.config.phoneNumber;
      body.append('From', from);
    }

    // Ajouter les media URLs pour MMS si présentes
    if (message.mediaUrls && message.mediaUrls.length > 0) {
      message.mediaUrls.forEach(url => {
        body.append('MediaUrl', url);
      });
    }

    const url = `${this.baseUrl}/Accounts/${this.config.accountSid}/Messages.json`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const data = await response.json();

    console.log('Twilio API Response:', { status: response.status, data });

    if (!response.ok) {
      console.error('Twilio API Error:', data);
      throw new Error(`Twilio API Error: ${data.message || data.error?.message || 'Unknown error'}`);
    }

    console.log('SMS sent successfully:', { sid: data.sid, to: data.to, status: data.status });

    return {
      sid: data.sid,
      status: data.status,
      to: data.to,
      from: data.from,
      body: data.body,
      dateCreated: data.date_created,
      price: data.price,
      errorCode: data.error_code,
      errorMessage: data.error_message,
    };
  }

  /**
   * Envoyer un SMS à plusieurs destinataires
   */
  async sendBulkSMS(recipients: string[], body: string): Promise<TwilioResponse[]> {
    const promises = recipients.map(to =>
      this.sendSMS({ to, body })
    );

    return Promise.all(promises);
  }

  /**
   * Récupérer le statut d'un message
   */
  async getMessageStatus(messageSid: string): Promise<TwilioResponse> {
    const url = `${this.baseUrl}/Accounts/${this.config.accountSid}/Messages/${messageSid}.json`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio API Error: ${data.message || 'Unknown error'}`);
    }

    return {
      sid: data.sid,
      status: data.status,
      to: data.to,
      from: data.from,
      body: data.body,
      dateCreated: data.date_created,
      price: data.price,
      errorCode: data.error_code,
      errorMessage: data.error_message,
    };
  }

  /**
   * Lister les messages récents
   */
  async listMessages(limit: number = 20, toNumber?: string): Promise<TwilioResponse[]> {
    const params = new URLSearchParams({
      PageSize: limit.toString(),
    });

    if (toNumber) {
      params.append('To', toNumber);
    }

    const url = `${this.baseUrl}/Accounts/${this.config.accountSid}/Messages.json?${params}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${btoa(`${this.config.accountSid}:${this.config.authToken}`)}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio API Error: ${data.message || 'Unknown error'}`);
    }

    return data.messages.map((msg: any) => ({
      sid: msg.sid,
      status: msg.status,
      to: msg.to,
      from: msg.from,
      body: msg.body,
      dateCreated: msg.date_created,
      price: msg.price,
    }));
  }

  /**
   * Vérifier la validité d'un numéro de téléphone
   */
  async validatePhoneNumber(phoneNumber: string): Promise<boolean> {
    const cleanedNumber = phoneNumber.replace(/[^0-9+]/g, '');

    // Validation basique du format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(cleanedNumber);
  }

  /**
   * Formater un numéro de téléphone pour Twilio (format E.164)
   */
  formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '+33'): string {
    let cleaned = phoneNumber.replace(/[^0-9+]/g, '');

    // Si commence par 0, remplacer par le code pays
    if (cleaned.startsWith('0')) {
      cleaned = defaultCountryCode + cleaned.substring(1);
    }

    // Si ne commence pas par +, ajouter le code pays
    if (!cleaned.startsWith('+')) {
      cleaned = defaultCountryCode + cleaned;
    }

    return cleaned;
  }
}

/**
 * Factory pour créer une instance TwilioSMSClient
 */
export function createTwilioClient(config: TwilioConfig): TwilioSMSClient {
  return new TwilioSMSClient(config);
}

/**
 * Helper pour créer un client depuis les variables d'environnement
 */
export function createTwilioClientFromEnv(env: any): TwilioSMSClient {
  const config: TwilioConfig = {
    accountSid: env.TWILIO_ACCOUNT_SID,
    authToken: env.TWILIO_AUTH_TOKEN,
    phoneNumber: env.TWILIO_PHONE_NUMBER,
    messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID, // Optionnel
  };

  if (!config.accountSid || !config.authToken || !config.phoneNumber) {
    throw new Error('Missing Twilio configuration in environment variables');
  }

  return new TwilioSMSClient(config);
}
