/**
 * Email Client - Coccinelle.AI
 *
 * Client universel pour gérer l'envoi d'emails via Resend
 * (Alternative: SendGrid, Amazon SES)
 */

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

export interface EmailMessage {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
  tags?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  content: string | Buffer; // Base64 string ou Buffer
  contentType?: string;
  path?: string; // URL vers le fichier
}

export interface EmailResponse {
  id: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  to: string[];
  subject: string;
  createdAt: Date;
  error?: string;
}

/**
 * Client Email basé sur Resend API
 * Documentation: https://resend.com/docs/api-reference/emails/send-email
 */
export class ResendEmailClient {
  private config: EmailConfig;
  private baseUrl = 'https://api.resend.com';

  constructor(config: EmailConfig) {
    this.config = config;
  }

  /**
   * Envoyer un email
   */
  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    const toArray = Array.isArray(message.to) ? message.to : [message.to];
    const ccArray = message.cc ? (Array.isArray(message.cc) ? message.cc : [message.cc]) : undefined;
    const bccArray = message.bcc ? (Array.isArray(message.bcc) ? message.bcc : [message.bcc]) : undefined;

    const payload: any = {
      from: `${this.config.fromName} <${this.config.fromEmail}>`,
      to: toArray,
      subject: message.subject,
    };

    if (message.cc) payload.cc = ccArray;
    if (message.bcc) payload.bcc = bccArray;
    if (message.html) payload.html = message.html;
    if (message.text) payload.text = message.text;
    if (message.replyTo) payload.reply_to = message.replyTo;
    if (message.tags) payload.tags = message.tags;

    // Attachments
    if (message.attachments && message.attachments.length > 0) {
      payload.attachments = message.attachments.map(att => ({
        filename: att.filename,
        content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
      }));
    }

    const response = await fetch(`${this.baseUrl}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Resend API Error: ${data.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      status: 'queued',
      to: toArray,
      subject: message.subject,
      createdAt: new Date(),
    };
  }

  /**
   * Envoyer un email à plusieurs destinataires
   */
  async sendBulkEmail(
    recipients: string[],
    subject: string,
    html: string,
    text?: string
  ): Promise<EmailResponse[]> {
    const promises = recipients.map(to =>
      this.sendEmail({ to, subject, html, text })
    );

    return Promise.all(promises);
  }

  /**
   * Envoyer un email avec template
   */
  async sendTemplatedEmail(params: {
    to: string | string[];
    subject: string;
    templateHtml: string;
    variables: Record<string, string>;
    attachments?: EmailAttachment[];
  }): Promise<EmailResponse> {
    // Remplacer les variables dans le template
    let renderedHtml = params.templateHtml;
    Object.entries(params.variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      renderedHtml = renderedHtml.replace(regex, value);
    });

    return this.sendEmail({
      to: params.to,
      subject: params.subject,
      html: renderedHtml,
      attachments: params.attachments,
    });
  }

  /**
   * Récupérer le statut d'un email
   */
  async getEmailStatus(emailId: string): Promise<EmailResponse> {
    const response = await fetch(`${this.baseUrl}/emails/${emailId}`, {
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Resend API Error: ${data.message || 'Unknown error'}`);
    }

    return {
      id: data.id,
      status: this.mapResendStatus(data.last_event),
      to: [data.to],
      subject: data.subject,
      createdAt: new Date(data.created_at),
    };
  }

  /**
   * Valider une adresse email
   */
  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Mapper le statut Resend vers notre statut
   */
  private mapResendStatus(resendStatus: string): EmailResponse['status'] {
    const statusMap: Record<string, EmailResponse['status']> = {
      'queued': 'queued',
      'sent': 'sent',
      'delivered': 'delivered',
      'delivery_delayed': 'queued',
      'complained': 'failed',
      'bounced': 'failed',
      'opened': 'delivered',
      'clicked': 'delivered',
    };

    return statusMap[resendStatus] || 'queued';
  }
}

/**
 * Alternative: SendGrid Email Client
 * Pour utiliser SendGrid au lieu de Resend
 */
export class SendGridEmailClient {
  private config: EmailConfig;
  private baseUrl = 'https://api.sendgrid.com/v3';

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async sendEmail(message: EmailMessage): Promise<EmailResponse> {
    const toArray = Array.isArray(message.to) ? message.to : [message.to];

    const payload = {
      personalizations: [
        {
          to: toArray.map(email => ({ email })),
          cc: message.cc ? (Array.isArray(message.cc) ? message.cc.map(email => ({ email })) : [{ email: message.cc }]) : undefined,
          bcc: message.bcc ? (Array.isArray(message.bcc) ? message.bcc.map(email => ({ email })) : [{ email: message.bcc }]) : undefined,
        },
      ],
      from: {
        email: this.config.fromEmail,
        name: this.config.fromName,
      },
      subject: message.subject,
      content: [
        { type: 'text/plain', value: message.text || '' },
        { type: 'text/html', value: message.html || '' },
      ],
      reply_to: message.replyTo ? { email: message.replyTo } : undefined,
    };

    const response = await fetch(`${this.baseUrl}/mail/send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`SendGrid API Error: ${JSON.stringify(data)}`);
    }

    // SendGrid retourne le message ID dans le header X-Message-Id
    const messageId = response.headers.get('X-Message-Id') || `msg_${Date.now()}`;

    return {
      id: messageId,
      status: 'queued',
      to: toArray,
      subject: message.subject,
      createdAt: new Date(),
    };
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

/**
 * Factory pour créer un client email
 */
export function createEmailClient(
  provider: 'resend' | 'sendgrid',
  config: EmailConfig
): ResendEmailClient | SendGridEmailClient {
  if (provider === 'resend') {
    return new ResendEmailClient(config);
  } else {
    return new SendGridEmailClient(config);
  }
}

/**
 * Helper pour créer un client depuis les variables d'environnement
 */
export function createEmailClientFromEnv(env: any): ResendEmailClient {
  const config: EmailConfig = {
    apiKey: env.RESEND_API_KEY || env.SENDGRID_API_KEY,
    fromEmail: env.FROM_EMAIL || 'noreply@coccinelle.ai',
    fromName: env.FROM_NAME || 'Coccinelle.AI',
  };

  if (!config.apiKey) {
    throw new Error('Missing email API key in environment variables');
  }

  // Déterminer le provider basé sur la clé disponible
  if (env.RESEND_API_KEY) {
    return new ResendEmailClient(config);
  } else {
    return new ResendEmailClient(config); // Fallback
  }
}
