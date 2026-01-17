// src/middleware/permissions.js - Middleware de vérification des permissions
import { hasPermission } from '../utils/permissions.js';

/**
 * Middleware pour vérifier une permission
 * Usage: await requirePermission(env, tenant.id, user.role, 'manage_employees')
 */
export async function requirePermission(env, tenantId, role, permissionCode) {
  const allowed = await hasPermission(env, tenantId, role, permissionCode);
  
  if (!allowed) {
    return {
      allowed: false,
      response: new Response(JSON.stringify({
        success: false,
        error: 'Permission refusée',
        required_permission: permissionCode
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
  
  return { allowed: true };
}

/**
 * Vérifie plusieurs permissions (toutes requises)
 */
export async function requireAllPermissions(env, tenantId, role, permissionCodes) {
  for (const code of permissionCodes) {
    const result = await requirePermission(env, tenantId, role, code);
    if (!result.allowed) {
      return result;
    }
  }
  return { allowed: true };
}

/**
 * Vérifie plusieurs permissions (au moins une requise)
 */
export async function requireAnyPermission(env, tenantId, role, permissionCodes) {
  for (const code of permissionCodes) {
    const allowed = await hasPermission(env, tenantId, role, code);
    if (allowed) {
      return { allowed: true };
    }
  }
  
  return {
    allowed: false,
    response: new Response(JSON.stringify({
      success: false,
      error: 'Permission refusée',
      required_permissions: permissionCodes
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    })
  };
}
