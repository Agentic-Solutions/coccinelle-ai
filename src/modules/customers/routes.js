/**
 * Module Customers - Routes CRUD sécurisées
 * Version: 1.0.0
 * 
 * Endpoints:
 * - GET    /api/v1/customers         - Liste des clients (pagination)
 * - POST   /api/v1/customers         - Créer un client
 * - GET    /api/v1/customers/:id     - Détail d'un client
 * - PUT    /api/v1/customers/:id     - Modifier un client
 * - DELETE /api/v1/customers/:id     - Supprimer un client
 */

import * as auth from '../auth/helpers.js';

// ============================================
// HELPER: Vérification Auth JWT
// ============================================
async function checkAuth(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return {
      error: true,
      response: new Response(JSON.stringify({ 
        success: false, 
        error: authResult.error 
      }), {
        status: authResult.status,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
  return { error: false, user: authResult.user, tenant: authResult.tenant };
}

// ============================================
// HELPER: Générer un ID unique
// ============================================
function generateId() {
  return `cust_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// ============================================
// GET /api/v1/customers - Liste des clients
// ============================================
async function listCustomers(request, env) {
  // 1. Vérifier l'authentification
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  
  const { tenant } = authCheck;
  const tenantId = tenant.id;

  try {
    // 2. Récupérer les paramètres de pagination
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 100);
    const offset = parseInt(url.searchParams.get('offset')) || 0;
    const search = url.searchParams.get('search') || '';
    const status = url.searchParams.get('status') || '';

    // 3. Construire la requête
    let query = `SELECT * FROM customers WHERE tenant_id = ?`;
    let countQuery = `SELECT COUNT(*) as total FROM customers WHERE tenant_id = ?`;
    const params = [tenantId];

    // Filtre par statut
    if (status) {
      query += ` AND status = ?`;
      countQuery += ` AND status = ?`;
      params.push(status);
    }

    // Recherche par nom/email/téléphone
    if (search) {
      query += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      countQuery += ` AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // 4. Exécuter le comptage
    const countResult = await env.DB.prepare(countQuery).bind(...params).first();
    const total = countResult?.total || 0;

    // 5. Ajouter tri et pagination
    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 6. Exécuter la requête principale
    const { results } = await env.DB.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({
      success: true,
      customers: results || [],
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error listing customers:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors de la récupération des clients'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================
// POST /api/v1/customers - Créer un client
// ============================================
async function createCustomer(request, env) {
  // 1. Vérifier l'authentification
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  
  const { tenant } = authCheck;
  const tenantId = tenant.id;

  try {
    // 2. Parser le body
    const body = await request.json();

    // 3. Validation minimale
    if (!body.first_name && !body.last_name && !body.email && !body.phone) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Au moins un champ (first_name, last_name, email ou phone) est requis'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 4. Vérifier si l'email existe déjà pour ce tenant
    if (body.email) {
      const existing = await env.DB.prepare(
        'SELECT id FROM customers WHERE tenant_id = ? AND email = ?'
      ).bind(tenantId, body.email).first();

      if (existing) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Un client avec cet email existe déjà'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 5. Générer l'ID et préparer les données
    const customerId = generateId();
    const now = new Date().toISOString();

    // 6. Insérer le client
    await env.DB.prepare(`
      INSERT INTO customers (
        id, tenant_id, first_name, last_name, email, phone,
        status, source, tags, preferred_contact_method,
        language, timezone, total_appointments, total_conversations,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      customerId,
      tenantId,
      body.first_name || null,
      body.last_name || null,
      body.email || null,
      body.phone || null,
      body.status || 'active',
      body.source || null,
      body.tags ? JSON.stringify(body.tags) : null,
      body.preferred_contact_method || null,
      body.language || 'fr',
      body.timezone || 'Europe/Paris',
      0,
      0,
      now,
      now
    ).run();

    // 7. Récupérer le client créé
    const customer = await env.DB.prepare(
      'SELECT * FROM customers WHERE id = ?'
    ).bind(customerId).first();

    return new Response(JSON.stringify({
      success: true,
      message: 'Client créé avec succès',
      customer
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating customer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors de la création du client'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================
// GET /api/v1/customers/:id - Détail d'un client
// ============================================
async function getCustomer(request, env, customerId) {
  // 1. Vérifier l'authentification
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  
  const { tenant } = authCheck;
  const tenantId = tenant.id;

  try {
    // 2. Récupérer le client (avec vérification tenant)
    const customer = await env.DB.prepare(
      'SELECT * FROM customers WHERE id = ? AND tenant_id = ?'
    ).bind(customerId, tenantId).first();

    if (!customer) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Client non trouvé'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      customer
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error getting customer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors de la récupération du client'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================
// PUT /api/v1/customers/:id - Modifier un client
// ============================================
async function updateCustomer(request, env, customerId) {
  // 1. Vérifier l'authentification
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  
  const { tenant } = authCheck;
  const tenantId = tenant.id;

  try {
    // 2. Vérifier que le client existe et appartient au tenant
    const existing = await env.DB.prepare(
      'SELECT * FROM customers WHERE id = ? AND tenant_id = ?'
    ).bind(customerId, tenantId).first();

    if (!existing) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Client non trouvé'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Parser le body
    const body = await request.json();

    // 4. Vérifier unicité email si modifié
    if (body.email && body.email !== existing.email) {
      const emailExists = await env.DB.prepare(
        'SELECT id FROM customers WHERE tenant_id = ? AND email = ? AND id != ?'
      ).bind(tenantId, body.email, customerId).first();

      if (emailExists) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Un autre client utilise déjà cet email'
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 5. Mettre à jour avec fallback sur valeurs existantes
    const now = new Date().toISOString();

    await env.DB.prepare(`
      UPDATE customers SET
        first_name = ?,
        last_name = ?,
        email = ?,
        phone = ?,
        status = ?,
        source = ?,
        tags = ?,
        preferred_contact_method = ?,
        language = ?,
        timezone = ?,
        updated_at = ?
      WHERE id = ? AND tenant_id = ?
    `).bind(
      body.first_name !== undefined ? body.first_name : existing.first_name,
      body.last_name !== undefined ? body.last_name : existing.last_name,
      body.email !== undefined ? body.email : existing.email,
      body.phone !== undefined ? body.phone : existing.phone,
      body.status || existing.status,
      body.source !== undefined ? body.source : existing.source,
      body.tags ? JSON.stringify(body.tags) : existing.tags,
      body.preferred_contact_method !== undefined ? body.preferred_contact_method : existing.preferred_contact_method,
      body.language || existing.language,
      body.timezone || existing.timezone,
      now,
      customerId,
      tenantId
    ).run();

    // 6. Récupérer le client mis à jour
    const customer = await env.DB.prepare(
      'SELECT * FROM customers WHERE id = ?'
    ).bind(customerId).first();

    return new Response(JSON.stringify({
      success: true,
      message: 'Client mis à jour avec succès',
      customer
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating customer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors de la mise à jour du client'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================
// DELETE /api/v1/customers/:id - Supprimer un client
// ============================================
async function deleteCustomer(request, env, customerId) {
  // 1. Vérifier l'authentification
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  
  const { tenant } = authCheck;
  const tenantId = tenant.id;

  try {
    // 2. Vérifier que le client existe et appartient au tenant
    const existing = await env.DB.prepare(
      'SELECT id FROM customers WHERE id = ? AND tenant_id = ?'
    ).bind(customerId, tenantId).first();

    if (!existing) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Client non trouvé'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3. Supprimer le client
    await env.DB.prepare(
      'DELETE FROM customers WHERE id = ? AND tenant_id = ?'
    ).bind(customerId, tenantId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Client supprimé avec succès'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting customer:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur lors de la suppression du client'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================
// ROUTER PRINCIPAL
// ============================================
export async function handleCustomersRoutes(request, env, path, method) {
  // GET /api/v1/customers - Liste
  if (path === '/api/v1/customers' && method === 'GET') {
    return await listCustomers(request, env);
  }

  // POST /api/v1/customers - Créer
  if (path === '/api/v1/customers' && method === 'POST') {
    return await createCustomer(request, env);
  }

  // Routes avec ID: /api/v1/customers/:id
  const customerIdMatch = path.match(/^\/api\/v1\/customers\/([^\/]+)$/);
  if (customerIdMatch) {
    const customerId = customerIdMatch[1];

    // GET /api/v1/customers/:id - Détail
    if (method === 'GET') {
      return await getCustomer(request, env, customerId);
    }

    // PUT /api/v1/customers/:id - Modifier
    if (method === 'PUT') {
      return await updateCustomer(request, env, customerId);
    }

    // DELETE /api/v1/customers/:id - Supprimer
    if (method === 'DELETE') {
      return await deleteCustomer(request, env, customerId);
    }
  }

  // Route non trouvée
  return null;
}
