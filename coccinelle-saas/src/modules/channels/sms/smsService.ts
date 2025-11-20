/**
 * SMS Service - Coccinelle.AI
 *
 * Service principal pour gérer l'envoi/réception de SMS
 */

import { TwilioSMSClient } from './twilioClient';

// Types pour les templates (à implémenter plus tard)
export type SMSTemplateData = Record<string, any>;

export interface SendSMSParams {
  tenantId: string;
  to: string;
  templateId?: string;
  customMessage?: string;
  data?: SMSTemplateData;
  scheduledAt?: Date;
}

export interface SMSConversation {
  id: string;
  tenantId: string;
  prospectPhone: string;
  prospectName?: string;
  lastMessageAt: Date;
  status: 'active' | 'closed';
  unreadCount: number;
}

export interface SMSMessage {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  body: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'received';
  twilioSid?: string;
  createdAt: Date;
  deliveredAt?: Date;
  errorMessage?: string;
}

export class SMSService {
  private twilioClient: TwilioSMSClient;

  constructor(twilioClient: TwilioSMSClient) {
    this.twilioClient = twilioClient;
  }

  /**
   * Envoyer un SMS depuis un template
   */
  async sendTemplatedSMS(params: SendSMSParams): Promise<SMSMessage> {
    if (!params.templateId && !params.customMessage) {
      throw new Error('Template ID ou message personnalisé requis');
    }

    let messageBody: string;

    if (params.templateId) {
      // TODO: Implémenter le système de templates SMS
      // Pour l'instant, utiliser customMessage si fourni, sinon message simple
      messageBody = params.customMessage || `Message depuis le template ${params.templateId}`;
    } else {
      messageBody = params.customMessage!;
    }

    // Formater le numéro
    const formattedPhone = this.twilioClient.formatPhoneNumber(params.to);

    // Envoyer le SMS
    const twilioResponse = await this.twilioClient.sendSMS({
      to: formattedPhone,
      body: messageBody,
    });

    // Créer l'objet message
    const message: SMSMessage = {
      id: `msg_${Date.now()}`,
      conversationId: `conv_${params.tenantId}_${formattedPhone}`,
      direction: 'outbound',
      from: twilioResponse.from,
      to: twilioResponse.to,
      body: twilioResponse.body,
      status: this.mapTwilioStatus(twilioResponse.status),
      twilioSid: twilioResponse.sid,
      createdAt: new Date(),
      errorMessage: twilioResponse.errorMessage,
    };

    // TODO: Sauvegarder en base de données
    // await this.saveMessage(message);

    return message;
  }

