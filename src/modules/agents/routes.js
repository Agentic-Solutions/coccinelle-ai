// Module Agents - Routes
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export async function handleAgentsRoutes(request, env, path, method) {
  try {
    // GET /api/v1/agents
    if (path === '/api/v1/agents' && method === 'GET') {
      return await handleListAgents(request, env);
    }
    
    return null;
    
  } catch (error) {
    logger.error('Agents route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

async function handleListAgents(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';

  const result = await env.DB.prepare(`
    SELECT
      id,
      first_name,
      last_name,
      (first_name || ' ' || last_name) as name,
      email,
      phone,
      is_active,
      created_at
    FROM commercial_agents
    WHERE tenant_id = ? AND is_active = 1
    ORDER BY first_name ASC, last_name ASC
  `).bind(tenantId).all();

  return successResponse({
    agents: result.results,
    count: result.results.length
  });
}
