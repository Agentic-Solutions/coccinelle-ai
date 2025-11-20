/**
 * Email Service - Coccinelle.AI
 *
 * Service principal pour gérer l'envoi/réception d'emails
 */

import { ResendEmailClient, SendGridEmailClient, EmailMessage } from './emailClient';

// Types pour les templates (à implémenter plus tard)
export type EmailTemplateData = Record<string, any>;

export interface SendEmailParams {
  tenantId: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  templateId?: string;
  customSubject?: string;
  customHtml?: string;
  data?: EmailTemplateData;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  replyTo?: string;
  scheduledAt?: Date;
}

export interface EmailConversation {
  id: string;
  tenantId: string;
  prospectEmail: string;
  prospectName?: string;
  subject: string;
  lastMessageAt: Date;
  status: 'active' | 'closed';
  unreadCount: number;
}

export interface EmailMessageRecord {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  text?: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received';
  emailId?: string;
  createdAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  errorMessage?: string;
}

export class EmailService {
  private emailClient: ResendEmailClient | SendGridEmailClient;

  constructor(emailClient: ResendEmailClient | SendGridEmailClient) {
    this.emailClient = emailClient;
  }

  /**
   * Envoyer un email depuis un template
   */
  async sendTemplatedEmail(params: SendEmailParams): Promise<EmailMessageRecord> {
    if (!params.templateId && !params.customHtml) {
      throw new Error('Template ID ou HTML personnalisé requis');
    }

    let subject: string;
    let html: string;
    let text: string | undefined;

    if (params.templateId) {
      // TODO: Implémenter le système de templates
      // Pour l'instant, utiliser customHtml si fourni, sinon message simple
      subject = params.customSubject || 'Message de Coccinelle.AI';
      html = params.customHtml || `<p>Message envoyé depuis le template ${params.templateId}</p>`;
      text = undefined;
    } else {
      subject = params.customSubject || 'Message de Coccinelle.AI';
      html = params.customHtml!;
      text = undefined;
    }

    // Préparer le message
    const emailMessage: EmailMessage = {
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject,
      html,
      text,
      attachments: params.attachments,
      replyTo: params.replyTo,
    };

    // Envoyer l'email
    const emailResponse = await this.emailClient.sendEmail(emailMessage);

    // Créer l'objet message
    const toArray = Array.isArray(params.to) ? params.to : [params.to];
    const conversationId = `conv_email_${params.tenantId}_${toArray[0]}`;

    const message: EmailMessageRecord = {
      id: `msg_${Date.now()}`,
      conversationId,
      direction: 'outbound',
      from: emailResponse.subject, // Will be replaced by actual from email
      to: emailResponse.to,
      cc: params.cc ? (Array.isArray(params.cc) ? params.cc : [params.cc]) : undefined,
      bcc: params.bcc ? (Array.isArray(params.bcc) ? params.bcc : [params.bcc]) : undefined,
      subject: emailResponse.subject,
      html,
      text,
      status: emailResponse.status as EmailMessageRecord['status'],
      emailId: emailResponse.id,
      createdAt: emailResponse.createdAt,
      errorMessage: emailResponse.error,
    };

    // TODO: Sauvegarder en base de données
    // await this.saveMessage(message);

    return message;
  }

  /**
   * Envoyer une confirmation de RDV par email
   */
  async sendAppointmentConfirmationEmail(params: {
    tenantId: string;
    prospectEmail: string;
    prospectName: string;
    appointmentDate: string;
    appointmentTime: string;
    agentName: string;
    companyName: string;
    address?: string;
    phone?: string;
    confirmationLink?: string;
    cancelLink?: string;
  }): Promise<EmailMessageRecord> {
    return this.sendTemplatedEmail({
      tenantId: params.tenantId,
      to: params.prospectEmail,
      templateId: 'APPOINTMENT_CONFIRMATION_EMAIL',
      data: {
        firstName: params.prospectName.split(' ')[0],
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        agentName: params.agentName,
        companyName: params.companyName,
        address: params.address,
        phone: params.phone,
        confirmationLink: params.confirmationLink,
        cancelLink: params.cancelLink,
      },
    });
  }

