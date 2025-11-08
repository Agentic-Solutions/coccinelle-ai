// Module VAPI - Routes (webhooks + API)
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export async function handleVapiRoutes(request, env, path, method) {
  try {
    // POST /webhooks/vapi/function-call
    if (path === '/webhooks/vapi/function-call' && method === 'POST') {
      return await handleFunctionCall(request, env);
    }
    
    // POST /webhooks/vapi/call-events
    if (path === '/webhooks/vapi/call-events' && method === 'POST') {
      return await handleCallEvents(request, env);
    }
    
    // GET /api/v1/vapi/calls
    if (path === '/api/v1/vapi/calls' && method === 'GET') {
      return await handleListCalls(request, env);
    }
    
    // GET /api/v1/vapi/stats
    if (path === '/api/v1/vapi/stats' && method === 'GET') {
      return await handleStats(request, env);
    }
    
    return null;
    
  } catch (error) {
    logger.error('VAPI route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

async function handleFunctionCall(request, env) {
  const body = await request.json();
  
  logger.info('VAPI function call received', { 
    functionName: body.message?.toolCalls?.[0]?.function?.name 
  });
  
  // Gérer les différents tool calls
  const toolCall = body.message?.toolCalls?.[0];
  
  if (!toolCall) {
    return errorResponse('No tool call found', 400);
  }
  
  const functionName = toolCall.function.name;
  const args = toolCall.function.arguments;
  
  let result;
  
  switch (functionName) {
    case 'search_knowledge':
      result = await searchKnowledge(args, env);
      break;
    case 'check_availability':
      result = await checkAvailability(args, env);
      break;
    case 'book_appointment':
      result = await bookAppointment(args, env);
      break;
    default:
      result = { error: 'Unknown function' };
  }
  
  return successResponse({
    results: [
      {
        toolCallId: toolCall.id,
        result: result
      }
    ]
  });
}

async function handleCallEvents(request, env) {
  const body = await request.json();
  
  logger.info('VAPI call event received', { 
    type: body.message?.type,
    callId: body.message?.call?.id 
  });
  
  // Enregistrer l'événement dans la DB
  const eventId = `event_${Date.now()}`;
  const now = new Date().toISOString();
  
  await env.DB.prepare(`
    INSERT INTO call_events (id, call_id, event_type, payload, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    eventId,
    body.message?.call?.id || 'unknown',
    body.message?.type || 'unknown',
    JSON.stringify(body),
    now
  ).run();
  
  return successResponse({ received: true });
}

async function handleListCalls(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  
  const result = await env.DB.prepare(`
    SELECT id, prospect_id, status, duration, created_at
    FROM calls
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(tenantId).all();
  
  return successResponse({
    calls: result.results,
    count: result.results.length
  });
}

async function handleStats(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  
  // Stats basiques
  const totalCalls = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM calls WHERE tenant_id = ?
  `).bind(tenantId).first();
  
  const successfulCalls = await env.DB.prepare(`
    SELECT COUNT(*) as count FROM calls WHERE tenant_id = ? AND status = 'completed'
  `).bind(tenantId).first();
  
  return successResponse({
    totalCalls: totalCalls.count,
    successfulCalls: successfulCalls.count,
    successRate: totalCalls.count > 0 
      ? (successfulCalls.count / totalCalls.count * 100).toFixed(2) 
      : 0
  });
}

// Tool call handlers
async function searchKnowledge(args, env) {
  // TODO: Implémenter recherche KB
  return { answer: 'Recherche KB non implémentée' };
}

async function checkAvailability(args, env) {
  // TODO: Implémenter vérification disponibilité
  return { available: true, slots: [] };
}

async function bookAppointment(args, env) {
  // TODO: Implémenter réservation
  return { success: true, appointmentId: 'apt_123' };
}
