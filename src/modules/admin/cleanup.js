/**
 * Module Admin - Nettoyage de la base de données
 * Pour réinitialiser complètement les données de test
 */

export async function cleanupDatabase(env) {
  try {
    console.log('🧹 Starting database cleanup...');

    // Désactiver temporairement les foreign keys pour permettre la suppression
    await env.DB.prepare('PRAGMA foreign_keys = OFF').run();
    console.log('🔓 Foreign keys disabled');

    // Ordre de suppression important : du plus dépendant au moins dépendant

    // 1. Omnichannel - Messages (référence conversations)
    try {
      await env.DB.prepare('DELETE FROM omni_messages').run();
      console.log('✅ Omni messages deleted');
    } catch (e) {
      console.log('⚠️ Omni messages table not found, skipping');
    }

    // 2. Omnichannel - Conversations (référence tenants)
    try {
      await env.DB.prepare('DELETE FROM omni_conversations').run();
      console.log('✅ Omni conversations deleted');
    } catch (e) {
      console.log('⚠️ Omni conversations table not found, skipping');
    }

    // 3. Omnichannel - Agent configs (référence tenants)
    try {
      await env.DB.prepare('DELETE FROM omni_agent_configs').run();
      console.log('✅ Omni agent configs deleted');
    } catch (e) {
      console.log('⚠️ Omni agent configs table not found, skipping');
    }

    // 4. Omnichannel - Phone mappings (référence tenants)
    try {
      await env.DB.prepare('DELETE FROM omni_phone_mappings').run();
      console.log('✅ Omni phone mappings deleted');
    } catch (e) {
      console.log('⚠️ Omni phone mappings table not found, skipping');
    }

    // 5. Knowledge Base - Chunks (référence documents)
    try {
      await env.DB.prepare('DELETE FROM knowledge_chunks').run();
      console.log('✅ Knowledge chunks deleted');
    } catch (e) {
      console.log('⚠️ Knowledge chunks table not found, skipping');
    }

    // 6. Knowledge Base - Documents (référence tenants)
    try {
      await env.DB.prepare('DELETE FROM knowledge_documents').run();
      console.log('✅ Knowledge documents deleted');
    } catch (e) {
      console.log('⚠️ Knowledge documents table not found, skipping');
    }

    // 7. Products (référence tenants, categories)
    try {
      await env.DB.prepare('DELETE FROM products').run();
      console.log('✅ Products deleted');
    } catch (e) {
      console.log('⚠️ Products table not found, skipping');
    }

    // 8. Supprimer les appointments (référence prospects, agents, properties, tenants)
    await env.DB.prepare('DELETE FROM appointments').run();
    console.log('✅ Appointments deleted');

    // 9. Supprimer les availability_slots (référence tenants, agents)
    await env.DB.prepare('DELETE FROM availability_slots').run();
    console.log('✅ Availability slots deleted');

    // 10. Supprimer les calls si la table existe (référence tenants)
    try {
      await env.DB.prepare('DELETE FROM calls').run();
      console.log('✅ Calls deleted');
    } catch (e) {
      console.log('⚠️ Calls table not found, skipping');
    }

    // 11. Supprimer les sessions d'onboarding (référence tenants)
    await env.DB.prepare('DELETE FROM onboarding_sessions').run();
    console.log('✅ Onboarding sessions deleted');

    // 12. Supprimer les analytics d'onboarding si la table existe (référence sessions)
    try {
      await env.DB.prepare('DELETE FROM onboarding_analytics').run();
      console.log('✅ Onboarding analytics deleted');
    } catch (e) {
      console.log('⚠️ Onboarding analytics table not found, skipping');
    }

    // 13. Supprimer les product_categories (référence tenants)
    await env.DB.prepare('DELETE FROM product_categories').run();
    console.log('✅ Product categories deleted');

    // 14. Supprimer les prospects (référence tenants)
    await env.DB.prepare('DELETE FROM prospects').run();
    console.log('✅ Prospects deleted');

    // 15. Supprimer les properties (référence tenants)
    await env.DB.prepare('DELETE FROM properties').run();
    console.log('✅ Properties deleted');

    // 16. Supprimer les agents (référence tenants)
    await env.DB.prepare('DELETE FROM commercial_agents').run();
    console.log('✅ Agents deleted');

    // 17. Supprimer les tenants (en tout dernier)
    await env.DB.prepare('DELETE FROM tenants').run();
    console.log('✅ Tenants deleted');

    // Réactiver les foreign keys
    await env.DB.prepare('PRAGMA foreign_keys = ON').run();
    console.log('🔒 Foreign keys re-enabled');

    // Vérifier que tout est vide
    const tenantsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM tenants').first();
    const agentsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM commercial_agents').first();
    const categoriesCount = await env.DB.prepare('SELECT COUNT(*) as count FROM product_categories').first();
    const sessionsCount = await env.DB.prepare('SELECT COUNT(*) as count FROM onboarding_sessions').first();

    console.log('✅ Database cleanup completed');

    return {
      success: true,
      message: 'Database cleaned successfully',
      stats: {
        tenants_remaining: tenantsCount.count,
        agents_remaining: agentsCount.count,
        categories_remaining: categoriesCount.count,
        sessions_remaining: sessionsCount.count
      }
    };

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return {
      success: false,
      error: 'Database cleanup failed',
      details: error.message
    };
  }
}

export async function listTenants(env) {
  try {
    const tenants = await env.DB.prepare(`
      SELECT
        t.id,
        t.name,
        t.email,
        t.twilio_phone_number,
        t.telephony_active,
        t.created_at,
        COUNT(DISTINCT a.id) as agents_count,
        COUNT(DISTINCT pc.id) as categories_count
      FROM tenants t
      LEFT JOIN commercial_agents a ON t.id = a.tenant_id
      LEFT JOIN product_categories pc ON t.id = pc.tenant_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `).all();

    return {
      success: true,
      tenants: tenants.results,
      count: tenants.results.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function deleteTenant(env, tenantId) {
  try {
    console.log(`🗑️ Deleting tenant: ${tenantId}`);

    // Supprimer dans l'ordre inverse des dépendances
    await env.DB.prepare('DELETE FROM appointments WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM availability_slots WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM product_categories WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM products WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM prospects WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM properties WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM commercial_agents WHERE tenant_id = ?').bind(tenantId).run();
    await env.DB.prepare('DELETE FROM onboarding_sessions WHERE tenant_id = ?').bind(tenantId).run();

    try {
      await env.DB.prepare('DELETE FROM calls WHERE tenant_id = ?').bind(tenantId).run();
    } catch (e) {
      console.log('⚠️ Calls table issue, skipping');
    }

    // Supprimer le tenant
    await env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(tenantId).run();

    console.log(`✅ Tenant ${tenantId} deleted`);

    return {
      success: true,
      message: `Tenant ${tenantId} deleted successfully`
    };
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

export async function handleAdminRoutes(request, env, path, method) {
  // GET /api/v1/admin/tenants - Lister les tenants
  if (path === '/api/v1/admin/tenants' && method === 'GET') {
    const result = await listTenants(env);
    return new Response(JSON.stringify(result, null, 2), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // DELETE /api/v1/admin/tenants/:id - Supprimer un tenant
  if (path.match(/^\/api\/v1\/admin\/tenants\/[^/]+$/) && method === 'DELETE') {
    const tenantId = path.split('/')[5];
    const result = await deleteTenant(env, tenantId);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/v1/admin/cleanup - Nettoyer la base de données
  if (path === '/api/v1/admin/cleanup' && method === 'POST') {
    const result = await cleanupDatabase(env);
    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return null;
}
