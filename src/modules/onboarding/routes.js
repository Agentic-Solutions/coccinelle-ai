/**
 * =====================================================
 * COCCINELLE.AI - ONBOARDING ROUTES (ARCHITECTURE UNIFIÉE)
 * Version : 2.1.0
 * Date : 1 mars 2026
 * =====================================================
 *
 * PRINCIPE : Single Source of Truth
 *   - Écriture DIRECTE dans les tables runtime (tenants, omni_agent_configs, etc.)
 *   - PAS de JSON temporaire dans onboarding_sessions
 *   - PAS de sync complexe
 *   - Transactions atomiques (rollback automatique si échec)
 *   - Auth via JWT (plus de x-tenant-id header)
 *
 * =====================================================
 */

import { requireAuth } from '../auth/helpers.js';
import { logger } from '../../utils/logger.js';

/**
 * Génère un ID unique
 */
function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Crée les catégories de produits par défaut pour un nouveau tenant
 */
async function createDefaultProductCategories(env, tenantId) {
  const now = new Date().toISOString();

  const defaultCategories = [
    {
      id: `cat_${tenantId}_real_estate`,
      key: 'real_estate',
      name: 'Immobilier',
      description: 'Biens immobiliers: appartements, maisons, locaux commerciaux',
      icon: 'Home',
      color: 'blue',
      fields: JSON.stringify([
        {"key": "surface", "label": "Surface (m²)", "type": "number", "required": false},
        {"key": "rooms", "label": "Nombre de pièces", "type": "number", "required": false},
        {"key": "bedrooms", "label": "Chambres", "type": "number", "required": false},
        {"key": "floor", "label": "Étage", "type": "number", "required": false}
      ]),
      display_order: 1
    },
    {
      id: `cat_${tenantId}_retail`,
      key: 'retail',
      name: 'Commerce',
      description: 'Articles de vente au détail',
      icon: 'ShoppingBag',
      color: 'purple',
      fields: JSON.stringify([
        {"key": "brand", "label": "Marque", "type": "text", "required": false},
        {"key": "color", "label": "Couleur", "type": "text", "required": false}
      ]),
      display_order: 2
    },
    {
      id: `cat_${tenantId}_food`,
      key: 'food',
      name: 'Restauration',
      description: 'Produits alimentaires et plats de restauration',
      icon: 'UtensilsCrossed',
      color: 'orange',
      fields: JSON.stringify([
        {"key": "ingredients", "label": "Ingrédients", "type": "text", "required": false},
        {"key": "spicy", "label": "Épicé", "type": "checkbox", "required": false}
      ]),
      display_order: 3
    },
    {
      id: `cat_${tenantId}_services`,
      key: 'services',
      name: 'Services',
      description: 'Services professionnels et prestations',
      icon: 'Briefcase',
      color: 'green',
      fields: JSON.stringify([
        {"key": "duration", "label": "Durée", "type": "text", "required": false},
        {"key": "online", "label": "En ligne", "type": "checkbox", "required": false}
      ]),
      display_order: 4
    }
  ];

  const statements = defaultCategories.map(cat =>
    env.DB.prepare(`
      INSERT INTO product_categories (
        id, tenant_id, key, name, description, icon, color, is_system, fields, display_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `).bind(cat.id, tenantId, cat.key, cat.name, cat.description, cat.icon, cat.color, cat.fields, cat.display_order, now, now)
  );

  await env.DB.batch(statements);
  console.log(`[Onboarding] Created ${defaultCategories.length} default product categories for tenant ${tenantId}`);
}

/**
 * POST /api/v1/onboarding/start
 * Démarre une nouvelle session d'onboarding
 */
