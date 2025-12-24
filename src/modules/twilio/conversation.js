// Twilio ConversationRelay - Conversation Manager
// Gère la logique de conversation avec Claude/GPT et les tool calls
import { logger } from '../../utils/logger.js';
import { ragPipeline } from '../knowledge/search.js';

export class ConversationManager {
  constructor(env, options) {
    this.env = env;
    this.callId = options.callId;
    this.tenantId = options.tenantId;
    this.websocket = options.websocket;
    this.messages = [];
    this.sessionInfo = {};
    this.config = {};
    this.isProcessing = false;

    this.loadConfig();
  }

  async loadConfig() {
    try {
      // Charger la config du tenant et de l'agent
      const tenant = await this.env.DB.prepare(`
        SELECT t.*,
          (a.first_name || ' ' || a.last_name) as agent_name,
          a.id as agent_id
        FROM tenants t
        LEFT JOIN commercial_agents a ON t.id = a.tenant_id AND a.is_active = 1
        WHERE t.id = ?
      `).bind(this.tenantId).first();

      if (tenant) {
        this.config = {
          tenantId: tenant.id,
          companyName: tenant.company_name,
          agentName: tenant.agent_name || 'Sara',
          agentId: tenant.agent_id,
          personality: 'professional',
          systemPrompt: null,
          transferNumber: null,
          smsNumber: null
        };
      } else {
        // Config par défaut
        this.config = {
          tenantId: this.tenantId,
          companyName: 'Coccinelle',
          agentName: 'Sara',
          personality: 'professional',
          systemPrompt: null,
          transferNumber: null
        };
      }

      logger.info('Config loaded', { tenantId: this.tenantId, agentName: this.config.agentName });

    } catch (error) {
      logger.error('Failed to load config', { error: error.message });
    }
  }

  setSessionInfo(info) {
    this.sessionInfo = { ...this.sessionInfo, ...info };
  }