  /**
   * Envoyer un rappel de RDV par email
   */
  async sendAppointmentReminderEmail(params: {
    tenantId: string;
    prospectEmail: string;
    prospectName: string;
    appointmentDate: string;
    appointmentTime: string;
    agentName: string;
    companyName: string;
    address?: string;
    phone?: string;
    confirmationLink?: string;
    reminderType: '24h' | '2h';
  }): Promise<EmailMessageRecord> {
    return this.sendTemplatedEmail({
      tenantId: params.tenantId,
      to: params.prospectEmail,
      templateId: 'APPOINTMENT_REMINDER_24H_EMAIL',
      data: {
        firstName: params.prospectName.split(' ')[0],
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        agentName: params.agentName,
        companyName: params.companyName,
        address: params.address,
        phone: params.phone,
        confirmationLink: params.confirmationLink,
      },
    });
  }

  /**
   * Envoyer une alerte de nouveau bien immobilier
   */
  async sendPropertyAlertEmail(params: {
    tenantId: string;
    prospectEmail: string;
    prospectName: string;
    propertyAddress: string;
    propertyPrice: string;
    propertyType: string;
    propertyDescription: string;
    propertyImage?: string;
    viewDetailsLink: string;
    scheduleVisitLink?: string;
    companyName: string;
  }): Promise<EmailMessageRecord> {
    return this.sendTemplatedEmail({
      tenantId: params.tenantId,
      to: params.prospectEmail,
      templateId: 'NEW_PROPERTY_ALERT',
      data: {
        firstName: params.prospectName.split(' ')[0],
        propertyAddress: params.propertyAddress,
        propertyPrice: params.propertyPrice,
        propertyType: params.propertyType,
        propertyDescription: params.propertyDescription,
        propertyImage: params.propertyImage,
        viewDetailsLink: params.viewDetailsLink,
        scheduleVisitLink: params.scheduleVisitLink,
        companyName: params.companyName,
      },
    });
  }

  /**
   * Envoyer une notification de document prêt
   */
  async sendDocumentReadyEmail(params: {
    tenantId: string;
    prospectEmail: string;
    prospectName: string;
    documentName: string;
    documentType: string;
    downloadLink: string;
    companyName: string;
    message?: string;
  }): Promise<EmailMessageRecord> {
    return this.sendTemplatedEmail({
      tenantId: params.tenantId,
      to: params.prospectEmail,
      templateId: 'DOCUMENT_READY_EMAIL',
      data: {
        firstName: params.prospectName.split(' ')[0],
        documentName: params.documentName,
        documentType: params.documentType,
        downloadLink: params.downloadLink,
        companyName: params.companyName,
        message: params.message,
      },
    });
  }

  /**
   * Envoyer une enquête de satisfaction
   */
  async sendSurveyEmail(params: {
    tenantId: string;
    prospectEmail: string;
    prospectName: string;
    companyName: string;
    surveyType: 'satisfaction' | 'nps';
    surveyLink?: string;
    rating1Link?: string;
    rating2Link?: string;
    rating3Link?: string;
    rating4Link?: string;
    rating5Link?: string;
  }): Promise<EmailMessageRecord> {
    return this.sendTemplatedEmail({
      tenantId: params.tenantId,
      to: params.prospectEmail,
      templateId: 'SATISFACTION_SURVEY_EMAIL',
      data: {
        firstName: params.prospectName.split(' ')[0],
        companyName: params.companyName,
        surveyLink: params.surveyLink,
        rating1Link: params.rating1Link,
        rating2Link: params.rating2Link,
        rating3Link: params.rating3Link,
        rating4Link: params.rating4Link,
        rating5Link: params.rating5Link,
      },
    });
  }

