// Module Prospects - Routes
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export async function handleProspectsRoutes(request, env, path, method) {
  try {
    // GET /api/v1/prospects
    if (path === '/api/v1/prospects' && method === 'GET') {
      return await handleListProspects(request, env);
    }
    
    // POST /api/v1/prospects
    if (path === '/api/v1/prospects' && method === 'POST') {
      return await handleCreateProspect(request, env);
    }
    
    return null;
    
  } catch (error) {
    logger.error('Prospects route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

async function handleListProspects(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  
  const result = await env.DB.prepare(`
    SELECT id, name, email, phone, status, score, created_at
    FROM prospects
    WHERE tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenantId).all();
  
  return successResponse({
    prospects: result.results,
    count: result.results.length
  });
}

async function handleCreateProspect(request, env) {
  const body = await request.json();
  const { name, email, phone, tenantId = 'tenant_demo_001' } = body;
  
  if (!name || !email) {
    return errorResponse('name and email are required', 400);
  }
  
  const prospectId = `prospect_${Date.now()}`;
  const now = new Date().toISOString();
  
  await env.DB.prepare(`
    INSERT INTO prospects (id, tenant_id, name, email, phone, status, score, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(prospectId, tenantId, name, email, phone || null, 'new', 0, now).run();
  
  return successResponse({
    prospect: {
      id: prospectId,
      name,
      email,
      phone,
      status: 'new',
      score: 0,
      created_at: now
    }
  }, 201);
}