  async addMessage(role, content) {
    const message = {
      role,
      content,
      timestamp: Date.now()
    };
    this.messages.push(message);

    // Sauvegarder en DB
    try {
      await this.env.DB.prepare(`
        INSERT INTO call_messages (id, call_id, role, content, created_at)
        VALUES (?, ?, ?, ?, datetime('now'))
      `).bind(
        `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        this.callId,
        role,
        content
      ).run();
    } catch (error) {
      logger.warn('Failed to save message', { error: error.message });
    }
  }

  getLastAssistantMessage() {
    const assistantMessages = this.messages.filter(m => m.role === 'assistant');
    return assistantMessages.length > 0
      ? assistantMessages[assistantMessages.length - 1].content
      : null;
  }

  interruptCurrentResponse() {
    this.isProcessing = false;
  }

  onPlaybackComplete() {
    // Callback quand le TTS est terminé
  }

  async generateResponse(userMessage, env) {
    this.isProcessing = true;

    try {
      // Construire le contexte de conversation
      const conversationContext = this.buildConversationContext();

      // Construire le system prompt
      const systemPrompt = this.buildSystemPrompt();

      // Préparer les outils disponibles
      const tools = this.getAvailableTools();

      // Appeler Claude pour générer la réponse
      const response = await this.callClaude(systemPrompt, conversationContext, userMessage, tools, env);

      return response;

    } catch (error) {
      logger.error('Generate response error', { error: error.message });
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  buildConversationContext() {
    // Garder les 10 derniers messages pour le contexte
    const recentMessages = this.messages.slice(-10);
    return recentMessages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }

  buildSystemPrompt() {
    const defaultPrompt = `Tu es ${this.config.agentName}, une assistante vocale IA professionnelle et chaleureuse qui travaille pour ${this.config.companyName}.

INSTRUCTIONS VOCALES:
- Parle de manière naturelle et conversationnelle, comme au téléphone
- Utilise des phrases courtes et claires (max 2-3 phrases par réponse)
- Évite le jargon technique
- Sois empathique et patiente
- Confirme les informations importantes en les répétant

CAPACITÉS:
- Répondre aux questions sur l'entreprise et ses services (via la base de connaissances)
- Rechercher des produits, biens immobiliers, articles ou services disponibles selon les critères du client
- Vérifier les disponibilités pour des rendez-vous
- Prendre des rendez-vous
- Transférer à un conseiller humain si nécessaire

COMPORTEMENT:
- Si tu ne connais pas la réponse, propose de transférer à un conseiller
- Si l'utilisateur semble frustré, propose le transfert immédiat
- Confirme toujours les rendez-vous pris avec un récapitulatif
- Quand tu présentes des produits, mentionne les détails clés: prix, localisation (si immobilier), et caractéristiques principales

LANGUE: Français exclusivement`;

    return this.config.systemPrompt || defaultPrompt;
  }

  getAvailableTools() {
    return [
      {
        name: 'search_knowledge',
        description: 'Rechercher une information dans la base de connaissances de l\'entreprise',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'La question ou le sujet à rechercher'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'search_products',
        description: 'Chercher des produits, biens immobiliers, articles, services ou autres offres disponibles selon des critères',
        input_schema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Catégorie de produit: real_estate, shoes, services, food, etc.'
            },
            keywords: {
              type: 'string',
              description: 'Mots-clés à rechercher dans le titre ou la description'
            },
            min_price: {
              type: 'number',
              description: 'Prix minimum'
            },
            max_price: {
              type: 'number',
              description: 'Prix maximum'
            },
            attributes: {
              type: 'object',
              description: 'Attributs spécifiques (taille, couleur, surface, etc.)'
            },
            limit: {
              type: 'number',
              description: 'Nombre maximum de résultats (défaut: 5)'
            }
          },
          required: []
        }
      },
      {
        name: 'check_availability',
        description: 'Vérifier les créneaux disponibles pour un rendez-vous',
        input_schema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'La date souhaitée au format YYYY-MM-DD'
            },
            service_type: {
              type: 'string',
              description: 'Le type de service ou rendez-vous'
            }
          },
          required: ['date']
        }
      },
      {
        name: 'book_appointment',
        description: 'Réserver un rendez-vous pour le client avec un agent spécifique (ex: visite d\'un bien immobilier)',
        input_schema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'Date du rendez-vous (YYYY-MM-DD)'
            },
            time: {
              type: 'string',
              description: 'Heure du rendez-vous (HH:MM)'
            },
            client_name: {
              type: 'string',
              description: 'Nom du client'
            },
            client_phone: {
              type: 'string',
              description: 'Téléphone du client'
            },
            property_id: {
              type: 'string',
              description: 'ID du bien/produit concerné (pour identifier l\'agent responsable)'
            },
            agent_id: {
              type: 'string',
              description: 'ID de l\'agent avec qui prendre RDV (si connu)'
            },
            service_type: {
              type: 'string',
              description: 'Type de rendez-vous (ex: visite, estimation, conseil)'
            },
            notes: {
              type: 'string',
              description: 'Notes additionnelles'
            }
          },
          required: ['date', 'time', 'client_name']
        }
      },
      {
        name: 'transfer_to_human',
        description: 'Transférer l\'appel à un conseiller humain',
        input_schema: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: 'Raison du transfert'
            }
          }
        }
      }
    ];
  }

  async callClaude(systemPrompt, conversationContext, userMessage, tools, env) {
    const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Construire les messages pour Claude
    const messages = [
      ...conversationContext,
      { role: 'user', content: userMessage }
    ];

    const requestBody = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages,
      tools: tools
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    // Traiter la réponse
    return await this.processClaudeResponse(data, env);
  }

  async processClaudeResponse(response, env) {
    const actions = [];
    let textResponse = '';

    for (const block of response.content) {
      if (block.type === 'text') {
        textResponse += block.text;
      } else if (block.type === 'tool_use') {
        // Exécuter le tool call
        const toolResult = await this.executeToolCall(block.name, block.input, env);

        // Si c'est un transfert, ajouter l'action
        if (block.name === 'transfer_to_human') {
          actions.push({ type: 'transfer', ...toolResult });
        }

        // Si le tool retourne du contexte, on doit rappeler Claude
        if (toolResult.context) {
          // Rappeler Claude avec le résultat du tool
          const followUpResponse = await this.callClaudeWithToolResult(
            block.id,
            block.name,
            toolResult,
            response,
            env
          );
          textResponse = followUpResponse.text;
          actions.push(...(followUpResponse.actions || []));
        }
      }
    }

    return {
      text: textResponse || "Je suis désolée, je n'ai pas compris. Pouvez-vous reformuler ?",
      actions
    };
  }

  async executeToolCall(toolName, input, env) {
    logger.info('Executing tool', { tool: toolName, input });

    switch (toolName) {
      case 'search_knowledge':
        return await this.toolSearchKnowledge(input, env);

      case 'search_products':
        return await this.toolSearchProducts(input, env);

      case 'check_availability':
        return await this.toolCheckAvailability(input, env);

      case 'book_appointment':
        return await this.toolBookAppointment(input, env);

      case 'transfer_to_human':
        return await this.toolTransferToHuman(input);

      default:
        return { error: 'Unknown tool' };
    }
  }

  async toolSearchKnowledge(input, env) {
    try {
      const { query } = input;

      // Utiliser le pipeline RAG existant
      const result = await ragPipeline({
        question: query,
        db: env.DB,
        vectorize: env.VECTORIZE,
        openaiApiKey: env.OPENAI_API_KEY,
        llmApiKey: env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY,
        tenantId: this.tenantId,
        agentId: this.config.agentId,
        topK: 3
      });

      return {
        context: result.answer,
        sources: result.sources,
        confidence: result.confidence
      };

    } catch (error) {
      logger.error('Knowledge search error', { error: error.message });
      return {
        context: "Je n'ai pas trouvé d'information à ce sujet.",
        sources: [],
        confidence: 0
      };
    }
  }

  async toolSearchProducts(input, env) {
    try {
      const { category, keywords, min_price, max_price, attributes, limit = 5 } = input;

      // Construire la requête SQL dynamiquement
      let query = `
        SELECT
          p.id,
          p.title,
          p.description,
          p.price,
          p.price_currency,
          p.category,
          p.type,
          p.stock_quantity,
          p.stock_status,
          p.location,
          p.attributes,
          p.images,
          p.agent_id,
          (a.first_name || ' ' || a.last_name) as agent_name
        FROM products p
        LEFT JOIN commercial_agents a ON p.agent_id = a.id
        WHERE p.tenant_id = ?
          AND p.available = 1
          AND p.status = 'active'
      `;

      // Paramètres de requête
      const params = [this.tenantId];

      // Filtrer par catégorie
      if (category) {
        query += ' AND p.category = ?';
        params.push(category);
      }

      // Filtrer par mots-clés (recherche dans titre, description, keywords)
      if (keywords) {
        query += ' AND (p.title LIKE ? OR p.description LIKE ? OR p.keywords LIKE ?)';
        const keywordPattern = `%${keywords}%`;
        params.push(keywordPattern, keywordPattern, keywordPattern);
      }

      // Filtrer par prix
      if (min_price !== undefined) {
        query += ' AND p.price >= ?';
        params.push(min_price);
      }

      if (max_price !== undefined) {
        query += ' AND p.price <= ?';
        params.push(max_price);
      }

      // Limiter les résultats
      query += ' LIMIT ?';
      params.push(limit);

      const results = await env.DB.prepare(query).bind(...params).all();

      if (!results.results || results.results.length === 0) {
        return {
          context: "Je n'ai trouvé aucun produit correspondant à ces critères.",
          products: [],
          count: 0
        };
      }

      // Formatter les résultats pour Claude
      const products = results.results.map(p => {
        const product = {
          id: p.id,
          title: p.title,
          price: p.price,
          currency: p.price_currency || 'EUR',
          category: p.category,
          type: p.type
        };

        // Ajouter description si présente
        if (p.description) {
          product.description = p.description.substring(0, 200);
        }

        // Parser et ajouter location pour immobilier
        if (p.location) {
          try {
            const loc = JSON.parse(p.location);
            if (loc.city || loc.address) {
              product.location = `${loc.address || ''}, ${loc.city || ''}`.trim();
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }

        // Parser et ajouter attributs spécifiques
        if (p.attributes) {
          try {
            const attrs = JSON.parse(p.attributes);
            if (Object.keys(attrs).length > 0) {
              product.attributes = attrs;
            }
          } catch (e) {
            // Ignore JSON parse errors
          }
        }

        // Stock info
        if (p.stock_status) {
          product.stock_status = p.stock_status;
        }

        return product;
      });

      // Construire un contexte textuel pour Claude
      const productDescriptions = products.map((p, idx) => {
        let desc = `${idx + 1}. ${p.title} - ${p.price} ${p.currency}`;
        if (p.location) desc += ` (${p.location})`;
        if (p.description) desc += ` - ${p.description}`;
        return desc;
      }).join('\n');

      return {
        context: `J'ai trouvé ${products.length} produit(s):\n${productDescriptions}`,
        products: products,
        count: products.length
      };

    } catch (error) {
      logger.error('Product search error', { error: error.message });
      return {
        context: "Désolé, une erreur s'est produite lors de la recherche de produits.",
        products: [],
        count: 0,
        error: error.message
      };
    }
  }

