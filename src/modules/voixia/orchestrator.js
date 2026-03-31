// ═══════════════════════════════════════════════════════════════
// VoixIA Orchestrateur Omnicanal
// Cerveau unique qui repond sur tous les canaux (voice, sms, email, whatsapp)
// avec le meme contexte, le meme prompt et les memes outils CRM.
// ═══════════════════════════════════════════════════════════════

import { logger } from '../../utils/logger.js';
import { errorResponse, successResponse } from '../../utils/response.js';
import { requireVoixIAAuth } from './auth.js';
import { generateId, logAudit } from '../auth/helpers.js';
import { findOrCreateProspect } from '../prospects/dedup.js';

// ── Canaux supportes ──
const CANAUX = ['voice', 'sms', 'email', 'whatsapp'];

// ── Limites par canal ──
const CANAL_LIMITS = {
  sms: 160,
  whatsapp: 4096,
  email: 10000,
  voice: 0 // pas de generation texte pour voice
};

// ═══════════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/voixia/orchestrate
 * Point d'entree unique pour tous les canaux.
 * Body : { canal, from, to, content, tenant_id?, metadata? }
 * Auth : X-VoixIA-Key ou Bearer JWT
 */
export async function handleOrchestrateRoutes(request, env, path, method) {
  if (path === '/api/v1/voixia/orchestrate' && method === 'POST') {
    return handleOrchestrate(request, env);
  }
  return null;
}

