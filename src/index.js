import { Router } from 'itty-router';

const router = Router();

// ============================================================================
// CORS MIDDLEWARE
// ============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

router.options('*', () => new Response(null, { headers: corsHeaders }));

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================
async function authenticate(request, env) {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) return null;

  const tenant = await env.DB.prepare(
    'SELECT * FROM tenants WHERE api_key = ?'
  ).bind(apiKey).first();

  return tenant;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function notifyN8N(env, eventType, data) {
  if (!env.N8N_WEBHOOK_URL) {
    console.log('[N8N] Webhook URL non configurée, notification ignorée');
    return;
  }
  
  try {
    const payload = {
      event: eventType,
      timestamp: new Date().toISOString(),
      data: data
    };

    await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(env.N8N_WEBHOOK_SECRET ? { 'X-Webhook-Secret': env.N8N_WEBHOOK_SECRET } : {})
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`[N8N] Notification envoyée: ${eventType}`);
  } catch (error) {
    console.error('[N8N] Erreur notification:', error.message);
  }
}

// ============================================================================
// VAPI WEBHOOK - CORRIGÉ v1.12.6
// ============================================================================

// ============================================================================
// WEB CRAWLER FUNCTIONS - Phase 2 v1.13.1
// ============================================================================

function extractTextFromHTML(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetadata(html, url) {
  const metadata = { url, title: '', description: '', headings: [] };
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) metadata.title = titleMatch[1].trim();
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
  if (descMatch) metadata.description = descMatch[1].trim();
  const h1Tags = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
  const h2Tags = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  metadata.headings = [...h1Tags, ...h2Tags].map(h => extractTextFromHTML(h)).filter(h => h.length > 0);
  return metadata;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const matches = html.matchAll(/<a[^>]*href=["'](.*?)["']/gi);
  for (const match of matches) {
    try {
      let href = match[1];
      if (href.startsWith('/')) href = new URL(baseUrl).origin + href;
      else if (!href.startsWith('http')) href = new URL(href, baseUrl).href;
      const url = new URL(href);
      if (url.protocol === 'http:' || url.protocol === 'https:') links.push(url.href);
    } catch (e) {}
  }
  return [...new Set(links)];
}

function isSameDomain(url1, url2) {
  try { return new URL(url1).hostname === new URL(url2).hostname; } catch { return false; }
}

function shouldCrawlUrl(url, includePatterns, excludePatterns) {
  if (excludePatterns?.length > 0) for (const p of excludePatterns) if (url.includes(p)) return false;
  if (includePatterns?.length > 0) { for (const p of includePatterns) if (url.includes(p)) return true; return false; }
  return true;
}

function hashString(str) {
  let h = 0; for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h = h & h; }
  return Math.abs(h).toString(36);
}

async function saveDocument(tenantId, db, docData) {
  const docId = 'doc_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  const contentHash = hashString(docData.content || '');
  const existing = await db.prepare('SELECT id FROM knowledge_documents WHERE tenant_id = ? AND content_hash = ?').bind(tenantId, contentHash).first();
  if (existing) return existing.id;
  await db.prepare('INSERT INTO knowledge_documents (id, tenant_id, source_type, source_url, title, content, content_hash, word_count, metadata, status, crawled_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(docId, tenantId, docData.sourceType || 'webpage', docData.sourceUrl, docData.title, docData.content, contentHash, docData.content ? docData.content.split(/\s+/).length : 0, JSON.stringify(docData.metadata || {}), 'completed', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()).run();
  return docId;
}

async function crawlWebsite(tenantId, db, rootUrl, options = {}) {
  const { maxPages = 50, maxDepth = 3, includePatterns = [], excludePatterns = [] } = options;
  const visited = new Set(); const queue = [{ url: rootUrl, depth: 0 }]; const documents = [];
  while (queue.length > 0 && visited.size < maxPages) {
    const { url, depth } = queue.shift();
    if (visited.has(url) || depth > maxDepth || !shouldCrawlUrl(url, includePatterns, excludePatterns)) continue;
    visited.add(url);
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Coccinelle.ai Bot/1.0' } });
      if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) continue;
      const html = await response.text();
      const mainContent = extractTextFromHTML(html);
      const metadata = extractMetadata(html, url);
      if (mainContent && mainContent.length > 100) {
        documents.push(await saveDocument(tenantId, db, { sourceType: 'webpage', sourceUrl: url, title: metadata.title || url, content: mainContent, metadata }));
      }
      if (depth < maxDepth) {
        for (const link of extractLinks(html, url)) {
          if (isSameDomain(link, rootUrl) && !visited.has(link)) queue.push({ url: link, depth: depth + 1 });
        }
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {}
  }
  return { pagesCrawled: visited.size, documentsCreated: documents.length };
}
router.post('/webhooks/vapi/function-call', async (request, env, ctx) => {
  try {
    const payload = await request.json();
    const message = payload.message || payload;
    
    console.log('=== VAPI WEBHOOK REÇU ===');
    console.log('Message type:', message.type);
    console.log('Tool calls:', message.toolCalls?.length || 0);

    const tenant = await env.DB.prepare(
      'SELECT * FROM tenants WHERE telephony_active = 1 LIMIT 1'
    ).first();

    if (!tenant) {
      console.error('Aucun tenant avec téléphonie active');
      return new Response(JSON.stringify({ error: 'No active tenant' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ======================================================================
    // NOUVEAU : Support tool-calls (pluriel) - v1.12.6
    // ======================================================================
    if (message.type === 'tool-calls' && message.toolCalls && Array.isArray(message.toolCalls)) {
      console.log('=== TRAITEMENT TOOL-CALLS (PLURIEL) ===');
      console.log('Nombre de tool calls:', message.toolCalls.length);
      
      const results = [];
      
      for (const toolCall of message.toolCalls) {
        const functionName = toolCall.function?.name;
        const parameters = toolCall.function?.arguments;
        const toolCallId = toolCall.id;
        
        console.log(`\n--- Tool Call ${toolCallId} ---`);
        console.log('Fonction:', functionName);
        console.log('Paramètres:', JSON.stringify(parameters, null, 2));
        
        let result;
        
        if (functionName === 'searchKnowledge') {
          result = await handleSearchKnowledge(parameters, tenant.id, env.DB);
        } else if (functionName === 'checkAvailability') {
          result = await handleCheckAvailability(parameters, tenant.id, env.DB);
        } else if (functionName === 'createAppointment') {
          result = await handleCreateAppointment(parameters, tenant.id, env, ctx);
        } else {
          result = { error: `Unknown function: ${functionName}` };
        }
        
        console.log('Résultat:', JSON.stringify(result, null, 2));
        
        results.push({
          toolCallId: toolCallId,
          result: result
        });
      }
      
      console.log(`=== FIN TRAITEMENT - ${results.length} résultats ===\n`);
      
      return new Response(JSON.stringify({ results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ======================================================================
    // ANCIEN : Support function-call (singulier) - Rétrocompatibilité
    // ======================================================================
    if (message.type === 'function-call' && message.functionCall) {
      const functionCall = message.functionCall;
      const functionName = functionCall.name;
      const parameters = functionCall.parameters;

      console.log(`Fonction appelée: ${functionName}`);
      console.log('Paramètres:', JSON.stringify(parameters, null, 2));

      let result;
      let toolCallId = message.toolCallId || functionCall.id || `call_${Date.now()}`;

      if (functionName === 'searchKnowledge') {
        result = await handleSearchKnowledge(parameters, tenant.id, env.DB);
      } else if (functionName === 'checkAvailability') {
        result = await handleCheckAvailability(parameters, tenant.id, env.DB);
      } else if (functionName === 'createAppointment') {
        result = await handleCreateAppointment(parameters, tenant.id, env, ctx);
      } else {
        result = { error: `Unknown function: ${functionName}` };
      }

      return new Response(JSON.stringify({
        results: [{
          toolCallId: toolCallId,
          result: result
        }]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ======================================================================
    // END-OF-CALL-REPORT
    // ======================================================================
    if (message.type === 'end-of-call-report') {
      console.log('📊 END-OF-CALL-REPORT reçu');
      
      const callData = message.call || {};
      const analysis = callData.analysis || {};
      const transcript = callData.transcript || '';
      
      console.log('Call ID:', callData.id);
      console.log('Transcript length:', transcript.length);
      
      try {
        await env.DB.prepare(`
          INSERT INTO vapi_call_logs (
            id, tenant_id, call_id, phone_number, status,
            duration_seconds, cost_usd, transcript, 
            summary, sentiment_score, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).bind(
          crypto.randomUUID(),
          tenant.id,
          callData.id || 'unknown',
          callData.customer?.number || '',
          callData.status || 'completed',
          Math.round(callData.duration || 0),
          (callData.cost || 0).toFixed(4),
          transcript,
          analysis.summary || '',
          (analysis.sentiment || 0).toString()
        ).run();
        
        console.log('✅ Transcription enregistrée en base');
      } catch (dbError) {
        console.error('❌ Erreur logging Vapi:', dbError.message);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur webhook Vapi:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================

// searchKnowledge
async function handleSearchKnowledge(params, tenantId, db) {
  const query = params.query?.toLowerCase() || '';
  
  const results = await db.prepare(`
    SELECT question, answer, category 
    FROM knowledge_base 
    WHERE tenant_id = ? 
      AND type = 'qa'
      AND (LOWER(question) LIKE ? OR LOWER(answer) LIKE ?)
    LIMIT 3
  `).bind(tenantId, `%${query}%`, `%${query}%`).all();

  if (!results.results || results.results.length === 0) {
    return {
      answer: "Je n'ai pas trouvé d'information sur ce sujet. Pouvez-vous reformuler votre question ?",
      sources: []
    };
  }

  return {
    answer: results.results[0].answer,
    sources: results.results.map(r => ({
      question: r.question,
      category: r.category
    }))
  };
}

// checkAvailability
async function handleCheckAvailability(params, tenantId, db) {
  const requestedDate = params.date;
  
  console.log('📅 checkAvailability appelé avec date:', requestedDate);
  
  if (!requestedDate || !requestedDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    console.error('❌ Format de date invalide:', requestedDate);
    return {
      available: false,
      slots: [],
      message: "Format de date invalide. Utilisez YYYY-MM-DD."
    };
  }

  const dayOfWeek = new Date(requestedDate + 'T12:00:00Z').getUTCDay();
  const dayNum = dayOfWeek === 0 ? 7 : dayOfWeek;

  console.log('Jour de la semaine:', dayNum, '(1=Lun, 7=Dim)');

  const agent = await db.prepare(`
    SELECT * FROM agents WHERE tenant_id = ? LIMIT 1
  `).bind(tenantId).first();

  if (!agent) {
    console.error('❌ Aucun agent trouvé');
    return {
      available: false,
      slots: [],
      message: "Aucun agent disponible"
    };
  }

  console.log('Agent trouvé:', agent.id, agent.name);

  const availabilitySlots = await db.prepare(`
    SELECT start_time, end_time 
    FROM availability_slots 
    WHERE agent_id = ? AND tenant_id = ? AND day_of_week = ?
  `).bind(agent.id, tenantId, dayNum).all();

  console.log('Créneaux trouvés en base:', availabilitySlots.results?.length || 0);

  if (!availabilitySlots.results || availabilitySlots.results.length === 0) {
    console.log('❌ Aucun créneau configuré pour ce jour');
    return {
      available: false,
      slots: [],
      message: "Aucun créneau disponible pour cette date"
    };
  }

  const existingAppointments = await db.prepare(`
    SELECT scheduled_at 
    FROM appointments 
    WHERE agent_id = ? 
      AND tenant_id = ? 
      AND DATE(scheduled_at) = ? 
      AND status = 'scheduled'
  `).bind(agent.id, tenantId, requestedDate).all();

  console.log('RDV existants:', existingAppointments.results?.length || 0);

  const calendarBlocks = await db.prepare(`
    SELECT start_datetime, end_datetime 
    FROM calendar_blocks 
    WHERE agent_id = ? 
      AND tenant_id = ? 
      AND DATE(start_datetime) <= ? 
      AND DATE(end_datetime) >= ?
  `).bind(agent.id, tenantId, requestedDate, requestedDate).all();

  console.log('Blocages calendrier:', calendarBlocks.results?.length || 0);

  const slots = [];
  
  for (const slot of availabilitySlots.results) {
    const startHour = parseInt(slot.start_time.split(':')[0]);
    const endHour = parseInt(slot.end_time.split(':')[0]);
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = `${hour.toString().padStart(2, '0')}:00`;
      const slotDatetime = `${requestedDate}T${slotTime}:00+01:00`;
      
      const isBooked = existingAppointments.results?.some(appt => {
        const apptHour = new Date(appt.scheduled_at).getHours();
        return apptHour === hour;
      });
      
      const isBlocked = calendarBlocks.results?.some(block => {
        const blockStart = new Date(block.start_datetime);
        const blockEnd = new Date(block.end_datetime);
        const slotDate = new Date(slotDatetime);
        return slotDate >= blockStart && slotDate <= blockEnd;
      });
      
      if (!isBooked && !isBlocked) {
        slots.push({
          time: slotTime,
          datetime: slotDatetime
        });
      }
    }
  }

  console.log('✅ Créneaux disponibles:', slots.length);
  
  if (slots.length > 0) {
    console.log('Premiers créneaux:', slots.slice(0, 3).map(s => s.time).join(', '));
  }

  return {
    available: slots.length > 0,
    slots: slots.slice(0, 5),
    date: requestedDate,
    message: slots.length > 0 
      ? `${slots.length} créneaux disponibles` 
      : "Aucun créneau disponible pour cette date"
  };
}

// createAppointment
async function handleCreateAppointment(params, tenantId, env, ctx) {
  const { firstName, lastName, phone, email, datetime } = params;
  
  console.log('🗓️ createAppointment appelé');
  console.log('Paramètres:', JSON.stringify(params, null, 2));

  const prospectName = firstName && lastName 
    ? `${firstName} ${lastName}`.trim()
    : params.prospectName || 'Prospect';

  const agent = await env.DB.prepare(`
    SELECT * FROM agents WHERE tenant_id = ? LIMIT 1
  `).bind(tenantId).first();

  if (!agent) {
    return { 
      success: false, 
      error: 'Aucun agent disponible' 
    };
  }

  const prospectId = generateId('prospect');
  await env.DB.prepare(`
    INSERT INTO prospects (id, tenant_id, first_name, last_name, phone, email, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'contacted', datetime('now'))
  `).bind(
    prospectId,
    tenantId,
        firstName || '',
    lastName || '',
    phone,
    email || 'noemail@placeholder.com'
  ).run();

  console.log('✅ Prospect créé:', prospectId);

  const appointmentId = generateId('appt');
  const managementToken = generateToken();

  await env.DB.prepare(`
    INSERT INTO appointments (
      id, tenant_id, prospect_id, agent_id, type,
      scheduled_at, status, management_token, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, datetime('now'))
  `).bind(
    appointmentId,
    tenantId,
    prospectId,
    agent.id,
    'visit',
    datetime,
    managementToken
  ).run();

  console.log('✅ RDV créé:', appointmentId);

  const managementUrl = `https://coccinelle-api.youssef-amrouche.workers.dev/rdv/${managementToken}`;

  if (phone && phone !== '') {
    ctx.waitUntil(sendSMS(env, phone, datetime, managementUrl, prospectName));
  }

  if (email && email !== 'noemail@placeholder.com') {
    ctx.waitUntil(sendEmail(env, email, datetime, managementUrl, prospectName));
  }

  ctx.waitUntil(
    env.DB.prepare(`
      INSERT INTO vapi_call_logs (
        id, tenant_id, prospect_id, prospect_name, prospect_email,
        phone_number, appointment_created, appointment_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))
    `).bind(
      crypto.randomUUID(),
      tenantId,
      prospectId,
      prospectName,
      email || '',
      phone || '',
      appointmentId
    ).run()
  );

  ctx.waitUntil(notifyN8N(env, 'appointment.created', {
    appointment_id: appointmentId,
    prospect_id: prospectId,
    scheduled_at: datetime
  }));

  return {
    success: true,
    appointment_id: appointmentId,
    scheduled_at: datetime,
    management_url: managementUrl,
    message: 'Rendez-vous confirmé'
  };
}

// ============================================================================
// NOTIFICATION FUNCTIONS
// ============================================================================
async function sendSMS(env, phone, datetime, managementUrl, prospectName) {
  try {
    const scheduledDate = new Date(datetime);
    const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });

    const message = `Bonjour ${prospectName}, votre rendez-vous est confirmé le ${formattedDate}. Gérez-le ici : ${managementUrl}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          To: phone,
          From: env.TWILIO_PHONE_NUMBER,
          Body: message
        })
      }
    );

    if (response.ok) {
      console.log('✅ SMS envoyé à', phone);
    } else {
      const error = await response.text();
      console.error('❌ Erreur SMS:', error);
    }
  } catch (error) {
    console.error('❌ Exception SMS:', error.message);
  }
}

async function sendEmail(env, email, datetime, managementUrl, prospectName) {
  try {
    const scheduledDate = new Date(datetime);
    const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-top: 0;">Rendez-vous confirmé</h1>
          <p style="font-size: 16px; color: #555;">Bonjour ${prospectName},</p>
          <p style="font-size: 16px; color: #555;">Votre rendez-vous est confirmé pour le :</p>
          <div style="background-color: #fff; border-left: 4px solid #3498db; padding: 15px; margin: 20px 0;">
            <p style="font-size: 18px; font-weight: bold; margin: 0; color: #2c3e50;">${formattedDate}</p>
          </div>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${managementUrl}" style="display: inline-block; background-color: #3498db; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; font-size: 16px;">Gérer mon rendez-vous</a>
        </div>
        <div style="font-size: 14px; color: #777; border-top: 1px solid #ddd; padding-top: 20px; margin-top: 20px;">
          <p>Vous pouvez modifier ou annuler votre rendez-vous en cliquant sur le bouton ci-dessus.</p>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL,
        to: email,
        subject: 'Confirmation de votre rendez-vous',
        html: htmlContent
      })
    });

    if (response.ok) {
      console.log('✅ Email envoyé à', email);
    } else {
      const error = await response.text();
      console.error('❌ Erreur Email:', error);
    }
  } catch (error) {
    console.error('❌ Exception Email:', error.message);
  }
}

// ============================================================================
// API ROUTES
// ============================================================================

// GET /api/v1/prospects
router.get('/api/v1/prospects', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const prospects = await env.DB.prepare(
    'SELECT * FROM prospects WHERE tenant_id = ? ORDER BY created_at DESC'
  ).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    prospects: prospects.results || []
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// POST /api/v1/prospects
router.post('/api/v1/prospects', async (request, env, ctx) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const prospectId = generateId('prospect');

  await env.DB.prepare(`
    INSERT INTO prospects (id, tenant_id, first_name, last_name, phone, email, status, source, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    prospectId,
    tenant.id,
    body.first_name || '',
  body.last_name || '',
    body.phone || null,
    body.email || null,
    body.status || 'new',
    body.source || 'manual',
    body.notes || null
  ).run();

  ctx.waitUntil(notifyN8N(env, 'prospect.created', {
    prospect_id: prospectId,
    name: `${body.first_name || ''} ${body.last_name || ''}`.trim() || 'Prospect'
  }));

  return new Response(JSON.stringify({
    success: true,
    prospect_id: prospectId
  }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// GET /api/v1/agents
router.get('/api/v1/agents', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const agents = await env.DB.prepare(
    'SELECT * FROM agents WHERE tenant_id = ?'
  ).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    agents: agents.results || []
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// GET /api/v1/agents/:agentId/availability
router.get('/api/v1/agents/:agentId/availability', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { agentId } = request.params;
  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const duration = parseInt(url.searchParams.get('duration') || '60');

  if (!startDate || !endDate) {
    return new Response(JSON.stringify({
      error: 'start_date and end_date are required'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const agent = await env.DB.prepare(
    'SELECT * FROM agents WHERE id = ? AND tenant_id = ?'
  ).bind(agentId, tenant.id).first();

  if (!agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const availableSlots = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay();
    const dayNum = dayOfWeek === 0 ? 7 : dayOfWeek;

    const slots = await env.DB.prepare(`
      SELECT start_time, end_time 
      FROM availability_slots 
      WHERE agent_id = ? AND tenant_id = ? AND day_of_week = ?
    `).bind(agent.id, tenant.id, dayNum).all();

    if (!slots.results || slots.results.length === 0) continue;

    const appointments = await env.DB.prepare(`
      SELECT scheduled_at 
      FROM appointments 
      WHERE agent_id = ? AND tenant_id = ? 
        AND DATE(scheduled_at) = ? 
        AND status = 'scheduled'
    `).bind(agent.id, tenant.id, dateStr).all();

    const blocks = await env.DB.prepare(`
      SELECT start_datetime, end_datetime 
      FROM calendar_blocks 
      WHERE agent_id = ? AND tenant_id = ? 
        AND DATE(start_datetime) <= ? 
        AND DATE(end_datetime) >= ?
    `).bind(agent.id, tenant.id, dateStr, dateStr).all();

    for (const slot of slots.results) {
      const [startHour, startMin] = slot.start_time.split(':').map(Number);
      const [endHour, endMin] = slot.end_time.split(':').map(Number);

      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += 30) {
          const slotStart = new Date(d);
          slotStart.setHours(h, m, 0, 0);
          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + duration);

          const isBooked = appointments.results?.some(appt => {
            const apptTime = new Date(appt.scheduled_at);
            return apptTime.getTime() === slotStart.getTime();
          });

          const isBlocked = blocks.results?.some(block => {
            const blockStart = new Date(block.start_datetime);
            const blockEnd = new Date(block.end_datetime);
            return slotStart >= blockStart && slotStart < blockEnd;
          });

          if (!isBooked && !isBlocked) {
            availableSlots.push({
              start: slotStart.toISOString(),
              end: slotEnd.toISOString(),
              duration_minutes: duration
            });
          }
        }
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      buffer_time: agent.buffer_time,
      max_appointments_per_day: agent.max_appointments_per_day
    },
    available_slots: availableSlots,
    period: { start: startDate, end: endDate, duration }
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// GET /api/v1/appointments
router.get('/api/v1/appointments', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const appointments = await env.DB.prepare(`
    SELECT a.*, p.name as prospect_name, ag.name as agent_name
    FROM appointments a
    LEFT JOIN prospects p ON a.prospect_id = p.id
    LEFT JOIN agents ag ON a.agent_id = ag.id
    WHERE a.tenant_id = ?
    ORDER BY a.scheduled_at DESC
  `).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    appointments: appointments.results || []
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// POST /api/v1/appointments
router.post('/api/v1/appointments', async (request, env, ctx) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const appointmentId = generateId('appt');
  const managementToken = generateToken();

  await env.DB.prepare(`
    INSERT INTO appointments (
      id, tenant_id, prospect_id, agent_id, type,
      scheduled_at, status, management_token, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, datetime('now'))
  `).bind(
    appointmentId,
    tenant.id,
    body.prospect_id,
    body.agent_id,
    body.type,
    body.scheduled_at,
    managementToken,
    body.notes || null
  ).run();

  const managementUrl = `${new URL(request.url).origin}/rdv/${managementToken}`;

  ctx.waitUntil(notifyN8N(env, 'appointment.created', {
    appointment_id: appointmentId,
    prospect_id: body.prospect_id,
    scheduled_at: body.scheduled_at
  }));

  return new Response(JSON.stringify({
    success: true,
    appointment_id: appointmentId,
    management_url: managementUrl
  }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// GET /api/v1/vapi/calls
router.get('/api/v1/vapi/calls', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const prospectId = url.searchParams.get('prospect_id');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');

  let query = 'SELECT * FROM vapi_call_logs WHERE tenant_id = ?';
  const params = [tenant.id];

  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (prospectId) {
    query += ' AND prospect_id = ?';
    params.push(prospectId);
  }
  if (dateFrom) {
    query += ' AND created_at >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    query += ' AND created_at <= ?';
    params.push(dateTo);
  }

  query += ' ORDER BY created_at DESC LIMIT 100';

  const calls = await env.DB.prepare(query).bind(...params).all();

  return new Response(JSON.stringify({
    success: true,
    calls: calls.results || []
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// GET /api/v1/vapi/calls/:callId
router.get('/api/v1/vapi/calls/:callId', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { callId } = request.params;

  const call = await env.DB.prepare(
    'SELECT * FROM vapi_call_logs WHERE id = ? AND tenant_id = ?'
  ).bind(callId, tenant.id).first();

  if (!call) {
    return new Response(JSON.stringify({ error: 'Call not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    call: call
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// GET /api/v1/vapi/stats
router.get('/api/v1/vapi/stats', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_calls,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
      SUM(CASE WHEN appointment_created = 1 THEN 1 ELSE 0 END) as appointments_created,
      AVG(duration_seconds) as avg_duration_seconds,
      SUM(CAST(cost_usd AS REAL)) as total_cost_usd,
      AVG(CAST(sentiment_score AS REAL)) as avg_sentiment
    FROM vapi_call_logs
    WHERE tenant_id = ?
  `).bind(tenant.id).first();

  const conversionRate = stats.total_calls > 0
    ? Math.round((stats.appointments_created / stats.total_calls) * 100)
    : 0;

  return new Response(JSON.stringify({
    success: true,
    stats: {
      total_calls: stats.total_calls || 0,
      completed_calls: stats.completed_calls || 0,
      appointments_created: stats.appointments_created || 0,
      conversion_rate: `${conversionRate}%`,
      avg_duration_seconds: Math.round(stats.avg_duration_seconds || 0),
      total_cost_usd: (stats.total_cost_usd || 0).toFixed(2),
      avg_sentiment: (stats.avg_sentiment || 0).toFixed(2)
    }
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// GET /rdv/:token
router.get('/rdv/:token', async (request, env) => {
  const { token } = request.params;

  const appointment = await env.DB.prepare(`
    SELECT 
      a.*,
      COALESCE(p.first_name || ' ' || p.last_name, p.name, '') as prospect_name,
      p.phone as prospect_phone,
      p.email as prospect_email,
      ag.name as agent_name
    FROM appointments a
    LEFT JOIN prospects p ON a.prospect_id = p.id
    LEFT JOIN agents ag ON a.agent_id = ag.id
    WHERE a.management_token = ?
  `).bind(token).first();

  if (!appointment) {
    return new Response('Rendez-vous non trouvé', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  const scheduledDate = new Date(appointment.scheduled_at);
  const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Paris'
  });

  const statusColors = {
    scheduled: '#10b981',
    cancelled: '#ef4444',
    completed: '#6b7280'
  };

  const statusLabels = {
    scheduled: 'Confirmé',
    cancelled: 'Annulé',
    completed: 'Terminé'
  };

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gestion de rendez-vous</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9fafb;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      padding: 32px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      color: #111827;
      margin-bottom: 24px;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 500;
      color: white;
      margin-bottom: 24px;
    }
    .info-section {
      margin-bottom: 24px;
      padding-bottom: 24px;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
    }
    .info-label {
      color: #6b7280;
      font-size: 14px;
    }
    .info-value {
      color: #111827;
      font-weight: 500;
      font-size: 14px;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 24px;
    }
    button {
      flex: 1;
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    .btn-modify {
      background-color: #3b82f6;
      color: white;
    }
    .btn-modify:hover {
      background-color: #2563eb;
    }
    .btn-cancel {
      background-color: #ef4444;
      color: white;
    }
    .btn-cancel:hover {
      background-color: #dc2626;
    }
    .btn-modify:disabled, .btn-cancel:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    #modify-form, #cancel-form {
      display: none;
      margin-top: 24px;
      padding: 20px;
      background-color: #f9fafb;
      border-radius: 6px;
    }
    input, textarea {
      width: 100%;
      padding: 10px;
      margin-top: 8px;
      margin-bottom: 16px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
    }
    label {
      display: block;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
    }
    .form-actions {
      display: flex;
      gap: 12px;
    }
    .btn-submit {
      background-color: #10b981;
      color: white;
    }
    .btn-submit:hover {
      background-color: #059669;
    }
    .btn-back {
      background-color: #6b7280;
      color: white;
    }
    .btn-back:hover {
      background-color: #4b5563;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Votre rendez-vous</h1>
    
    <span class="status-badge" style="background-color: ${statusColors[appointment.status]}">
      ${statusLabels[appointment.status]}
    </span>

    <div class="info-section">
      <div class="info-row">
        <span class="info-label">Date et heure</span>
        <span class="info-value">${formattedDate}</span>
      </div>
      ${appointment.prospect_name ? `
      <div class="info-row">
        <span class="info-label">Contact</span>
        <span class="info-value">${appointment.prospect_name}</span>
      </div>
      ` : ''}
      ${appointment.agent_name ? `
      <div class="info-row">
        <span class="info-label">Agent</span>
        <span class="info-value">${appointment.agent_name}</span>
      </div>
      ` : ''}
    </div>

    ${appointment.status === 'scheduled' ? `
    <div class="actions">
      <button class="btn-modify" onclick="showModifyForm()">Modifier</button>
      <button class="btn-cancel" onclick="showCancelForm()">Annuler</button>
    </div>

    <div id="modify-form">
      <h2 style="margin-bottom: 16px; font-size: 18px;">Modifier la date</h2>
      <label>
        Nouvelle date et heure (format: JJ/MM/AAAA HH:MM)
        <input type="text" id="new-datetime" placeholder="07/10/2025 14:00">
      </label>
      <div class="form-actions">
        <button class="btn-submit" onclick="submitModify()">Confirmer</button>
        <button class="btn-back" onclick="hideModifyForm()">Retour</button>
      </div>
    </div>

    <div id="cancel-form">
      <h2 style="margin-bottom: 16px; font-size: 18px;">Annuler le rendez-vous</h2>
      <label>
        Raison (optionnel)
        <textarea id="cancel-reason" rows="3" placeholder="Pourquoi annulez-vous ?"></textarea>
      </label>
      <div class="form-actions">
        <button class="btn-submit" onclick="submitCancel()">Confirmer l'annulation</button>
        <button class="btn-back" onclick="hideCancelForm()">Retour</button>
      </div>
    </div>
    ` : ''}
  </div>

  <script>
    function showModifyForm() {
      document.getElementById('modify-form').style.display = 'block';
      document.getElementById('cancel-form').style.display = 'none';
    }

    function hideModifyForm() {
      document.getElementById('modify-form').style.display = 'none';
    }

    function showCancelForm() {
      document.getElementById('cancel-form').style.display = 'block';
      document.getElementById('modify-form').style.display = 'none';
    }

    function hideCancelForm() {
      document.getElementById('cancel-form').style.display = 'none';
    }

    async function submitModify() {
      const newDatetime = document.getElementById('new-datetime').value;
      if (!newDatetime) {
        alert('Veuillez saisir une date');
        return;
      }

      try {
        const response = await fetch('/rdv/${token}/modify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_datetime: newDatetime })
        });

        if (response.ok) {
          alert('Rendez-vous modifié avec succès');
          location.reload();
        } else {
          alert('Erreur lors de la modification');
        }
      } catch (error) {
        alert('Erreur réseau');
      }
    }

    async function submitCancel() {
      const reason = document.getElementById('cancel-reason').value;

      if (!confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
        return;
      }

      try {
        const response = await fetch('/rdv/${token}/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason })
        });

        if (response.ok) {
          alert('Rendez-vous annulé');
          location.reload();
        } else {
          alert('Erreur lors de l\'annulation');
        }
      } catch (error) {
        alert('Erreur réseau');
      }
    }
  </script>
</body>
</html>
  `;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html;charset=UTF-8' }
  });
});

// POST /rdv/:token/modify
router.post('/rdv/:token/modify', async (request, env, ctx) => {
  const { token } = request.params;
  const body = await request.json();

  const appointment = await env.DB.prepare(
    'SELECT * FROM appointments WHERE management_token = ?'
  ).bind(token).first();

  if (!appointment) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await env.DB.prepare(
    'UPDATE appointments SET scheduled_at = ?, updated_at = datetime(\'now\') WHERE management_token = ?'
  ).bind(body.new_datetime, token).run();

  ctx.waitUntil(notifyN8N(env, 'appointment.modified', {
    appointment_id: appointment.id,
    new_datetime: body.new_datetime
  }));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// POST /rdv/:token/cancel
router.post('/rdv/:token/cancel', async (request, env, ctx) => {
  const { token } = request.params;
  const body = await request.json();

  const appointment = await env.DB.prepare(
    'SELECT * FROM appointments WHERE management_token = ?'
  ).bind(token).first();

  if (!appointment) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await env.DB.prepare(
    'UPDATE appointments SET status = \'cancelled\', notes = ?, updated_at = datetime(\'now\') WHERE management_token = ?'
  ).bind(body.reason || '', token).run();

  ctx.waitUntil(notifyN8N(env, 'appointment.cancelled', {
    appointment_id: appointment.id,
    reason: body.reason
  }));

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});

// 404 handler

// ============================================================================
// KNOWLEDGE BASE ROUTES - Phase 2 v1.13.1
// ============================================================================

router.post('/api/v1/knowledge/crawl', async (request, env, ctx) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const body = await request.json();
  const { startUrl, maxPages, includePatterns, excludePatterns } = body;
  if (!startUrl) {
    return new Response(JSON.stringify({ error: 'startUrl is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const jobId = generateId('crawl');
  await env.DB.prepare('INSERT INTO crawl_jobs (id, tenant_id, start_url, max_pages, include_patterns, exclude_patterns, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, \'running\', datetime(\'now\'), datetime(\'now\'))').bind(jobId, tenant.id, startUrl, maxPages || 50, JSON.stringify(includePatterns || []), JSON.stringify(excludePatterns || [])).run();
  ctx.waitUntil((async () => {
    try {
      const result = await crawlWebsite(tenant.id, env.DB, startUrl, { maxPages: maxPages || 50, maxDepth: 3, includePatterns: includePatterns || [], excludePatterns: excludePatterns || [] });
      await env.DB.prepare('UPDATE crawl_jobs SET status = \'completed\', pages_crawled = ?, documents_created = ?, completed_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ?').bind(result.pagesCrawled, result.documentsCreated, jobId).run();
      await notifyN8N(env, 'crawl.completed', { job_id: jobId, pages_crawled: result.pagesCrawled, documents_created: result.documentsCreated });
    } catch (error) {
      await env.DB.prepare('UPDATE crawl_jobs SET status = \'failed\', error_message = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(error.message, jobId).run();
    }
  })());
  return new Response(JSON.stringify({ success: true, job_id: jobId, status: 'running' }), { status: 202, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

router.get('/api/v1/knowledge/crawl/:jobId', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const { jobId } = request.params;
  const job = await env.DB.prepare('SELECT * FROM crawl_jobs WHERE id = ? AND tenant_id = ?').bind(jobId, tenant.id).first();
  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  return new Response(JSON.stringify({ success: true, job: { id: job.id, start_url: job.start_url, status: job.status, pages_crawled: job.pages_crawled || 0, documents_created: job.documents_created || 0, error_message: job.error_message, created_at: job.created_at, completed_at: job.completed_at } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

router.get('/api/v1/knowledge/documents', async (request, env) => {
  const tenant = await authenticate(request, env);
  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const documents = await env.DB.prepare('SELECT id, source_type, source_url, title, word_count, status, crawled_at, created_at FROM knowledge_documents WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?').bind(tenant.id, limit, offset).all();
  const total = await env.DB.prepare('SELECT COUNT(*) as count FROM knowledge_documents WHERE tenant_id = ?').bind(tenant.id).first();
  return new Response(JSON.stringify({ success: true, documents: documents.results || [], pagination: { total: total.count, limit, offset, has_more: (offset + limit) < total.count } }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});

router.all('*', () => new Response('Not Found', { status: 404 }));

// ============================================================================
// WORKER ENTRY POINT
// ============================================================================
export default {
  fetch: (request, env, ctx) => router.handle(request, env, ctx)
};
