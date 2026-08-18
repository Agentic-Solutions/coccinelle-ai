// Module Twilio ConversationRelay - Routes
// Migration VAPI → Twilio pour meilleure latence et qualité voix FR
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { requireAuth } from '../auth/helpers.js';
import { handleConversationWebSocket } from './websocket.js';
import { TwilioSignatureValidator } from './validator.js';
import {
  signatureTwilioValide, intercepterRefus, resoudreTenantParNumeroAppele, twimlVide,
} from '../shared/sms-entrant.js';

export async function handleTwilioRoutes(request, env, path, method) {
  try {
    // ============ WEBHOOKS (no auth - called by Twilio servers) ============

    // POST /webhooks/twilio/voice - Webhook initial pour appel entrant (TwiML)
    if (path === '/webhooks/twilio/voice' && method === 'POST') {
      return await handleIncomingCall(request, env);
    }

    // POST /webhooks/twilio/gather - Traitement de la réponse vocale (Gather)
    if (path.startsWith('/webhooks/twilio/gather') && method === 'POST') {
      return await handleGatherResponse(request, env);
    }

    // POST /webhooks/twilio/status - Callback de statut d'appel
    if (path === '/webhooks/twilio/status' && method === 'POST') {
      return await handleCallStatus(request, env);
    }

    // GET /webhooks/twilio/conversation - WebSocket upgrade pour ConversationRelay
    if (path === '/webhooks/twilio/conversation') {
      return await handleConversationWebSocket(request, env);
    }

    // POST /webhooks/twilio/sms - Webhook pour SMS entrants depuis Twilio
    if (path === '/webhooks/twilio/sms' && method === 'POST') {
      return await handleIncomingSMS(request, env);
    }

    // ============ API ROUTES (require JWT auth) ============

    // Authenticate all /api/v1/ routes
    let authResult = null;
    if (path.startsWith('/api/v1/')) {
      authResult = await requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status);
      }
    }

    const tenantId = authResult?.tenant?.id;

    // GET /api/v1/twilio/calls - Liste des appels
    if (path === '/api/v1/twilio/calls' && method === 'GET') {
      return await handleListCalls(request, env, tenantId);
    }

    // GET /api/v1/twilio/stats - Statistiques
    if (path === '/api/v1/twilio/stats' && method === 'GET') {
      return await handleStats(env, tenantId);
    }

    // ⛔ ============ QUATRE ROUTES SMS SUPPRIMEES (17/08/2026) ============
    //
    // `POST /api/v1/sms/send` (+ alias /twilio/ et /channels/), et
    // `/sms/confirmation`, `/sms/reminder`, `/sms/cancel`.
    //
    // Les quatre prenaient `{to, …}` DANS LE CORPS de la requete et n'en verifiaient
    // que la presence : aucun rapprochement avec les contacts du tenant, aucune
    // permission RBAC. N'importe quel utilisateur authentifie d'un tenant — ou un robot
    // ayant pris son compte — pouvait envoyer a un numero quelconque.
    //
    // `/sms/send` acceptait EN PLUS un `message` libre : c'etait le seul chemin du
    // produit capable de porter du vrai demarchage. Un chemin a contenu libre finit
    // toujours par servir a autre chose que ce pour quoi il a ete ecrit.
    //
    // Les trois autres (`confirmation`, `reminder`, `cancel`) n'avaient AUCUN appelant
    // frontend, et le produit envoie deja ces messages par ses chemins legitimes :
    // `public/booking.js` pour la confirmation, `cron/reminders.js` pour le rappel.
    //
    // La garde de destinataire posee dans `shared/sms-envoi.js` rendrait ces routes
    // inoffensives, mais une route qui ne peut plus rien faire n'a pas de raison
    // d'exister — et la garder inviterait a la « reparer » un jour.
    //
    // Envoi manuel par gabarit nomme : au backlog, s'il revient d'un vrai client.

    // GET /api/v1/sms/history | /api/v1/twilio/sms/history — CONSERVEE (lecture seule)
    if ((path === '/api/v1/sms/history' || path === '/api/v1/twilio/sms/history') && method === 'GET') {
      return await handleSMSHistory(env, tenantId);
    }

    return null;

  } catch (error) {
    logger.error('Twilio route error', { error: error.message, path });
    // Webhook routes must return TwiML, not JSON
    if (path && path.startsWith('/webhooks/twilio/')) {
      return new Response(generateErrorTwiML('Erreur technique, veuillez rappeler'), {
        headers: { 'Content-Type': 'application/xml' }
      });
    }
    return errorResponse(error.message);
  }
}

