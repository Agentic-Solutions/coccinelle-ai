// Module Calls - Endpoints API pour l'historique des appels reels
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { requireAuth } from '../auth/helpers.js';
import { getCorsHeaders } from '../../config/cors.js';

/**
 * GET /api/v1/calls — liste des appels du tenant (pagination)
 * GET /api/v1/calls/:id — detail d'un appel (transcription, resume, duree, sentiment)
 * GET /api/v1/calls/stats — statistiques des appels du tenant
 */
export async function handleCallsRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // Auth obligatoire sur toutes les routes
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return Response.json({ error: authResult.error }, { status: authResult.status, headers: corsHeaders });
  }

  const tenantId = authResult.tenant.id;

  try {
    // GET /api/v1/calls/stats
    if (path === '/api/v1/calls/stats' && method === 'GET') {
      return await getCallStats(env, tenantId, corsHeaders);
    }

    // GET /api/v1/calls/:id
    const callDetailMatch = path.match(/^\/api\/v1\/calls\/([^\/]+)$/);
    if (callDetailMatch && method === 'GET') {
      const callId = callDetailMatch[1];
      if (callId === 'stats') return null; // handled above
      return await getCallDetail(env, tenantId, callId, corsHeaders);
    }

    // GET /api/v1/calls
    if (path === '/api/v1/calls' && method === 'GET') {
      return await listCalls(request, env, tenantId, corsHeaders);
    }

    return null;
  } catch (error) {
    logger.error('Calls route error', { error: error.message, path });
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}

/**
 * GET /api/v1/calls — Liste des appels avec pagination et filtres
 */
