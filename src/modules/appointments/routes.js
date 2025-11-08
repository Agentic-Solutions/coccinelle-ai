// Module Appointments - Routes
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export async function handleAppointmentsRoutes(request, env, path, method) {
  try {
    // GET /api/v1/appointments
    if (path === '/api/v1/appointments' && method === 'GET') {
      return await handleListAppointments(request, env);
    }
    
    // POST /api/v1/appointments
    if (path === '/api/v1/appointments' && method === 'POST') {
      return await handleCreateAppointment(request, env);
    }
    
    return null;
    
  } catch (error) {
    logger.error('Appointments route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

async function handleListAppointments(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  
  const result = await env.DB.prepare(`
    SELECT id, prospect_id, agent_id, scheduled_at, status, created_at
    FROM appointments
    WHERE tenant_id = ?
    ORDER BY scheduled_at DESC
  `).bind(tenantId).all();
  
  return successResponse({
    appointments: result.results,
    count: result.results.length
  });
}

async function handleCreateAppointment(request, env) {
  const body = await request.json();
  const { prospectId, agentId, scheduledAt, tenantId = 'tenant_demo_001' } = body;
  
  if (!prospectId || !scheduledAt) {
    return errorResponse('prospectId and scheduledAt are required', 400);
  }
  
  const appointmentId = `appointment_${Date.now()}`;
  const now = new Date().toISOString();
  
  await env.DB.prepare(`
    INSERT INTO appointments (id, tenant_id, prospect_id, agent_id, scheduled_at, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(appointmentId, tenantId, prospectId, agentId, scheduledAt, 'scheduled', now).run();
  
  return successResponse({
    appointment: {
      id: appointmentId,
      prospect_id: prospectId,
      agent_id: agentId,
      scheduled_at: scheduledAt,
      status: 'scheduled',
      created_at: now
    }
  }, 201);
}
