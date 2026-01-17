// src/modules/teams/routes.js - Routes de gestion des équipes
import * as auth from '../auth/helpers.js';
import { getUserTeams, getTeamMembers, isTeamManager, getVisibleAgents } from '../../utils/teams.js';
import { hasPermission } from '../../utils/permissions.js';

export async function handleTeamsRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/v1/teams - Liste les équipes visibles
  if (path === '/api/v1/teams' && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { user, tenant } = authResult;
      const teams = await getUserTeams(env, tenant.id, user.id, user.role);
      return new Response(JSON.stringify({ success: true, teams, count: teams.length }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Get teams error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // GET /api/v1/teams/:id/members - Liste les membres d'une équipe
  if (path.match(/^\/api\/v1\/teams\/[^/]+\/members$/) && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { user, tenant } = authResult;
      const teamId = path.split('/')[4];
      const userTeams = await getUserTeams(env, tenant.id, user.id, user.role);
      if (!userTeams.some(t => t.id === teamId)) {
        return new Response(JSON.stringify({ success: false, error: 'Accès non autorisé' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const members = await getTeamMembers(env, teamId);
      return new Response(JSON.stringify({ success: true, members, count: members.length }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Get team members error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /api/v1/teams - Créer une équipe
  if (path === '/api/v1/teams' && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { user, tenant } = authResult;
      const canManage = await hasPermission(env, tenant.id, user.role, 'manage_employees');
      if (!canManage) {
        return new Response(JSON.stringify({ success: false, error: 'Permission refusée' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const body = await request.json();
      const { name, description, manager_user_id, location } = body;
      if (!name) {
        return new Response(JSON.stringify({ success: false, error: 'Nom requis' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      await env.DB.prepare(`
        INSERT INTO teams (id, tenant_id, name, description, manager_user_id, location, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).bind(teamId, tenant.id, name, description || null, manager_user_id || null, location || null, now, now).run();
      return new Response(JSON.stringify({ success: true, team: { id: teamId, name } }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Create team error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // POST /api/v1/teams/:id/members - Ajouter un membre
  if (path.match(/^\/api\/v1\/teams\/[^/]+\/members$/) && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { user, tenant } = authResult;
      const teamId = path.split('/')[4];
      const isManager = await isTeamManager(env, user.id, teamId);
      if (user.role !== 'admin' && !isManager) {
        return new Response(JSON.stringify({ success: false, error: 'Permission refusée' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const body = await request.json();
      const { user_id, agent_id, role_in_team } = body;
      const memberId = `tm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await env.DB.prepare(`
        INSERT INTO team_members (id, team_id, user_id, agent_id, role_in_team)
        VALUES (?, ?, ?, ?, ?)
      `).bind(memberId, teamId, user_id || null, agent_id || null, role_in_team || 'member').run();
      return new Response(JSON.stringify({ success: true, member_id: memberId }), {
        status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Add member error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // GET /api/v1/teams/agents - Agents visibles par l'utilisateur
  if (path === '/api/v1/teams/agents' && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      const { user, tenant } = authResult;
      const agents = await getVisibleAgents(env, tenant.id, user.id, user.role);
      return new Response(JSON.stringify({ success: true, agents, count: agents.length }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Get agents error:', error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  return null;
}
