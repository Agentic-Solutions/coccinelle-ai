/**
 * Module Product Categories - Routes API
 * Gestion des catégories de produits personnalisables
 */

import { logger } from '../../utils/logger.js';
import { successResponse, errorResponse } from '../../utils/response.js';

/**
 * Handler principal pour les routes /api/v1/product-categories/*
 */
export async function handleProductCategoriesRoutes(request, env, path, method) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
    const userId = 'user_demo_001';

    // GET /api/v1/product-categories - Liste des catégories
    if (path === '/api/v1/product-categories' && method === 'GET') {
      return await listCategories(request, env, tenantId);
    }

    // GET /api/v1/product-categories/:id - Détails d'une catégorie
    if (path.match(/^\/api\/v1\/product-categories\/[^/]+$/) && method === 'GET') {
      const categoryId = path.split('/').pop();
      return await getCategory(request, env, tenantId, categoryId);
    }

    // POST /api/v1/product-categories - Créer une catégorie
    if (path === '/api/v1/product-categories' && method === 'POST') {
      return await createCategory(request, env, tenantId, userId);
    }

    // PUT /api/v1/product-categories/:id - Modifier une catégorie
    if (path.match(/^\/api\/v1\/product-categories\/[^/]+$/) && method === 'PUT') {
      const categoryId = path.split('/').pop();
      return await updateCategory(request, env, tenantId, userId, categoryId);
    }

    // DELETE /api/v1/product-categories/:id - Supprimer une catégorie
    if (path.match(/^\/api\/v1\/product-categories\/[^/]+$/) && method === 'DELETE') {
      const categoryId = path.split('/').pop();
      return await deleteCategory(request, env, tenantId, categoryId);
    }

    return null;
  } catch (error) {
    logger.error('Product categories route error', { error: error.message, path, method });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * GET /api/v1/product-categories - Liste des catégories
 */
async function listCategories(request, env, tenantId) {
  try {
    const url = new URL(request.url);
    const includeSystem = url.searchParams.get('includeSystem') !== 'false';

    let query = `
      SELECT
        id, tenant_id, key, name, description, icon, color,
        is_system, fields, display_order,
        created_at, updated_at
      FROM product_categories
      WHERE tenant_id = ?
    `;

    const params = [tenantId];

    if (!includeSystem) {
      query += ' AND is_system = 0';
    }

    query += ' ORDER BY display_order ASC, name ASC';

    const results = await env.DB.prepare(query).bind(...params).all();

    const categories = results.results.map(parseCategoryJson);

    return successResponse({
      categories,
      total: categories.length
    });

  } catch (error) {
    logger.error('List categories error', { error: error.message });
    return errorResponse('Failed to list categories', 500);
  }
}

/**
 * GET /api/v1/product-categories/:id - Détails d'une catégorie
 */
async function getCategory(request, env, tenantId, categoryId) {
  try {
    const category = await env.DB.prepare(`
      SELECT * FROM product_categories
      WHERE id = ? AND tenant_id = ?
    `).bind(categoryId, tenantId).first();

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse(parseCategoryJson(category));

  } catch (error) {
    logger.error('Get category error', { error: error.message, categoryId });
    return errorResponse('Failed to get category', 500);
  }
}

/**
 * POST /api/v1/product-categories - Créer une catégorie personnalisée
 */
async function createCategory(request, env, tenantId, userId) {
  try {
    const body = await request.json();

    // Validation
    if (!body.key || !body.name) {
      return errorResponse('Key and name are required', 400);
    }

    // Vérifier que la clé n'existe pas déjà
    const existing = await env.DB.prepare(`
      SELECT id FROM product_categories
      WHERE tenant_id = ? AND key = ?
    `).bind(tenantId, body.key).first();

    if (existing) {
      return errorResponse('A category with this key already exists', 409);
    }

    const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await env.DB.prepare(`
      INSERT INTO product_categories (
        id, tenant_id, key, name, description, icon, color,
        is_system, fields, display_order, status,
        created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, datetime('now'), datetime('now')
      )
    `).bind(
      categoryId,
      tenantId,
      body.key,
      body.name,
      body.description || null,
      body.icon || 'Package',
      body.color || 'blue',
      0, // is_system = false pour catégories personnalisées
      JSON.stringify(body.fields || []),
      body.display_order || 999,
      body.status || 'active',
      userId
    ).run();

    // Récupérer la catégorie créée
    const category = await env.DB.prepare('SELECT * FROM product_categories WHERE id = ?')
      .bind(categoryId).first();

    logger.info('Category created', { categoryId, tenantId, key: body.key });

    return successResponse(parseCategoryJson(category), 201);

  } catch (error) {
    logger.error('Create category error', { error: error.message });
    return errorResponse('Failed to create category', 500);
  }
}

/**
 * PUT /api/v1/product-categories/:id - Modifier une catégorie
 */
async function updateCategory(request, env, tenantId, userId, categoryId) {
  try {
    // Vérifier que la catégorie existe
    const existing = await env.DB.prepare(`
      SELECT id, is_system FROM product_categories
      WHERE id = ? AND tenant_id = ?
    `).bind(categoryId, tenantId).first();

    if (!existing) {
      return errorResponse('Category not found', 404);
    }

    // Bloquer la modification des catégories système
    if (existing.is_system === 1) {
      return errorResponse('Cannot modify system categories', 403);
    }

    const body = await request.json();

    await env.DB.prepare(`
      UPDATE product_categories SET
        name = ?,
        description = ?,
        icon = ?,
        color = ?,
        fields = ?,
        display_order = ?,
        status = ?,
        updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(
      body.name,
      body.description || null,
      body.icon || 'Package',
      body.color || 'blue',
      JSON.stringify(body.fields || []),
      body.display_order || 999,
      body.status || 'active',
      categoryId,
      tenantId
    ).run();

    // Récupérer la catégorie mise à jour
    const category = await env.DB.prepare('SELECT * FROM product_categories WHERE id = ?')
      .bind(categoryId).first();

    logger.info('Category updated', { categoryId, tenantId });

    return successResponse(parseCategoryJson(category));

  } catch (error) {
    logger.error('Update category error', { error: error.message, categoryId });
    return errorResponse('Failed to update category', 500);
  }
}

/**
 * DELETE /api/v1/product-categories/:id - Supprimer une catégorie
 */
async function deleteCategory(request, env, tenantId, categoryId) {
  try {
    // Vérifier que la catégorie existe
    const existing = await env.DB.prepare(`
      SELECT id, is_system FROM product_categories
      WHERE id = ? AND tenant_id = ?
    `).bind(categoryId, tenantId).first();

    if (!existing) {
      return errorResponse('Category not found', 404);
    }

    // Bloquer la suppression des catégories système
    if (existing.is_system === 1) {
      return errorResponse('Cannot delete system categories', 403);
    }

    // Soft delete
    await env.DB.prepare(`
      UPDATE product_categories
      SET status = 'archived', updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(categoryId, tenantId).run();

    logger.info('Category deleted', { categoryId, tenantId });

    return successResponse({ message: 'Category deleted successfully' });

  } catch (error) {
    logger.error('Delete category error', { error: error.message, categoryId });
    return errorResponse('Failed to delete category', 500);
  }
}

/**
 * Helper: Parser les champs JSON d'une catégorie
 */
function parseCategoryJson(category) {
  if (!category) return null;

  try {
    return {
      ...category,
      fields: category.fields ? JSON.parse(category.fields) : [],
      is_system: Boolean(category.is_system)
    };
  } catch (error) {
    logger.warn('Failed to parse category JSON', { categoryId: category.id, error: error.message });
    return category;
  }
}
