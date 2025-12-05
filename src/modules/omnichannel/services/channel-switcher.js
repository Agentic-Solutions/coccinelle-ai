/**
 * Service Channel Switcher - Logique pour changer de canal pendant une conversation
 */

import { queries } from '../db/queries.js';
import { omniLogger } from '../utils/logger.js';
import TwilioConversationsService from './twilio-conversations.js';

export class ChannelSwitcher {
  constructor(env) {
    this.env = env;
    this.twilioService = new TwilioConversationsService(env);
  }

  /**
   * Changer de canal (voice → sms, par exemple)
   */
  async switchChannel(conversationId, fromChannel, toChannel, reason = 'user_request') {
    try {
      // Récupérer la conversation
      const conversation = await this.env.DB.prepare(queries.getConversation)
        .bind(conversationId)
        .first();

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Parser les données JSON
      const activeChannels = JSON.parse(conversation.active_channels || '[]');
      const channelSwitches = JSON.parse(conversation.channel_switches || '[]');

      // Ajouter le nouveau canal s'il n'est pas déjà actif
      if (!activeChannels.includes(toChannel)) {
        activeChannels.push(toChannel);
      }

      // Enregistrer le switch
      channelSwitches.push({
        from: fromChannel,
        to: toChannel,
        reason,
        timestamp: new Date().toISOString()
      });

      // Mettre à jour la conversation
      await this.env.DB.prepare(queries.updateConversationChannel).bind(
        toChannel,
        JSON.stringify(channelSwitches),
        conversationId
      ).run();

      omniLogger.info('Channel switched', {
        conversationId,
        from: fromChannel,
        to: toChannel,
        reason
      });

      // Envoyer un message système dans la conversation Twilio
      if (conversation.conversation_sid) {
        await this.twilioService.sendMessage(
          conversation.conversation_sid,
          `Conversation transférée de ${fromChannel} vers ${toChannel}`,
          'system',
          { type: 'channel_switch', from: fromChannel, to: toChannel }
        );
      }

      return {
        success: true,
        conversationId,
        newChannel: toChannel,
        activeChannels
      };

    } catch (error) {
      omniLogger.error('Failed to switch channel', {
        conversationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Déterminer quel canal utiliser en fonction du contexte
   */
  getSuggestedChannel(context) {
    // Logique simple : prioriser voice si disponible
    if (context.hasPhoneNumber && context.canCall) {
      return 'voice';
    }

    if (context.hasPhoneNumber) {
      return 'sms';
    }

    if (context.hasWhatsApp) {
      return 'whatsapp';
    }

    if (context.hasEmail) {
      return 'email';
    }

    return 'voice'; // Défaut
  }

  /**
   * Vérifier si un switch de canal est autorisé
   */
  canSwitchChannel(fromChannel, toChannel, conversation) {
    // Règles métier : peut-on passer de X vers Y ?
    const allowedTransitions = {
      voice: ['sms', 'whatsapp', 'email'],
      sms: ['voice', 'whatsapp', 'email'],
      whatsapp: ['voice', 'sms', 'email'],
      email: ['voice', 'sms', 'whatsapp']
    };

    return allowedTransitions[fromChannel]?.includes(toChannel) || false;
  }
}

export default ChannelSwitcher;
