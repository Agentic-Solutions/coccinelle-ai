/**
 * Channel Orchestrator - Coccinelle.AI
 *
 * Routage intelligent des messages sur le bon canal
 * Gère SMS, Email, WhatsApp, Telegram, Voice
 */

import { SMSService } from '../channels/sms/smsService';
import { EmailService } from '../channels/email/emailService';

export type ChannelType = 'sms' | 'email' | 'whatsapp' | 'telegram' | 'voice';

export interface MessagePriority {
  level: 'urgent' | 'high' | 'normal' | 'low';
  sendWithin?: number; // minutes
}

export interface ChannelPreferences {
  preferredChannels: ChannelType[];
  fallbackChannels: ChannelType[];
  disabledChannels?: ChannelType[];
  quietHoursStart?: string; // "22:00"
  quietHoursEnd?: string; // "08:00"
  allowSMSDuringQuietHours?: boolean;
}

export interface MessageContext {
  tenantId: string;
  prospectId: string;
  prospectName: string;
  prospectPhone?: string;
  prospectEmail?: string;
  prospectWhatsApp?: string;
  prospectTelegram?: string;
  messageType: 'appointment' | 'notification' | 'marketing' | 'survey' | 'general';
  priority: MessagePriority;
  preferences?: ChannelPreferences;
}

export interface MessageContent {
  subject?: string;
  body: string;
  html?: string;
  templateId?: string;
  data?: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface RoutingDecision {
  channel: ChannelType;
  reason: string;
  confidence: number; // 0-1
  alternativeChannels: Array<{
    channel: ChannelType;
    reason: string;
    confidence: number;
  }>;
  estimatedCost: number;
  estimatedDeliveryTime: number; // seconds
}

export interface SendResult {
  success: boolean;
  channel: ChannelType;
  messageId: string;
  status: string;
  error?: string;
  fallbackAttempted?: boolean;
  fallbackChannel?: ChannelType;
}

export class ChannelOrchestrator {
  private smsService?: SMSService;
  private emailService?: EmailService;
  // private whatsappService?: WhatsAppService;
  // private telegramService?: TelegramService;

  constructor(services: {
    smsService?: SMSService;
    emailService?: EmailService;
    // whatsappService?: WhatsAppService;
    // telegramService?: TelegramService;
  }) {
    this.smsService = services.smsService;
    this.emailService = services.emailService;
  }