export async function startOnboarding(request, env, tenantId, userId) {
  try {
    const sessionId = generateId('onb');
    const now = new Date().toISOString();

    // Vérifier si le tenant existe, sinon le créer
    const tenant = await env.DB.prepare(`
      SELECT id FROM tenants WHERE id = ?
    `).bind(tenantId).first();

    if (!tenant) {
      // Créer un tenant temporaire pour l'onboarding
      const apiKey = generateId('key');
      await env.DB.prepare(`
        INSERT INTO tenants (id, name, email, api_key, created_at)
        VALUES (?, 'Tenant Temporaire', ?, ?, ?)
      `).bind(tenantId, `${tenantId}@temp.local`, apiKey, now).run();
      console.log(`[Onboarding] Tenant temporaire créé: ${tenantId}`);

      // Créer les catégories de produits par défaut
      try {
        await createDefaultProductCategories(env, tenantId);
      } catch (error) {
        console.error(`[Onboarding] Erreur création catégories pour ${tenantId}:`, error);
        // Ne pas bloquer l'onboarding si les catégories échouent
      }
    }

    await env.DB.prepare(`
      INSERT INTO onboarding_sessions (
        id, tenant_id, user_id, current_step, status, started_at, last_updated_at, updated_at
      ) VALUES (?, ?, ?, 1, 'in_progress', ?, ?, ?)
    `).bind(sessionId, tenantId, userId, now, now, now).run();

    return {
      success: true,
      session_id: sessionId,
      tenant_id: tenantId
    };
  } catch (error) {
    console.error('[Onboarding] Error starting session:', error);
    return {
      success: false,
      error: 'Erreur lors du démarrage de l\'onboarding',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/session/:id/business
 * Étape 2 : Informations business
 *
 * NOUVEAU : Écrit directement dans `tenants` (pas de JSON temporaire)
 */
export async function saveBusinessInfo(request, env, sessionId, tenantId) {
  try {
    const { company_name, industry, email, phone } = await request.json();
    const now = new Date().toISOString();

    // Validation
    if (!company_name || !industry) {
      return {
        success: false,
        error: 'Nom d\'entreprise et secteur requis'
      };
    }

    // Transaction atomique : tout ou rien
    await env.DB.batch([
      // 1. Mettre à jour le tenant avec les données business
      env.DB.prepare(`
        UPDATE tenants
        SET company_name = ?,
            sector = ?,
            phone = ?,
            updated_at = ?
        WHERE id = ?
      `).bind(company_name, industry, phone || null, now, tenantId),

      // 2. Mettre à jour la progression (step 3)
      env.DB.prepare(`
        UPDATE onboarding_sessions
        SET current_step = 3,
            metadata = json_set(COALESCE(metadata, '{}'), '$.industry_template', ?),
            updated_at = ?
        WHERE id = ?
      `).bind(industry, now, sessionId)
    ]);

    console.log(`[Onboarding] Business info saved for tenant ${tenantId}`);

    return {
      success: true,
      message: 'Informations business enregistrées',
      next_step: 3
    };
  } catch (error) {
    console.error('[Onboarding] Error saving business info:', error);
    return {
      success: false,
      error: 'Erreur lors de la sauvegarde',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/session/:id/agents/auto-generate
 * Étape 3 : Génération automatique d'agents
 *
 * INCHANGÉ : Génère des agents selon l'industrie
 */
export async function autoGenerateAgents(request, env, sessionId, tenantId) {
  try {
    const session = await env.DB.prepare(`
      SELECT metadata FROM onboarding_sessions WHERE id = ?
    `).bind(sessionId).first();

    if (!session) {
      return { success: false, error: 'Session introuvable' };
    }

    const metadata = JSON.parse(session.metadata || '{}');
    const industry = metadata.industry_template || 'generic';

    // Templates d'agents par industrie
    const agentTemplates = {
      'real_estate': [
        { name: 'Agent Principal', specialties: 'Ventes, Visites' },
        { name: 'Assistant Location', specialties: 'Location, Gestion locative' }
      ],
      'generic': [
        { name: 'Agent Principal', specialties: 'Général' }
      ]
    };

    const templates = agentTemplates[industry] || agentTemplates['generic'];
    const now = new Date().toISOString();

    // Créer les agents
    const statements = [];
    for (const template of templates) {
      const agentId = generateId('agent');
      const email = `${template.name.toLowerCase().replace(/\s+/g, '.')}@${tenantId}.local`;

      statements.push(
        env.DB.prepare(`
          INSERT INTO commercial_agents (
            id, tenant_id, first_name, last_name, email, specialties, is_active, created_at
          ) VALUES (?, ?, ?, '', ?, ?, 1, ?)
        `).bind(agentId, tenantId, template.name, email, template.specialties, now)
      );

      // Disponibilités par défaut (Lun-Ven, 9h-18h)
      for (let day = 1; day <= 5; day++) {
        const slotId = generateId('slot');
        statements.push(
          env.DB.prepare(`
            INSERT INTO availability_slots (
              id, agent_id, day_of_week, start_time, end_time, is_available
            ) VALUES (?, ?, ?, '09:00', '18:00', 1)
          `).bind(slotId, agentId, day)
        );
      }
    }

    // Mettre à jour la progression
    statements.push(
      env.DB.prepare(`
        UPDATE onboarding_sessions
        SET current_step = 4, last_updated_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(now, now, sessionId)
    );

    await env.DB.batch(statements);

    console.log(`[Onboarding] ${templates.length} agents created for tenant ${tenantId}`);

    return {
      success: true,
      agents_created: templates.length,
      next_step: 4
    };
  } catch (error) {
    console.error('[Onboarding] Error generating agents:', error);
    return {
      success: false,
      error: 'Erreur lors de la génération des agents',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/session/:id/assistant
 * Étape 4 : Configuration de l'assistant vocal
 *
 * NOUVEAU : Écrit directement dans `omni_agent_configs` et `omni_phone_mappings`
 *           (pas de JSON temporaire, pas de sync)
 */
export async function saveAssistantConfig(request, env, sessionId, tenantId) {
  try {
    const {
      agent_type,
      agent_name,
      voice,
      enable_appointments,
      enable_products
    } = await request.json();

    // Validation
    if (!agent_type || !agent_name) {
      return {
        success: false,
        error: 'Type d\'agent et nom requis'
      };
    }

    // Mapper voice → voice_id ElevenLabs
    const voiceId = voice === 'male'
      ? 'onwK4e9ZLuTAKqWW03F9'  // Voix masculine
      : 'pNInz6obpgDQGcFmaJgB';  // Voix féminine

    // Récupérer le téléphone du tenant
    const tenant = await env.DB.prepare(`
      SELECT phone, company_name FROM tenants WHERE id = ?
    `).bind(tenantId).first();

    if (!tenant) {
      return { success: false, error: 'Tenant introuvable' };
    }

    const now = new Date().toISOString();
    const configId = generateId('agent');
    const mappingId = generateId('mapping');

    // Générer le greeting message
    const greeting = `Bonjour, je suis ${agent_name}, votre assistant${voice === 'female' ? 'e' : ''} virtuel${voice === 'female' ? 'le' : ''} chez ${tenant.company_name || 'notre entreprise'}. Comment puis-je vous aider ?`;

    // Transaction atomique
    const statements = [
      // 1. Créer/mettre à jour la config agent
      env.DB.prepare(`
        INSERT INTO omni_agent_configs (
          id, tenant_id, agent_type, agent_name,
          voice_provider, voice_id, voice_language,
          greeting_message,
          enable_appointments, enable_products,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'elevenlabs', ?, 'fr-FR', ?, ?, ?, ?, ?)
        ON CONFLICT(tenant_id) DO UPDATE SET
          agent_type = excluded.agent_type,
          agent_name = excluded.agent_name,
          voice_id = excluded.voice_id,
          greeting_message = excluded.greeting_message,
          enable_appointments = excluded.enable_appointments,
          enable_products = excluded.enable_products,
          updated_at = excluded.updated_at
      `).bind(
        configId, tenantId, agent_type, agent_name,
        voiceId, greeting,
        enable_appointments ? 1 : 0,
        enable_products ? 1 : 0,
        now, now
      )
    ];

    // 2. Créer le phone mapping si téléphone disponible
    if (tenant.phone) {
      statements.push(
        env.DB.prepare(`
          INSERT INTO omni_phone_mappings (
            id, phone_number, tenant_id, is_active, created_at, updated_at
          ) VALUES (?, ?, ?, 1, ?, ?)
          ON CONFLICT(phone_number) DO UPDATE SET
            tenant_id = excluded.tenant_id,
            updated_at = excluded.updated_at
        `).bind(mappingId, tenant.phone, tenantId, now, now)
      );
    }

    // 3. Mettre à jour la progression
    statements.push(
      env.DB.prepare(`
        UPDATE onboarding_sessions
        SET current_step = 5, last_updated_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(now, now, sessionId)
    );

    await env.DB.batch(statements);

    console.log(`[Onboarding] Assistant config saved for tenant ${tenantId}: ${agent_name} (${voice})`);

    return {
      success: true,
      message: 'Assistant configuré',
      config: {
        agent_name,
        agent_type,
        voice,
        phone_mapped: !!tenant.phone
      },
      next_step: 5
    };
  } catch (error) {
    console.error('[Onboarding] Error saving assistant config:', error);
    return {
      success: false,
      error: 'Erreur lors de la configuration de l\'assistant',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/session/:id/knowledge
 * Étape 5 : Initialisation de la base de connaissances
 *
 * INCHANGÉ : Écrit directement dans `knowledge_documents`
 */
export async function initializeKnowledgeBase(request, env, sessionId, tenantId) {
  try {
    const { documents } = await request.json();

    if (!documents || documents.length === 0) {
      // Optionnel : skip si pas de documents
      const now = new Date().toISOString();
      await env.DB.prepare(`
        UPDATE onboarding_sessions
        SET current_step = 6, last_updated_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(now, now, sessionId).run();

      return {
        success: true,
        message: 'Étape knowledge base ignorée',
        next_step: 6
      };
    }

    const now = new Date().toISOString();
    const statements = [];

    for (const doc of documents) {
      const docId = generateId('doc');
      statements.push(
        env.DB.prepare(`
          INSERT INTO knowledge_documents (
            id, tenant_id, title, source_type, source_url, content, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `).bind(
          docId, tenantId,
          doc.title, doc.source_type, doc.source_url || null,
          doc.content, now, now
        )
      );
    }

    // Mettre à jour la progression
    statements.push(
      env.DB.prepare(`
        UPDATE onboarding_sessions
        SET current_step = 6, last_updated_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(now, now, sessionId)
    );

    await env.DB.batch(statements);

    console.log(`[Onboarding] ${documents.length} KB documents created for tenant ${tenantId}`);

    return {
      success: true,
      documents_created: documents.length,
      next_step: 6
    };
  } catch (error) {
    console.error('[Onboarding] Error initializing KB:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'initialisation de la knowledge base',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/session/:id/complete
 * Étape 6 : Finalisation de l'onboarding
 *
 * NOUVEAU : Pas de sync, juste marquer comme complété
 */
export async function completeOnboarding(request, env, sessionId, tenantId) {
  try {
    const now = new Date().toISOString();

    // Calculer la durée
    const session = await env.DB.prepare(`
      SELECT started_at FROM onboarding_sessions WHERE id = ?
    `).bind(sessionId).first();

    const startTime = new Date(session.started_at);
    const endTime = new Date();
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    // Transaction atomique
    await env.DB.batch([
      // 1. Marquer le tenant comme onboardé
      env.DB.prepare(`
        UPDATE tenants
        SET onboarding_completed = 1, updated_at = ?
        WHERE id = ?
      `).bind(now, tenantId),

      // 2. Marquer la session comme complétée
      env.DB.prepare(`
        UPDATE onboarding_sessions
        SET status = 'completed',
            completed_at = ?,
            current_step = 6,
            updated_at = ?
        WHERE id = ?
      `).bind(now, now, sessionId)
    ]);

    // Analytics (optionnel, non bloquant)
    try {
      await env.DB.prepare(`
        INSERT INTO analytics_events (id, tenant_id, event_type, event_data, created_at)
        VALUES (?, ?, 'onboarding_completed', ?, ?)
      `).bind(
        generateId('event'),
        tenantId,
        JSON.stringify({ duration_seconds: durationSeconds }),
        now
      ).run();
    } catch (e) {
      console.error('[Onboarding] Analytics error (non-blocking):', e);
    }

    console.log(`[Onboarding] Completed for tenant ${tenantId} (${durationSeconds}s)`);

    return {
      success: true,
      message: 'Onboarding terminé avec succès ! 🎉',
      duration_seconds: durationSeconds,
      duration_minutes: Math.round(durationSeconds / 60)
    };
  } catch (error) {
    console.error('[Onboarding] Error completing onboarding:', error);
    return {
      success: false,
      error: 'Erreur lors de la finalisation',
      details: error.message
    };
  }
}

/**
 * GET /api/v1/onboarding/session/:id/status
 * Récupère le statut de la session
 */
export async function getOnboardingStatus(request, env, sessionId, tenantId) {
  try {
    const session = await env.DB.prepare(`
      SELECT * FROM onboarding_sessions WHERE id = ? AND tenant_id = ?
    `).bind(sessionId, tenantId).first();

    if (!session) {
      return {
        success: false,
        error: 'Session introuvable'
      };
    }

    return {
      success: true,
      session: {
        id: session.id,
        current_step: session.current_step,
        status: session.status,
        started_at: session.started_at,
        completed_at: session.completed_at
      }
    };
  } catch (error) {
    console.error('[Onboarding] Error getting status:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération du statut',
      details: error.message
    };
  }
}

/**
 * GET /api/v1/onboarding/agent-types
 * Liste les types d'agents disponibles
 */
export async function getAgentTypes(request, env) {
  try {
    // Types d'agents statiques (pas de DB)
    const agentTypes = [
      {
        id: 'real_estate_reception',
        name: 'Réception d\'appels immobiliers',
        description: 'Accueille les appels entrants, recherche des biens et prend des rendez-vous',
        tools: ['appointment_booking', 'property_search', 'crm_sync']
      },
      {
        id: 'appointment_booking',
        name: 'Prise de rendez-vous générique',
        description: 'Prend des rendez-vous pour tout type de service',
        tools: ['appointment_booking', 'calendar_sync']
      },
      {
        id: 'customer_support',
        name: 'Support client',
        description: 'Répond aux questions fréquentes et traite les demandes',
        tools: ['knowledge_base', 'ticket_creation']
      },
      {
        id: 'multi_purpose',
        name: 'Agent multi-usage',
        description: 'Agent polyvalent adaptable à différents besoins',
        tools: ['appointment_booking', 'knowledge_base', 'crm_sync']
      }
    ];

    return {
      success: true,
      agent_types: agentTypes
    };
  } catch (error) {
    console.error('[Onboarding] Error getting agent types:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération des types d\'agents',
      details: error.message
    };
  }
}

/**
 * Router principal pour les routes d'onboarding
 */
export async function handleOnboardingRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // POST /api/v1/onboarding/start
    if (path === '/api/v1/onboarding/start' && method === 'POST') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const tenantId = authResult.tenant.id;
      const userId = authResult.user.id;
      const result = await startOnboarding(request, env, tenantId, userId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 201 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/session/:id/business
    if (path.match(/^\/api\/v1\/onboarding\/session\/[^/]+\/business$/) && method === 'POST') {
      const sessionId = path.split('/')[5];
      const session = await env.DB.prepare(`SELECT tenant_id FROM onboarding_sessions WHERE id = ?`).bind(sessionId).first();
      if (!session) {
        return new Response(JSON.stringify({ success: false, error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const result = await saveBusinessInfo(request, env, sessionId, session.tenant_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/session/:id/agents/auto-generate
    if (path.match(/^\/api\/v1\/onboarding\/session\/[^/]+\/agents\/auto-generate$/) && method === 'POST') {
      const sessionId = path.split('/')[5];
      const session = await env.DB.prepare(`SELECT tenant_id FROM onboarding_sessions WHERE id = ?`).bind(sessionId).first();
      if (!session) {
        return new Response(JSON.stringify({ success: false, error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const result = await autoGenerateAgents(request, env, sessionId, session.tenant_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/session/:id/assistant
    if (path.match(/^\/api\/v1\/onboarding\/session\/[^/]+\/assistant$/) && method === 'POST') {
      const sessionId = path.split('/')[5];
      const session = await env.DB.prepare(`SELECT tenant_id FROM onboarding_sessions WHERE id = ?`).bind(sessionId).first();
      if (!session) {
        return new Response(JSON.stringify({ success: false, error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const result = await saveAssistantConfig(request, env, sessionId, session.tenant_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/session/:id/knowledge
    if (path.match(/^\/api\/v1\/onboarding\/session\/[^/]+\/knowledge$/) && method === 'POST') {
      const sessionId = path.split('/')[5];
      const session = await env.DB.prepare(`SELECT tenant_id FROM onboarding_sessions WHERE id = ?`).bind(sessionId).first();
      if (!session) {
        return new Response(JSON.stringify({ success: false, error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const result = await initializeKnowledgeBase(request, env, sessionId, session.tenant_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/session/:id/complete
    if (path.match(/^\/api\/v1\/onboarding\/session\/[^/]+\/complete$/) && method === 'POST') {
      const sessionId = path.split('/')[5];
      const session = await env.DB.prepare(`SELECT tenant_id FROM onboarding_sessions WHERE id = ?`).bind(sessionId).first();
      if (!session) {
        return new Response(JSON.stringify({ success: false, error: 'Session not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const result = await completeOnboarding(request, env, sessionId, session.tenant_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /api/v1/onboarding/session/:id/status
    if (path.match(/^\/api\/v1\/onboarding\/session\/[^/]+\/status$/) && method === 'GET') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const sessionId = path.split('/')[5];
      const tenantId = authResult.tenant.id;
      const result = await getOnboardingStatus(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /api/v1/onboarding/agent-types
    if (path === '/api/v1/onboarding/agent-types' && method === 'GET') {
      const result = await getAgentTypes(request, env);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ========================================
    // GET /api/v1/onboarding/checklist
    // Vérifie 6 étapes de setup en DB
    // ========================================
    if (path === '/api/v1/onboarding/checklist' && method === 'GET') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const tenantId = authResult.tenant.id;
      const tenant = authResult.tenant;

      try {
        // 1. Compte cree (toujours vrai si on est auth)
        const accountCreated = true;

        // 2. Profil entreprise complete (company_name + sector)
        const profileCompleted = !!(tenant.company_name && tenant.sector);

        // 3. Base de connaissances (au moins 1 document)
        let kbCount = 0;
        try {
          const kbResult = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM knowledge_documents WHERE tenant_id = ?'
          ).bind(tenantId).first();
          kbCount = kbResult?.count || 0;
        } catch (e) { /* table may not exist */ }

        // 4. Agent vocal configure (omni_agent_configs)
        let agentConfigured = false;
        try {
          const agentResult = await env.DB.prepare(
            'SELECT id FROM omni_agent_configs WHERE tenant_id = ? LIMIT 1'
          ).bind(tenantId).first();
          agentConfigured = !!agentResult;
        } catch (e) { /* table may not exist */ }

        // 5. Appel test effectue
        const testCallDone = tenant.test_call_done === 1;

        // 6. Integrations (au moins un canal active ou OAuth)
        let integrationsDone = false;
        try {
          const oauthResult = await env.DB.prepare(
            'SELECT id FROM oauth_tokens WHERE tenant_id = ? LIMIT 1'
          ).bind(tenantId).first();
          integrationsDone = !!oauthResult;
        } catch (e) { /* table may not exist */ }

        const steps = [
          { id: 'account', title: 'Compte cree', completed: accountCreated, href: null },
          { id: 'profile', title: 'Profil entreprise', completed: profileCompleted, href: '/dashboard/settings' },
          { id: 'knowledge', title: 'Base de connaissances', completed: kbCount >= 1, href: '/dashboard/knowledge' },
          { id: 'agent', title: 'Agent vocal configure', completed: agentConfigured, href: '/dashboard/sara' },
          { id: 'test_call', title: 'Appel test effectue', completed: testCallDone, href: '/dashboard/sara' },
          { id: 'integrations', title: 'Integrations connectees', completed: integrationsDone, href: '/dashboard/settings/integrations' }
        ];

        const completedCount = steps.filter(s => s.completed).length;
        const totalSteps = steps.length;
        const progressPercent = Math.round((completedCount / totalSteps) * 100);

        // Marquer setup_completed_at si 100%
        if (completedCount === totalSteps && !tenant.setup_completed_at) {
          await env.DB.prepare(
            'UPDATE tenants SET setup_completed_at = datetime(\'now\') WHERE id = ?'
          ).bind(tenantId).run();
        }

        return new Response(JSON.stringify({
          success: true,
          checklist: {
            steps,
            completed: completedCount,
            total: totalSteps,
            progress_percent: progressPercent,
            setup_completed: completedCount === totalSteps
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logger.error('Checklist error', { error: error.message });
        return new Response(JSON.stringify({ success: false, error: 'Erreur checklist' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route non trouvée
    return null;

  } catch (error) {
    logger.error('Error in handleOnboardingRoutes', { error: error.message, path });
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur serveur'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
