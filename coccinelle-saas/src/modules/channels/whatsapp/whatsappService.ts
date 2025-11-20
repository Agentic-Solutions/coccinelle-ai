/**
 * WhatsApp Service - Coccinelle.AI
 *
 * Service principal pour gérer l'envoi/réception de messages WhatsApp
 */

import { TwilioWhatsAppClient } from './whatsappClient';
import { renderWhatsAppTemplate, WhatsAppTemplateData, validateWhatsAppTemplateData } from '../../../templates/whatsapp/whatsappTemplates';

export interface SendWhatsAppParams {
  tenantId: string;
  to: string;
  templateId?: string;
  customMessage?: string;
  data?: WhatsAppTemplateData;
  mediaUrl?: string[];
  scheduledAt?: Date;
}

export interface WhatsAppConversation {
  id: string;
  tenantId: string;
  prospectPhone: string;
  prospectName?: string;
  lastMessageAt: Date;
  status: 'active' | 'closed';
  unreadCount: number;
}

export interface WhatsAppMessage {
  id: string;
  conversationId: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  body: string;
  mediaUrl?: string[];
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'received';
  whatsappSid?: string;
  createdAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
}

export class WhatsAppService {
  private whatsappClient: TwilioWhatsAppClient;

  constructor(whatsappClient: TwilioWhatsAppClient) {
    this.whatsappClient = whatsappClient;
  }

  /**
   * Envoyer un message WhatsApp depuis un template
   */
  async sendTemplatedMessage(params: SendWhatsAppParams): Promise<WhatsAppMessage> {
    if (!params.templateId && !params.customMessage) {
      throw new Error('Template ID ou message personnalisé requis');
    }

    let messageBody: string;

    if (params.templateId) {
      // Valider les données du template
      if (params.data) {
        const validation = validateWhatsAppTemplateData(params.templateId, params.data);
        if (!validation.valid) {
          throw new Error(
            `Variables manquantes: ${validation.missingVariables.join(', ')}`
          );
        }
      }

      // Rendre le template
      messageBody = renderWhatsAppTemplate(params.templateId, params.data || {});
    } else {
      messageBody = params.customMessage!;
    }

    // Formater le numéro
    const formattedPhone = this.whatsappClient.formatWhatsAppNumber(params.to);

    // Envoyer le message
    const whatsappResponse = await this.whatsappClient.sendMessage({
      to: formattedPhone,
      body: messageBody,
      mediaUrl: params.mediaUrl,
    });

    // Créer l'objet message
    const message: WhatsAppMessage = {
      id: `msg_${Date.now()}`,
      conversationId: `conv_wa_${params.tenantId}_${formattedPhone}`,
      direction: 'outbound',
      from: whatsappResponse.from,
      to: whatsappResponse.to,
      body: whatsappResponse.body,
      mediaUrl: whatsappResponse.mediaUrl,
      status: this.mapWhatsAppStatus(whatsappResponse.status),
      whatsappSid: whatsappResponse.sid,
      createdAt: new Date(),
      errorMessage: whatsappResponse.errorMessage,
    };

    // TODO: Sauvegarder en base de données
    // await this.saveMessage(message);

    return message;
  }