// Webhook pour appel entrant - retourne TwiML avec ConversationRelay
async function handleIncomingCall(request, env) {
  try {
    // Parse form data safely - Twilio sends application/x-www-form-urlencoded
    let formData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      logger.error('Failed to parse incoming call form data', { error: parseError.message });
      return new Response(generateErrorTwiML('Erreur technique, veuillez rappeler'), {
        headers: { 'Content-Type': 'application/xml' }
      });
    }

    const callSid = formData.get('CallSid') || null;
    const from = formData.get('From') || null;
    const to = formData.get('To') || null;
    const forwardedFrom = formData.get('ForwardedFrom') || null; // Numéro original si renvoi d'appel

    logger.info('Incoming call received', { callSid, from, to, forwardedFrom });

    // Récupérer la config du tenant basée sur le numéro appelé
    // Si ForwardedFrom existe, c'est que l'appel a été renvoyé depuis le numéro pro du client
    const phoneToIdentify = forwardedFrom || to;

    if (!phoneToIdentify) {
      logger.warn('No phone number to identify tenant', { to, forwardedFrom });
      return new Response(generateErrorTwiML('Numéro non identifié'), {
        headers: { 'Content-Type': 'application/xml' }
      });
    }

    const tenantConfig = await getTenantByPhoneNumber(env, phoneToIdentify);

    if (!tenantConfig) {
      logger.warn('No tenant found for number', { to, forwardedFrom, phoneToIdentify });
      return new Response(generateErrorTwiML('Numéro non configuré'), {
        headers: { 'Content-Type': 'application/xml' }
      });
    }

    // Enregistrer l'appel en DB
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    try {
      await env.DB.prepare(`
        INSERT INTO calls (id, tenant_id, twilio_call_sid, from_number, to_number, direction, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(callId, tenantConfig.tenant_id, callSid || '', from || '', to || '', 'inbound', 'ringing', now).run();
    } catch (dbError) {
      logger.error('Failed to save call', { error: dbError.message });
    }

    // Construire l'URL WebSocket pour ConversationRelay
    // IMPORTANT : Utiliser &amp; pour encoder le & dans le XML
    const wsUrl = `wss://${new URL(request.url).host}/webhooks/twilio/conversation?callId=${callId}&amp;tenantId=${tenantConfig.tenant_id}`;

    // Générer TwiML avec ConversationRelay
    const twiml = generateConversationRelayTwiML(wsUrl, tenantConfig);

    logger.info('Returning TwiML with ConversationRelay', { callId, wsUrl });

    return new Response(twiml, {
      headers: { 'Content-Type': 'application/xml' }
    });

  } catch (error) {
    logger.error('handleIncomingCall unexpected error', { error: error.message, stack: error.stack });
    return new Response(generateErrorTwiML('Erreur technique, veuillez rappeler'), {
      headers: { 'Content-Type': 'application/xml' }
    });
  }
}

// Générer le TwiML avec ConversationRelay (IA conversationnelle en temps réel)
function generateConversationRelayTwiML(wsUrl, tenantConfig) {
  const welcomeMessage = tenantConfig.welcome_message ||
    'Bonjour, bienvenue chez Coccinelle. Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?';

  // Configuration TTS (synthèse vocale)
  const ttsProvider = tenantConfig.ttsProvider || 'amazon'; // amazon | elevenlabs | google
  const ttsVoice = tenantConfig.ttsVoice || 'Lea-Neural';
  const ttsVoiceId = tenantConfig.ttsVoiceId; // Pour ElevenLabs

  // Configuration STT (transcription)
  const transcriptionProvider = tenantConfig.transcriptionProvider || 'Deepgram';
  const transcriptionLanguage = tenantConfig.transcriptionLanguage || 'fr-FR';
  const speechModel = tenantConfig.speechModel || 'nova-2-conversationalai';

  // Déterminer quel attribut voice utiliser selon le provider
  const voiceAttr = ttsProvider === 'elevenlabs' && ttsVoiceId
    ? ttsVoiceId  // Voice ID ElevenLabs (ex: "a5n9pJUnAhX4fn7lx3uo")
    : ttsVoice;   // Nom de voix Amazon/Google (ex: "Lea-Neural")

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <ConversationRelay
      url="${wsUrl}"
      voice="${voiceAttr}"
      ttsProvider="${ttsProvider}"
      transcriptionLanguage="${transcriptionLanguage}"
      transcriptionProvider="${transcriptionProvider}"
      speechModel="${speechModel}"
      dtmfDetection="true"
      interruptible="speech"
      interruptSensitivity="high"
      welcomeGreeting="${escapeXml(welcomeMessage)}"
      welcomeGreetingInterruptible="speech"
      preemptible="true">
      <Language code="${transcriptionLanguage}" ttsProvider="${ttsProvider}" voice="${voiceAttr}" transcriptionProvider="${transcriptionProvider}" />
    </ConversationRelay>
  </Connect>
</Response>`;
}

// TwiML d'erreur
function generateErrorTwiML(message) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR" voice="Polly.Lea-Neural">${escapeXml(message)}. Au revoir.</Say>
  <Hangup/>
</Response>`;
}

// Traiter la réponse vocale de l'utilisateur (Gather)
async function handleGatherResponse(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch (parseError) {
    logger.error('Failed to parse gather form data', { error: parseError.message });
    return new Response(generateErrorTwiML('Erreur technique, veuillez rappeler'), {
      headers: { 'Content-Type': 'application/xml' }
    });
  }

  const speechResult = formData.get('SpeechResult') || '';
  const callSid = formData.get('CallSid') || null;
  const confidence = formData.get('Confidence') || null;

  logger.info('Speech received', { callSid, speechResult, confidence });

  // Extraire les paramètres de l'URL
  const url = new URL(request.url);
  const callId = url.searchParams.get('callId') || `call_${Date.now()}`;
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';

  if (!speechResult || speechResult.trim() === '') {
    // Pas de réponse, redemander
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Lea-Neural" language="fr-FR">Je n'ai pas compris. Pouvez-vous répéter ?</Say>
  <Gather input="speech" language="fr-FR" speechTimeout="auto" action="${url.href}" method="POST">
    <Say voice="Polly.Lea-Neural" language="fr-FR">Je vous écoute.</Say>
  </Gather>
  <Say voice="Polly.Lea-Neural" language="fr-FR">Au revoir.</Say>
</Response>`, { headers: { 'Content-Type': 'application/xml' } });
  }

  // Générer une réponse avec Claude
  try {
    const aiResponse = await generateAIResponse(speechResult, tenantId, env);

    // Continuer la conversation
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Lea-Neural" language="fr-FR">${escapeXml(aiResponse)}</Say>
  <Gather input="speech" language="fr-FR" speechTimeout="auto" action="${url.href}" method="POST">
    <Say voice="Polly.Lea-Neural" language="fr-FR">Avez-vous une autre question ?</Say>
  </Gather>
  <Say voice="Polly.Lea-Neural" language="fr-FR">Merci de votre appel. Au revoir !</Say>
</Response>`, { headers: { 'Content-Type': 'application/xml' } });

  } catch (error) {
    logger.error('AI response error', { error: error.message });
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Lea-Neural" language="fr-FR">Je suis désolée, j'ai rencontré un problème technique. Veuillez réessayer plus tard.</Say>
  <Hangup/>
</Response>`, { headers: { 'Content-Type': 'application/xml' } });
  }
}

// Générer une réponse IA avec Claude
async function generateAIResponse(userMessage, tenantId, env) {
  const apiKey = env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY;

  if (!apiKey) {
    return "Je suis désolée, le service est temporairement indisponible.";
  }

  const systemPrompt = `Tu es Sara, une assistante vocale IA professionnelle et chaleureuse pour Coccinelle.
Tu réponds en français, de manière naturelle et concise (2-3 phrases max).
Tu es empathique, patiente et tu t'assures de bien comprendre les besoins de l'appelant.
Si tu ne connais pas la réponse, propose de transférer à un conseiller.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || "Je n'ai pas compris, pouvez-vous reformuler ?";
}

// Callback de statut d'appel
async function handleCallStatus(request, env) {
  let formData;
  try {
    formData = await request.formData();
  } catch (parseError) {
    logger.error('Failed to parse call status form data', { error: parseError.message });
    return successResponse({ received: true });
  }

  const callSid = formData.get('CallSid') || null;
  const callStatus = formData.get('CallStatus') || 'unknown';
  const callDuration = formData.get('CallDuration') || '0';

  logger.info('Call status update', { callSid, callStatus, callDuration });

  // Mettre à jour le statut en DB
  const statusMap = {
    'queued': 'queued',
    'ringing': 'ringing',
    'in-progress': 'in_progress',
    'completed': 'completed',
    'busy': 'busy',
    'failed': 'failed',
    'no-answer': 'no_answer',
    'canceled': 'canceled'
  };

  if (callSid) {
    try {
      await env.DB.prepare(`
        UPDATE calls
        SET status = ?, duration = ?, updated_at = datetime('now')
        WHERE twilio_call_sid = ?
      `).bind(statusMap[callStatus] || callStatus, parseInt(callDuration) || 0, callSid).run();
    } catch (dbError) {
      logger.error('Failed to update call status', { error: dbError.message });
    }
  } else {
    logger.warn('Call status update received without CallSid');
  }

  return successResponse({ received: true });
}

// Liste des appels
async function handleListCalls(request, env, tenantId) {
  const url = new URL(request.url);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);

  const result = await env.DB.prepare(`
    SELECT id, twilio_call_sid, from_number, to_number, direction, status, duration, created_at
    FROM calls
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(tenantId, limit).all();

  return successResponse({
    calls: result.results,
    count: result.results.length
  });
}

// Statistiques des appels
async function handleStats(env, tenantId) {

  const [totalCalls, completedCalls, avgDuration] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as count FROM calls WHERE tenant_id = ?`).bind(tenantId).first(),
    env.DB.prepare(`SELECT COUNT(*) as count FROM calls WHERE tenant_id = ? AND status = 'completed'`).bind(tenantId).first(),
    env.DB.prepare(`SELECT AVG(duration) as avg FROM calls WHERE tenant_id = ? AND duration > 0`).bind(tenantId).first()
  ]);

  return successResponse({
    totalCalls: totalCalls?.count || 0,
    completedCalls: completedCalls?.count || 0,
    averageDuration: Math.round(avgDuration?.avg || 0),
    successRate: totalCalls?.count > 0
      ? ((completedCalls?.count / totalCalls?.count) * 100).toFixed(2)
      : 0
  });
}