  async toolCheckAvailability(input, env) {
    try {
      const { date, service_type } = input;

      // Vérifier les créneaux disponibles
      const dayOfWeek = new Date(date).getDay();
      const slots = [];

      // Générer des créneaux fictifs basés sur la config
      // En production, cela viendrait d'un calendrier réel
      const startHour = 9;
      const endHour = 18;

      for (let hour = startHour; hour < endHour; hour++) {
        // Simuler quelques créneaux pris
        if (Math.random() > 0.3) {
          slots.push(`${hour}:00`);
        }
        if (Math.random() > 0.3) {
          slots.push(`${hour}:30`);
        }
      }

      return {
        date,
        available: slots.length > 0,
        slots: slots.slice(0, 5), // Max 5 créneaux
        service_type
      };

    } catch (error) {
      logger.error('Check availability error', { error: error.message });
      return { available: false, slots: [], error: error.message };
    }
  }

  async toolBookAppointment(input, env) {
    try {
      const { date, time, client_name, client_phone, property_id, agent_id, service_type, notes } = input;

      let finalAgentId = agent_id;
      let agentName = null;
      let propertyTitle = null;

      // Si un bien est spécifié, récupérer l'agent responsable
      if (property_id) {
        const product = await env.DB.prepare(`
          SELECT p.agent_id, p.title, a.first_name, a.last_name
          FROM products p
          LEFT JOIN commercial_agents a ON p.agent_id = a.id
          WHERE p.id = ? AND p.tenant_id = ?
        `).bind(property_id, this.tenantId).first();

        if (product) {
          finalAgentId = product.agent_id;
          propertyTitle = product.title;
          agentName = product.first_name && product.last_name
            ? `${product.first_name} ${product.last_name}`
            : null;
        }
      }

      // Si on a un agent, vérifier ses disponibilités
      if (finalAgentId) {
        const appointmentDate = new Date(`${date}T${time}:00`);
        const dayOfWeek = appointmentDate.getDay(); // 0=Dimanche, 1=Lundi, etc.

        const availability = await env.DB.prepare(`
          SELECT * FROM availability_slots
          WHERE agent_id = ? AND day_of_week = ? AND is_available = 1
            AND time(?) >= time(start_time) AND time(?) < time(end_time)
        `).bind(finalAgentId, dayOfWeek, time, time).first();

        if (!availability) {
          // Récupérer le nom de l'agent pour le message d'erreur
          if (!agentName && finalAgentId) {
            const agent = await env.DB.prepare(`
              SELECT first_name, last_name FROM commercial_agents WHERE id = ?
            `).bind(finalAgentId).first();

            if (agent) {
              agentName = `${agent.first_name} ${agent.last_name}`;
            }
          }

          return {
            success: false,
            error: `L'agent ${agentName || 'concerné'} n'est pas disponible à cette date et heure. Souhaitez-vous un autre créneau ?`
          };
        }
      }

      const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scheduledAt = `${date}T${time}:00`;

      // Créer le rendez-vous en DB avec l'agent
      await env.DB.prepare(`
        INSERT INTO appointments (id, tenant_id, agent_id, property_id, customer_name, customer_phone, scheduled_at, service_type, notes, status, created_at, call_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `).bind(
        appointmentId,
        this.tenantId,
        finalAgentId,
        property_id || null,
        client_name,
        client_phone || this.sessionInfo.fromNumber,
        scheduledAt,
        service_type || 'general',
        notes || '',
        'scheduled',
        this.callId
      ).run();

      logger.info('Appointment booked', { appointmentId, date, time, client_name, agent_id: finalAgentId, property_id });

      // Construire le message de confirmation
      let confirmationMessage = `Votre rendez-vous est confirmé pour le ${this.formatDate(date)} à ${time}`;
      if (agentName) {
        confirmationMessage += ` avec ${agentName}`;
      }
      if (propertyTitle) {
        confirmationMessage += ` pour ${propertyTitle}`;
      }
      confirmationMessage += '.';

      return {
        success: true,
        appointmentId,
        date,
        time,
        client_name,
        agent_name: agentName,
        property_title: propertyTitle,
        confirmation: confirmationMessage
      };

    } catch (error) {
      logger.error('Book appointment error', { error: error.message });
      return {
        success: false,
        error: 'Désolé, je n\'ai pas pu créer le rendez-vous. Pouvez-vous réessayer ?'
      };
    }
  }