async function handleOrchestrate(request, env) {
  const startTime = Date.now();

  // 1. Auth
  const auth = await requireVoixIAAuth(request, env);
  if (auth.error) return errorResponse(auth.error, auth.status);

  // 2. Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return errorResponse('Body JSON invalide', 400);
  }

  const { canal, from, to, content, metadata } = body;

  // 3. Validation
  if (!canal || !CANAUX.includes(canal)) {
    return errorResponse(`Canal invalide. Valeurs acceptees : ${CANAUX.join(', ')}`, 400);
  }
  if (!from) return errorResponse('Champ "from" requis', 400);
  if (!content && canal !== 'voice') return errorResponse('Champ "content" requis', 400);

  let tenantId = auth.tenant_id;
  let tenantConfig = null;

  try {
    // 4. Resolution tenant si pas deja connu (depuis phone/email)
    if (!tenantId || tenantId === 'system') {
      const resolved = await resolveTenant(env, canal, from, to);
      if (resolved) {
        tenantId = resolved.tenant_id;
      } else {
        return errorResponse('Impossible de resoudre le tenant depuis le numero/email', 404);
      }
    }

    // 5. Charger contexte complet
    const context = await loadContext(env, tenantId, from, canal);
    tenantConfig = context;

    // 6. Dedup prospect
    const prospectData = buildProspectData(canal, from, metadata);
    const { prospect } = await findOrCreateProspect(env, tenantId, prospectData);

    // 7. Dispatcher selon le canal
    let result;
    switch (canal) {
      case 'voice':
        result = await handleVoice(env, tenantId, from, content, context, prospect);
        break;
      case 'sms':
        result = await handleSMS(env, tenantId, from, content, context, prospect);
        break;
      case 'email':
        result = await handleEmail(env, tenantId, from, to, content, context, prospect, metadata);
        break;
      case 'whatsapp':
        result = await handleWhatsApp(env, tenantId, from, content, context, prospect);
        break;
    }

    // 8. Logger l'interaction
    const duration = Date.now() - startTime;
    await logInteraction(env, tenantId, canal, duration, true, from, content, result?.response, prospect?.id);

    // 9. Audit
    await logAudit(env, {
      tenant_id: tenantId,
      user_id: 'voixia-orchestrator',
      action: `voixia.orchestrate.${canal}`,
      resource_type: 'interaction',
      resource_id: prospect?.id,
      changes: { canal, from, duration_ms: duration }
    });

    return successResponse({
      canal,
      tenant_id: tenantId,
      prospect_id: prospect?.id,
      response: result?.response || null,
      sent: result?.sent || false,
      duration_ms: duration
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('VoixIA orchestrator error', { error: error.message, canal, from, tenantId });

    // Log echec
    await logInteraction(env, tenantId, canal, duration, false, from, content, null, null).catch(() => {});

    return errorResponse('Erreur interne de l\'orchestrateur', 500);
  }
}

// ═══════════════════════════════════════════════════════════════
// RESOLUTION TENANT
// ═══════════════════════════════════════════════════════════════

async function resolveTenant(env, canal, from, to) {
  if (canal === 'email') {
    return resolveEmail(env, to);
  }
  // sms, whatsapp, voice → resolution par numero
  return resolvePhone(env, to || from);
}

/**
 * Resoudre un numero de telephone vers un tenant
 * Reutilise la logique de handleResolvePhone
 */
async function resolvePhone(env, phone) {
  if (!phone) return null;
  const normalized = String(phone).replace(/^\+/, '');

  try {
    const mapping = await env.DB.prepare(`
      SELECT m.tenant_id, m.prompt_type, t.company_name
      FROM omni_phone_mappings m
      INNER JOIN tenants t ON m.tenant_id = t.id
      WHERE (m.phone_number = ? OR m.phone_number = ?)
        AND m.is_active = 1
      LIMIT 1
    `).bind(phone, normalized).first();

    return mapping ? { tenant_id: mapping.tenant_id, prompt_type: mapping.prompt_type } : null;
  } catch (error) {
    logger.error('resolvePhone error', { error: error.message, phone });
    return null;
  }
}

/**
 * Resoudre un email vers un tenant
 * Cherche dans les channels email configures
 */
async function resolveEmail(env, email) {
  if (!email) return null;

  try {
    // Chercher dans les canaux email configures pour ce tenant
    const channel = await env.DB.prepare(`
      SELECT c.tenant_id, t.company_name
      FROM channels c
      INNER JOIN tenants t ON c.tenant_id = t.id
      WHERE c.type = 'email' AND c.config LIKE ? AND c.is_active = 1
      LIMIT 1
    `).bind(`%${email}%`).first();

    if (channel) return { tenant_id: channel.tenant_id };

    // Fallback : chercher dans omni_phone_mappings (certains mappings sont par email)
    const mapping = await env.DB.prepare(`
      SELECT tenant_id FROM omni_phone_mappings
      WHERE phone_number = ? AND channel_type = 'email' AND is_active = 1
      LIMIT 1
    `).bind(email).first();

    return mapping ? { tenant_id: mapping.tenant_id } : null;
  } catch (error) {
    logger.error('resolveEmail error', { error: error.message, email });
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// CHARGEMENT CONTEXTE
// ═══════════════════════════════════════════════════════════════

async function loadContext(env, tenantId, contactId, canal) {
  const [history, config, prospect] = await Promise.all([
    loadHistory(env, tenantId, contactId),
    loadPromptConfig(env, tenantId),
    loadProspect(env, tenantId, contactId, canal)
  ]);

  return { history, ...config, prospect };
}

/**
 * Historique des interactions depuis ai_interaction_logs
 */
async function loadHistory(env, tenantId, contactId) {
  try {
    const rows = await env.DB.prepare(`
      SELECT canal, content_in, content_out, created_at
      FROM ai_interaction_logs
      WHERE tenant_id = ? AND contact_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `).bind(tenantId, contactId).all();

    return rows.results || [];
  } catch {
    // Table peut ne pas avoir toutes les colonnes — graceful
    return [];
  }
}

/**
 * Prompt actif depuis voixia_configs + ai_prompt_versions
 */
async function loadPromptConfig(env, tenantId) {
  try {
    const config = await env.DB.prepare(`
      SELECT vc.llm_provider, vc.llm_model, vc.voice_id,
             vc.active_prompt_id, vc.secteur,
             apv.system_prompt, apv.version as prompt_version
      FROM voixia_configs vc
      LEFT JOIN ai_prompt_versions apv ON vc.active_prompt_id = apv.id
      WHERE vc.tenant_id = ?
      LIMIT 1
    `).bind(tenantId).first();

    if (config?.system_prompt) {
      return {
        system_prompt: config.system_prompt,
        llm_provider: config.llm_provider,
        llm_model: config.llm_model,
        secteur: config.secteur,
        prompt_version: config.prompt_version
      };
    }

    // Fallback template sectoriel
    const secteur = config?.secteur || 'generaliste';
    const template = await env.DB.prepare(`
      SELECT system_prompt, llm_provider, llm_model
      FROM ai_sector_templates WHERE secteur = ? LIMIT 1
    `).bind(secteur).first();

    return {
      system_prompt: template?.system_prompt || getDefaultPrompt(),
      llm_provider: config?.llm_provider || template?.llm_provider || 'anthropic',
      llm_model: config?.llm_model || template?.llm_model || 'claude-haiku-4-5-20251001',
      secteur,
      prompt_version: null
    };
  } catch (error) {
    logger.error('loadPromptConfig error', { error: error.message, tenantId });
    return {
      system_prompt: getDefaultPrompt(),
      llm_provider: 'anthropic',
      llm_model: 'claude-haiku-4-5-20251001',
      secteur: 'generaliste',
      prompt_version: null
    };
  }
}

/**
 * Charger le prospect connu depuis la table prospects
 */
async function loadProspect(env, tenantId, contactId, canal) {
  try {
    const field = canal === 'email' ? 'email' : 'phone';
    const prospect = await env.DB.prepare(
      `SELECT id, first_name, last_name, email, phone, status, interaction_count
       FROM prospects WHERE tenant_id = ? AND ${field} = ? LIMIT 1`
    ).bind(tenantId, contactId).first();
    return prospect || null;
  } catch {
    return null;
  }
}

function getDefaultPrompt() {
  return `Tu es Sara, assistante commerciale IA de Coccinelle.ai. Tu es professionnelle, chaleureuse et efficace. Tu aides les clients en repondant a leurs questions et en les orientant vers les bons interlocuteurs. Reponds toujours en francais.`;
}

// ═══════════════════════════════════════════════════════════════
// GENERATION LLM (Anthropic Claude)
// ═══════════════════════════════════════════════════════════════

async function generateLLMResponse(env, systemPrompt, userMessage, canal, context) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.error('ANTHROPIC_API_KEY non configuree');
    return 'Desole, le service est temporairement indisponible.';
  }

  // Construire les messages avec historique
  const messages = [];

  // Ajouter l'historique recent pour le contexte
  if (context.history && context.history.length > 0) {
    for (const h of context.history.slice().reverse()) {
      if (h.content_in) messages.push({ role: 'user', content: h.content_in });
      if (h.content_out) messages.push({ role: 'assistant', content: h.content_out });
    }
  }

  // Contexte prospect
  let enrichedSystem = systemPrompt;
  if (context.prospect) {
    const p = context.prospect;
    enrichedSystem += `\n\nContexte du contact :\n- Nom : ${p.first_name || ''} ${p.last_name || ''}\n- Email : ${p.email || 'inconnu'}\n- Tel : ${p.phone || 'inconnu'}\n- Statut : ${p.status || 'nouveau'}\n- Interactions precedentes : ${p.interaction_count || 0}`;
  }

  // Instruction de format selon le canal
  const formatInstruction = getFormatInstruction(canal);
  enrichedSystem += `\n\n${formatInstruction}`;

  // Message utilisateur courant
  messages.push({ role: 'user', content: userMessage });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: canal === 'sms' ? 80 : 1024,
        system: enrichedSystem,
        messages
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      logger.error('Anthropic API error', { status: response.status, error: errText });
      return getFallbackResponse(canal);
    }

    const data = await response.json();
    let text = data.content?.[0]?.text || getFallbackResponse(canal);

    // Tronquer pour SMS si necessaire
    if (canal === 'sms' && text.length > CANAL_LIMITS.sms) {
      text = text.substring(0, CANAL_LIMITS.sms - 3) + '...';
    }

    return text;
  } catch (error) {
    logger.error('LLM generation error', { error: error.message });
    return getFallbackResponse(canal);
  }
}

