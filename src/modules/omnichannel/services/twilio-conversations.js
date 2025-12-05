/**
 * Service Twilio Conversations - Gestion des conversations multi-canal
 */

import { OmnichannelConfig } from '../config.js';
import { omniLogger } from '../utils/logger.js';

export class TwilioConversationsService {
  constructor(env) {
    this.accountSid = OmnichannelConfig.twilio.accountSid(env);
    this.authToken = OmnichannelConfig.twilio.authToken(env);
    this.serviceSid = OmnichannelConfig.twilio.conversationsServiceSid(env);
    this.baseUrl = `https://conversations.twilio.com/v1/Services/${this.serviceSid}`;
  }

  /**
   * Créer une nouvelle conversation
   */
  async createConversation(friendlyName, attributes = {}) {
    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);

      const body = new URLSearchParams({
        FriendlyName: friendlyName,
        Attributes: JSON.stringify(attributes)
      });

      const response = await fetch(`${this.baseUrl}/Conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${response.status} - ${error}`);
      }

      const conversation = await response.json();
      omniLogger.info('Conversation created', { sid: conversation.sid });
      return conversation;

    } catch (error) {
      omniLogger.error('Failed to create conversation', { error: error.message });
      throw error;
    }
  }

  /**
   * Ajouter un participant à une conversation
   */
  async addParticipant(conversationSid, identity, attributes = {}) {
    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);

      const body = new URLSearchParams({
        Identity: identity,
        Attributes: JSON.stringify(attributes)
      });

      const response = await fetch(
        `${this.baseUrl}/Conversations/${conversationSid}/Participants`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body.toString()
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${response.status} - ${error}`);
      }

      return await response.json();

    } catch (error) {
      omniLogger.error('Failed to add participant', { error: error.message });
      throw error;
    }
  }

  /**
   * Envoyer un message dans une conversation
   */
  async sendMessage(conversationSid, body, author = 'system', attributes = {}) {
    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);

      const formData = new URLSearchParams({
        Body: body,
        Author: author,
        Attributes: JSON.stringify(attributes)
      });

      const response = await fetch(
        `${this.baseUrl}/Conversations/${conversationSid}/Messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Twilio API error: ${response.status} - ${error}`);
      }

      return await response.json();

    } catch (error) {
      omniLogger.error('Failed to send message', { error: error.message });
      throw error;
    }
  }

  /**
   * Récupérer une conversation
   */
  async getConversation(conversationSid) {
    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);

      const response = await fetch(
        `${this.baseUrl}/Conversations/${conversationSid}`,
        {
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      omniLogger.error('Failed to get conversation', { error: error.message });
      throw error;
    }
  }

  /**
   * Fermer une conversation
   */
  async closeConversation(conversationSid) {
    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);

      const response = await fetch(
        `${this.baseUrl}/Conversations/${conversationSid}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Basic ${auth}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }

      omniLogger.info('Conversation closed', { conversationSid });
      return true;

    } catch (error) {
      omniLogger.error('Failed to close conversation', { error: error.message });
      throw error;
    }
  }
}

export default TwilioConversationsService;
