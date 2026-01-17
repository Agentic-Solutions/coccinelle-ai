// src/utils/permissions.js - Gestion des permissions par tenant

/**
 * Initialise les permissions par défaut pour un nouveau tenant
 * Appelé lors du signup
 */
export async function initTenantPermissions(env, tenantId) {
  const now = new Date().toISOString();
  
  // Récupérer toutes les permissions avec leurs valeurs par défaut
  const permissions = await env.DB.prepare(`
    SELECT code, default_for_admin, default_for_manager, default_for_employee 
    FROM permissions
  `).all();
  
  if (!permissions.results || permissions.results.length === 0) {
    console.log('No permissions found in database');
    return;
  }
  
  const roles = ['admin', 'manager', 'employee'];
  const statements = [];
  
  for (const perm of permissions.results) {
    for (const role of roles) {
      const defaultValue = role === 'admin' 
        ? perm.default_for_admin 
        : role === 'manager' 
          ? perm.default_for_manager 
          : perm.default_for_employee;
      
      const id = `trp_${tenantId}_${role}_${perm.code}`;
      
      statements.push(
        env.DB.prepare(`
          INSERT INTO tenant_role_permissions (id, tenant_id, role, permission_code, is_enabled, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(id, tenantId, role, perm.code, defaultValue, now)
      );
    }
  }
  
  // Exécuter en batch
  await env.DB.batch(statements);
}

/**
 * Vérifie si un utilisateur a une permission spécifique
 */
export async function hasPermission(env, tenantId, role, permissionCode) {
  // Admin a toujours toutes les permissions
  if (role === 'admin') {
    return true;
  }
  
  const result = await env.DB.prepare(`
    SELECT is_enabled 
    FROM tenant_role_permissions 
    WHERE tenant_id = ? AND role = ? AND permission_code = ?
  `).bind(tenantId, role, permissionCode).first();
  
  return result?.is_enabled === 1;
}

/**
 * Récupère toutes les permissions d'un tenant groupées par rôle
 */
export async function getTenantPermissions(env, tenantId) {
  const results = await env.DB.prepare(`
    SELECT 
      trp.role,
      trp.permission_code,
      trp.is_enabled,
      p.name,
      p.description,
      p.category
    FROM tenant_role_permissions trp
    JOIN permissions p ON trp.permission_code = p.code
    WHERE trp.tenant_id = ?
    ORDER BY trp.role, p.category, p.code
  `).bind(tenantId).all();
  
  // Grouper par rôle
  const grouped = {
    admin: [],
    manager: [],
    employee: []
  };
  
  for (const row of results.results || []) {
    grouped[row.role]?.push({
      code: row.permission_code,
      name: row.name,
      description: row.description,
      category: row.category,
      is_enabled: row.is_enabled === 1
    });
  }
  
  return grouped;
}

/**
 * Met à jour une permission pour un rôle d'un tenant
 */
export async function updatePermission(env, tenantId, role, permissionCode, isEnabled) {
  // On ne peut pas modifier les permissions admin
  if (role === 'admin') {
    throw new Error('Cannot modify admin permissions');
  }
  
  const now = new Date().toISOString();
  
  await env.DB.prepare(`
    UPDATE tenant_role_permissions 
    SET is_enabled = ?, created_at = ?
    WHERE tenant_id = ? AND role = ? AND permission_code = ?
  `).bind(isEnabled ? 1 : 0, now, tenantId, role, permissionCode).run();
}

/**
 * Récupère le catalogue de toutes les permissions disponibles
 */
export async function getAllPermissions(env) {
  const results = await env.DB.prepare(`
    SELECT code, name, description, category, 
           default_for_admin, default_for_manager, default_for_employee
    FROM permissions
    ORDER BY category, code
  `).all();
  
  return results.results || [];
}