function getFormatInstruction(canal) {
  switch (canal) {
    case 'sms':
      return 'IMPORTANT : Ta reponse doit faire maximum 160 caracteres (limite SMS). Sois ultra concise.';
    case 'email':
      return 'Reponds dans un format email professionnel avec salutation, corps et signature. Signe "Sara — Assistante IA".';
    case 'whatsapp':
      return 'Reponds de maniere naturelle et conversationnelle, comme sur une messagerie instantanee. Tu peux utiliser des paragraphes courts.';
    default:
      return '';
  }
}

function getFallbackResponse(canal) {
  if (canal === 'sms') return 'Bonjour, un conseiller vous recontacte bientot.';
  return 'Bonjour ! Je suis Sara, assistante IA. Comment puis-je vous aider ?';
}

// ═══════════════════════════════════════════════════════════════
// HANDLERS PAR CANAL
// ═══════════════════════════════════════════════════════════════

/**
 * Canal VOICE — Log + metriques uniquement
 * L'agent Python (Retell/Vapi) gere deja la conversation vocale.
 */
async function handleVoice(env, tenantId, from, content, context, prospect) {
  logger.info('VoixIA orchestrate voice', { tenantId, from });

  return {
    response: null,
    sent: false,
    message: 'Appel vocal logue — agent Python gere la conversation'
  };
}

/**
 * Canal SMS — Generer reponse LLM + envoyer via Twilio
 */
async function handleSMS(env, tenantId, from, content, context, prospect) {
  // Generer la reponse
  const response = await generateLLMResponse(env, context.system_prompt, content, 'sms', context);

  // Envoyer via Twilio
  const sent = await sendTwilioSMS(env, from, response);

  return { response, sent };
}

/**
 * Canal EMAIL — Generer reponse LLM + envoyer via Resend
 */
async function handleEmail(env, tenantId, from, to, content, context, prospect, metadata) {
  const response = await generateLLMResponse(env, context.system_prompt, content, 'email', context);

  const subject = metadata?.subject
    ? `Re: ${metadata.subject.replace(/^Re:\s*/i, '')}`
    : 'Reponse de Sara — Coccinelle.ai';

  const sent = await sendResendEmail(env, from, subject, response);

  return { response, sent };
}

