// Module Twilio ConversationRelay - Routes
// Migration VAPI → Twilio pour meilleure latence et qualité voix FR
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { handleConversationWebSocket } from './websocket.js';
import { TwilioSignatureValidator } from './validator.js';

export async function handleTwilioRoutes(request, env, path, method) {
  try {
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

    // GET /api/v1/twilio/calls - Liste des appels
    if (path === '/api/v1/twilio/calls' && method === 'GET') {
      return await handleListCalls(request, env);
    }

    // GET /api/v1/twilio/stats - Statistiques
    if (path === '/api/v1/twilio/stats' && method === 'GET') {
      return await handleStats(request, env);
    }


    // ============ SMS ROUTES ============
    
    // POST /api/v1/sms/send - Envoyer un SMS manuel
    if (path === '/api/v1/sms/send' && method === 'POST') {
      return await handleSendSMS(request, env);
    }
    
    // POST /api/v1/sms/confirmation - SMS confirmation RDV
    if (path === '/api/v1/sms/confirmation' && method === 'POST') {
      return await handleSMSConfirmation(request, env);
    }
    
    // POST /api/v1/sms/reminder - SMS rappel RDV
    if (path === '/api/v1/sms/reminder' && method === 'POST') {
      return await handleSMSReminder(request, env);
    }
    
    // POST /api/v1/sms/cancel - SMS annulation RDV
    if (path === '/api/v1/sms/cancel' && method === 'POST') {
      return await handleSMSCancel(request, env);
    }
    
    // GET /api/v1/sms/history - Historique des SMS
    if (path === '/api/v1/sms/history' && method === 'GET') {
      return await handleSMSHistory(request, env);
    }
    return null;

  } catch (error) {
    logger.error('Twilio route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// Webhook pour appel entrant - retourne TwiML avec ConversationRelay
async function handleIncomingCall(request, env) {
  const formData = await request.formData();
  const callSid = formData.get('CallSid');
  const from = formData.get('From');
  const to = formData.get('To');
  const forwardedFrom = formData.get('ForwardedFrom'); // Numéro original si renvoi d'appel

  logger.info('Incoming call received', { callSid, from, to, forwardedFrom });

  // Récupérer la config du tenant basée sur le numéro appelé
  // Si ForwardedFrom existe, c'est que l'appel a été renvoyé depuis le numéro pro du client
  const phoneToIdentify = forwardedFrom || to;
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
    `).bind(callId, tenantConfig.tenant_id, callSid, from, to, 'inbound', 'ringing', now).run();
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
  const formData = await request.formData();
  const speechResult = formData.get('SpeechResult');
  const callSid = formData.get('CallSid');
  const confidence = formData.get('Confidence');

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
  const formData = await request.formData();
  const callSid = formData.get('CallSid');
  const callStatus = formData.get('CallStatus');
  const callDuration = formData.get('CallDuration');

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

  try {
    await env.DB.prepare(`
      UPDATE calls
      SET status = ?, duration = ?, updated_at = datetime('now')
      WHERE twilio_call_sid = ?
    `).bind(statusMap[callStatus] || callStatus, parseInt(callDuration) || 0, callSid).run();
  } catch (dbError) {
    logger.error('Failed to update call status', { error: dbError.message });
  }

  return successResponse({ received: true });
}

// Liste des appels
async function handleListCalls(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  const limit = parseInt(url.searchParams.get('limit')) || 50;

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
async function handleStats(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';

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
  // Normaliser le numéro (enlever le +)
  const normalizedNumber = phoneNumber.replace(/^\+/, '');

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

// ============ SMS ROUTES ============

/**
 * POST /api/v1/sms/send - Envoyer un SMS manuel
 */
async function handleSendSMS(request, env) {
  const body = await request.json();
  const { to, message, tenant_id } = body;

  if (!to) return errorResponse('Numéro destinataire (to) requis', 400);
  if (!message) return errorResponse('Message requis', 400);

  const result = await sendTwilioSMS(env, to, message, tenant_id);
  
  if (result.success) {
    return successResponse({
      message_sid: result.messageSid,
      to,
      status: 'sent',
      message: 'SMS envoyé avec succès'
    });
  } else {
    return errorResponse(result.error, 400);
  }
}

/**
 * POST /api/v1/sms/confirmation - SMS confirmation RDV (template)
 */
async function handleSMSConfirmation(request, env) {
  const body = await request.json();
  const { to, customer_name, date, time, company_name, tenant_id } = body;

  if (!to) return errorResponse('Numéro destinataire (to) requis', 400);
  if (!date || !time) return errorResponse('Date et heure requises', 400);

  const name = customer_name || 'Client';
  const company = company_name || 'notre établissement';
  
  const message = `Bonjour ${name}, votre RDV est confirmé pour le ${date} à ${time} chez ${company}. À bientôt !`;

  const result = await sendTwilioSMS(env, to, message, tenant_id);
  
  if (result.success) {
    return successResponse({
      message_sid: result.messageSid,
      to,
      type: 'confirmation',
      status: 'sent'
    });
  } else {
    return errorResponse(result.error, 400);
  }
}

/**
 * POST /api/v1/sms/reminder - SMS rappel RDV (template)
 */
async function handleSMSReminder(request, env) {
  const body = await request.json();
  const { to, customer_name, date, time, company_name, tenant_id } = body;

  if (!to) return errorResponse('Numéro destinataire (to) requis', 400);
  if (!date || !time) return errorResponse('Date et heure requises', 400);

  const name = customer_name || 'Client';
  const company = company_name || 'notre établissement';
  
  const message = `Rappel ${name} : votre RDV est demain ${date} à ${time} chez ${company}. Besoin de modifier ? Répondez à ce SMS.`;

  const result = await sendTwilioSMS(env, to, message, tenant_id);
  
  if (result.success) {
    return successResponse({
      message_sid: result.messageSid,
      to,
      type: 'reminder',
      status: 'sent'
    });
  } else {
    return errorResponse(result.error, 400);
  }
}

/**
 * POST /api/v1/sms/cancel - SMS annulation RDV (template)
 */
async function handleSMSCancel(request, env) {
  const body = await request.json();
  const { to, customer_name, date, time, company_name, tenant_id } = body;

  if (!to) return errorResponse('Numéro destinataire (to) requis', 400);

  const name = customer_name || 'Client';
  const company = company_name || 'notre établissement';
  
  let message;
  if (date && time) {
    message = `Bonjour ${name}, votre RDV du ${date} à ${time} chez ${company} a été annulé. Contactez-nous pour reprogrammer.`;
  } else {
    message = `Bonjour ${name}, votre RDV chez ${company} a été annulé. Contactez-nous pour reprogrammer.`;
  }

  const result = await sendTwilioSMS(env, to, message, tenant_id);
  
  if (result.success) {
    return successResponse({
      message_sid: result.messageSid,
      to,
      type: 'cancel',
      status: 'sent'
    });
  } else {
    return errorResponse(result.error, 400);
  }
}

/**
 * GET /api/v1/sms/history - Historique des SMS
 */
async function handleSMSHistory(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  const limit = parseInt(url.searchParams.get('limit')) || 50;

  try {
    const result = await env.DB.prepare(`
      SELECT id, to_number, from_number, message, status, direction, created_at
      FROM sms_messages
      WHERE tenant_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(tenantId, limit).all();

    return successResponse({
      messages: result.results || [],
      count: result.results?.length || 0
    });
  } catch (error) {
    // Table might not exist yet
    return successResponse({
      messages: [],
      count: 0,
      note: 'SMS history table not configured'
    });
  }
}

/**
 * Fonction commune pour envoyer un SMS via Twilio
 */
async function sendTwilioSMS(env, to, message, tenantId) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER || '+33939035760';

  if (!accountSid || !authToken) {
    logger.warn('Twilio credentials not configured');
    return { success: false, error: 'SMS service not configured' };
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

  const formData = new URLSearchParams();
  formData.append('From', from);
  formData.append('To', to);
  formData.append('Body', message);

  try {
    const response = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      logger.error('Twilio SMS API error', { error: data });
      return { success: false, error: data.message || 'SMS send failed' };
    }

    logger.info('SMS sent', { messageSid: data.sid, to });

    // Sauvegarder en DB (optionnel)
    try {
      await env.DB.prepare(`
        INSERT INTO sms_messages (id, tenant_id, to_number, from_number, message, status, direction, twilio_sid, created_at)
        VALUES (?, ?, ?, ?, ?, 'sent', 'outbound', ?, datetime('now'))
      `).bind(
        `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId || 'tenant_demo_001',
        to,
        from,
        message,
        data.sid
      ).run();
    } catch (dbError) {
      // Table might not exist, ignore
      logger.warn('Could not save SMS to DB', { error: dbError.message });
    }

    return { success: true, messageSid: data.sid };
  } catch (error) {
    logger.error('Error sending SMS', { error: error.message });
    return { success: false, error: error.message };
  }
}
