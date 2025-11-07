/**
 * =====================================================
 * COCCINELLE.AI - AUTOPILOT ONBOARDING ROUTES
 * Version : v2.8.0
 * Date : 24 octobre 2025
 * Description : Routes API pour le système d'onboarding automatisé
 * =====================================================
 */

/**
 * Génère un ID unique pour une session d'onboarding
 */
function generateOnboardingId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `onb_${timestamp}_${random}`;
}

/**
 * Génère un ID unique générique
 */
function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Calcule le pourcentage de progression
 */
function calculateProgress(currentStep, totalSteps) {
  return Math.round((currentStep / totalSteps) * 100);
}

/**
 * Génère des agents par défaut selon l'industrie
 */
async function generateDefaultAgents(env, tenantId, industry, companyName) {
  // Récupérer le template de l'industrie
  const template = await env.DB.prepare(`
    SELECT default_agents FROM onboarding_templates
    WHERE industry = ? AND is_active = 1
  `).bind(industry).first();

  if (!template) {
    // Fallback: agents génériques
    return [
      {
        id: generateId('agent'),
        name: 'Agent Principal',
        email: `agent@${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
        speciality: 'Général'
      }
    ];
  }

  const agentTemplates = JSON.parse(template.default_agents);
  const emailDomain = companyName.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  
  const agents = [];
  
  for (const agentTemplate of agentTemplates.slice(0, 2)) { // Max 2 agents par défaut
    const agentId = generateId('agent');
    const email = `${agentTemplate.email_suffix}@${emailDomain}.com`;
    
    // Créer l'agent dans la base
    await env.DB.prepare(`
      INSERT INTO agents (
        id, tenant_id, name, email, speciality, 
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `).bind(
      agentId,
      tenantId,
      agentTemplate.name,
      email,
      agentTemplate.speciality,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
    
    // Créer disponibilités par défaut (9h-18h, Lun-Ven)
    const days = [1, 2, 3, 4, 5]; // Lundi à Vendredi
    for (const day of days) {
      const slotId = generateId('slot');
      await env.DB.prepare(`
        INSERT INTO availability_slots (
          id, agent_id, day_of_week, start_time, end_time, is_available
        ) VALUES (?, ?, ?, '09:00', '18:00', 1)
      `).bind(slotId, agentId, day).run();
    }
    
    agents.push({
      id: agentId,
      name: agentTemplate.name,
      email: email,
      speciality: agentTemplate.speciality
    });
  }
  
  return agents;
}

/**
 * Génère le prompt VAPI personnalisé selon l'industrie
 */
async function generateVapiPrompt(env, industry, companyName) {
  const template = await env.DB.prepare(`
    SELECT vapi_system_prompt, vapi_first_message 
    FROM onboarding_templates
    WHERE industry = ? AND is_active = 1
  `).bind(industry).first();

  if (!template) {
    // Fallback générique
    return {
      systemPrompt: `Tu es Sara, assistante vocale pour ${companyName}. Tu aides les clients à prendre rendez-vous.`,
      firstMessage: `Bonjour, je suis Sara de ${companyName}. Comment puis-je vous aider ?`
    };
  }

  return {
    systemPrompt: template.vapi_system_prompt.replace('{COMPANY_NAME}', companyName),
    firstMessage: template.vapi_first_message.replace('{COMPANY_NAME}', companyName)
  };
}

/**
 * Initialise la Knowledge Base avec des documents par défaut
 */
async function initializeKnowledgeBase(env, tenantId, industry, companyName) {
  const template = await env.DB.prepare(`
    SELECT default_documents, default_faqs 
    FROM onboarding_templates
    WHERE industry = ? AND is_active = 1
  `).bind(industry).first();

  if (!template) {
    return { documentsCreated: 0, faqsCreated: 0 };
  }

  const documents = JSON.parse(template.default_documents);
  const faqs = JSON.parse(template.default_faqs);
  
  let documentsCreated = 0;
  let faqsCreated = 0;

  // Créer les documents
  for (const doc of documents) {
    const docId = generateId('doc');
    const contentHash = `hash_${Date.now()}_${Math.random()}`;
    
    await env.DB.prepare(`
      INSERT INTO knowledge_documents (
        id, tenant_id, title, content, source_type, source_url,
        content_hash, metadata, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'template', '', ?, '{}', 'pending', ?, ?)
    `).bind(
      docId,
      tenantId,
      doc.title,
      doc.content,
      contentHash,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
    
    documentsCreated++;
  }

  // Créer les FAQs dans knowledge_base (legacy table si elle existe)
  for (const faq of faqs) {
    const faqId = generateId('kb');
    
    try {
      await env.DB.prepare(`
        INSERT INTO knowledge_base (
          id, tenant_id, question, answer, category, created_at
        ) VALUES (?, ?, ?, ?, 'onboarding', ?)
      `).bind(
        faqId,
        tenantId,
        faq.question,
        faq.answer,
        new Date().toISOString()
      ).run();
      
      faqsCreated++;
    } catch (error) {
      console.log('FAQ insertion failed (table may not exist):', error.message);
    }
  }

  return { documentsCreated, faqsCreated };
}

/**
 * =====================================================
 * ROUTES ONBOARDING
 * =====================================================
 */

/**
 * POST /api/v1/onboarding/start
 * Démarre une nouvelle session d'onboarding
 */
export async function startOnboarding(request, env, tenantId, userId) {
  try {
    const sessionId = generateOnboardingId();
    const analyticsId = generateId('ona');
    const now = new Date().toISOString();

    // Récupérer IP et User-Agent
    const ipAddress = request.headers.get('cf-connecting-ip') || 
                     request.headers.get('x-forwarded-for') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Créer la session d'onboarding
    await env.DB.prepare(`
      INSERT INTO onboarding_sessions (
        id, tenant_id, user_id, current_step, total_steps,
        progress_percentage, status, source, started_at,
        last_updated_at, ip_address, user_agent, is_active
      ) VALUES (?, ?, ?, 1, 6, 0, 'in_progress', 'web', ?, ?, ?, ?, 1)
    `).bind(
      sessionId,
      tenantId,
      userId,
      now,
      now,
      ipAddress,
      userAgent
    ).run();

    // Créer l'entrée analytics
    await env.DB.prepare(`
      INSERT INTO onboarding_analytics (
        id, session_id, tenant_id, created_at
      ) VALUES (?, ?, ?, ?)
    `).bind(analyticsId, sessionId, tenantId, now).run();

    return {
      success: true,
      session: {
        id: sessionId,
        current_step: 1,
        total_steps: 6,
        progress: 0,
        status: 'in_progress',
        started_at: now
      }
    };

  } catch (error) {
    console.error('Error starting onboarding:', error);
    return {
      success: false,
      error: 'Erreur lors du démarrage de l\'onboarding',
      details: error.message
    };
  }
}

/**
 * PUT /api/v1/onboarding/:id/step
 * Met à jour une étape et avance la progression
 */
export async function updateOnboardingStep(request, env, sessionId, tenantId) {
  try {
    const body = await request.json();
    const { step, data, moveToNext = true } = body;

    if (!step || !data) {
      return {
        success: false,
        error: 'Paramètres manquants: step et data requis'
      };
    }

    // Vérifier que la session existe et appartient au tenant
    const session = await env.DB.prepare(`
      SELECT * FROM onboarding_sessions
      WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(sessionId, tenantId).first();

    if (!session) {
      return {
        success: false,
        error: 'Session d\'onboarding non trouvée'
      };
    }

    // Déterminer le champ JSON à mettre à jour
    let jsonField = '';
    
    switch (step) {
      case 1:
      case 2:
        jsonField = 'business_data';
        break;
      case 3:
        jsonField = 'agents_data';
        break;
      case 4:
        jsonField = 'vapi_data';
        break;
      case 5:
        jsonField = 'kb_data';
        break;
      case 6:
        jsonField = 'completion_data';
        break;
      default:
        return {
          success: false,
          error: 'Numéro d\'étape invalide'
        };
    }

    const now = new Date().toISOString();
    const newStep = moveToNext ? step + 1 : step;
    const progress = calculateProgress(newStep, 6);

    // Construire la requête SQL dynamiquement
    let sqlQuery = `
      UPDATE onboarding_sessions
      SET ${jsonField} = ?,
          current_step = ?,
          progress_percentage = ?,
          last_updated_at = ?
    `;
    
    const bindings = [JSON.stringify(data), Math.min(newStep, 6), progress, now];

    if (newStep > 6) {
      sqlQuery += `, status = 'completed', completed_at = ?`;
      bindings.push(now);
    }

    sqlQuery += ` WHERE id = ? AND tenant_id = ?`;
    bindings.push(sessionId, tenantId);

    await env.DB.prepare(sqlQuery).bind(...bindings).run();

    return {
      success: true,
      session: {
        id: sessionId,
        current_step: Math.min(newStep, 6),
        total_steps: 6,
        progress: progress,
        status: newStep > 6 ? 'completed' : 'in_progress'
      }
    };

  } catch (error) {
    console.error('Error updating onboarding step:', error);
    return {
      success: false,
      error: 'Erreur lors de la mise à jour de l\'étape',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/:id/agents/auto-generate
 * Génère automatiquement des agents selon l'industrie
 */
export async function autoGenerateAgents(request, env, sessionId, tenantId) {
  try {
    // Récupérer la session et les données business
    const session = await env.DB.prepare(`
      SELECT business_data FROM onboarding_sessions
      WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(sessionId, tenantId).first();

    if (!session || !session.business_data) {
      return {
        success: false,
        error: 'Données business manquantes. Complétez l\'étape 2 d\'abord.'
      };
    }

    const businessData = JSON.parse(session.business_data);
    const { industry, company_name } = businessData;

    if (!industry || !company_name) {
      return {
        success: false,
        error: 'Industrie et nom d\'entreprise requis'
      };
    }

    // Générer les agents
    const agents = await generateDefaultAgents(env, tenantId, industry, company_name);

    // Mettre à jour les analytics
    await env.DB.prepare(`
      UPDATE onboarding_analytics
      SET agents_auto_generated = 1,
          agents_created_count = ?
      WHERE session_id = ?
    `).bind(agents.length, sessionId).run();

    return {
      success: true,
      message: `${agents.length} agent(s) créé(s) avec succès`,
      agents: agents
    };

  } catch (error) {
    console.error('Error auto-generating agents:', error);
    return {
      success: false,
      error: 'Erreur lors de la génération automatique des agents',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/:id/vapi/auto-configure
 * Configure automatiquement l'assistant VAPI
 */
export async function autoConfigureVapi(request, env, sessionId, tenantId) {
  try {
    // Récupérer la session et les données
    const session = await env.DB.prepare(`
      SELECT business_data FROM onboarding_sessions
      WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(sessionId, tenantId).first();

    if (!session || !session.business_data) {
      return {
        success: false,
        error: 'Données business manquantes'
      };
    }

    const businessData = JSON.parse(session.business_data);
    const { industry, company_name, phone } = businessData;

    // Générer le prompt personnalisé
    const { systemPrompt, firstMessage } = await generateVapiPrompt(env, industry, company_name);

    // TODO: Intégration réelle avec l'API VAPI
    // Pour l'instant, simulation
    const mockAssistantId = `vapi_assistant_${Date.now()}`;
    const mockPhoneId = phone ? `vapi_phone_${Date.now()}` : null;

    // Mettre à jour le tenant avec les infos VAPI
    await env.DB.prepare(`
      UPDATE tenants
      SET vapi_assistant_id = ?,
          vapi_phone_number = ?,
          vapi_phone_id = ?,
          telephony_active = 1
      WHERE id = ?
    `).bind(
      mockAssistantId,
      phone || null,
      mockPhoneId,
      tenantId
    ).run();

    // Mettre à jour les analytics
    await env.DB.prepare(`
      UPDATE onboarding_analytics
      SET vapi_auto_configured = 1
      WHERE session_id = ?
    `).bind(sessionId).run();

    return {
      success: true,
      message: 'Assistant VAPI configuré avec succès',
      vapi: {
        assistant_id: mockAssistantId,
        phone_number: phone || null,
        phone_id: mockPhoneId,
        system_prompt: systemPrompt.substring(0, 100) + '...',
        first_message: firstMessage
      }
    };

  } catch (error) {
    console.error('Error auto-configuring VAPI:', error);
    return {
      success: false,
      error: 'Erreur lors de la configuration VAPI',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/:id/kb/initialize
 * Initialise la Knowledge Base avec du contenu par défaut
 */
export async function initializeKB(request, env, sessionId, tenantId) {
  try {
    const body = await request.json();
    const { crawlUrl = null } = body;

    // Récupérer les données business
    const session = await env.DB.prepare(`
      SELECT business_data FROM onboarding_sessions
      WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(sessionId, tenantId).first();

    if (!session || !session.business_data) {
      return {
        success: false,
        error: 'Données business manquantes'
      };
    }

    const businessData = JSON.parse(session.business_data);
    const { industry, company_name } = businessData;

    // Initialiser la KB avec les templates
    const { documentsCreated, faqsCreated } = await initializeKnowledgeBase(
      env, 
      tenantId, 
      industry, 
      company_name
    );

    // Si URL fournie, créer un job de crawl
    let crawlJobId = null;
    if (crawlUrl) {
      crawlJobId = generateId('crawl');
      await env.DB.prepare(`
        INSERT INTO knowledge_crawl_jobs (
          id, url, agent_id, status, max_pages,
          created_at
        ) VALUES (?, ?, 'system', 'pending', 50, ?)
      `).bind(
        crawlJobId,
        crawlUrl,
        new Date().toISOString()
      ).run();
    }

    // Mettre à jour les analytics
    await env.DB.prepare(`
      UPDATE onboarding_analytics
      SET kb_auto_initialized = 1,
          documents_created_count = ?,
          crawl_launched = ?
      WHERE session_id = ?
    `).bind(
      documentsCreated,
      crawlUrl ? 1 : 0,
      sessionId
    ).run();

    return {
      success: true,
      message: 'Knowledge Base initialisée avec succès',
      kb: {
        documents_created: documentsCreated,
        faqs_created: faqsCreated,
        crawl_job_id: crawlJobId,
        crawl_url: crawlUrl
      }
    };

  } catch (error) {
    console.error('Error initializing KB:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'initialisation de la KB',
      details: error.message
    };
  }
}

/**
 * GET /api/v1/onboarding/:id/status
 * Récupère le statut complet d'une session d'onboarding
 */
export async function getOnboardingStatus(request, env, sessionId, tenantId) {
  try {
    // Récupérer la session
    const session = await env.DB.prepare(`
      SELECT * FROM onboarding_sessions
      WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(sessionId, tenantId).first();

    if (!session) {
      return {
        success: false,
        error: 'Session d\'onboarding non trouvée'
      };
    }

    // Récupérer les analytics
    const analytics = await env.DB.prepare(`
      SELECT * FROM onboarding_analytics
      WHERE session_id = ?
    `).bind(sessionId).first();

    // Construire la réponse complète
    return {
      success: true,
      session: {
        id: session.id,
        current_step: session.current_step,
        total_steps: session.total_steps,
        progress: session.progress_percentage,
        status: session.status,
        started_at: session.started_at,
        last_updated_at: session.last_updated_at,
        completed_at: session.completed_at
      },
      data: {
        business: session.business_data ? JSON.parse(session.business_data) : null,
        agents: session.agents_data ? JSON.parse(session.agents_data) : null,
        vapi: session.vapi_data ? JSON.parse(session.vapi_data) : null,
        kb: session.kb_data ? JSON.parse(session.kb_data) : null,
        completion: session.completion_data ? JSON.parse(session.completion_data) : null
      },
      completed: {
        business_info: !!session.business_data,
        agents_created: !!session.agents_data && analytics?.agents_auto_generated,
        vapi_configured: !!session.vapi_data && analytics?.vapi_auto_configured,
        kb_initialized: !!session.kb_data && analytics?.kb_auto_initialized,
        onboarding_completed: session.status === 'completed'
      },
      analytics: analytics ? {
        agents_count: analytics.agents_created_count,
        documents_count: analytics.documents_created_count,
        crawl_launched: analytics.crawl_launched
      } : null
    };

  } catch (error) {
    console.error('Error getting onboarding status:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération du statut',
      details: error.message
    };
  }
}

/**
 * POST /api/v1/onboarding/:id/complete
 * Marque l'onboarding comme terminé
 */
export async function completeOnboarding(request, env, sessionId, tenantId) {
  try {
    const now = new Date().toISOString();

    // Calculer la durée totale
    const session = await env.DB.prepare(`
      SELECT started_at FROM onboarding_sessions
      WHERE id = ? AND tenant_id = ? AND is_active = 1
    `).bind(sessionId, tenantId).first();

    if (!session) {
      return {
        success: false,
        error: 'Session non trouvée'
      };
    }

    const startTime = new Date(session.started_at);
    const endTime = new Date(now);
    const durationSeconds = Math.floor((endTime - startTime) / 1000);

    // Mettre à jour la session
    await env.DB.prepare(`
      UPDATE onboarding_sessions
      SET status = 'completed',
          completed_at = ?,
          progress_percentage = 100,
          current_step = 6
      WHERE id = ? AND tenant_id = ?
    `).bind(now, sessionId, tenantId).run();

    // Mettre à jour les analytics
    await env.DB.prepare(`
      UPDATE onboarding_analytics
      SET completed = 1,
          total_duration_seconds = ?
      WHERE session_id = ?
    `).bind(durationSeconds, sessionId).run();

    return {
      success: true,
      message: 'Onboarding terminé avec succès ! 🎉',
      duration_seconds: durationSeconds,
      duration_minutes: Math.round(durationSeconds / 60)
    };

  } catch (error) {
    console.error('Error completing onboarding:', error);
    return {
      success: false,
      error: 'Erreur lors de la finalisation',
      details: error.message
    };
  }
}

/**
 * GET /api/v1/onboarding/templates
 * Liste les templates d'industrie disponibles
 */
export async function getOnboardingTemplates(request, env) {
  try {
    const templates = await env.DB.prepare(`
      SELECT id, industry, display_name, description, icon
      FROM onboarding_templates
      WHERE is_active = 1
      ORDER BY display_name ASC
    `).all();

    return {
      success: true,
      templates: templates.results
    };

  } catch (error) {
    console.error('Error getting templates:', error);
    return {
      success: false,
      error: 'Erreur lors de la récupération des templates',
      details: error.message
    };
  }
}

/**
 * ========================================================
 * ROUTER PRINCIPAL - GÈRE TOUTES LES ROUTES ONBOARDING
 * ========================================================
 */

/**
 * Handler principal pour toutes les routes Onboarding
 * Appelé depuis index.js
 */
export async function handleOnboardingRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // GET /api/v1/onboarding/templates
    if (path === '/api/v1/onboarding/templates' && method === 'GET') {
      const result = await getOnboardingTemplates(request, env);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/start
    if (path === '/api/v1/onboarding/start' && method === 'POST') {
      const body = await request.json();
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      const userId = request.headers.get('x-user-id') || 'anonymous';
      
      const result = await startOnboarding(request, env, tenantId, userId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 201 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /api/v1/onboarding/:id/step
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/step$/) && method === 'PUT') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await updateOnboardingStep(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/:id/agents/auto-generate
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/agents\/auto-generate$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await autoGenerateAgents(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/:id/vapi/auto-configure
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/vapi\/auto-configure$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await autoConfigureVapi(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/:id/kb/initialize
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/kb\/initialize$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await initializeKB(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /api/v1/onboarding/:id/status
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/status$/) && method === 'GET') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await getOnboardingStatus(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/:id/complete
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/complete$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await completeOnboarding(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Aucune route Onboarding ne correspond
    return null;

  } catch (error) {
    console.error('Error in handleOnboardingRoutes:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