/**
 * Canal WHATSAPP — Generer reponse LLM + envoyer via Meta API
 */
async function handleWhatsApp(env, tenantId, from, content, context, prospect) {
  const response = await generateLLMResponse(env, context.system_prompt, content, 'whatsapp', context);

  const sent = await sendWhatsApp(env, tenantId, from, response);

  return { response, sent };
}

// ═══════════════════════════════════════════════════════════════
// ENVOI MESSAGES (Twilio, Resend, Meta)
// ═══════════════════════════════════════════════════════════════

async function sendTwilioSMS(env, to, body) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const fromNumber = env.TWILIO_PHONE_NUMBER || '+33939035760';

  if (!accountSid || !authToken) {
    logger.error('Twilio credentials manquantes');
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', to);
    formData.append('Body', body);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      }
    );

    if (!response.ok) {
      const err = await response.text();
      logger.error('Twilio SMS error', { status: response.status, error: err });
      return false;
    }

    const data = await response.json();
    logger.info('SMS sent via orchestrator', { sid: data.sid, to });
    return true;
  } catch (error) {
    logger.error('sendTwilioSMS error', { error: error.message });
    return false;
  }
}

async function sendResendEmail(env, to, subject, htmlBody) {
  const apiKey = env.RESEND_API_KEY;
  const fromEmail = env.RESEND_FROM_EMAIL || 'sara@coccinelle.ai';

  if (!apiKey) {
    logger.error('RESEND_API_KEY manquante');
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Sara <${fromEmail}>`,
        to: [to],
        subject,
        html: formatEmailHTML(htmlBody)
      })
    });

    if (!response.ok) {
      const err = await response.text();
      logger.error('Resend email error', { status: response.status, error: err });
      return false;
    }

    const data = await response.json();
    logger.info('Email sent via orchestrator', { emailId: data.id, to });
    return true;
  } catch (error) {
    logger.error('sendResendEmail error', { error: error.message });
    return false;
  }
}

async function sendWhatsApp(env, tenantId, to, message) {
  const accessToken = env.META_WHATSAPP_ACCESS_TOKEN;

  if (!accessToken) {
    logger.error('META_WHATSAPP_ACCESS_TOKEN manquant');
    return false;
  }

  try {
    // Trouver le phoneNumberId du tenant
    const mapping = await env.DB.prepare(`
      SELECT meta_phone_number_id FROM omni_phone_mappings
      WHERE tenant_id = ? AND channel_type = 'whatsapp' AND is_active = 1
      LIMIT 1
    `).bind(tenantId).first();

    const phoneNumberId = mapping?.meta_phone_number_id || env.META_PHONE_NUMBER_ID;
    if (!phoneNumberId) {
      logger.error('Pas de phoneNumberId WhatsApp pour ce tenant', { tenantId });
      return false;
    }

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        })
      }
    );

    if (!response.ok) {
      const err = await response.text();
      logger.error('Meta WhatsApp error', { status: response.status, error: err });
      return false;
    }

    const data = await response.json();
    logger.info('WhatsApp sent via orchestrator', { messageId: data.messages?.[0]?.id, to });
    return true;
  } catch (error) {
    logger.error('sendWhatsApp error', { error: error.message });
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// LOGGING INTERACTIONS
// ═══════════════════════════════════════════════════════════════

async function logInteraction(env, tenantId, canal, durationMs, success, contactId, contentIn, contentOut, prospectId) {
  try {
    const id = generateId('int');
    await env.DB.prepare(`
      INSERT INTO ai_interaction_logs (id, tenant_id, canal, call_duration_seconds, success, contact_id, content_in, content_out, prospect_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      id,
      tenantId,
      canal,
      Math.round(durationMs / 1000 * 100) / 100,
      success ? 1 : 0,
      contactId || null,
      contentIn ? contentIn.substring(0, 500) : null,
      contentOut ? contentOut.substring(0, 500) : null,
      prospectId || null
    ).run();
  } catch (error) {
    // Non-bloquant — on ne casse pas la reponse pour un log
    logger.error('logInteraction error', { error: error.message });
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════

function buildProspectData(canal, from, metadata) {
  if (canal === 'email') {
    return {
      email: from,
      first_name: metadata?.sender_name || null,
      source: 'voixia_email'
    };
  }
  return {
    phone: from,
    first_name: metadata?.sender_name || null,
    source: `voixia_${canal}`
  };
}

function formatEmailHTML(text) {
  const paragraphs = text.split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      ${paragraphs}
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 20px 0;" />
      <p style="font-size: 12px; color: #888;">
        Ce message a ete envoye par Sara, assistante IA de Coccinelle.ai
      </p>
    </div>
  `.trim();
}
