/**
 * Service OpenAI - GPT-4 pour ConversationRelay
 */

import { omniLogger } from '../utils/logger.js';
import { getAgentTypeConfig, renderTemplate } from '../templates/agent-types.js';

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
   * @param {Object} session - Session de conversation
   * @param {string} userMessage - Message de l'utilisateur
   * @param {Object} tools - Outils disponibles (ex: { searchProducts: (params) => {...} })
   */
  async streamResponse(session, userMessage, tools = null) {
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
        max_tokens: 150,  // Augmenté pour permettre les function calls
        temperature: 0.9,
        presence_penalty: 0.6,
        frequency_penalty: 0.3
      };

      // Ajouter les tools/functions si disponibles
      if (tools && (tools.searchProducts || tools.bookAppointment)) {
        requestBody.tools = [];

        // Outil de recherche de produits
        if (tools.searchProducts) {
          requestBody.tools.push({
            type: 'function',
            function: {
              name: 'searchProducts',
              description: 'Rechercher des produits (appartements, maisons, etc.) dans la base de données en fonction des critères de l\'utilisateur',
              parameters: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    description: 'Catégorie du produit (ex: real_estate)',
                    enum: ['real_estate', 'service', 'other']
                  },
                  city: {
                    type: 'string',
                    description: 'Ville recherchée (ex: Toulouse, Paris)'
                  },
                  exactPrice: {
                    type: 'number',
                    description: 'Prix exact en euros (utilise ce param si l\'utilisateur donne un prix précis)'
                  },
                  minPrice: {
                    type: 'number',
                    description: 'Prix minimum en euros (utilise seulement si fourchette de prix)'
                  },
                  maxPrice: {
                    type: 'number',
                    description: 'Prix maximum en euros (utilise seulement si fourchette de prix)'
                  },
                  minRooms: {
                    type: 'number',
                    description: 'Nombre minimum de pièces'
                  },
                  maxRooms: {
                    type: 'number',
                    description: 'Nombre maximum de pièces'
                  },
                  keywords: {
                    type: 'string',
                    description: 'Mots-clés libres pour rechercher dans le titre et la description'
                  }
                },
                required: []
              }
            }
          });
        }

        // Outil de prise de rendez-vous
        if (tools.bookAppointment) {
          requestBody.tools.push({
            type: 'function',
            function: {
              name: 'bookAppointment',
              description: 'Prendre un rendez-vous pour une visite de bien immobilier. Utilise cet outil quand le client souhaite visiter un bien ou prendre rendez-vous. IMPORTANT: Collecte d\'abord le nom et l\'email du client avant de réserver.',
              parameters: {
                type: 'object',
                properties: {
                  customerName: {
                    type: 'string',
                    description: 'Nom complet du client (requis pour la réservation)'
                  },
                  customerEmail: {
                    type: 'string',
                    description: 'Email du client pour la confirmation (requis pour la réservation)'
                  },
                  dateTime: {
                    type: 'string',
                    description: 'Date et heure souhaitées au format ISO 8601 (ex: 2025-01-15T14:00:00Z). Si non spécifié, proposer demain.'
                  },
                  productId: {
                    type: 'string',
                    description: 'ID du produit/bien à visiter (extrait des résultats de recherche)'
                  },
                  productTitle: {
                    type: 'string',
                    description: 'Titre ou description du bien à visiter'
                  },
                  duration: {
                    type: 'number',
                    description: 'Durée du rendez-vous en minutes (par défaut: 60)'
                  }
                },
                required: ['customerName', 'customerEmail']
              }
            }
          });
        }

        requestBody.tool_choice = 'auto';
      }

      omniLogger.info('Calling OpenAI API', {
        url: `${this.baseUrl}/chat/completions`,
        model: this.model,
        hasApiKey: !!this.apiKey,
        apiKeyPrefix: this.apiKey ? this.apiKey.substring(0, 10) + '...' : 'none',
        messagesCount: openaiMessages.length,
        toolsEnabled: !!tools
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
      const choice = data.choices[0];

      // Vérifier si GPT-4 veut appeler une fonction
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        const toolCall = choice.message.tool_calls[0];

        omniLogger.info('OpenAI requested function call', {
          functionName: toolCall.function.name,
          arguments: toolCall.function.arguments
        });

        // Ajouter le message de l'assistant avec tool_calls à l'historique
        session.messages.push({
          role: 'assistant',
          content: null,
          tool_calls: choice.message.tool_calls
        });

        // Exécuter la fonction searchProducts
        if (toolCall.function.name === 'searchProducts' && tools.searchProducts) {
          const params = JSON.parse(toolCall.function.arguments);
          const searchResults = await tools.searchProducts(params);

          omniLogger.info('Function executed', {
            functionName: 'searchProducts',
            resultsCount: searchResults.length
          });

          // Ajouter le résultat de la fonction à l'historique
          session.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              count: searchResults.length,
              products: searchResults.slice(0, 5).map(p => ({
                title: p.title,
                price: p.price,
                location: p.location,
                description: p.description ? p.description.substring(0, 200) : ''
              }))
            })
          });

          // Rappeler GPT-4 pour qu'il formule une réponse avec les résultats
          const secondRequestBody = {
            model: this.model,
            messages: [
              { role: 'system', content: session.systemPrompt },
              ...session.messages
            ],
            max_tokens: 50,
            temperature: 0.9,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
          };

          const secondResponse = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(secondRequestBody)
          });

          if (!secondResponse.ok) {
            throw new Error('OpenAI second call failed');
          }

          const secondData = await secondResponse.json();
          const finalMessage = secondData.choices[0].message.content;

          // Ajouter la réponse finale à l'historique
          session.messages.push({
            role: 'assistant',
            content: finalMessage
          });

          omniLogger.info('OpenAI final response generated', {
            sessionId: session.sessionId,
            messageLength: finalMessage.length
          });

          return finalMessage;
        }

        // Exécuter la fonction bookAppointment
        if (toolCall.function.name === 'bookAppointment' && tools.bookAppointment) {
          const params = JSON.parse(toolCall.function.arguments);
          const bookingResult = await tools.bookAppointment(params);

          omniLogger.info('Function executed', {
            functionName: 'bookAppointment',
            success: bookingResult.success,
            appointmentId: bookingResult.appointmentId
          });

          // Ajouter le résultat de la fonction à l'historique
          session.messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(bookingResult)
          });

          // Rappeler GPT-4 pour qu'il formule une réponse
          const secondRequestBody = {
            model: this.model,
            messages: [
              { role: 'system', content: session.systemPrompt },
              ...session.messages
            ],
            max_tokens: 50,
            temperature: 0.9,
            presence_penalty: 0.6,
            frequency_penalty: 0.3
          };

          const secondResponse = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify(secondRequestBody)
          });

          if (!secondResponse.ok) {
            throw new Error('OpenAI second call failed');
          }

          const secondData = await secondResponse.json();
          const finalMessage = secondData.choices[0].message.content;

          // Ajouter la réponse finale à l'historique
          session.messages.push({
            role: 'assistant',
            content: finalMessage
          });

          omniLogger.info('OpenAI final response generated', {
            sessionId: session.sessionId,
            messageLength: finalMessage.length
          });

          return finalMessage;
        }
      }

      // Réponse normale sans function call
      const assistantMessage = choice.message.content;

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
    const agencyName = agentConfig.agency_name || 'notre agence';
    const agentType = agentConfig.agent_type || 'custom';

    // Si un system_prompt personnalisé existe, l'utiliser (priorité maximale)
    if (agentConfig.system_prompt && agentConfig.system_prompt.trim() !== '') {
      return agentConfig.system_prompt;
    }

    // Sinon, utiliser le template du type d'agent
    const typeConfig = getAgentTypeConfig(agentType);

    // Rendre le template avec les variables
    return renderTemplate(typeConfig.system_prompt_template, {
      agent_name: name,
      agency_name: agencyName,
      first_name: agentConfig.first_name || '',
      personality: agentConfig.agent_personality || 'professional'
    });
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
