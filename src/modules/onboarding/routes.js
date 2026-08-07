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
import { syncHorairesToSlots } from '../shared/horaires-slots.js';
import {
  buildSectorPrompt,
  isPromptCompliant,
  normalizeSector,
  DEFAULT_AGENT_NAME,
} from '../shared/sector-prompts.js';

/**
 * Journalise un événement d'onboarding (table onboarding_events, migration 0082).
 *
 * Ne JAMAIS laisser échouer l'onboarding à cause de la mesure : toute erreur d'écriture
 * est avalée et seulement loguée. C'est l'inverse du piège de juin, où l'étape mesurée
 * cassait le parcours.
 */
async function logOnboardingEvent(env, { tenantId, userId, step, stepIndex, event, errorMessage }) {
  if (!tenantId || !step || !event) return;
  try {
    const id = `onbe_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await env.DB.prepare(
      `INSERT INTO onboarding_events
         (id, tenant_id, user_id, step, step_index, event, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      id,
      tenantId,
      userId || null,
      step,
      Number.isInteger(stepIndex) ? stepIndex : null,
      event,
      errorMessage ? String(errorMessage).slice(0, 300) : null
    ).run();
  } catch (error) {
    logger.warn('logOnboardingEvent echec (non bloquant)', { error: error.message, step, event });
  }
}

/**
 * Checklist de démarrage — 5 étapes (Chantier CX 1, 28/07/2026).
 *
 * Remplace l'ancienne checklist 8 étapes qui référençait « Sara » (interdit,
 * règle i.14), lisait `oauth_tokens` (table inexistante) et `tenants.company_name`
 * (doublon interdit, la source unique est `tenants.name`).
 *
 * Chaque état est calculé DEPUIS LA DB — jamais de localStorage, jamais de flag
 * applicatif. En particulier `tenants.test_call_done` n'est PAS utilisé : la
 * colonne est lue à 3 endroits du code mais n'est écrite nulle part.
 *
 * Chaque lecture est isolée dans son propre try/catch : une table absente ne
 * doit pas faire tomber toute la checklist (leçon de la migration 0070).
 *
 * @returns {Promise<{steps: Array, completed: number, total: number,
 *                    progress_percent: number, setup_completed: boolean}>}
 */
