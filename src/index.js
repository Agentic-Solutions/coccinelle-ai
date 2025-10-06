import { Router } from 'itty-router';
import { logVapiCall, getVapiCalls, getVapiCallById, getVapiStats } from './vapi-logger.js';

const router = Router();

// ============================================================================
// TIMEZONE OFFSETS
// ============================================================================
const TIMEZONE_OFFSETS = {
  'Europe/Paris': 2,
  'America/New_York': -4,
  'America/Los_Angeles': -7,
  'Asia/Tokyo': 9,
  'Australia/Sydney': 11,
  'Europe/London': 1,
  'America/Sao_Paulo': -3,
  'Asia/Dubai': 4,
};

// ============================================================================
// MIDDLEWARE
// ============================================================================
async function authenticateApiKey(request, env) {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key required' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tenant = await env.DB.prepare(
    'SELECT * FROM tenants WHERE api_key = ?'
  ).bind(apiKey).first();

  if (!tenant) {
    return new Response(JSON.stringify({ error: 'Invalid API key' }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return tenant;
}

// ============================================================================
// CORS
// ============================================================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
};

router.options('*', () => {
  return new Response(null, { 
    status: 204, 
    headers: corsHeaders 
  });
});

// ============================================================================
// VAPI WEBHOOK
// ============================================================================
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

      return new Response(JSON.stringify({ 
        success: true,
        message: 'End-of-call-report processed'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook received'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erreur webhook Vapi:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// ============================================================================
// HANDLER FUNCTIONS
// ============================================================================
async function handleSearchKnowledge(params, tenantId, db) {
  const { query } = params;
  
  const results = await db.prepare(`
    SELECT question, answer 
    FROM knowledge_base 
    WHERE tenant_id = ? 
    AND type = 'qa'
    AND (question LIKE ? OR answer LIKE ?)
    LIMIT 3
  `).bind(tenantId, `%${query}%`, `%${query}%`).all();

  if (results.results.length === 0) {
    return "Je n'ai pas trouvé d'information spécifique sur ce sujet dans ma base de connaissances.";
  }

  return results.results.map(r => `Q: ${r.question}\nR: ${r.answer}`).join('\n\n');
}

async function handleCheckAvailability(params, tenantId, db) {
  const { date } = params;
  
  const agents = await db.prepare(
    'SELECT id, name FROM agents WHERE tenant_id = ? LIMIT 1'
  ).bind(tenantId).first();

  if (!agents) {
    return "Aucun agent disponible pour le moment.";
  }

  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay();

  const slots = await db.prepare(`
    SELECT start_time, end_time 
    FROM availability_slots 
    WHERE agent_id = ? 
    AND day_of_week = ?
  `).bind(agents.id, dayOfWeek).all();

  if (slots.results.length === 0) {
    return `Désolé, nous ne sommes pas disponibles le ${targetDate.toLocaleDateString('fr-FR', { weekday: 'long' })}.`;
  }

  const availableSlots = slots.results.map(slot => {
    const [startHour] = slot.start_time.split(':');
    const [endHour] = slot.end_time.split(':');
    return `${startHour}h-${endHour}h`;
  }).join(', ');

  return `Pour le ${targetDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}, nous sommes disponibles aux horaires suivants : ${availableSlots}. Quel créneau vous conviendrait ?`;
}

async function handleCreateAppointment(params, tenantId, env, ctx) {
  const { firstName, lastName, phone, email, datetime } = params;
  
  const prospectId = `prospect_${Date.now()}`;
  const appointmentId = `appt_${Date.now()}`;
  const managementToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');

  const agents = await env.DB.prepare(
    'SELECT id FROM agents WHERE tenant_id = ? LIMIT 1'
  ).bind(tenantId).first();

  if (!agents) {
    return "Erreur: aucun agent disponible.";
  }

  try {
    await env.DB.prepare(`
      INSERT INTO prospects (id, tenant_id, first_name, last_name, email, phone, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'contacted', datetime('now'))
    `).bind(prospectId, tenantId, firstName, lastName, email || 'noemail@placeholder.com', phone).run();

    await env.DB.prepare(`
      INSERT INTO appointments (
        id, tenant_id, prospect_id, agent_id, type, 
        scheduled_at, status, management_token, created_at
      ) VALUES (?, ?, ?, ?, 'visit', ?, 'scheduled', ?, datetime('now'))
    `).bind(appointmentId, tenantId, prospectId, agents.id, datetime, managementToken).run();

    console.log('✅ RDV créé:', appointmentId);

    const prospectPhone = phone;
    const prospectEmail = email;
    const scheduledDate = new Date(datetime);
    
    const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Europe/Paris'
    });
    
    const formattedTime = scheduledDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris'
    });

    const managementUrl = `https://coccinelle-api.youssef-amrouche.workers.dev/rdv/${managementToken}`;

    if (prospectPhone && prospectPhone !== '') {
      const smsPromise = sendSMS(env, prospectPhone, firstName, formattedDate, formattedTime, managementUrl, tenantId, appointmentId);
      ctx.waitUntil(smsPromise);
    }

    if (prospectEmail && prospectEmail !== 'noemail@placeholder.com') {
      const emailPromise = sendEmail(env, prospectEmail, firstName, formattedDate, formattedTime, managementUrl, tenantId, appointmentId);
      ctx.waitUntil(emailPromise);
    }

    const callStatus = 'completed';
    const callDuration = 0;
    const callCost = '0.00';
    
    await env.DB.prepare(`
      INSERT INTO vapi_call_logs (
        id, tenant_id, call_id, phone_number,
        status, duration_seconds, cost_usd,
        prospect_id, prospect_name, prospect_email,
        appointment_created, appointment_id,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      `log_${Date.now()}`,
      tenantId,
      'call_via_webhook',
      prospectPhone || '',
      callStatus,
      callDuration,
      callCost,
      prospectId,
      `${firstName} ${lastName}`,
      prospectEmail || '',
      1,
      appointmentId
    ).run();
    
    console.log('✅ Appel Vapi loggé dans vapi_call_logs');

    return `Parfait ! Votre rendez-vous est confirmé pour le ${formattedDate} à ${formattedTime}. Vous allez recevoir un SMS avec tous les détails et un lien pour gérer votre rendez-vous.`;

  } catch (error) {
    console.error('Erreur création RDV:', error);
    return `Désolé, une erreur s'est produite lors de la création du rendez-vous. Erreur: ${error.message}`;
  }
}

async function sendSMS(env, phone, firstName, date, time, managementUrl, tenantId, appointmentId) {
  try {
    const twilioAccountSid = env.TWILIO_ACCOUNT_SID;
    const twilioAuthToken = env.TWILIO_AUTH_TOKEN;
    const twilioPhoneNumber = env.TWILIO_PHONE_NUMBER;

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.log('⚠️ Twilio non configuré, SMS non envoyé');
      return;
    }

    const message = `Bonjour ${firstName}, votre rendez-vous est confirmé le ${date} à ${time}. Gérez-le ici : ${managementUrl}`;

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: twilioPhoneNumber,
          Body: message,
        }),
      }
    );

    const twilioData = await response.json();
    console.log('✅ SMS envoyé');

    await env.DB.prepare(`
      INSERT INTO appointment_notifications (
        tenant_id, appointment_id, type, recipient, status, sent_at
      ) VALUES (?, ?, 'sms', ?, 'sent', datetime('now'))
    `).bind(tenantId, appointmentId, phone).run();

  } catch (error) {
    console.error('❌ Exception SMS:', error);
  }
}