  /**
   * Envoyer un rappel de RDV via WhatsApp
   */
  async sendAppointmentReminder(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    appointmentDate: string;
    appointmentTime: string;
    address: string;
    agentName: string;
    companyName: string;
    reminderType: '24h' | '2h';
  }): Promise<WhatsAppMessage> {
    const templateId =
      params.reminderType === '24h'
        ? 'APPOINTMENT_REMINDER_24H_WA'
        : 'APPOINTMENT_REMINDER_2H_WA';

    return this.sendTemplatedMessage({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId,
      data: {
        firstName: params.prospectName.split(' ')[0],
        appointmentTime: params.appointmentTime,
        address: params.address,
        agentName: params.agentName,
        companyName: params.companyName,
      },
    });
  }

  /**
   * Envoyer une confirmation de RDV via WhatsApp
   */
  async sendAppointmentConfirmation(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    appointmentDate: string;
    appointmentTime: string;
    address: string;
    agentName: string;
    companyName: string;
  }): Promise<WhatsAppMessage> {
    return this.sendTemplatedMessage({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId: 'APPOINTMENT_CONFIRMATION_WA',
      data: {
        firstName: params.prospectName.split(' ')[0],
        appointmentDate: params.appointmentDate,
        appointmentTime: params.appointmentTime,
        address: params.address,
        agentName: params.agentName,
        companyName: params.companyName,
      },
    });
  }

  /**
   * Envoyer une alerte de nouveau bien avec photo
   */
  async sendPropertyAlert(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    propertyType: string;
    propertyAddress: string;
    propertyPrice: string;
    propertyDescription: string;
    propertyFeatures: string;
    propertyImageUrl?: string;
    companyName: string;
  }): Promise<WhatsAppMessage> {
    return this.sendTemplatedMessage({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId: 'NEW_PROPERTY_ALERT_WA',
      data: {
        propertyType: params.propertyType,
        propertyAddress: params.propertyAddress,
        propertyPrice: params.propertyPrice,
        propertyDescription: params.propertyDescription,
        propertyFeatures: params.propertyFeatures,
        companyName: params.companyName,
      },
      mediaUrl: params.propertyImageUrl ? [params.propertyImageUrl] : undefined,
    });
  }

  /**
   * Envoyer un message de bienvenue
   */
  async sendWelcomeMessage(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    agentName: string;
    companyName: string;
  }): Promise<WhatsAppMessage> {
    return this.sendTemplatedMessage({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId: 'WELCOME_NEW_CLIENT_WA',
      data: {
        firstName: params.prospectName.split(' ')[0],
        agentName: params.agentName,
        companyName: params.companyName,
      },
    });
  }

  /**
   * Envoyer un document via WhatsApp
   */
  async sendDocument(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    documentName: string;
    documentType: string;
    documentUrl: string;
    companyName: string;
  }): Promise<WhatsAppMessage[]> {
    // 1. Envoyer le message d'annonce
    const announcement = await this.sendTemplatedMessage({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId: 'DOCUMENT_READY_WA',
      data: {
        firstName: params.prospectName.split(' ')[0],
        documentName: params.documentName,
        documentType: params.documentType,
        companyName: params.companyName,
      },
    });

    // 2. Envoyer le document
    const document = await this.sendTemplatedMessage({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      customMessage: `📄 ${params.documentName}`,
      mediaUrl: [params.documentUrl],
    });

    return [announcement, document];
  }

  /**
   * Envoyer une enquête de satisfaction
   */
  async sendSurvey(params: {
    tenantId: string;
    prospectPhone: string;
    prospectName: string;
    companyName: string;
    surveyType: 'post_visit' | 'nps';
    propertyAddress?: string;
  }): Promise<WhatsAppMessage> {
    const templateId =
      params.surveyType === 'post_visit'
        ? 'POST_VISIT_SURVEY_WA'
        : 'NPS_SURVEY_WA';

    return this.sendTemplatedMessage({
      tenantId: params.tenantId,
      to: params.prospectPhone,
      templateId,
      data: {
        firstName: params.prospectName.split(' ')[0],
        companyName: params.companyName,
        propertyAddress: params.propertyAddress || '',
      },
    });
  }

  /**
   * Traiter un message WhatsApp entrant (webhook Twilio)
   */
  async handleIncomingMessage(webhookData: {
    From: string;
    To: string;
    Body: string;
    MessageSid: string;
    MediaUrl0?: string;
    MediaContentType0?: string;
    NumMedia?: string;
  }): Promise<WhatsAppMessage> {
    const message: WhatsAppMessage = {
      id: `msg_${Date.now()}`,
      conversationId: `conv_wa_${webhookData.To}_${webhookData.From}`,
      direction: 'inbound',
      from: webhookData.From,
      to: webhookData.To,
      body: webhookData.Body,
      mediaUrl: webhookData.MediaUrl0 ? [webhookData.MediaUrl0] : undefined,
      status: 'received',
      whatsappSid: webhookData.MessageSid,
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

    // TODO: Auto-répondre avec IA si approprié
    // const intent = await this.detectIntent(message.body);
    // if (intent) {
    //   await this.handleIntent(intent, message);
    // }

    return message;
  }

  /**
   * Détecter les commandes dans les messages entrants
   */
  private detectCommand(messageBody: string): string | null {
    const upperBody = messageBody.trim().toUpperCase();

    const commands = {
      OUI: 'confirm',
      YES: 'confirm',
      OK: 'confirm',
      NON: 'decline',
      NO: 'decline',
      ANNULER: 'cancel',
      CANCEL: 'cancel',
      VISITE: 'schedule_visit',
      VISIT: 'schedule_visit',
      INFO: 'info',
      AIDE: 'help',
      HELP: 'help',
      STOP: 'stop',
      ARRET: 'stop',
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
      case 'confirm':
        await this.handleConfirmation(from, to);
        break;

      case 'decline':
        await this.handleDecline(from, to);
        break;

      case 'cancel':
        await this.handleCancellation(from, to);
        break;

      case 'schedule_visit':
        await this.handleVisitRequest(from, to);
        break;

      case 'info':
      case 'help':
        await this.handleInfoRequest(from, to);
        break;

      case 'stop':
        await this.handleOptOut(from, to);
        break;

      default:
        console.log(`Command non géré: ${command}`);
    }
  }

  /**
   * Gérer la confirmation
   */
  private async handleConfirmation(from: string, to: string): Promise<void> {
    // TODO: Marquer le RDV comme confirmé en base
    // await this.confirmAppointment(from);

    await this.whatsappClient.sendMessage({
      to: from,
      from: to,
      body: '✅ Parfait! Votre RDV est confirmé. À bientôt!',
    });
  }

  /**
   * Gérer le déclin
   */
  private async handleDecline(from: string, to: string): Promise<void> {
    await this.whatsappClient.sendMessage({
      to: from,
      from: to,
      body: 'Pas de problème. Pour reprendre RDV, envoyez simplement VISITE.',
    });
  }

  /**
   * Gérer l'annulation
   */
  private async handleCancellation(from: string, to: string): Promise<void> {
    // TODO: Annuler le RDV en base
    // await this.cancelAppointment(from);

    await this.whatsappClient.sendMessage({
      to: from,
      from: to,
      body: 'Votre RDV a été annulé. Pour en reprendre un, répondez VISITE.',
    });
  }

  /**
   * Gérer une demande de visite
   */
  private async handleVisitRequest(from: string, to: string): Promise<void> {
    await this.whatsappClient.sendMessage({
      to: from,
      from: to,
      body: '🏠 Pour quelle propriété souhaitez-vous une visite? Donnez-moi l\'adresse ou le numéro de référence.',
    });
  }

  /**
   * Gérer les demandes d'info
   */
  private async handleInfoRequest(from: string, to: string): Promise<void> {
    await this.whatsappClient.sendMessage({
      to: from,
      from: to,
      body: `Bonjour! 👋

Je peux vous aider avec:
• Programmer une visite (répondez VISITE)
• Confirmer un RDV (répondez OUI)
• Annuler un RDV (répondez ANNULER)
• Infos sur un bien

N'hésitez pas à m'écrire!`,
    });
  }

  /**
   * Gérer l'opt-out
   */
  private async handleOptOut(from: string, to: string): Promise<void> {
    // TODO: Marquer le prospect comme opt-out en base
    // await this.markAsOptedOut(from);

    await this.whatsappClient.sendMessage({
      to: from,
      from: to,
      body: 'Vous avez été désinscrit de nos notifications WhatsApp. Pour vous réabonner, envoyez START.',
    });
  }

  /**
   * Mapper le statut WhatsApp vers notre statut
   */
  private mapWhatsAppStatus(
    whatsappStatus: string
  ): WhatsAppMessage['status'] {
    const statusMap: Record<string, WhatsAppMessage['status']> = {
      queued: 'queued',
      sending: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      undelivered: 'failed',
      failed: 'failed',
      received: 'received',
    };

    return statusMap[whatsappStatus] || 'queued';
  }

  /**
   * Obtenir les conversations actives
   */
  async getActiveConversations(
    tenantId: string
  ): Promise<WhatsAppConversation[]> {
    // TODO: Implémenter avec la base de données
    return [];
  }

  /**
   * Obtenir l'historique d'une conversation
   */
  async getConversationHistory(
    conversationId: string
  ): Promise<WhatsAppMessage[]> {
    // TODO: Implémenter avec la base de données
    return [];
  }

  /**
   * Envoyer un message à plusieurs destinataires
   */
  async sendBulkMessages(params: {
    tenantId: string;
    recipients: Array<{ phone: string; name: string; data?: WhatsAppTemplateData }>;
    templateId: string;
    baseData?: WhatsAppTemplateData;
    mediaUrl?: string[];
  }): Promise<WhatsAppMessage[]> {
    const promises = params.recipients.map(recipient =>
      this.sendTemplatedMessage({
        tenantId: params.tenantId,
        to: recipient.phone,
        templateId: params.templateId,
        data: {
          ...params.baseData,
          ...recipient.data,
          firstName: recipient.name.split(' ')[0],
        },
        mediaUrl: params.mediaUrl,
      })
    );

    return Promise.all(promises);
  }
}

/**
 * Factory pour créer une instance WhatsAppService
 */
export function createWhatsAppService(
  whatsappClient: TwilioWhatsAppClient
): WhatsAppService {
  return new WhatsAppService(whatsappClient);
}