async function listCalls(request, env, tenantId, corsHeaders) {
  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page')) || 1);
  const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 200);
  const offset = (page - 1) * limit;
  const status = url.searchParams.get('status');
  const direction = url.searchParams.get('direction');
  const dateFrom = url.searchParams.get('date_from');
  const dateTo = url.searchParams.get('date_to');

  let whereClause = 'WHERE c.tenant_id = ?';
  const params = [tenantId];

  if (status) {
    whereClause += ' AND c.status = ?';
    params.push(status);
  }
  if (direction) {
    whereClause += ' AND c.direction = ?';
    params.push(direction);
  }
  if (dateFrom) {
    whereClause += ' AND c.created_at >= ?';
    params.push(dateFrom);
  }
  if (dateTo) {
    whereClause += " AND c.created_at <= ? || 'T23:59:59'";
    params.push(dateTo);
  }

  // Count total
  const countResult = await env.DB.prepare(
    `SELECT COUNT(*) as total FROM calls c ${whereClause}`
  ).bind(...params).first();

  // Fetch calls with joined summary and prospect info
  const callsResult = await env.DB.prepare(`
    SELECT
      c.id,
      c.retell_call_id,
      c.twilio_call_sid,
      c.from_number,
      c.to_number,
      c.direction,
      c.status,
      c.duration,
      c.transcript,
      c.post_call_analysis,
      c.prospect_id,
      c.started_at,
      c.ended_at,
      c.created_at,
      cs.summary,
      cs.sentiment,
      cs.intent,
      cs.appointment_booked,
      p.first_name as prospect_first_name,
      p.last_name as prospect_last_name,
      p.phone as prospect_phone,
      p.email as prospect_email
    FROM calls c
    LEFT JOIN call_summaries cs ON cs.call_id = c.id
    LEFT JOIN prospects p ON p.id = c.prospect_id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();

  const total = countResult?.total || 0;
  const calls = (callsResult.results || []).map(formatCallForAPI);

  return Response.json({
    success: true,
    calls,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit)
    }
  }, { headers: corsHeaders });
}

/**
 * GET /api/v1/calls/:id — Detail d'un appel
 */
async function getCallDetail(env, tenantId, callId, corsHeaders) {
  // Fetch call
  const call = await env.DB.prepare(`
    SELECT
      c.*,
      cs.summary,
      cs.sentiment,
      cs.intent,
      cs.appointment_booked,
      cs.message_count,
      p.first_name as prospect_first_name,
      p.last_name as prospect_last_name,
      p.phone as prospect_phone,
      p.email as prospect_email,
      p.id as prospect_id_ref
    FROM calls c
    LEFT JOIN call_summaries cs ON cs.call_id = c.id
    LEFT JOIN prospects p ON p.id = c.prospect_id
    WHERE c.id = ? AND c.tenant_id = ?
  `).bind(callId, tenantId).first();

  if (!call) {
    return Response.json({ error: 'Appel non trouve' }, { status: 404, headers: corsHeaders });
  }

  // Parse analysis if exists
  let analysis = null;
  if (call.post_call_analysis) {
    try {
      analysis = JSON.parse(call.post_call_analysis);
    } catch (e) {
      analysis = { raw: call.post_call_analysis };
    }
  }

  return Response.json({
    success: true,
    call: {
      ...formatCallForAPI(call),
      transcript: call.transcript || null,
      analysis,
      message_count: call.message_count || 0,
      prospect: call.prospect_id_ref ? {
        id: call.prospect_id_ref,
        first_name: call.prospect_first_name,
        last_name: call.prospect_last_name,
        phone: call.prospect_phone,
        email: call.prospect_email
      } : null
    }
  }, { headers: corsHeaders });
}

/**
 * GET /api/v1/calls/stats — Statistiques des appels
 */
async function getCallStats(env, tenantId, corsHeaders) {
  const stats = await env.DB.prepare(`
    SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN status IN ('completed', 'ended') THEN 1 ELSE 0 END) as completed_calls,
      SUM(CASE WHEN status IN ('failed', 'no_answer', 'busy') THEN 1 ELSE 0 END) as failed_calls,
      AVG(CASE WHEN duration > 0 THEN duration ELSE NULL END) as avg_duration,
      SUM(duration) as total_duration,
      SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound_calls,
      SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound_calls
    FROM calls
    WHERE tenant_id = ?
  `).bind(tenantId).first();

  // Count appointments from call_summaries
  const apptStats = await env.DB.prepare(`
    SELECT
      SUM(CASE WHEN cs.appointment_booked = 1 THEN 1 ELSE 0 END) as appointments_created
    FROM calls c
    LEFT JOIN call_summaries cs ON cs.call_id = c.id
    WHERE c.tenant_id = ?
  `).bind(tenantId).first();

  const totalCalls = stats?.total_calls || 0;
  const completedCalls = stats?.completed_calls || 0;
  const appointmentsCreated = apptStats?.appointments_created || 0;

  return Response.json({
    success: true,
    stats: {
      total_calls: totalCalls,
      completed_calls: completedCalls,
      failed_calls: stats?.failed_calls || 0,
      avg_duration_seconds: Math.round(stats?.avg_duration || 0),
      total_duration_seconds: stats?.total_duration || 0,
      inbound_calls: stats?.inbound_calls || 0,
      outbound_calls: stats?.outbound_calls || 0,
      appointments_created: appointmentsCreated,
      conversion_rate: totalCalls > 0
        ? (appointmentsCreated / totalCalls * 100).toFixed(1) + '%'
        : '0%'
    }
  }, { headers: corsHeaders });
}

/**
 * Formatte un appel pour l'API
 */
function formatCallForAPI(call) {
  let sentiment = call.sentiment || null;
  // Try to extract from post_call_analysis if no summary sentiment
  if (!sentiment && call.post_call_analysis) {
    try {
      const analysis = JSON.parse(call.post_call_analysis);
      sentiment = analysis.user_sentiment || analysis.sentiment || null;
    } catch (e) {}
  }

  let summary = call.summary || null;
  if (!summary && call.post_call_analysis) {
    try {
      const analysis = JSON.parse(call.post_call_analysis);
      summary = analysis.call_summary || null;
    } catch (e) {}
  }

  return {
    id: call.id,
    retell_call_id: call.retell_call_id || null,
    from_number: call.from_number,
    to_number: call.to_number,
    direction: call.direction || 'inbound',
    status: call.status,
    duration: call.duration || 0,
    sentiment,
    summary,
    appointment_booked: call.appointment_booked || 0,
    prospect_name: [call.prospect_first_name, call.prospect_last_name].filter(Boolean).join(' ') || null,
    prospect_id: call.prospect_id || null,
    started_at: call.started_at,
    ended_at: call.ended_at,
    created_at: call.created_at
  };
}