// Récupérer la config tenant par numéro de téléphone
async function getTenantByPhoneNumber(env, phoneNumber) {
  if (!phoneNumber) {
    logger.warn('getTenantByPhoneNumber called with null/undefined phoneNumber');
    return null;
  }

  // Normaliser le numéro (enlever le +)
  const normalizedNumber = String(phoneNumber).replace(/^\+/, '');

  // Essayer d'abord avec la nouvelle table channel_configurations
  // Cherche dans le JSON config_public le champ phoneNumber qui correspond au numéro du client
  const configResult = await env.DB.prepare(`
    SELECT
      t.id as tenant_id,
      t.company_name,
      cc.config_public,
      a.id as agent_id,
      (a.first_name || ' ' || a.last_name) as agent_name
    FROM tenants t
    INNER JOIN channel_configurations cc ON t.id = cc.tenant_id AND cc.channel_type = 'phone'
    LEFT JOIN commercial_agents a ON t.id = a.tenant_id AND a.is_active = 1
    WHERE cc.enabled = 1
      AND (
        JSON_EXTRACT(cc.config_public, '$.phoneNumber') = ?
        OR JSON_EXTRACT(cc.config_public, '$.phoneNumber') = ?
      )
    LIMIT 1
  `).bind(phoneNumber, normalizedNumber).first();

  if (configResult && configResult.config_public) {
    const config = JSON.parse(configResult.config_public);
    const saraConfig = config.sara || {};

    return {
      tenant_id: configResult.tenant_id,
      company_name: configResult.company_name,
      agent_id: configResult.agent_id,
      agent_name: configResult.agent_name,
      // Configuration vocale
      ttsProvider: saraConfig.ttsProvider || 'amazon',
      ttsVoice: saraConfig.ttsVoice || 'Lea-Neural',
      ttsVoiceId: saraConfig.ttsVoiceId || null,
      transcriptionProvider: saraConfig.transcriptionProvider || 'Deepgram',
      transcriptionLanguage: saraConfig.transcriptionLanguage || 'fr-FR',
      speechModel: saraConfig.speechModel || 'nova-2-conversationalai',
      // Message de bienvenue
      welcome_message: saraConfig.welcomeMessage || 'Bonjour, bienvenue chez Coccinelle. Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?',
      // Autre config
      language: saraConfig.language || 'fr-FR',
      transfer_number: config.transferNumber || null
    };
  }

  // Fallback : essayer l'ancienne table tenant_channels (rétrocompatibilité)
  const legacyResult = await env.DB.prepare(`
    SELECT
      t.id as tenant_id,
      t.company_name,
      tc.voice_id,
      tc.language,
      tc.welcome_message,
      tc.transfer_number,
      a.id as agent_id,
      (a.first_name || ' ' || a.last_name) as agent_name
    FROM tenants t
    LEFT JOIN tenant_channels tc ON t.id = tc.tenant_id AND tc.channel_type = 'phone'
    LEFT JOIN commercial_agents a ON t.id = a.tenant_id AND a.is_active = 1
    WHERE tc.phone_number = ? OR tc.phone_number = ?
    LIMIT 1
  `).bind(phoneNumber, normalizedNumber).first();

  if (legacyResult) {
    return {
      ...legacyResult,
      // Valeurs par défaut pour les nouveaux paramètres
      ttsProvider: 'amazon',
      ttsVoice: 'Lea-Neural',
      ttsVoiceId: null,
      transcriptionProvider: 'Deepgram',
      transcriptionLanguage: legacyResult.language || 'fr-FR',
      speechModel: 'nova-2-conversationalai'
    };
  }

  // Nouveau fallback : chercher directement dans tenants.twilio_phone_number
  const directResult = await env.DB.prepare(`
    SELECT
      t.id as tenant_id,
      t.name as company_name,
      a.id as agent_id,
      (a.first_name || ' ' || a.last_name) as agent_name
    FROM tenants t
    LEFT JOIN commercial_agents a ON t.id = a.tenant_id AND a.is_active = 1
    WHERE t.twilio_phone_number = ? OR t.twilio_phone_number = ?
    LIMIT 1
  `).bind(phoneNumber, normalizedNumber).first();

  if (directResult) {
    return {
      tenant_id: directResult.tenant_id,
      company_name: directResult.company_name,
      agent_id: directResult.agent_id,
      agent_name: directResult.agent_name,
      language: 'fr-FR',
      ttsProvider: 'amazon',
      ttsVoice: 'Lea-Neural',
      ttsVoiceId: null,
      transcriptionProvider: 'Deepgram',
      transcriptionLanguage: 'fr-FR',
      speechModel: 'nova-2-conversationalai',
      welcome_message: `Bonjour, bienvenue chez ${directResult.company_name}. Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?`,
      transfer_number: null
    };
  }

  // Fallback sur config par défaut pour le développement
  return {
    tenant_id: 'tenant_demo_001',
    company_name: 'Demo Company',
    agent_id: 'agent_sara_001',
    agent_name: 'Sara',
    language: 'fr-FR',
    ttsProvider: 'amazon',
    ttsVoice: 'Lea-Neural',
    ttsVoiceId: null,
    transcriptionProvider: 'Deepgram',
    transcriptionLanguage: 'fr-FR',
    speechModel: 'nova-2-conversationalai',
    welcome_message: 'Bonjour, bienvenue chez Coccinelle. Comment puis-je vous aider ?',
    transfer_number: null
  };
}

