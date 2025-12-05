/**
 * Service OpenAI - GPT-4 pour ConversationRelay
 */

import { omniLogger } from '../utils/logger.js';

export class ClaudeAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.model = 'gpt-4o-mini';
  }

  /**
   * Créer une nouvelle session de conversation
   */
  async createSession(agentConfig) {
    const systemPrompt = agentConfig.system_prompt || this.getDefaultSystemPrompt(agentConfig);

    return {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      model: this.model,
      systemPrompt,
      messages: [],
      agentConfig
    };
  }

  /**
   * Générer une réponse avec OpenAI GPT-4
   */
  async streamResponse(session, userMessage) {
    session.messages.push({
      role: 'user',
      content: userMessage
    });

    try {
      // Format OpenAI : system message en premier
      const openaiMessages = [
        {
          role: 'system',
          content: session.systemPrompt
        },
        ...session.messages
      ];

      const requestBody = {
        model: this.model,
        messages: openaiMessages,
        max_tokens: 50,  // Ultra-court pour latence minimale
        temperature: 0.9,  // Max naturalité
        presence_penalty: 0.6,  // Évite répétitions
        frequency_penalty: 0.3  // Encourage variété
      };

      omniLogger.info('Calling OpenAI API', {
        url: `${this.baseUrl}/chat/completions`,
        model: this.model,
        hasApiKey: !!this.apiKey,
        apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'none',
        messagesCount: openaiMessages.length
      });

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        omniLogger.error('OpenAI API error response', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new Error(`OpenAI API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;

      // Ajouter la réponse à l'historique
      session.messages.push({
        role: 'assistant',
        content: assistantMessage
      });

      omniLogger.info('OpenAI response generated', {
        sessionId: session.sessionId,
        messageLength: assistantMessage.length
      });

      return assistantMessage;

    } catch (error) {
      omniLogger.error('OpenAI error', {
        sessionId: session.sessionId,
        error: error.message,
        stack: error.stack
      });

      // Lancer l'erreur au lieu de retourner le fallback
      // L'orchestrator va gérer le fallback
      throw error;
    }
  }

  /**
   * Générer le system prompt par défaut
   */
  getDefaultSystemPrompt(agentConfig) {
    const name = agentConfig.agent_name || 'Sara';
    const personality = agentConfig.agent_personality || 'professional';

    let personalityDesc = '';
    switch (personality) {
      case 'friendly':
        personalityDesc = 'Tu es chaleureuse, empathique et utilises un langage simple et accessible.';
        break;
      case 'casual':
        personalityDesc = 'Tu es décontractée, utilises un langage courant et crées une ambiance conviviale.';
        break;
      default:
        personalityDesc = 'Tu es professionnelle, courtoise et efficace dans tes réponses.';
    }

    return `Tu es ${name}, assistante virtuelle téléphonique. ${personalityDesc}

RÈGLES STRICTES:
- 1-2 phrases max, très courtes
- Langage naturel et conversationnel
- Pas de listes, pas de points numérotés
- Utilise "je" pour parler de toi
- Immobilier et assistance client

RÉPONDS DE FAÇON ULTRA-CONCISE.`;
  }

  /**
   * Déterminer si l'utilisateur veut transférer vers un humain
   */
  shouldTransfer(userMessage) {
    const transferKeywords = [
      'parler à quelqu\'un',
      'conseiller',
      'humain',
      'personne réelle',
      'agent',
      'service client',
      'transfert',
      'transférer'
    ];

    const lowerMessage = userMessage.toLowerCase();
    return transferKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Déterminer si la conversation est terminée
   */
  shouldEndConversation(userMessage) {
    const endKeywords = [
      'au revoir',
      'merci au revoir',
      'bonne journée',
      'à bientôt',
      'raccrocher',
      'c\'est bon',
      'terminé'
    ];

    const lowerMessage = userMessage.toLowerCase();
    return endKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}
