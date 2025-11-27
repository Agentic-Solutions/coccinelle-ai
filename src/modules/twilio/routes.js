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

  logger.info('Incoming call received', { callSid, from, to });

  // Récupérer la config du tenant basée sur le numéro appelé
  const tenantConfig = await getTenantByPhoneNumber(env, to);

  if (!tenantConfig) {
    logger.warn('No tenant found for number', { to });
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
  const wsUrl = `wss://${new URL(request.url).host}/webhooks/twilio/conversation?callId=${callId}&tenantId=${tenantConfig.tenant_id}`;

  // Générer TwiML avec ConversationRelay
  const twiml = generateConversationRelayTwiML(wsUrl, tenantConfig);

  logger.info('Returning TwiML with ConversationRelay', { callId, wsUrl });

  return new Response(twiml, {
    headers: { 'Content-Type': 'application/xml' }
  });
}

// Générer le TwiML - Version Gather/Say (en attendant ConversationRelay)
function generateConversationRelayTwiML(wsUrl, tenantConfig) {
  const welcomeMessage = tenantConfig.welcome_message || 'Bonjour, comment puis-je vous aider ?';
  const gatherUrl = `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/twilio/gather?tenantId=${tenantConfig.tenant_id}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Lea-Neural" language="fr-FR">${escapeXml(welcomeMessage)}</Say>
  <Gather input="speech" language="fr-FR" speechTimeout="2" action="${gatherUrl}" method="POST">
    <Say voice="Polly.Lea-Neural" language="fr-FR">Je vous écoute.</Say>
  </Gather>
  <Say voice="Polly.Lea-Neural" language="fr-FR">Je n'ai pas entendu votre réponse. Au revoir.</Say>
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

  const result = await env.DB.prepare(`
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
    LEFT JOIN agents a ON t.id = a.tenant_id AND a.is_active = 1
    WHERE tc.phone_number = ? OR tc.phone_number = ?
    LIMIT 1
  `).bind(phoneNumber, normalizedNumber).first();

  // Fallback sur config par défaut pour le développement
  if (!result) {
    return {
      tenant_id: 'tenant_demo_001',
      company_name: 'Demo Company',
      voice_id: 'Polly.Lea-Neural',
      language: 'fr-FR',
      welcome_message: 'Bonjour, bienvenue chez Coccinelle. Comment puis-je vous aider ?',
      agent_id: 'agent_sara_001',
      agent_name: 'Sara'
    };
  }

  return result;
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