  /**
   * Routage intelligent d'un message vers le meilleur canal
   */
  async routeMessage(
    context: MessageContext,
    content: MessageContent
  ): Promise<SendResult> {
    // 1. Décider du meilleur canal
    const decision = await this.decideChannel(context, content);

    console.log(`📡 Routing message via ${decision.channel} (confidence: ${decision.confidence})`);
    console.log(`   Reason: ${decision.reason}`);

    // 2. Tenter l'envoi sur le canal choisi
    try {
      const result = await this.sendViaChannel(decision.channel, context, content);
      return result;
    } catch (error) {
      console.error(`❌ Failed to send via ${decision.channel}:`, error);

      // 3. Fallback sur un canal alternatif
      if (decision.alternativeChannels.length > 0) {
        const fallback = decision.alternativeChannels[0];
        console.log(`🔄 Attempting fallback via ${fallback.channel}`);

        try {
          const result = await this.sendViaChannel(fallback.channel, context, content);
          return {
            ...result,
            fallbackAttempted: true,
            fallbackChannel: fallback.channel,
          };
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed via ${fallback.channel}:`, fallbackError);
          return {
            success: false,
            channel: decision.channel,
            messageId: '',
            status: 'failed',
            error: `Primary and fallback channels failed: ${error}`,
          };
        }
      }

      return {
        success: false,
        channel: decision.channel,
        messageId: '',
        status: 'failed',
        error: String(error),
      };
    }
  }

  /**
   * Décider du meilleur canal pour un message
   */
  async decideChannel(
    context: MessageContext,
    content: MessageContent
  ): Promise<RoutingDecision> {
    const scores: Array<{
      channel: ChannelType;
      score: number;
      reasons: string[];
      cost: number;
      deliveryTime: number;
    }> = [];

    // Vérifier les canaux disponibles
    const availableChannels = this.getAvailableChannels(context);

    for (const channel of availableChannels) {
      const evaluation = await this.evaluateChannel(channel, context, content);
      scores.push(evaluation);
    }

    // Trier par score décroissant
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      throw new Error('No available channels for this prospect');
    }

    const winner = scores[0];
    const alternatives = scores.slice(1, 3); // Top 2 alternatives

    return {
      channel: winner.channel,
      reason: winner.reasons.join('; '),
      confidence: winner.score,
      alternativeChannels: alternatives.map(alt => ({
        channel: alt.channel,
        reason: alt.reasons.join('; '),
        confidence: alt.score,
      })),
      estimatedCost: winner.cost,
      estimatedDeliveryTime: winner.deliveryTime,
    };
  }

  /**
   * Évaluer un canal pour un message
   */
  private async evaluateChannel(
    channel: ChannelType,
    context: MessageContext,
    content: MessageContent
  ): Promise<{
    channel: ChannelType;
    score: number;
    reasons: string[];
    cost: number;
    deliveryTime: number;
  }> {
    const { calculateTotalScore } = await import('./channelScoringHelpers');

    // Calculer le score total avec toutes les règles
    const result = calculateTotalScore(channel, context, content);

    // Vérifier la disponibilité des coordonnées (règle finale)
    const hasContact = this.hasContactInfo(channel, context);
    if (!hasContact) {
      return {
        channel,
        score: 0,
        reasons: ['Contact info not available'],
        cost: result.cost,
        deliveryTime: result.deliveryTime,
      };
    }

    return {
      channel,
      ...result,
    };
  }

  /**
   * Envoyer via un canal spécifique
   */
  private async sendViaChannel(
    channel: ChannelType,
    context: MessageContext,
    content: MessageContent
  ): Promise<SendResult> {
    switch (channel) {
      case 'sms':
        return this.sendViaSMS(context, content);
      case 'email':
        return this.sendViaEmail(context, content);
      case 'whatsapp':
        return this.sendViaWhatsApp(context, content);
      case 'telegram':
        return this.sendViaTelegram(context, content);
      default:
        throw new Error(`Channel ${channel} not implemented`);
    }
  }

  /**
   * Envoyer via SMS
   */
  private async sendViaSMS(
    context: MessageContext,
    content: MessageContent
  ): Promise<SendResult> {
    if (!this.smsService) {
      throw new Error('SMS service not available');
    }

    if (!context.prospectPhone) {
      throw new Error('No phone number available');
    }

    const message = await this.smsService.sendTemplatedSMS({
      tenantId: context.tenantId,
      to: context.prospectPhone,
      templateId: content.templateId,
      customMessage: content.body,
      data: content.data as any,
    });

    return {
      success: true,
      channel: 'sms',
      messageId: message.id,
      status: message.status,
    };
  }

  /**
   * Envoyer via Email
   */
  private async sendViaEmail(
    context: MessageContext,
    content: MessageContent
  ): Promise<SendResult> {
    if (!this.emailService) {
      throw new Error('Email service not available');
    }

    if (!context.prospectEmail) {
      throw new Error('No email address available');
    }

    const message = await this.emailService.sendTemplatedEmail({
      tenantId: context.tenantId,
      to: context.prospectEmail,
      templateId: content.templateId,
      customSubject: content.subject,
      customHtml: content.html || `<p>${content.body}</p>`,
      data: content.data as any,
      attachments: content.attachments,
    });

    return {
      success: true,
      channel: 'email',
      messageId: message.id,
      status: message.status,
    };
  }

  /**
   * Envoyer via WhatsApp (à implémenter)
   */
  private async sendViaWhatsApp(
    context: MessageContext,
    content: MessageContent
  ): Promise<SendResult> {
    // TODO: Implémenter avec Twilio WhatsApp API
    throw new Error('WhatsApp not yet implemented');
  }

  /**
   * Envoyer via Telegram (à implémenter)
   */
  private async sendViaTelegram(
    context: MessageContext,
    content: MessageContent
  ): Promise<SendResult> {
    // TODO: Implémenter avec Telegram Bot API
    throw new Error('Telegram not yet implemented');
  }

  /**
   * Obtenir les canaux disponibles pour un prospect
   */
  private getAvailableChannels(context: MessageContext): ChannelType[] {
    const channels: ChannelType[] = [];

    if (context.prospectPhone && this.smsService) channels.push('sms');
    if (context.prospectEmail && this.emailService) channels.push('email');
    if (context.prospectWhatsApp) channels.push('whatsapp');
    if (context.prospectTelegram) channels.push('telegram');

    // Filtrer les canaux désactivés
    if (context.preferences?.disabledChannels) {
      return channels.filter(c => !context.preferences?.disabledChannels?.includes(c));
    }

    return channels;
  }

  /**
   * Note: isQuietHours() a été déplacé vers channelScoringHelpers.ts
   * Cette fonction est maintenant appelée depuis les helpers de scoring
   */

  /**
   * Vérifier si les coordonnées sont disponibles
   */
  private hasContactInfo(channel: ChannelType, context: MessageContext): boolean {
    switch (channel) {
      case 'sms':
        return !!context.prospectPhone;
      case 'email':
        return !!context.prospectEmail;
      case 'whatsapp':
        return !!context.prospectWhatsApp;
      case 'telegram':
        return !!context.prospectTelegram;
      default:
        return false;
    }
  }

  /**
   * Envoyer un message sur plusieurs canaux (broadcast)
   */
  async broadcastMessage(
    contexts: MessageContext[],
    content: MessageContent
  ): Promise<SendResult[]> {
    const promises = contexts.map(context =>
      this.routeMessage(context, content)
    );

    return Promise.all(promises);
  }

  /**
   * Obtenir les statistiques de performance des canaux
   */
  async getChannelStats(tenantId: string): Promise<{
    channel: ChannelType;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
    deliveryRate: number;
    openRate: number;
    avgCost: number;
    avgDeliveryTime: number;
  }[]> {
    // TODO: Implémenter avec la base de données
    return [];
  }
}

/**
 * Factory pour créer une instance ChannelOrchestrator
 */
export function createChannelOrchestrator(services: {
  smsService?: SMSService;
  emailService?: EmailService;
}): ChannelOrchestrator {
  return new ChannelOrchestrator(services);
}