  /**
   * Envoyer un email de bienvenue
   */
  async sendWelcomeEmail(params: {
    tenantId: string;
    prospectEmail: string;
    prospectName: string;
    companyName: string;
    dashboardLink?: string;
    contactEmail?: string;
    contactPhone?: string;
  }): Promise<EmailMessageRecord> {
    return this.sendTemplatedEmail({
      tenantId: params.tenantId,
      to: params.prospectEmail,
      templateId: 'WELCOME_EMAIL',
      data: {
        firstName: params.prospectName.split(' ')[0],
        companyName: params.companyName,
        dashboardLink: params.dashboardLink,
        contactEmail: params.contactEmail,
        contactPhone: params.contactPhone,
      },
    });
  }

  /**
   * Envoyer un email à plusieurs destinataires
   */
  async sendBulkEmail(params: {
    tenantId: string;
    recipients: Array<{ email: string; name: string; data?: EmailTemplateData }>;
    templateId: string;
    baseData?: EmailTemplateData;
  }): Promise<EmailMessageRecord[]> {
    const promises = params.recipients.map(recipient =>
      this.sendTemplatedEmail({
        tenantId: params.tenantId,
        to: recipient.email,
        templateId: params.templateId,
        data: {
          ...params.baseData,
          ...recipient.data,
          firstName: recipient.name.split(' ')[0],
        },
      })
    );

    return Promise.all(promises);
  }

  /**
   * Traiter un email entrant (webhook)
   */
  async handleIncomingEmail(webhookData: {
    from: string;
    to: string;
    subject: string;
    html?: string;
    text?: string;
    messageId: string;
  }): Promise<EmailMessageRecord> {
    const message: EmailMessageRecord = {
      id: `msg_${Date.now()}`,
      conversationId: `conv_email_${webhookData.to}_${webhookData.from}`,
      direction: 'inbound',
      from: webhookData.from,
      to: [webhookData.to],
      subject: webhookData.subject,
      html: webhookData.html || '',
      text: webhookData.text,
      status: 'received',
      emailId: webhookData.messageId,
      createdAt: new Date(),
    };

    // TODO: Sauvegarder en base de données
    // await this.saveMessage(message);

    // TODO: Notifier l'agent en temps réel (WebSocket)
    // await this.notifyAgent(message);

    // TODO: Détecter l'intention et auto-répondre si approprié
    // const intent = await this.detectIntent(message.text || message.html);
    // if (intent === 'appointment_request') {
    //   await this.handleAppointmentRequest(message);
    // }

    return message;
  }

  /**
   * Obtenir les conversations actives
   */
  async getActiveConversations(
    tenantId: string
  ): Promise<EmailConversation[]> {
    // TODO: Implémenter avec la base de données
    return [];
  }

  /**
   * Obtenir l'historique d'une conversation
   */
  async getConversationHistory(
    conversationId: string
  ): Promise<EmailMessageRecord[]> {
    // TODO: Implémenter avec la base de données
    return [];
  }

  /**
   * Obtenir le statut d'un email
   */
  async getEmailStatus(emailId: string): Promise<EmailMessageRecord['status']> {
    try {
      const status = await this.emailClient.getEmailStatus(emailId);
      return status.status as EmailMessageRecord['status'];
    } catch (error) {
      console.error('Error getting email status:', error);
      return 'failed';
    }
  }

  /**
   * Valider une adresse email
   */
  validateEmail(email: string): boolean {
    return this.emailClient.validateEmail(email);
  }

  /**
   * Envoyer un email de test
   */
  async sendTestEmail(params: {
    to: string;
    companyName: string;
  }): Promise<EmailMessageRecord> {
    return this.sendTemplatedEmail({
      tenantId: 'test',
      to: params.to,
      templateId: 'WELCOME_EMAIL',
      data: {
        firstName: 'Test',
        companyName: params.companyName,
        dashboardLink: 'https://example.com/dashboard',
        contactEmail: 'contact@example.com',
        contactPhone: '+33 1 23 45 67 89',
      },
    });
  }
}

/**
 * Factory pour créer une instance EmailService
 */
export function createEmailService(
  emailClient: ResendEmailClient | SendGridEmailClient
): EmailService {
  return new EmailService(emailClient);
}
