// src/modules/permissions/routes.js - Routes de gestion des permissions
import * as auth from '../auth/helpers.js';
import { getTenantPermissions, updatePermission, getAllPermissions, hasPermission } from '../../utils/permissions.js';

/**
 * Gère toutes les routes de permissions
 */
export async function handlePermissionsRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ========================================
  // GET /api/v1/permissions
  // Liste toutes les permissions disponibles (catalogue)
  // ========================================
  if (path === '/api/v1/permissions' && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const permissions = await getAllPermissions(env);

      return new Response(JSON.stringify({
        success: true,
        permissions
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Get permissions error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la récupération des permissions',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // GET /api/v1/permissions/tenant
  // Récupère les permissions du tenant courant
  // ========================================
  if (path === '/api/v1/permissions/tenant' && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { tenant } = authResult;
      const permissions = await getTenantPermissions(env, tenant.id);

      return new Response(JSON.stringify({
        success: true,
        permissions
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Get tenant permissions error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la récupération des permissions',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // PUT /api/v1/permissions/tenant
  // Met à jour une permission pour un rôle
  // Body: { role: 'manager', permission_code: 'view_all_stats', is_enabled: true }
  // ========================================
  if (path === '/api/v1/permissions/tenant' && method === 'PUT') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;

      // Seul l'admin peut modifier les permissions
      if (user.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Seul l\'administrateur peut modifier les permissions'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const body = await request.json();
      const { role, permission_code, is_enabled } = body;

      // Validation
      if (!role || !['manager', 'employee'].includes(role)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Rôle invalide (manager ou employee)'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!permission_code) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Code de permission requis'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      await updatePermission(env, tenant.id, role, permission_code, is_enabled);

      // Log audit
      const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
      const userAgent = request.headers.get('User-Agent') || 'unknown';
      await auth.logAudit(env, {
        tenant_id: tenant.id,
        user_id: user.id,
        action: 'permission.update',
        resource_type: 'permission',
        resource_id: `${role}_${permission_code}`,
        changes: { role, permission_code, is_enabled },
        ip_address: clientIp,
        user_agent: userAgent
      });

      return new Response(JSON.stringify({
        success: true,
        message: 'Permission mise à jour avec succès'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Update permission error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la mise à jour de la permission',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // ========================================
  // GET /api/v1/permissions/check/:permission_code
  // Vérifie si l'utilisateur courant a une permission
  // ========================================
  if (path.startsWith('/api/v1/permissions/check/') && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(JSON.stringify({ success: false, error: authResult.error }), {
          status: authResult.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { user, tenant } = authResult;
      const permissionCode = path.replace('/api/v1/permissions/check/', '');

      const allowed = await hasPermission(env, tenant.id, user.role, permissionCode);

      return new Response(JSON.stringify({
        success: true,
        permission_code: permissionCode,
        allowed
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Check permission error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Erreur lors de la vérification de la permission',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Route non trouvée
  return null;
}
