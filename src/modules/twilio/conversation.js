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
        SELECT t.*, a.name as agent_name, a.personality, a.system_prompt, a.id as agent_id
        FROM tenants t
        LEFT JOIN agents a ON t.id = a.tenant_id AND a.is_default = 1
        WHERE t.id = ?
      `).bind(this.tenantId).first();

      if (tenant) {
        this.config = {
          tenantId: tenant.id,
          companyName: tenant.company_name,
          agentName: tenant.agent_name || 'Sara',
          agentId: tenant.agent_id,
          personality: tenant.personality || 'professional',
          systemPrompt: tenant.system_prompt,
          transferNumber: tenant.transfer_number,
          smsNumber: tenant.sms_number
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
- Vérifier les disponibilités pour des rendez-vous
- Prendre des rendez-vous
- Transférer à un conseiller humain si nécessaire

COMPORTEMENT:
- Si tu ne connais pas la réponse, propose de transférer à un conseiller
- Si l'utilisateur semble frustré, propose le transfert immédiat
- Confirme toujours les rendez-vous pris avec un récapitulatif

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
        description: 'Réserver un rendez-vous pour le client',
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
            service_type: {
              type: 'string',
              description: 'Type de rendez-vous'
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
      const { date, time, client_name, client_phone, service_type, notes } = input;

      const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const scheduledAt = `${date}T${time}:00`;

      // Créer le rendez-vous en DB
      await env.DB.prepare(`
        INSERT INTO appointments (id, tenant_id, client_name, client_phone, scheduled_at, service_type, notes, status, created_at, call_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
      `).bind(
        appointmentId,
        this.tenantId,
        client_name,
        client_phone || this.sessionInfo.fromNumber,
        scheduledAt,
        service_type || 'general',
        notes || '',
        'scheduled',
        this.callId
      ).run();

      logger.info('Appointment booked', { appointmentId, date, time, client_name });

      return {
        success: true,
        appointmentId,
        date,
        time,
        client_name,
        confirmation: `Votre rendez-vous est confirmé pour le ${this.formatDate(date)} à ${time}.`
      };

    } catch (error) {
      logger.error('Book appointment error', { error: error.message });
      return {
        success: false,
        error: 'Unable to book appointment'
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