  async toolTransferToHuman(input) {
    const { reason } = input;

    logger.info('Transfer requested', { reason, callId: this.callId });

    return {
      transfer: true,
      reason,
      destination: this.config.transferNumber
    };
  }

  async callClaudeWithToolResult(toolUseId, toolName, toolResult, previousResponse, env) {
    const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;

    // Construire la conversation avec le résultat du tool
    const messages = [
      ...this.buildConversationContext(),
      { role: 'assistant', content: previousResponse.content },
      {
        role: 'user',
        content: [{
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: JSON.stringify(toolResult)
        }]
      }
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: this.buildSystemPrompt(),
        messages: messages
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();

    // Extraire le texte de la réponse
    let text = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        text += block.text;
      }
    }

    return { text, actions: [] };
  }

  formatDate(dateStr) {
    const date = new Date(dateStr);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
  }

  async endConversation(reason) {
    try {
      // Mettre à jour l'appel en DB
      const duration = this.sessionInfo.startTime
        ? Math.round((Date.now() - this.sessionInfo.startTime) / 1000)
        : 0;

      await this.env.DB.prepare(`
        UPDATE calls
        SET status = ?, duration = ?, end_reason = ?, updated_at = datetime('now')
        WHERE id = ?
      `).bind('completed', duration, reason || 'normal', this.callId).run();

      // Sauvegarder le résumé de la conversation
      const messageCount = this.messages.length;
      const summary = this.messages.slice(-5).map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('\n');

      await this.env.DB.prepare(`
        INSERT INTO call_summaries (id, call_id, tenant_id, message_count, duration, summary, created_at)
        VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        `summary_${this.callId}`,
        this.callId,
        this.tenantId,
        messageCount,
        duration,
        summary
      ).run();

      logger.info('Conversation ended', {
        callId: this.callId,
        duration,
        messageCount,
        reason
      });

    } catch (error) {
      logger.error('End conversation error', { error: error.message });
    }
  }
}