async function computeStartupChecklist(env, tenantId, user) {
  // 1. Assistant configuré — a-t-il reçu un prénom ?
  // On NE peut PAS se baser sur voixia_configs ni ai_prompt_versions : le signup
  // les crée déjà (voice_id + prompt sectoriel par défaut), l'étape serait verte
  // dès J0. `omni_agent_configs.agent_name` n'est écrit que sur action utilisateur.
  let assistantDone = false;
  try {
    const row = await env.DB.prepare(
      `SELECT agent_name FROM omni_agent_configs WHERE tenant_id = ? LIMIT 1`
    ).bind(tenantId).first();
    assistantDone = !!(row?.agent_name && String(row.agent_name).trim() !== '');
  } catch (e) { /* table absente */ }

  // 2. Numéro vérifié — condition du « magic moment » QW8 : sans phone_verified,
  // le numéro d'essai partagé ne sait pas à quel tenant rattacher l'appelant.
  const phoneDone = (user?.phone_verified === 1 || user?.phone_verified === true);

  // 3. Informations métier — l'assistant a-t-il de quoi répondre ?
  // Trois sources possibles : documents importés, questions/réponses, prestations.
  let knowledgeDone = false;
  for (const sql of [
    `SELECT 1 FROM knowledge_documents WHERE tenant_id = ? AND is_active = 1 LIMIT 1`,
    `SELECT 1 FROM knowledge_faq WHERE tenant_id = ? AND is_active = 1 LIMIT 1`,
    `SELECT 1 FROM services WHERE tenant_id = ? AND is_active = 1 LIMIT 1`
  ]) {
    if (knowledgeDone) break;
    try {
      const row = await env.DB.prepare(sql).bind(tenantId).first();
      if (row) knowledgeDone = true;
    } catch (e) { /* table absente : on tente la suivante */ }
  }

  // 4. Premier appel — trace réelle en base, pas un flag déclaratif.
  let callDone = false;
  try {
    const row = await env.DB.prepare(
      `SELECT 1 FROM calls WHERE tenant_id = ? LIMIT 1`
    ).bind(tenantId).first();
    callDone = !!row;
  } catch (e) { /* table absente */ }

  // 5. Équipe — un 2e compte actif OU une invitation envoyée (même non acceptée :
  // le geste a été fait, on ne bloque pas l'utilisateur sur l'inaction d'un tiers).
  let teamDone = false;
  try {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM users WHERE tenant_id = ?`
    ).bind(tenantId).first();
    teamDone = (row?.n || 0) > 1;
  } catch (e) { /* table absente */ }
  if (!teamDone) {
    try {
      const row = await env.DB.prepare(
        `SELECT 1 FROM user_invitations WHERE tenant_id = ? LIMIT 1`
      ).bind(tenantId).first();
      teamDone = !!row;
    } catch (e) { /* table absente */ }
  }

  // Libellés : formulation « je », vocabulaire métier, zéro terme technique
  // (règle i.15 : pas de RAG / knowledge base / crawl / embedding dans l'UI).
  const steps = [
    {
      id: 'assistant',
      title: 'Configurer mon assistant',
      hint: 'Son prénom, sa voix, sa façon de répondre',
      completed: assistantDone,
      href: '/dashboard/agents/configuration'
    },
    {
      id: 'phone',
      title: 'Vérifier mon numéro de téléphone',
      hint: 'Indispensable pour que votre assistant décroche',
      completed: phoneDone,
      href: '/dashboard/settings'
    },
    {
      id: 'knowledge',
      title: 'Ajouter mes informations',
      hint: 'Horaires, tarifs, prestations — ce que votre assistant doit savoir',
      completed: knowledgeDone,
      href: '/dashboard/knowledge'
    },
    {
      id: 'call',
      title: 'Appeler mon assistant',
      hint: 'Le meilleur moyen de vérifier qu\'il répond bien',
      completed: callDone,
      href: '/dashboard/channels/numbers'
    },
    {
      id: 'team',
      title: 'Inviter mon équipe',
      hint: 'Vos collaborateurs reçoivent les demandes et les rendez-vous',
      completed: teamDone,
      href: '/dashboard/teams'
    }
  ];

  const completed = steps.filter((s) => s.completed).length;
  const total = steps.length;

  return {
    steps,
    completed,
    total,
    progress_percent: Math.round((completed / total) * 100),
    setup_completed: completed === total
  };
}

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

    // Les 6 routes /api/v1/onboarding/session/:id/* ont été supprimées le
    // 05/08/2026 (business, agents/auto-generate, assistant, knowledge,
    // complete, status), avec leurs 6 handlers.
    // Vestiges de l'onboarding 8 étapes : le tunnel actuel (4 étapes) passe
    // exclusivement par /onboarding/step, et le frontend ne les appelait plus.
    // 5 des 6 résolvaient le tenant à partir du seul sessionId de l'URL, SANS
    // requireAuth : qui devinait un id de session écrivait chez un autre tenant.
    // `saveAssistantConfig` insérait en plus tenants.phone dans
    // omni_phone_mappings — même mapping voix parasite que le bloc retiré de
    // `case 'complete'`, mais silencieux car il visait la bonne colonne.
    // Ne pas les réintroduire : /onboarding/step couvre le besoin, sous auth.

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
      const user = authResult.user;

      try {
        const checklist = await computeStartupChecklist(env, tenantId, user);

        // Masquage : uniquement possible une fois les 5 étapes terminées
        // (garde côté API sur POST /checklist/dismiss). Persisté en DB, jamais
        // en localStorage — l'ancien composant utilisait localStorage, ce qui
        // faisait réapparaître la checklist sur un autre appareil.
        let dismissed = false;
        try {
          const row = await env.DB.prepare(
            'SELECT checklist_dismissed_at FROM users WHERE id = ?'
          ).bind(user.id).first();
          dismissed = !!row?.checklist_dismissed_at;
        } catch (e) { /* colonne absente (migration 0083 non appliquée) */ }

        // Trace le moment où le tenant devient pleinement opérationnel.
        if (checklist.setup_completed && !tenant.setup_completed_at) {
          try {
            await env.DB.prepare(
              `UPDATE tenants SET setup_completed_at = datetime('now') WHERE id = ?`
            ).bind(tenantId).run();
          } catch (e) {
            logger.warn('setup_completed_at update echec (non bloquant)', { error: e.message });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          checklist: { ...checklist, dismissed }
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

    // ========================================
    // POST /api/v1/onboarding/checklist/dismiss
    // Masque définitivement la checklist de démarrage (une fois 5/5).
    // ========================================
    if (path === '/api/v1/onboarding/checklist/dismiss' && method === 'POST') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const checklist = await computeStartupChecklist(env, authResult.tenant.id, authResult.user);

        // On recalcule côté serveur : le client ne décide pas seul qu'il a fini.
        if (!checklist.setup_completed) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Checklist incomplete',
            completed: checklist.completed,
            total: checklist.total
          }), {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        await env.DB.prepare(
          `UPDATE users SET checklist_dismissed_at = datetime('now') WHERE id = ?`
        ).bind(authResult.user.id).run();

        return new Response(JSON.stringify({ success: true, dismissed: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logger.error('Checklist dismiss error', { error: error.message });
        return new Response(JSON.stringify({ success: false, error: 'Erreur masquage checklist' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ========================================
    // POST /api/v1/onboarding/send-verification
    // Envoie un code SMS de vérification
    // ========================================
    if (path === '/api/v1/onboarding/send-verification' && method === 'POST') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const body = await request.json();
        const phone = body.phone;

        // Valider format E.164
        if (!phone || !/^\+[1-9]\d{6,14}$/.test(phone)) {
          return new Response(JSON.stringify({ success: false, error: 'Format de numéro invalide (ex: +33612345678)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Générer code 6 chiffres
        const code = String(Math.floor(100000 + Math.random() * 900000));

        // Stocker dans users
        await env.DB.prepare(`
          UPDATE users SET
            phone = ?,
            phone_verification_code = ?,
            phone_verification_expires = datetime('now', '+10 minutes')
          WHERE id = ?
        `).bind(phone, code, authResult.user.id).run();

        // Envoyer SMS via Twilio
        const accountSid = env.TWILIO_ACCOUNT_SID;
        const authToken = env.TWILIO_AUTH_TOKEN;
        const from = env.TWILIO_PHONE_NUMBER || '+33939035760';

        if (accountSid && authToken) {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
          const formData = new URLSearchParams();
          formData.append('From', from);
          formData.append('To', phone);
          formData.append('Body', `Votre code Coccinelle.ai : ${code}`);

          const smsRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
          });

          if (!smsRes.ok) {
            logger.error('Twilio SMS error during verification', { status: smsRes.status });
          }
        } else {
          logger.warn('Twilio not configured, code stored but not sent', { code });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logger.error('Send verification error', { error: error.message });
        return new Response(JSON.stringify({ success: false, error: 'Erreur envoi code' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ========================================
    // POST /api/v1/onboarding/verify-phone
    // Vérifie le code SMS
    // ========================================
    if (path === '/api/v1/onboarding/verify-phone' && method === 'POST') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const body = await request.json();
        const code = body.code;

        if (!code || code.length !== 6) {
          return new Response(JSON.stringify({ success: false, error: 'Code invalide (6 chiffres)' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const user = await env.DB.prepare(`
          SELECT phone, phone_verification_code, phone_verification_expires
          FROM users WHERE id = ?
        `).bind(authResult.user.id).first();

        if (!user || !user.phone_verification_code) {
          return new Response(JSON.stringify({ success: false, error: 'Aucun code en attente' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Vérifier expiration
        if (user.phone_verification_expires && new Date(user.phone_verification_expires) < new Date()) {
          return new Response(JSON.stringify({ success: false, error: 'Code expiré, renvoyez un nouveau code' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Vérifier code
        if (user.phone_verification_code !== code) {
          return new Response(JSON.stringify({ success: false, error: 'Code incorrect' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // OK — marquer vérifié
        await env.DB.prepare(`
          UPDATE users SET
            phone_verified = 1,
            phone_verification_code = NULL,
            phone_verification_expires = NULL
          WHERE id = ?
        `).bind(authResult.user.id).run();

        return new Response(JSON.stringify({ success: true, phone: user.phone }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logger.error('Verify phone error', { error: error.message });
        return new Response(JSON.stringify({ success: false, error: 'Erreur vérification' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ========================================
    // POST /api/v1/onboarding/step
    // Sauvegarde une étape d'onboarding
    // ========================================
    // POST /api/v1/onboarding/event — Instrumentation par étape (QW3)
    // Étapes ATTEINTES ('entered') et volontairement passées ('skipped') : le backend ne
    // les voit pas via /step (une étape abandonnée n'émet jamais de save), d'où ce beacon.
    if (path === '/api/v1/onboarding/event' && method === 'POST') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const body = await request.json();
        const { step, event, step_index } = body;
        if (!step || !event) {
          return new Response(JSON.stringify({ success: false, error: 'step et event requis' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        await logOnboardingEvent(env, {
          tenantId: authResult.tenant.id,
          userId: authResult.user.id,
          step,
          stepIndex: step_index,
          event,
        });
      } catch (error) {
        // Jamais bloquant : l'instrumentation ne doit pas casser l'onboarding qu'elle mesure
        logger.warn('Onboarding event non enregistre', { error: error.message });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === '/api/v1/onboarding/step' && method === 'POST') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let body = null;
      try {
        body = await request.json();
        const { step, data } = body;
        const tenantId = authResult.tenant.id;
        const userId = authResult.user.id;

        if (!step) {
          return new Response(JSON.stringify({ success: false, error: 'step requis' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        switch (step) {
          case 'sector':
            if (data?.sector) {
              await env.DB.prepare(
                `UPDATE tenants SET sector = ?, updated_at = datetime('now') WHERE id = ?`
              ).bind(data.sector, tenantId).run();
            }
            break;

          case 'business':
            if (data) {
              const companyName = data.company_name || data.name || null;
              // Correction 3 : email_pro = email du compte JWT si non fourni
              const emailPro = data.email_pro || authResult.user.email || null;
              await env.DB.prepare(
                `UPDATE tenants SET
                  name = COALESCE(?, name),
                  company_name = COALESCE(?, company_name),
                  sector = COALESCE(?, sector),
                  phone = COALESCE(?, phone),
                  email_pro = COALESCE(?, email_pro),
                  horaires = COALESCE(?, horaires),
                  updated_at = datetime('now')
                WHERE id = ?`
              ).bind(
                companyName,
                companyName,
                data.sector || null,
                data.phone || null,
                emailPro,
                data.horaires ? (typeof data.horaires === 'string' ? data.horaires : JSON.stringify(data.horaires)) : null,
                tenantId
              ).run();

              // SSOT horaires : projeter les horaires société dans availability_slots
              // (agent société par défaut = maître lu par VoixIA/booking). Non bloquant.
              if (data.horaires) {
                await syncHorairesToSlots(env, tenantId, data.horaires);
              }
            }
            break;

          case 'assistant':
            if (data) {
              const tenantSector = normalizeSector(authResult.tenant.sector || data.secteur);
              const voiceId = data.voice_id || 'cgSgspJ2msm6clMCkdW9';

              // SOURCE UNIQUE : le prompt est GÉNÉRÉ ici (shared/sector-prompts.js).
              // Le frontend continue d'envoyer un `system_prompt` construit depuis
              // lib/prompts.ts — il est IGNORÉ tant qu'il n'est pas conforme, car
              // ces templates n'ont ni l'instruction search_knowledge (règle i.5)
              // ni les règles vocales (règle i.6). Un prompt déjà conforme est
              // respecté : c'est ce qui rendra le Lot B (frontend aligné) neutre.
              const agentName = String(data.agent_name || '').trim() || DEFAULT_AGENT_NAME;
              const companyName = authResult.tenant.name || '';
              const systemPrompt = isPromptCompliant(data.system_prompt)
                ? data.system_prompt
                : buildSectorPrompt({ secteur: tenantSector, agentName, companyName });

              // UPSERT voixia_configs — INSERT si nouveau tenant, UPDATE si existant (BUG #016 fix)
              try {
                await env.DB.prepare(
                  `INSERT INTO voixia_configs
                    (tenant_id, voice_id, llm_provider, llm_model, secteur, created_at, updated_at)
                   VALUES (?, ?, 'mistral', COALESCE(?, 'mistral-large-latest'), ?, datetime('now'), datetime('now'))
                   ON CONFLICT(tenant_id) DO UPDATE SET
                     voice_id = COALESCE(excluded.voice_id, voixia_configs.voice_id),
                     llm_model = COALESCE(excluded.llm_model, voixia_configs.llm_model),
                     secteur = excluded.secteur,
                     updated_at = datetime('now')`
                ).bind(tenantId, voiceId, data.llm_model || null, tenantSector).run();
              } catch (e) {
                logger.error('voixia_configs upsert error', { error: e.message, tenantId });
              }

              // Créer ou mettre à jour le prompt actif.
              //
              // ORDRE VOLONTAIRE : on INSÈRE d'abord, on désactive les autres ensuite.
              // L'ordre inverse (désactiver puis insérer) laissait le tenant avec ZÉRO
              // prompt actif quand l'INSERT échouait — 6 tenants en prod se sont
              // retrouvés dans cet état, dont la ligne réelle Coccinelle.ai.
              // Ici, un échec d'INSERT laisse simplement le prompt précédent en place.
              if (systemPrompt) {
                try {
                  // `id` est INTEGER PRIMARY KEY AUTOINCREMENT (CLAUDE.md § f) : on ne
                  // le fournit PAS et on récupère meta.last_row_id. La table n'a pas de
                  // colonne `updated_at` — ses colonnes de date sont created_at/activated_at.
                  const inserted = await env.DB.prepare(
                    `INSERT INTO ai_prompt_versions
                       (tenant_id, canal, secteur, version, system_prompt, is_active, created_at, activated_at)
                     VALUES (?, 'voice', ?,
                       (SELECT COALESCE(MAX(version), 0) + 1 FROM ai_prompt_versions WHERE tenant_id = ?),
                       ?, 1, datetime('now'), datetime('now'))`
                  ).bind(tenantId, tenantSector, tenantId, systemPrompt).run();

                  const promptId = inserted.meta?.last_row_id;
                  if (!promptId) throw new Error('INSERT sans last_row_id');

                  // Un SEUL is_active=1 par tenant (règle absolue CLAUDE.md § f).
                  await env.DB.prepare(
                    `UPDATE ai_prompt_versions SET is_active = 0 WHERE tenant_id = ? AND id != ?`
                  ).bind(tenantId, promptId).run();

                  // voixia_configs.active_prompt_id pointerait sinon vers le prompt du
                  // signup, périmé dès que l'utilisateur nomme son assistant.
                  await env.DB.prepare(
                    `UPDATE voixia_configs SET active_prompt_id = ?, updated_at = datetime('now') WHERE tenant_id = ?`
                  ).bind(promptId, tenantId).run();
                } catch (e) {
                  // Ce catch a masqué la panne pendant des mois : l'utilisateur nommait
                  // son assistant et l'agent continuait de s'annoncer « Coccinelle ».
                  logger.error('ai_prompt_versions create FAILED — prompt personnalisé non appliqué', {
                    error: e.message, tenantId, step: 'assistant'
                  });
                  await logOnboardingEvent(env, {
                    tenantId, userId, step: 'assistant', event: 'error', errorMessage: e.message
                  });
                }
              }
              // (l'ancienne branche « pas de prompt fourni → on ne met à jour que le
              //  secteur » a disparu : `systemPrompt` est désormais toujours renseigné,
              //  puisqu'il est généré et non plus reçu du frontend.)

              // Sauvegarder agent_name dans omni_agent_configs (BUG #018 fix)
              if (data.agent_name) {
                try {
                  await env.DB.prepare(`
                    INSERT INTO omni_agent_configs (id, tenant_id, agent_name, created_at, updated_at)
                    VALUES (?, ?, ?, datetime('now'), datetime('now'))
                    ON CONFLICT(tenant_id) DO UPDATE SET
                      agent_name = excluded.agent_name,
                      updated_at = datetime('now')
                  `).bind(generateId('agent'), tenantId, data.agent_name).run();
                } catch (e) {
                  console.error('[Onboarding] Error saving agent_name to omni_agent_configs:', e.message);
                }
              }
            }
            break;

          case 'channels':
            if (data?.channels && Array.isArray(data.channels)) {
              for (const channel of data.channels) {
                try {
                  await env.DB.prepare(
                    `INSERT OR REPLACE INTO tenant_channels (tenant_id, channel, is_active, created_at)
                     VALUES (?, ?, 1, datetime('now'))`
                  ).bind(tenantId, channel).run();
                } catch { /* table may not exist */ }
              }
            }
            break;

          case 'knowledge': {
            // Generation automatique de documents KB depuis les 3 champs essentiels
            const { adresse, services, tarifs, qa_items } = data || {};

            if (adresse && adresse.trim()) {
              await env.DB.prepare(`
                INSERT OR REPLACE INTO knowledge_documents (id, tenant_id, title, content, source_type, created_at, updated_at)
                VALUES (?, ?, 'Adresse et localisation', ?, 'onboarding', datetime('now'), datetime('now'))
              `).bind(
                `doc_adresse_${tenantId}`,
                tenantId,
                `Notre adresse est : ${adresse.trim()}. Nous sommes situes a ${adresse.trim()}.`
              ).run();

              // Chantier #1B : adresse structurée dans tenants.address (source unique + pré-remplit Paramètres)
              await env.DB.prepare(
                `UPDATE tenants SET address = ?, updated_at = datetime('now') WHERE id = ?`
              ).bind(adresse.trim(), tenantId).run();
            }

            if (services && services.trim()) {
              await env.DB.prepare(`
                INSERT OR REPLACE INTO knowledge_documents (id, tenant_id, title, content, source_type, created_at, updated_at)
                VALUES (?, ?, 'Nos services et prestations', ?, 'onboarding', datetime('now'), datetime('now'))
              `).bind(
                `doc_services_${tenantId}`,
                tenantId,
                `Nous proposons : ${services.trim()}.`
              ).run();
            }

            if (tarifs && tarifs.trim()) {
              await env.DB.prepare(`
                INSERT OR REPLACE INTO knowledge_documents (id, tenant_id, title, content, source_type, created_at, updated_at)
                VALUES (?, ?, 'Nos tarifs', ?, 'onboarding', datetime('now'), datetime('now'))
              `).bind(
                `doc_tarifs_${tenantId}`,
                tenantId,
                `Concernant nos tarifs : ${tarifs.trim()}.`
              ).run();
            }

            // Q&A supplementaires (max 3)
            if (qa_items && Array.isArray(qa_items)) {
              for (let i = 0; i < Math.min(qa_items.length, 3); i++) {
                const qa = qa_items[i];
                if (qa.question && qa.answer) {
                  await env.DB.prepare(`
                    INSERT OR REPLACE INTO knowledge_documents (id, tenant_id, title, content, source_type, created_at, updated_at)
                    VALUES (?, ?, ?, ?, 'onboarding', datetime('now'), datetime('now'))
                  `).bind(
                    `doc_qa_${i}_${tenantId}`,
                    tenantId,
                    qa.question.trim(),
                    qa.answer.trim()
                  ).run();
                }
              }
            }

            logger.info('Onboarding KB docs generated', { tenantId, hasAdresse: !!adresse, hasServices: !!services, hasTarifs: !!tarifs });
            break;
          }

          case 'complete': {
            // Correction 5 : onboarding terminé → Plan Pro trial 14 jours
            await env.DB.prepare(
              `UPDATE tenants SET
                onboarding_completed = 1,
                setup_completed_at = datetime('now'),
                subscription_plan = 'pro',
                trial_ends_at = datetime('now', '+14 days'),
                updated_at = datetime('now')
              WHERE id = ?`
            ).bind(tenantId).run();

            // PAS de phone mapping ici — supprimé le 05/08/2026, volontairement.
            //
            // Le code retiré insérait `tenants.phone` dans omni_phone_mappings. Or
            // `tenants.phone` est le numéro que l'utilisateur DÉCLARE à l'étape
            // Entreprise (son mobile perso), pas un numéro Twilio provisionné. Sans
            // channel_type ni is_active, les DEFAULT en faisaient un mapping VOIX ACTIF :
            //   - c'est exactement le « faux mapping » +33760762153 désactivé à la main
            //     le 07/07/2026 (bug B20) ;
            //   - `phone_number` est UNIQUE et l'ON CONFLICT réécrivait tenant_id : les
            //     5 tenants qui partagent ce numéro se seraient volé le mapping, le
            //     dernier à finir l'onboarding gagnant ;
            //   - c'est inutile depuis B20 : resolve-phone résout par le numéro APPELÉ
            //     (sip.trunkPhoneNumber), or personne n'appelle le mobile perso d'un
            //     client à travers notre trunk.
            // Le mapping légitime d'un vrai numéro provisionné est créé ailleurs :
            // channels/routes.js (attribution d'un numéro) et reseller/routes.js.
            // La colonne s'appelle `phone_number`, jamais `phone` : ne pas « réparer »
            // ce bloc en renommant la colonne, il ne doit pas exister.

            // Marquer la session comme terminée
            try {
              await env.DB.prepare(
                `UPDATE onboarding_sessions SET status = 'completed', completed_at = datetime('now') WHERE tenant_id = ? AND status = 'in_progress'`
              ).bind(tenantId).run();
            } catch { /* session may not exist */ }
            break;
          }

          default:
            return new Response(JSON.stringify({ success: false, error: `Étape inconnue: ${step}` }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // Mettre à jour la progression dans onboarding_sessions
        const stepMap = { business: 1, assistant: 2, knowledge: 3, complete: 4, sector: 1, verification: 1, channels: 3 };
        const stepNum = stepMap[step] || 0;
        try {
          await env.DB.prepare(
            `UPDATE onboarding_sessions SET current_step = ?, last_updated_at = datetime('now') WHERE tenant_id = ? AND status = 'in_progress'`
          ).bind(stepNum, tenantId).run();
        } catch { /* session may not exist */ }

        await logOnboardingEvent(env, { tenantId, userId, step, event: 'saved' });

        return new Response(JSON.stringify({ success: true, step }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logger.error('Onboarding step error', { error: error.message });
        // Une étape qui echoue est precisement ce qu'on cherche a mesurer (cf. les 500 de
        // juin qui ont gele le funnel 25 jours sans laisser de trace exploitable).
        await logOnboardingEvent(env, {
          tenantId: authResult.tenant?.id,
          userId: authResult.user?.id,
          step: body?.step,
          event: 'error',
          errorMessage: error.message,
        });
        return new Response(JSON.stringify({ success: false, error: 'Erreur sauvegarde étape' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ========================================
    // GET /api/v1/onboarding/state
    // Retourne l'état complet de l'onboarding
    // ========================================
    if (path === '/api/v1/onboarding/state' && method === 'GET') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const tenantId = authResult.tenant.id;
        const userId = authResult.user.id;

        // Requête unifiée tenant + user + session
        const tenant = await env.DB.prepare(
          `SELECT t.name, t.sector, t.phone AS tenant_phone, t.onboarding_completed,
                  t.setup_completed_at, t.company_name, t.email_pro, t.horaires
           FROM tenants t WHERE t.id = ?`
        ).bind(tenantId).first();

        const user = await env.DB.prepare(
          `SELECT phone, phone_verified FROM users WHERE id = ?`
        ).bind(userId).first();

        const session = await env.DB.prepare(
          `SELECT current_step, status, completed_at
           FROM onboarding_sessions
           WHERE tenant_id = ? AND status = 'in_progress'
           ORDER BY started_at DESC LIMIT 1`
        ).bind(tenantId).first();

        return new Response(JSON.stringify({
          success: true,
          tenant: {
            name: tenant?.name || '',
            sector: tenant?.sector || '',
            phone: tenant?.tenant_phone || '',
            email_pro: tenant?.email_pro || '',
            horaires: tenant?.horaires || '',
            onboarding_completed: tenant?.onboarding_completed || 0
          },
          user: {
            phone: user?.phone || '',
            phone_verified: user?.phone_verified || 0
          },
          session: {
            current_step: session?.current_step || 0,
            status: session?.status || 'not_started'
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        logger.error('Onboarding state error', { error: error.message });
        return new Response(JSON.stringify({ success: false, error: 'Erreur récupération état' }), {
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