async function sendEmail(env, email, firstName, date, time, managementUrl, tenantId, appointmentId) {
  try {
    const resendApiKey = env.RESEND_API_KEY;
    const fromEmail = env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!resendApiKey) {
      console.log('⚠️ Resend non configuré, email non envoyé');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Rendez-vous confirmé</h1>
          </div>
          <div class="content">
            <p>Bonjour ${firstName},</p>
            <p>Votre rendez-vous est confirmé pour le <strong>${date}</strong> à <strong>${time}</strong>.</p>
            <p>Vous pouvez gérer votre rendez-vous (modifier la date ou annuler) en cliquant sur le bouton ci-dessous :</p>
            <center>
              <a href="${managementUrl}" class="btn">Gérer mon rendez-vous</a>
            </center>
            <p>À très bientôt !</p>
          </div>
          <div class="footer">
            <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: email,
        subject: `Confirmation de votre rendez-vous - ${date} à ${time}`,
        html: htmlContent,
      }),
    });

    const resendData = await response.json();
    console.log('✅ Email envoyé');

    await env.DB.prepare(`
      INSERT INTO appointment_notifications (
        tenant_id, appointment_id, type, recipient, status, sent_at
      ) VALUES (?, ?, 'email', ?, 'sent', datetime('now'))
    `).bind(tenantId, appointmentId, email).run();

  } catch (error) {
    console.error('❌ Exception Email:', error);
  }
}

