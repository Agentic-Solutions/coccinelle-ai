/**
 * Utilitaire de nettoyage de la base de données pour tests E2E
 * ⚠️ DANGER: Supprime toutes les données
 * À utiliser UNIQUEMENT en développement/test
 */

/**
 * Nettoie toutes les tables de la base de données
 * Conserve uniquement l'utilisateur test et le tenant test
 *
 * @param {Object} env - Environnement Cloudflare (contient DB)
 * @returns {Object} Résultat du nettoyage avec compteurs
 */
export async function cleanupDatabase(env) {
  const results = {
    success: true,
    deleted: {},
    errors: [],
    preserved: {
      users: [],
      tenants: []
    }
  };

  try {
    // 1. Omnichannel
    const tables = [
      'omni_messages',
      'omni_conversations',
      'omni_agent_configs',
      'omni_phone_mappings',
      'onboarding_sessions',
      'knowledge_documents',
      'knowledge_chunks',
      'products',
      'product_categories',
      'appointments',
      'prospects',
      'availability_slots',
      'agents'
    ];

    for (const table of tables) {
      try {
        const result = await env.DB.prepare(`DELETE FROM ${table}`).run();
        results.deleted[table] = result.meta?.changes || 0;
      } catch (error) {
        results.errors.push({
          table,
          error: error.message
        });
      }
    }

    // 2. Users - supprimer tous sauf test7@test.com
    try {
      const result = await env.DB.prepare(`
        DELETE FROM users WHERE email != 'test7@test.com'
      `).run();
      results.deleted.users = result.meta?.changes || 0;

      // Récupérer les users conservés
      const preserved = await env.DB.prepare(`
        SELECT id, email FROM users
      `).all();
      results.preserved.users = preserved.results;
    } catch (error) {
      results.errors.push({
        table: 'users',
        error: error.message
      });
    }

    // 3. Tenants - supprimer tous sauf tenant_dGVzdDdAdGVzdC5jb20
    try {
      const result = await env.DB.prepare(`
        DELETE FROM tenants WHERE id != 'tenant_dGVzdDdAdGVzdC5jb20'
      `).run();
      results.deleted.tenants = result.meta?.changes || 0;

      // Réinitialiser le tenant de test
      await env.DB.prepare(`
        UPDATE tenants
        SET
          company_name = NULL,
          sector = NULL,
          subscription_tier = 'free',
          subscription_status = 'active'
        WHERE id = 'tenant_dGVzdDdAdGVzdC5jb20'
      `).run();

      // Récupérer les tenants conservés
      const preserved = await env.DB.prepare(`
        SELECT id, company_name, sector FROM tenants
      `).all();
      results.preserved.tenants = preserved.results;
    } catch (error) {
      results.errors.push({
        table: 'tenants',
        error: error.message
      });
    }

    // 4. Vérification post-nettoyage
    const verificationTables = [
      'omni_conversations',
      'omni_messages',
      'omni_agent_configs',
      'omni_phone_mappings',
      'onboarding_sessions',
      'knowledge_documents',
      'products',
      'appointments',
      'prospects',
      'agents',
      'users',
      'tenants'
    ];

    results.verification = {};
    for (const table of verificationTables) {
      try {
        const count = await env.DB.prepare(`SELECT COUNT(*) as count FROM ${table}`).first();
        results.verification[table] = count.count;
      } catch (error) {
        results.verification[table] = 'error';
      }
    }

    // Si des erreurs, marquer comme échec partiel
    if (results.errors.length > 0) {
      results.success = false;
      results.message = 'Cleanup completed with errors';
    } else {
      results.message = 'Database cleaned successfully';
    }

  } catch (error) {
    results.success = false;
    results.message = 'Cleanup failed';
    results.errors.push({
      general: error.message,
      stack: error.stack
    });
  }

  return results;
}

/**
 * Handler pour la route API de nettoyage
 * POST /api/v1/admin/cleanup-database
 *
 * ⚠️ À protéger avec authentification admin en production!
 */
export async function handleCleanupRequest(request, env) {
  // ⚠️ SÉCURITÉ: Vérifier que c'est l'environnement de développement
  if (env.ENVIRONMENT !== 'development' && env.ENVIRONMENT !== 'test') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Cleanup is only available in development/test environment'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Vérifier le header de confirmation
  const confirmHeader = request.headers.get('X-Confirm-Cleanup');
  if (confirmHeader !== 'yes-i-understand-this-will-delete-all-data') {
    return new Response(JSON.stringify({
      success: false,
      error: 'Missing confirmation header',
      required_header: 'X-Confirm-Cleanup: yes-i-understand-this-will-delete-all-data'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await cleanupDatabase(env);

  return new Response(JSON.stringify(result), {
    status: result.success ? 200 : 500,
    headers: { 'Content-Type': 'application/json' }
  });
}