  /**
   * Envoyer un SMS de rappel de RDV
   */
  async sendAppointmentReminder(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    appointmentDate: string;
    appointmentTime: string;
    agentName: string;
    companyName: string;
    reminderType: '24h' | '2h';
  }): Promise<SMSMessage> {
    const templateId =
      params.reminderType === '24h'
        ? 'APPOINTMENT_REMINDER_24H'
        : 'APPOINTMENT_REMINDER_2H';

    return this.sendTemplatedSMS({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId,
      data: {
        firstName: params.prospectName.split(' ')[0],
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        agentName: params.agentName,
        companyName: params.companyName,
      },
    });
  }

  /**
   * Envoyer une confirmation de RDV
   */
  async sendAppointmentConfirmation(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    appointmentDate: string;
    appointmentTime: string;
    agentName: string;
    companyName: string;
  }): Promise<SMSMessage> {
    return this.sendTemplatedSMS({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId: 'APPOINTMENT_CONFIRMATION',
      data: {
        firstName: params.prospectName.split(' ')[0],
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        agentName: params.agentName,
        companyName: params.companyName,
      },
    });
  }

  /**
   * Envoyer un message de bienvenue
   */
  async sendWelcomeMessage(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    companyName: string;
  }): Promise<SMSMessage> {
    return this.sendTemplatedSMS({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId: 'WELCOME_NEW_CLIENT',
      data: {
        firstName: params.prospectName.split(' ')[0],
        companyName: params.companyName,
      },
    });
  }

  /**
   * Envoyer une enquête de satisfaction
   */
  async sendSurvey(params: {
    tenantId: string;
    prospectPhone: string;
    companyName: string;
    surveyType: 'post_appointment' | 'nps';
  }): Promise<SMSMessage> {
    const templateId =
      params.surveyType === 'post_appointment'
        ? 'POST_APPOINTMENT_SURVEY'
        : 'NPS_SURVEY';

    return this.sendTemplatedSMS({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId,
      data: {
        companyName: params.companyName,
      },
    });
  }

  /**
   * Traiter un SMS entrant (webhook Twilio)
   */
  async handleIncomingSMS(webhookData: {
    From: string;
    To: string;
    Body: string;
    MessageSid: string;
  }): Promise<SMSMessage> {
    const message: SMSMessage = {
      id: `msg_${Date.now()}`,
      conversationId: `conv_${webhookData.To}_${webhookData.From}`,
      direction: 'inbound',
      from: webhookData.From,
      to: webhookData.To,
      body: webhookData.Body,
      status: 'received',
      twilioSid: webhookData.MessageSid,
      createdAt: new Date(),
    };

    // Détecter les commandes spéciales
    const command = this.detectCommand(webhookData.Body);

    if (command) {
      await this.handleCommand(command, webhookData.From, webhookData.To);
    }

    // TODO: Sauvegarder en base de données
    // await this.saveMessage(message);

    // TODO: Notifier l'agent en temps réel (WebSocket)
    // await this.notifyAgent(message);

    return message;
  }

  /**
   * Détecter les commandes dans les SMS entrants
   */
  private detectCommand(messageBody: string): string | null {
    const upperBody = messageBody.trim().toUpperCase();

    const commands = {
      STOP: 'unsubscribe',
      ARRET: 'unsubscribe',
      ANNULER: 'cancel_appointment',
      CANCEL: 'cancel_appointment',
      OUI: 'confirm',
      YES: 'confirm',
      NON: 'decline',
      NO: 'decline',
      INFO: 'info',
      AIDE: 'help',
      HELP: 'help',
    };

    return commands[upperBody as keyof typeof commands] || null;
  }

  /**
   * Gérer les commandes détectées
   */
  private async handleCommand(
    command: string,
    from: string,
    to: string
  ): Promise<void> {
    switch (command) {
      case 'unsubscribe':
        await this.handleUnsubscribe(from, to);
        break;

      case 'cancel_appointment':
        await this.handleCancelAppointment(from, to);
        break;

      case 'confirm':
        await this.handleConfirmation(from, to);
        break;

      case 'info':
      case 'help':
        await this.handleInfoRequest(from, to);
        break;

      default:
        console.log(`Command non géré: ${command}`);
    }
  }

  /**
   * Gérer le désabonnement
   */
  private async handleUnsubscribe(from: string, to: string): Promise<void> {
    // TODO: Marquer le prospect comme désabonné en base
    // await this.markAsUnsubscribed(from);

    // Envoyer confirmation
    await this.twilioClient.sendSMS({
      to: from,
      from: to,
      body: 'Vous avez été désabonné des SMS de Coccinelle.AI. Merci.',
    });
  }

  /**
   * Gérer l'annulation de RDV
   */
  private async handleCancelAppointment(
    from: string,
    to: string
  ): Promise<void> {
    // TODO: Trouver le prochain RDV du prospect et l'annuler
    // const appointment = await this.findNextAppointment(from);
    // if (appointment) {
    //   await this.cancelAppointment(appointment.id);
    // }

    // Envoyer confirmation
    await this.twilioClient.sendSMS({
      to: from,
      from: to,
      body: 'Votre RDV a été annulé. Pour reprendre RDV, répondez OUI.',
    });
  }

  /**
   * Gérer la confirmation
   */
  private async handleConfirmation(from: string, to: string): Promise<void> {
    // TODO: Logique de confirmation selon le contexte
    // (nouveau RDV, confirmation de visite, etc.)

    await this.twilioClient.sendSMS({
      to: from,
      from: to,
      body: 'Merci pour votre confirmation! Un agent va vous contacter.',
    });
  }

  /**
   * Gérer les demandes d'info
   */
  private async handleInfoRequest(from: string, to: string): Promise<void> {
    // TODO: Récupérer les infos du tenant
    await this.twilioClient.sendSMS({
      to: from,
      from: to,
      body:
        'Coccinelle.AI - Votre assistant IA. Répondez à ce SMS pour parler à un agent. STOP pour vous désabonner.',
    });
  }

  /**
   * Mapper le statut Twilio vers notre statut
   */
  private mapTwilioStatus(
    twilioStatus: string
  ): SMSMessage['status'] {
    const statusMap: Record<string, SMSMessage['status']> = {
      queued: 'queued',
      sending: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      undelivered: 'failed',
      failed: 'failed',
      received: 'received',
    };

    return statusMap[twilioStatus] || 'queued';
  }

  /**
   * Obtenir les conversations actives
   */
  async getActiveConversations(
    tenantId: string
  ): Promise<SMSConversation[]> {
    // TODO: Implémenter avec la base de données
    return [];
  }

  /**
   * Obtenir l'historique d'une conversation
   */
  async getConversationHistory(
    conversationId: string
  ): Promise<SMSMessage[]> {
    // TODO: Implémenter avec la base de données
    return [];
  }
}

/**
 * Factory pour créer une instance SMSService
 */
export function createSMSService(twilioClient: TwilioSMSClient): SMSService {
  return new SMSService(twilioClient);
}
