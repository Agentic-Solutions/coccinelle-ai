// src/utils/teams.js - Gestion des équipes

/**
 * Récupère les équipes que l'utilisateur peut voir
 * - Admin: toutes les équipes du tenant
 * - Manager: ses équipes uniquement
 * - Employee: son équipe uniquement
 */
export async function getUserTeams(env, tenantId, userId, role) {
  if (role === 'admin') {
    // Admin voit toutes les équipes
    const result = await env.DB.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
        u.name as manager_name
      FROM teams t
      LEFT JOIN users u ON t.manager_user_id = u.id
      WHERE t.tenant_id = ? AND t.is_active = 1
      ORDER BY t.name
    `).bind(tenantId).all();
    return result.results || [];
  }
  
  // Manager ou Employee: uniquement ses équipes
  const result = await env.DB.prepare(`
    SELECT t.*, 
      (SELECT COUNT(*) FROM team_members WHERE team_id = t.id) as member_count,
      u.name as manager_name,
      tm.role_in_team
    FROM teams t
    JOIN team_members tm ON t.id = tm.team_id
    LEFT JOIN users u ON t.manager_user_id = u.id
    WHERE t.tenant_id = ? AND t.is_active = 1 AND tm.user_id = ?
    ORDER BY t.name
  `).bind(tenantId, userId).all();
  return result.results || [];
}

/**
 * Vérifie si un utilisateur est manager d'une équipe
 */
export async function isTeamManager(env, userId, teamId) {
  const result = await env.DB.prepare(`
    SELECT 1 FROM teams WHERE id = ? AND manager_user_id = ?
    UNION
    SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ? AND role_in_team = 'manager'
  `).bind(teamId, userId, teamId, userId).first();
  return !!result;
}

/**
 * Récupère les membres d'une équipe
 */
export async function getTeamMembers(env, teamId) {
  const result = await env.DB.prepare(`
    SELECT 
      tm.id,
      tm.role_in_team,
      tm.joined_at,
      u.id as user_id,
      u.name as user_name,
      u.email as user_email,
      u.role as user_role,
      a.id as agent_id,
      a.first_name,
      a.last_name,
      a.title,
      a.phone
    FROM team_members tm
    LEFT JOIN users u ON tm.user_id = u.id
    LEFT JOIN agents a ON tm.agent_id = a.id
    WHERE tm.team_id = ?
    ORDER BY tm.role_in_team DESC, u.name ASC
  `).bind(teamId).all();
  return result.results || [];
}

/**
 * Récupère les agents qu'un utilisateur peut voir
 * - Admin: tous les agents du tenant
 * - Manager: agents de ses équipes
 * - Employee: lui-même uniquement
 */
export async function getVisibleAgents(env, tenantId, userId, role) {
  if (role === 'admin') {
    const result = await env.DB.prepare(`
      SELECT a.*, t.name as team_name
      FROM agents a
      LEFT JOIN team_members tm ON a.id = tm.agent_id
      LEFT JOIN teams t ON tm.team_id = t.id
      WHERE a.tenant_id = ? AND a.is_active = 1
      ORDER BY a.first_name, a.last_name
    `).bind(tenantId).all();
    return result.results || [];
  }
  
  if (role === 'manager') {
    // Agents des équipes dont il est manager
    const result = await env.DB.prepare(`
      SELECT DISTINCT a.*, t.name as team_name
      FROM agents a
      JOIN team_members tm_agent ON a.id = tm_agent.agent_id
      JOIN teams t ON tm_agent.team_id = t.id
      WHERE a.tenant_id = ? AND a.is_active = 1
        AND t.id IN (
          SELECT team_id FROM team_members WHERE user_id = ? AND role_in_team = 'manager'
          UNION
          SELECT id FROM teams WHERE manager_user_id = ?
        )
      ORDER BY a.first_name, a.last_name
    `).bind(tenantId, userId, userId).all();
    return result.results || [];
  }
  
  // Employee: lui-même uniquement
  const result = await env.DB.prepare(`
    SELECT a.*, t.name as team_name
    FROM agents a
    LEFT JOIN team_members tm ON a.id = tm.agent_id
    LEFT JOIN teams t ON tm.team_id = t.id
    WHERE a.tenant_id = ? AND a.user_id = ? AND a.is_active = 1
  `).bind(tenantId, userId).all();
  return result.results || [];
}

/**
 * Vérifie si un utilisateur peut voir un agent spécifique
 */
export async function canViewAgent(env, tenantId, userId, role, agentId) {
  if (role === 'admin') return true;
  
  if (role === 'manager') {
    const result = await env.DB.prepare(`
      SELECT 1 FROM agents a
      JOIN team_members tm_agent ON a.id = tm_agent.agent_id
      WHERE a.id = ? AND a.tenant_id = ?
        AND tm_agent.team_id IN (
          SELECT team_id FROM team_members WHERE user_id = ? AND role_in_team = 'manager'
          UNION
          SELECT id FROM teams WHERE manager_user_id = ?
        )
    `).bind(agentId, tenantId, userId, userId).first();
    return !!result;
  }
  
  // Employee: peut voir uniquement lui-même
  const result = await env.DB.prepare(`
    SELECT 1 FROM agents WHERE id = ? AND tenant_id = ? AND user_id = ?
  `).bind(agentId, tenantId, userId).first();
  return !!result;
}

/**
 * Récupère les statistiques visibles par un utilisateur
 */
export async function getVisibleStats(env, tenantId, userId, role) {
  const agents = await getVisibleAgents(env, tenantId, userId, role);
  const agentIds = agents.map(a => a.id);
  
  if (agentIds.length === 0) {
    return { appointments: 0, revenue: 0, agents: 0 };
  }
  
  const placeholders = agentIds.map(() => '?').join(',');
  
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_appointments,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
    FROM appointments 
    WHERE tenant_id = ? AND agent_id IN (${placeholders})
  `).bind(tenantId, ...agentIds).first();
  
  return {
    appointments: stats?.total_appointments || 0,
    completed: stats?.completed || 0,
    cancelled: stats?.cancelled || 0,
    agents: agentIds.length
  };
}