// Escape XML pour éviter les injections
function escapeXml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============ WEBHOOK SMS ENTRANT ============

/**
 * POST /webhooks/twilio/sms - Réception de SMS entrant depuis Twilio
 */
async function handleIncomingSMS(request, env) {
  try {
    // ── SIGNATURE TWILIO — AVANT TOUT, ET AVANT TOUTE LECTURE DU CORPS ──
    // Cette route n'a JAMAIS rien vérifié, alors qu'elle annule des rendez-vous sur un
    // simple `Body=ANNULER`. N'importe qui pouvait annuler le rendez-vous de n'importe
    // qui, sans authentification, en connaissant un numéro de téléphone.
    if (!(await signatureTwilioValide(request, env))) {
      logger.warn('Webhook SMS legacy : signature Twilio absente ou invalide — rejete');
      return new Response('Forbidden', { status: 403 });
    }

    const formData = await request.formData();
    const from = formData.get('From');
    const to = formData.get('To');
    const body = formData.get('Body');
    const messageSid = formData.get('MessageSid');

    logger.info('Incoming SMS received', { from, to, messageSid, body: body?.substring(0, 50) });

    // ── LE REFUS, AVANT TOUT LE RESTE ──
    //
    // ⚠️ C'EST CETTE ROUTE QUE TWILIO APPELLE, PAS `/webhooks/omnichannel/sms`.
    // Mesuré au `wrangler tail` le 17/08/2026 : trois « ARRET » envoyés depuis un vrai
    // combiné sont arrivés ICI, ont traversé sans être reconnus, et sont partis à l'IA.
    // Le code de refus vivait sur l'autre route et n'a jamais été atteint.
    // Voir `shared/sms-entrant.js` : on ne parie plus sur la porte d'entrée.
    const refus = await intercepterRefus(env, { from, to, body });
    if (refus) return refus;

    // ── RESOLUTION DU TENANT PAR LE NUMERO APPELE ──
    //
    // Avant : `channel_configurations` puis repli sur **`'tenant_demo_001'`** en dur.
    // Mesuré en production le 17/08 : c'est le repli qui servait — un SMS entrant réel
    // était traité sous `tenant_demo_001`. Même antipattern que le tenant en dur de
    // l'autre webhook, et que le « premier tenant actif » de la faille WhatsApp V1.
    //
    // Un numéro appelé INCONNU est désormais REJETÉ, jamais deviné.
    const tenantId = await resoudreTenantParNumeroAppele(env, to);
    if (!tenantId) {
      // 200 et non 404 : Twilio réessaierait sur une erreur, et un numéro non rattaché
      // n'est pas une panne — c'est une configuration absente.
      logger.warn('SMS entrant sur un numero non rattache — ignore', { to, from });
      return twimlVide();
    }

    // L'INSERT dans `sms_messages` a été retiré (18/08/2026) : la table N'EXISTE PAS
    // dans `coccinelle-db-eu`, et l'erreur était avalée en `warn` — un log d'erreur par
    // SMS reçu, et aucun entrant enregistré nulle part. Les SMS entrants vivent dans
    // `omni_messages`, comme le reste, écrits par l'orchestrateur omnicanal plus bas.
    // C'est déjà la source que lit `handleSMSHistory`.

    // Detecter reponse CONFIRMER / ANNULER pour RDV
    //
    // ⚠️ CES REQUETES SONT DESORMAIS BORNEES AU TENANT. Sans le filtre, elles
    // cherchaient le rendez-vous par le SEUL numéro de téléphone, toutes entreprises
    // confondues : un « ANNULER » annulait le premier rendez-vous trouvé, qui pouvait
    // appartenir à un autre tenant que celui du numéro appelé.
    const upperBody = (body || '').trim().toUpperCase();
    if (['CONFIRMER', 'OUI', 'CONFIRM'].includes(upperBody)) {
      const apt = await env.DB.prepare(`
        SELECT id FROM appointments
        WHERE tenant_id = ?
          AND (customer_phone = ? OR customer_phone = ?)
          AND DATE(scheduled_at) >= DATE('now')
          AND status NOT IN ('cancelled','completed','confirmed')
        ORDER BY scheduled_at ASC LIMIT 1
      `).bind(tenantId, from, from.replace('+33', '0')).first();
      if (apt) {
        await env.DB.prepare(`UPDATE appointments SET status = 'confirmed', updated_at = datetime('now') WHERE id = ?`).bind(apt.id).run();
        logger.info('Appointment confirmed via SMS', { appointmentId: apt.id, from });
      }
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Votre RDV est confirme. A bientot !</Message></Response>',
        { headers: { 'Content-Type': 'application/xml' } }
      );
    }
    if (['ANNULER', 'NON', 'CANCEL'].includes(upperBody)) {
      const apt = await env.DB.prepare(`
        SELECT id FROM appointments
        WHERE tenant_id = ?
          AND (customer_phone = ? OR customer_phone = ?)
          AND DATE(scheduled_at) >= DATE('now')
          AND status NOT IN ('cancelled','completed')
        ORDER BY scheduled_at ASC LIMIT 1
      `).bind(tenantId, from, from.replace('+33', '0')).first();
      if (apt) {
        await env.DB.prepare(`UPDATE appointments SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`).bind(apt.id).run();
        logger.info('Appointment cancelled via SMS', { appointmentId: apt.id, from });
      }
      return new Response(
        '<?xml version="1.0" encoding="UTF-8"?><Response><Message>RDV annule. N\'hesitez pas a reprendre RDV.</Message></Response>',
        { headers: { 'Content-Type': 'application/xml' } }
      );
    }

    // Declencher l'orchestrateur omnicanal (reponse IA, creation prospect, etc.)
    try {
      const { onSmsReceived } = await import('../omnicanal/orchestrator.js');
      await onSmsReceived(env, tenantId, { From: from, To: to, Body: body || '' });
      logger.info('Omnicanal SMS triggered', { tenantId, from });
    } catch (omniErr) {
      logger.warn('Omnicanal SMS error (non-bloquant)', { error: omniErr.message });
    }

    // Répondre avec TwiML vide (accusé de réception sans réponse auto)
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'application/xml' } }
    );
  } catch (error) {
    logger.error('Incoming SMS webhook error', { error: error.message });
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { 'Content-Type': 'application/xml' } }
    );
  }
}