// ============================================================================
// PROSPECTS
// ============================================================================
router.get('/api/v1/prospects', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const prospects = await env.DB.prepare(
    'SELECT * FROM prospects WHERE tenant_id = ? ORDER BY created_at DESC'
  ).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    prospects: prospects.results
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.post('/api/v1/prospects', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const body = await request.json();
  const { name, email, phone, source } = body;

  const prospectId = `prospect_${Date.now()}`;

  await env.DB.prepare(`
    INSERT INTO prospects (id, tenant_id, name, email, phone, source, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'new', datetime('now'))
  `).bind(prospectId, tenant.id, name, email || null, phone || null, source || 'manual').run();

  return new Response(JSON.stringify({
    success: true,
    prospect_id: prospectId
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// ============================================================================
// AGENTS
// ============================================================================
router.get('/api/v1/agents', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const agents = await env.DB.prepare(
    'SELECT * FROM agents WHERE tenant_id = ? ORDER BY name'
  ).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    agents: agents.results
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.get('/api/v1/agents/:agentId/availability', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

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
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const agent = await env.DB.prepare(
    'SELECT * FROM agents WHERE id = ? AND tenant_id = ?'
  ).bind(agentId, tenant.id).first();

  if (!agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const slots = await env.DB.prepare(
    'SELECT * FROM availability_slots WHERE agent_id = ? AND tenant_id = ?'
  ).bind(agentId, tenant.id).all();

  const appointments = await env.DB.prepare(
    'SELECT scheduled_at FROM appointments WHERE agent_id = ? AND tenant_id = ? AND status = "scheduled"'
  ).bind(agentId, tenant.id).all();

  const blocks = await env.DB.prepare(
    'SELECT start_datetime, end_datetime FROM calendar_blocks WHERE agent_id = ? AND tenant_id = ?'
  ).bind(agentId, tenant.id).all();

  const availableSlots = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const daySlots = slots.results.filter(s => s.day_of_week === dayOfWeek);

    for (const slot of daySlots) {
      const [startHour, startMin] = slot.start_time.split(':').map(Number);
      const [endHour, endMin] = slot.end_time.split(':').map(Number);

      let currentTime = new Date(d);
      currentTime.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(d);
      slotEnd.setHours(endHour, endMin, 0, 0);

      while (currentTime < slotEnd) {
        const slotEndTime = new Date(currentTime.getTime() + duration * 60000);
        
        if (slotEndTime <= slotEnd) {
          let isBlocked = false;

          for (const appt of appointments.results) {
            const apptTime = new Date(appt.scheduled_at);
            const apptEnd = new Date(apptTime.getTime() + duration * 60000 + agent.buffer_time * 60000);
            if (currentTime < apptEnd && slotEndTime > apptTime) {
              isBlocked = true;
              break;
            }
          }

          for (const block of blocks.results) {
            const blockStart = new Date(block.start_datetime);
            const blockEnd = new Date(block.end_datetime);
            if (currentTime < blockEnd && slotEndTime > blockStart) {
              isBlocked = true;
              break;
            }
          }

          if (!isBlocked) {
            availableSlots.push({
              start: currentTime.toISOString(),
              end: slotEndTime.toISOString(),
              duration_minutes: duration
            });
          }
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30);
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
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.get('/api/v1/agents/:agentId/calendar-blocks', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const { agentId } = request.params;

  const blocks = await env.DB.prepare(
    'SELECT * FROM calendar_blocks WHERE agent_id = ? AND tenant_id = ? ORDER BY start_datetime'
  ).bind(agentId, tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    blocks: blocks.results
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.post('/api/v1/agents/:agentId/calendar-blocks', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const { agentId } = request.params;
  const body = await request.json();
  const { start_datetime, end_datetime, reason, title, is_all_day } = body;

  if (!start_datetime || !end_datetime) {
    return new Response(JSON.stringify({
      error: 'start_datetime and end_datetime are required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const blockId = `block_${Date.now()}`;

  await env.DB.prepare(`
    INSERT INTO calendar_blocks (
      id, agent_id, tenant_id, start_datetime, end_datetime, 
      reason, title, is_all_day, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    blockId, agentId, tenant.id, start_datetime, end_datetime,
    reason || null, title || null, is_all_day || 0
  ).run();

  return new Response(JSON.stringify({
    success: true,
    block_id: blockId
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.delete('/api/v1/agents/:agentId/calendar-blocks/:blockId', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const { agentId, blockId } = request.params;

  const result = await env.DB.prepare(
    'DELETE FROM calendar_blocks WHERE id = ? AND agent_id = ? AND tenant_id = ?'
  ).bind(blockId, agentId, tenant.id).run();

  if (result.meta.changes === 0) {
    return new Response(JSON.stringify({ error: 'Block not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Block deleted'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// ============================================================================
// SERVICES
// ============================================================================
router.get('/api/v1/services', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const services = await env.DB.prepare(
    'SELECT * FROM services WHERE tenant_id = ? ORDER BY name'
  ).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    services: services.results
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.post('/api/v1/services', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const body = await request.json();
  const { name, description, category, duration_minutes } = body;

  const serviceId = `service_${Date.now()}`;

  await env.DB.prepare(`
    INSERT INTO services (id, tenant_id, name, description, category, duration_minutes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(serviceId, tenant.id, name, description || null, category || null, duration_minutes || 60).run();

  return new Response(JSON.stringify({
    success: true,
    service_id: serviceId
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// ============================================================================
// APPOINTMENT TYPES
// ============================================================================
router.get('/api/v1/appointment-types', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const types = await env.DB.prepare(
    'SELECT * FROM appointment_types WHERE tenant_id = ? ORDER BY name'
  ).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    types: types.results
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.post('/api/v1/appointment-types', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const body = await request.json();
  const { name, description, duration_minutes, color } = body;

  const typeId = `type_${Date.now()}`;

  await env.DB.prepare(`
    INSERT INTO appointment_types (id, tenant_id, name, description, duration_minutes, color, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(typeId, tenant.id, name, description || null, duration_minutes || 60, color || null).run();

  return new Response(JSON.stringify({
    success: true,
    type_id: typeId
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.delete('/api/v1/appointment-types/:typeId', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const { typeId } = request.params;

  const result = await env.DB.prepare(
    'DELETE FROM appointment_types WHERE id = ? AND tenant_id = ?'
  ).bind(typeId, tenant.id).run();

  if (result.meta.changes === 0) {
    return new Response(JSON.stringify({ error: 'Type not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Type deleted'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// ============================================================================
// KNOWLEDGE BASE
// ============================================================================
router.get('/api/v1/knowledge-base', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const entries = await env.DB.prepare(
    'SELECT * FROM knowledge_base WHERE tenant_id = ? ORDER BY created_at DESC'
  ).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    entries: entries.results
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.post('/api/v1/knowledge-base', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const body = await request.json();
  const { type, category, question, answer, document_url, metadata } = body;

  const entryId = `kb_${Date.now()}`;

  await env.DB.prepare(`
    INSERT INTO knowledge_base (
      id, tenant_id, type, category, question, answer, 
      document_url, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    entryId, tenant.id, type, category || null, question || null, 
    answer || null, document_url || null, metadata || null
  ).run();

  return new Response(JSON.stringify({
    success: true,
    entry_id: entryId
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.put('/api/v1/knowledge-base/:kbId', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const { kbId } = request.params;
  const body = await request.json();
  const { question, answer, category } = body;

  const result = await env.DB.prepare(`
    UPDATE knowledge_base 
    SET question = ?, answer = ?, category = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(question, answer, category, kbId, tenant.id).run();

  if (result.meta.changes === 0) {
    return new Response(JSON.stringify({ error: 'Entry not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Entry updated'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.delete('/api/v1/knowledge-base/:kbId', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const { kbId } = request.params;

  const result = await env.DB.prepare(
    'DELETE FROM knowledge_base WHERE id = ? AND tenant_id = ?'
  ).bind(kbId, tenant.id).run();

  if (result.meta.changes === 0) {
    return new Response(JSON.stringify({ error: 'Entry not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Entry deleted'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// ============================================================================
// APPOINTMENTS
// ============================================================================
router.get('/api/v1/appointments', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const appointments = await env.DB.prepare(`
    SELECT 
      a.*,
      COALESCE(p.first_name || ' ' || p.last_name, '') as prospect_name,
      ag.name as agent_name
    FROM appointments a
    LEFT JOIN prospects p ON a.prospect_id = p.id
    LEFT JOIN agents ag ON a.agent_id = ag.id
    WHERE a.tenant_id = ?
    ORDER BY a.scheduled_at DESC
  `).bind(tenant.id).all();

  return new Response(JSON.stringify({
    success: true,
    appointments: appointments.results
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.post('/api/v1/appointments', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const body = await request.json();
  const { prospect_id, agent_id, service_id, type, scheduled_at, notes } = body;

  const appointmentId = `appt_${Date.now()}`;
  const managementToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '');

  await env.DB.prepare(`
    INSERT INTO appointments (
      id, tenant_id, prospect_id, agent_id, service_id, type,
      scheduled_at, status, management_token, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, datetime('now'))
  `).bind(
    appointmentId, tenant.id, prospect_id, agent_id, 
    service_id || null, type, scheduled_at, managementToken, notes || null
  ).run();

  const managementUrl = `https://coccinelle-api.youssef-amrouche.workers.dev/rdv/${managementToken}`;

  return new Response(JSON.stringify({
    success: true,
    appointment_id: appointmentId,
    management_url: managementUrl
  }), {
    status: 201,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// ============================================================================
// PUBLIC APPOINTMENT MANAGEMENT
// ============================================================================
router.get('/rdv/:token', async (request, env) => {
  const { token } = request.params;

  const appointment = await env.DB.prepare(`
    SELECT 
      a.*,
      COALESCE(p.first_name || ' ' || p.last_name, '') as prospect_name,
      p.phone as prospect_phone,
      p.email as prospect_email,
      ag.name as agent_name
    FROM appointments a
    LEFT JOIN prospects p ON a.prospect_id = p.id
    LEFT JOIN agents ag ON a.agent_id = ag.id
    WHERE a.management_token = ?
  `).bind(token).first();

  if (!appointment) {
    return new Response('Rendez-vous introuvable', { status: 404 });
  }

  const scheduledDate = new Date(appointment.scheduled_at);
  const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = scheduledDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Gérer mon rendez-vous</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 32px; }
    h1 { font-size: 24px; color: #111; margin-bottom: 8px; }
    .subtitle { color: #666; font-size: 14px; margin-bottom: 32px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; margin-bottom: 24px; }
    .status.scheduled { background: #dbeafe; color: #1e40af; }
    .status.cancelled { background: #fee2e2; color: #991b1b; }
    .info-section { margin-bottom: 24px; }
    .info-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .info-value { font-size: 16px; color: #111; }
    .actions { display: flex; gap: 12px; margin-top: 32px; }
    button { flex: 1; padding: 12px; border: none; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
    button:hover { opacity: 0.9; }
    .btn-modify { background: #4F46E5; color: white; }
    .btn-cancel { background: #fee2e2; color: #991b1b; }
    .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e5e5; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Votre rendez-vous</h1>
    <p class="subtitle">Vous pouvez modifier ou annuler votre rendez-vous ci-dessous</p>
    
    <span class="status ${appointment.status}">${appointment.status === 'scheduled' ? 'Confirmé' : 'Annulé'}</span>
    
    <div class="info-section">
      <div class="info-label">Date et heure</div>
      <div class="info-value">${formattedDate} à ${formattedTime}</div>
    </div>
    
    <div class="info-section">
      <div class="info-label">Avec</div>
      <div class="info-value">${appointment.agent_name || 'Agent non spécifié'}</div>
    </div>
    
    ${appointment.status === 'scheduled' ? `
    <div class="actions">
      <button class="btn-modify" onclick="modifyAppointment()">Modifier la date</button>
      <button class="btn-cancel" onclick="cancelAppointment()">Annuler</button>
    </div>
    ` : '<p style="color: #991b1b;">Ce rendez-vous a été annulé.</p>'}
    
    <div class="footer">
      <p>Cet outil a été généré automatiquement</p>
    </div>
  </div>
  
  <script>
    function modifyAppointment() {
      const newDate = prompt('Nouvelle date et heure (format: AAAA-MM-JJ HH:MM):', '${appointment.scheduled_at.slice(0, 16).replace('T', ' ')}');
      if (newDate) {
        const isoDate = newDate.replace(' ', 'T') + ':00Z';
        fetch('/rdv/${token}/modify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ new_datetime: isoDate })
        }).then(r => r.json()).then(d => {
          if (d.success) {
            alert('Rendez-vous modifié avec succès !');
            location.reload();
          } else {
            alert('Erreur: ' + (d.error || 'Modification impossible'));
          }
        });
      }
    }
    
    function cancelAppointment() {
      if (confirm('Êtes-vous sûr de vouloir annuler ce rendez-vous ?')) {
        fetch('/rdv/${token}/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).then(r => r.json()).then(d => {
          if (d.success) {
            alert('Rendez-vous annulé.');
            location.reload();
          } else {
            alert('Erreur: ' + (d.error || 'Annulation impossible'));
          }
        });
      }
    }
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
});

router.get('/rdv/:token/availability', async (request, env) => {
  const { token } = request.params;

  const appointment = await env.DB.prepare(
    'SELECT agent_id, tenant_id FROM appointments WHERE management_token = ?'
  ).bind(token).first();

  if (!appointment) {
    return new Response(JSON.stringify({ error: 'Appointment not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const url = new URL(request.url);
  const startDate = url.searchParams.get('start_date');
  const endDate = url.searchParams.get('end_date');
  const duration = parseInt(url.searchParams.get('duration') || '60');

  if (!startDate || !endDate) {
    return new Response(JSON.stringify({
      error: 'start_date and end_date are required'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const agent = await env.DB.prepare(
    'SELECT * FROM agents WHERE id = ? AND tenant_id = ?'
  ).bind(appointment.agent_id, appointment.tenant_id).first();

  if (!agent) {
    return new Response(JSON.stringify({ error: 'Agent not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  const slots = await env.DB.prepare(
    'SELECT * FROM availability_slots WHERE agent_id = ? AND tenant_id = ?'
  ).bind(appointment.agent_id, appointment.tenant_id).all();

  const appointments = await env.DB.prepare(
    'SELECT scheduled_at FROM appointments WHERE agent_id = ? AND tenant_id = ? AND status = "scheduled"'
  ).bind(appointment.agent_id, appointment.tenant_id).all();

  const blocks = await env.DB.prepare(
    'SELECT start_datetime, end_datetime FROM calendar_blocks WHERE agent_id = ? AND tenant_id = ?'
  ).bind(appointment.agent_id, appointment.tenant_id).all();

  const availableSlots = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    const daySlots = slots.results.filter(s => s.day_of_week === dayOfWeek);

    for (const slot of daySlots) {
      const [startHour, startMin] = slot.start_time.split(':').map(Number);
      const [endHour, endMin] = slot.end_time.split(':').map(Number);

      let currentTime = new Date(d);
      currentTime.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(d);
      slotEnd.setHours(endHour, endMin, 0, 0);

      while (currentTime < slotEnd) {
        const slotEndTime = new Date(currentTime.getTime() + duration * 60000);
        
        if (slotEndTime <= slotEnd) {
          let isBlocked = false;

          for (const appt of appointments.results) {
            const apptTime = new Date(appt.scheduled_at);
            const apptEnd = new Date(apptTime.getTime() + duration * 60000 + agent.buffer_time * 60000);
            if (currentTime < apptEnd && slotEndTime > apptTime) {
              isBlocked = true;
              break;
            }
          }

          for (const block of blocks.results) {
            const blockStart = new Date(block.start_datetime);
            const blockEnd = new Date(block.end_datetime);
            if (currentTime < blockEnd && slotEndTime > blockStart) {
              isBlocked = true;
              break;
            }
          }

          if (!isBlocked) {
            availableSlots.push({
              start: currentTime.toISOString(),
              end: slotEndTime.toISOString(),
              duration_minutes: duration
            });
          }
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }
    }
  }

  return new Response(JSON.stringify({
    success: true,
    available_slots: availableSlots
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.post('/rdv/:token/modify', async (request, env) => {
  const { token } = request.params;
  const body = await request.json();
  const { new_datetime } = body;

  const result = await env.DB.prepare(
    'UPDATE appointments SET scheduled_at = ? WHERE management_token = ?'
  ).bind(new_datetime, token).run();

  if (result.meta.changes === 0) {
    return new Response(JSON.stringify({ error: 'Appointment not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Appointment modified'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.post('/rdv/:token/cancel', async (request, env) => {
  const { token } = request.params;

  const result = await env.DB.prepare(
    'UPDATE appointments SET status = "cancelled" WHERE management_token = ?'
  ).bind(token).run();

  if (result.meta.changes === 0) {
    return new Response(JSON.stringify({ error: 'Appointment not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  return new Response(JSON.stringify({
    success: true,
    message: 'Appointment cancelled'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// ============================================================================
// VAPI LOGS ENDPOINTS
// ============================================================================
router.get('/api/v1/vapi/calls', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const prospectId = url.searchParams.get('prospect_id');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');

  const calls = await getVapiCalls(env, tenant.id, { status, prospectId, dateFrom, dateTo });

  return new Response(JSON.stringify({
    success: true,
    calls: calls
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.get('/api/v1/vapi/calls/:callId', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const { callId } = request.params;
  const call = await getVapiCallById(env, tenant.id, callId);

  if (!call) {
    return new Response(JSON.stringify({ error: 'Call not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  if (call.functions_called) {
    try {
      call.functions_called = JSON.parse(call.functions_called);
    } catch (e) {
      call.functions_called = [];
    }
  }

  return new Response(JSON.stringify({
    success: true,
    call: call
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.get('/api/v1/vapi/stats', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const stats = await getVapiStats(env, tenant.id);

  return new Response(JSON.stringify({
    success: true,
    stats: stats
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

router.all('*', () => new Response('Not Found', { status: 404 }));

export default {
  fetch: router.handle
};