// ============ SMS ROUTES ============

/**
 * GET /api/v1/sms/history - Historique des SMS
 *
 * Lisait `sms_messages`, table qui n'existe pas dans `coccinelle-db-eu` : la
 * route répondait donc « SMS history table not configured » à tous les tenants,
 * depuis toujours, avec un `messages: []` qui ressemblait à « aucun SMS ».
 * Deux mensonges superposés — l'absence de table présentée comme une absence de
 * message, et une route d'historique qui n'historisait rien.
 *
 * Elle lit désormais la source réelle : `omni_messages`, alimentée par
 * `shared/sms-envoi.js`. Les champs gardent leurs anciens noms — aucun appelant
 * connu (aucune page ne consomme cette route), mais la renommer n'apporterait
 * rien et casserait un éventuel client hors dépôt.
 */
async function handleSMSHistory(env, tenantId) {
  const limit = 50;

  const result = await env.DB.prepare(`
    SELECT m.id,
           c.client_phone AS to_number,
           m.content      AS message,
           m.message_type AS type,
           m.direction,
           m.message_sid,
           m.created_at
      FROM omni_messages m
      JOIN omni_conversations c ON c.id = m.conversation_id
     WHERE c.tenant_id = ? AND m.channel = 'sms'
     ORDER BY m.created_at DESC
     LIMIT ?
  `).bind(tenantId, limit).all();

  return successResponse({
    messages: result.results || [],
    count: result.results?.length || 0
  });
}

/**
 * Fonction commune pour envoyer un SMS via Twilio
 */
/*
 * ⛔ `sendTwilioSMS` supprimee le 17/08/2026 : elle n'existait que pour les quatre
 * routes a destinataire libre, retirees ci-dessus. Les envois legitimes passent par
 * `shared/sms-envoi.js`, seul fichier autorise a appeler Twilio
 * (`scripts/verifier-sms.mjs`).
 */
