/**
 * Module Products - Routes API
 * Gestion CRUD des produits multi-secteurs avec assignation flexible par agent
 */

import { logger } from '../../utils/logger.js';
import * as auth from '../auth/helpers.js';
import { hasPermission } from '../../utils/permissions.js';
import { successResponse, errorResponse } from '../../utils/response.js';
import { importProductsWithVariants, checkStockByAttributes } from './variants-handler.js';

/**
 * Handler principal pour les routes /api/v1/products/*
 */
export async function handleProductsRoutes(request, env, path, method) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;


    // GET /api/v1/products - Liste des produits
    if (path === '/api/v1/products' && method === 'GET') {
      return await listProducts(request, env, tenantId);
    }

    // GET /api/v1/products/categories - Liste des catégories
    if (path === '/api/v1/products/categories' && method === 'GET') {
      return await listCategories(request, env, tenantId);
    }

    // GET /api/v1/products/:id - Détails d'un produit
    if (path.match(/^\/api\/v1\/products\/[^/]+$/) && method === 'GET') {
      const productId = path.split('/').pop();
      return await getProduct(request, env, tenantId, productId);
    }

    // POST /api/v1/products - Créer un produit
    if (path === '/api/v1/products' && method === 'POST') {
      return await createProduct(request, env, tenantId, userId);
    }

    // PUT /api/v1/products/:id - Modifier un produit
    if (path.match(/^\/api\/v1\/products\/[^/]+$/) && method === 'PUT') {
      const productId = path.split('/').pop();
      return await updateProduct(request, env, tenantId, userId, productId);
    }

    // DELETE /api/v1/products/:id - Supprimer un produit
    if (path.match(/^\/api\/v1\/products\/[^/]+$/) && method === 'DELETE') {
      const productId = path.split('/').pop();
      return await deleteProduct(request, env, tenantId, productId);
    }

    // POST /api/v1/products/preview-import - Analyser et prévisualiser un CSV
    if (path === '/api/v1/products/preview-import' && method === 'POST') {
      return await previewImport(request, env, tenantId);
    }

    // POST /api/v1/products/import - Importer des produits depuis CSV
    if (path === '/api/v1/products/import' && method === 'POST') {
      return await importProducts(request, env, tenantId, userId);
    }

    // POST /api/v1/products/check-stock - Vérifier le stock d'une variante
    if (path === '/api/v1/products/check-stock' && method === 'POST') {
      return await checkStock(request, env, tenantId);
    }

    return null; // Route non trouvée
  } catch (error) {
    logger.error('Products route error', { error: error.message, path, method });
    return errorResponse('Internal server error', 500);
  }
}

/**
 * GET /api/v1/products - Liste des produits avec filtres
 */
async function listProducts(request, env, tenantId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const agentId = url.searchParams.get('agent_id');
    const status = url.searchParams.get('status') || 'active';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = `
      SELECT
        id, tenant_id, agent_id, assignment_type, sku,
        category, type, title, description, short_description,
        price, price_currency, compare_at_price,
        stock_quantity, stock_status, available,
        attributes, images, videos, location,
        keywords, tags, has_variants, variants,
        status, published_at, created_at, updated_at
      FROM products
      WHERE tenant_id = ? AND status = ?
    `;

    const params = [tenantId, status];

    // Filtrer par catégorie
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    // Filtrer par agent (NULL = tous, sinon spécifique)
    if (agentId) {
      query += ' AND (agent_id IS NULL OR agent_id = ?)';
      params.push(agentId);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const results = await env.DB.prepare(query).bind(...params).all();

    // Parser les champs JSON
    const products = results.results.map(parseProductJson);

    // Compter le total
    let countQuery = 'SELECT COUNT(*) as total FROM products WHERE tenant_id = ? AND status = ?';
    const countParams = [tenantId, status];

    if (category) {
      countQuery += ' AND category = ?';
      countParams.push(category);
    }

    if (agentId) {
      countQuery += ' AND (agent_id IS NULL OR agent_id = ?)';
      countParams.push(agentId);
    }

    const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();

    return successResponse({
      products,
      total: countResult.total,
      limit,
      offset
    });

  } catch (error) {
    logger.error('List products error', { error: error.message });
    return errorResponse('Failed to list products', 500);
  }
}

/**
 * GET /api/v1/products/:id - Détails d'un produit
 */
async function getProduct(request, env, tenantId, productId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    const product = await env.DB.prepare(`
      SELECT * FROM products
      WHERE id = ? AND tenant_id = ?
    `).bind(productId, tenantId).first();

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    const parsedProduct = parseProductJson(product);

    // Si le produit a des variantes, les récupérer
    if (product.has_variants === 1) {
      const variantsResult = await env.DB.prepare(`
        SELECT
          id, sku, attributes, price, stock_quantity,
          stock_status, available, created_at
        FROM product_variants
        WHERE product_id = ? AND tenant_id = ?
        ORDER BY position ASC, created_at ASC
      `).bind(productId, tenantId).all();

      // Parser les attributs JSON de chaque variante
      parsedProduct.variants = variantsResult.results.map(v => ({
        ...v,
        attributes: v.attributes ? JSON.parse(v.attributes) : {}
      }));
    }

    return successResponse({ product: parsedProduct });

  } catch (error) {
    logger.error('Get product error', { error: error.message, productId });
    return errorResponse('Failed to get product', 500);
  }
}

/**
 * POST /api/v1/products - Créer un produit
 */
async function createProduct(request, env, tenantId, userId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    const body = await request.json();

    // Validation
    if (!body.title || !body.category) {
      return errorResponse('Title and category are required', 400);
    }

    const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await env.DB.prepare(`
      INSERT INTO products (
        id, tenant_id, agent_id, assignment_type, sku,
        category, type, title, description, short_description,
        price, price_currency, compare_at_price,
        stock_quantity, stock_status, available,
        attributes, images, videos, location,
        keywords, tags, has_variants, variants,
        status, published_at, created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, datetime('now'), datetime('now')
      )
    `).bind(
      productId,
      tenantId,
      body.agent_id || null,
      body.assignment_type || 'shared',
      body.sku || null,
      body.category || existing.category,
      body.type || null,
      body.title || existing.title,
      body.description || null,
      body.short_description || null,
      body.price || null,
      body.price_currency || 'EUR',
      body.compare_at_price || null,
      body.stock_quantity || 0,
      body.stock_status || 'in_stock',
      body.available !== undefined ? body.available : 1,
      JSON.stringify(body.attributes || {}),
      JSON.stringify(body.images || []),
      JSON.stringify(body.videos || []),
      JSON.stringify(body.location || {}),
      body.keywords || null,
      JSON.stringify(body.tags || []),
      body.has_variants || 0,
      JSON.stringify(body.variants || []),
      body.status || 'active',
      body.published_at || null,
      userId
    ).run();

    // Créer les variantes si applicable
    if (body.has_variants && body.variants && Array.isArray(body.variants)) {
      for (let i = 0; i < body.variants.length; i++) {
        const variant = body.variants[i];
        const variantId = `var_${productId}_${i + 1}`;

        // Déterminer le status du stock
        const stockQuantity = variant.stock_quantity || 0;
        const stockStatus = stockQuantity === 0 ? 'out_of_stock' : stockQuantity < 5 ? 'low_stock' : 'in_stock';
        const available = stockQuantity > 0 ? 1 : 0;

        await env.DB.prepare(`
          INSERT INTO product_variants (
            id, product_id, tenant_id, sku,
            attributes, price, stock_quantity, stock_status, available,
            created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            datetime('now'), datetime('now')
          )
        `).bind(
          variantId,
          productId,
          tenantId,
          variant.sku || `${productId.substring(5, 10)}-${i + 1}`,
          JSON.stringify(variant.attributes || {}),
          variant.price || null,
          stockQuantity,
          stockStatus,
          available
        ).run();
      }

      logger.info('Product variants created', { productId, variantCount: body.variants.length });
    }

    // Récupérer le produit créé
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?')
      .bind(productId).first();

    logger.info('Product created', { productId, tenantId, category: body.category });

    return successResponse(parseProductJson(product), 201);

  } catch (error) {
    logger.error('Create product error', { error: error.message });
    return errorResponse('Failed to create product', 500);
  }
}

/**
 * PUT /api/v1/products/:id - Modifier un produit
 */
async function updateProduct(request, env, tenantId, userId, productId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    // Vérifier que le produit existe et appartient au tenant
    const existing = await env.DB.prepare(`
      SELECT * FROM products WHERE id = ? AND tenant_id = ?
    `).bind(productId, tenantId).first();

    if (!existing) {
      return errorResponse('Product not found', 404);
    }

    const body = await request.json();

    await env.DB.prepare(`
      UPDATE products SET
        agent_id = ?,
        assignment_type = ?,
        sku = ?,
        category = ?,
        type = ?,
        title = ?,
        description = ?,
        short_description = ?,
        price = ?,
        price_currency = ?,
        compare_at_price = ?,
        stock_quantity = ?,
        stock_status = ?,
        available = ?,
        attributes = ?,
        images = ?,
        videos = ?,
        location = ?,
        keywords = ?,
        tags = ?,
        has_variants = ?,
        variants = ?,
        status = ?,
        published_at = ?,
        updated_by = ?,
        updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(
      body.agent_id !== undefined ? body.agent_id : null,
      body.assignment_type || 'shared',
      body.sku || null,
      body.category || existing.category,
      body.type || null,
      body.title || existing.title,
      body.description || null,
      body.short_description || null,
      body.price || null,
      body.price_currency || 'EUR',
      body.compare_at_price || null,
      body.stock_quantity || 0,
      body.stock_status || 'in_stock',
      body.available !== undefined ? body.available : 1,
      JSON.stringify(body.attributes || {}),
      JSON.stringify(body.images || []),
      JSON.stringify(body.videos || []),
      JSON.stringify(body.location || {}),
      body.keywords || null,
      JSON.stringify(body.tags || []),
      body.has_variants || 0,
      JSON.stringify(body.variants || []),
      body.status || 'active',
      body.published_at || null,
      userId,
      productId,
      tenantId
    ).run();

    // Récupérer le produit mis à jour
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?')
      .bind(productId).first();

    logger.info('Product updated', { productId, tenantId });

    return successResponse(parseProductJson(product));

  } catch (error) {
    logger.error('Update product error', { error: error.message, productId });
    return errorResponse('Failed to update product', 500);
  }
}

/**
 * DELETE /api/v1/products/:id - Supprimer un produit (soft delete)
 */
async function deleteProduct(request, env, tenantId, productId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    // Vérifier que le produit existe
    const existing = await env.DB.prepare(`
      SELECT * FROM products WHERE id = ? AND tenant_id = ?
    `).bind(productId, tenantId).first();

    if (!existing) {
      return errorResponse('Product not found', 404);
    }

    // Soft delete (changer le statut à "archived")
    await env.DB.prepare(`
      UPDATE products
      SET status = 'archived', updated_at = datetime('now')
      WHERE id = ? AND tenant_id = ?
    `).bind(productId, tenantId).run();

    logger.info('Product deleted', { productId, tenantId });

    return successResponse({ message: 'Product deleted successfully' });

  } catch (error) {
    logger.error('Delete product error', { error: error.message, productId });
    return errorResponse('Failed to delete product', 500);
  }
}

/**
 * Mapping de secours basique (utilisé si l'IA échoue ou n'est pas disponible)
 */
function fallbackMapping(headers) {
  const mapping = {};
  const patterns = {
    'category': ['categorie', 'category', 'type', 'cat'],
    'title': ['titre', 'title', 'nom', 'name', 'intitule', 'intitulé', 'libelle', 'libellé'],
    'description': ['description', 'desc', 'descriptif', 'details', 'détails'],
    'price': ['prix', 'price', 'montant', 'amount', 'tarif'],
    'price_currency': ['devise', 'currency', 'monnaie'],
    'available': ['disponible', 'available', 'dispo', 'stock'],
    'city': ['ville', 'city', 'localite', 'localité'],
    'postal_code': ['code_postal', 'postal_code', 'cp', 'zip'],
    'address': ['adresse', 'address', 'rue', 'street']
  };

  headers.forEach(header => {
    const headerLower = header.toLowerCase().trim();
    for (const [systemField, variations] of Object.entries(patterns)) {
      if (variations.some(v => headerLower.includes(v))) {
        mapping[header] = systemField;
        break;
      }
    }
  });

  return mapping;
}

/**
 * POST /api/v1/products/preview-import - Analyser et prévisualiser un fichier (CSV, JSON, PDF, Excel, Image)
 */
async function previewImport(request, env, tenantId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    // Import des parsers (dynamique pour éviter les erreurs si le fichier n'existe pas encore)
    let parseFile, suggestMappingWithAI;
    try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

      const parsers = await import('./file-parsers.js');
      parseFile = parsers.parseFile;
      suggestMappingWithAI = parsers.suggestMappingWithAI;
    } catch (importError) {
      logger.error('Failed to import parsers', { error: importError.message });
      return errorResponse('File parser module not available', 500);
    }

    // Parser le fichier selon son format
    let parsedData;
    try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

      parsedData = await parseFile(file, env);
    } catch (parseError) {
      logger.error('File parsing error', { error: parseError.message });
      return errorResponse(parseError.message, 400);
    }

    const { format, headers, preview, totalRows, cleaning } = parsedData;

    // Utiliser l'IA pour suggérer le meilleur mapping (avec analyse de nettoyage si disponible)
    let aiSuggestion;
    try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

      const cleaningAnalysis = cleaning?.analysis || null;
      aiSuggestion = await suggestMappingWithAI(headers, preview, env, cleaningAnalysis);
    } catch (aiError) {
      logger.error('AI mapping error', { error: aiError.message });
      // Fallback sur mapping basique
      aiSuggestion = {
        mapping: fallbackMapping(headers),
        confidence: 'low',
        explanations: {},
        aiGenerated: false,
        error: 'AI unavailable, using basic pattern matching'
      };
    }

    // Vérifier les champs requis
    const requiredFields = ['category', 'title'];
    const mappedFields = Object.values(aiSuggestion.mapping);
    const missingRequired = requiredFields.filter(f => !mappedFields.includes(f));

    return successResponse({
      format,
      headers,
      preview,
      suggestions: aiSuggestion.mapping,
      confidence: aiSuggestion.confidence,
      explanations: aiSuggestion.explanations,
      aiGenerated: aiSuggestion.aiGenerated,
      method: aiSuggestion.method || 'unknown',
      cleaning: cleaning || { applied: false },
      requiredFields,
      missingRequired,
      totalRows
    });

  } catch (error) {
    logger.error('Preview import error', { error: error.message, stack: error.stack });
    return errorResponse('Failed to preview file: ' + error.message, 500);
  }
}

/**
 * POST /api/v1/products/import - Importer des produits depuis CSV
 */
async function importProducts(request, env, tenantId, userId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    const formData = await request.formData();
    const file = formData.get('file');
    const mappingJson = formData.get('columnMapping');

    if (!file) {
      return errorResponse('No file uploaded', 400);
    }

    // Import des parsers avec le nettoyage intelligent
    let parseFile;
    try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

      const parsers = await import('./file-parsers.js');
      parseFile = parsers.parseFile;
    } catch (importError) {
      logger.error('Failed to import parsers', { error: importError.message });
      return errorResponse('File parser module not available', 500);
    }

    // Parser le fichier avec nettoyage automatique
    let parsedData;
    try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

      parsedData = await parseFile(file, env);
    } catch (parseError) {
      logger.error('File parsing error', { error: parseError.message });
      return errorResponse(parseError.message, 400);
    }

    const { headers, rows, variants } = parsedData;

    // Vérifier si le CSV contient des variantes de produits
    if (variants && variants.hasVariants) {
      logger.info('CSV contains product variants', {
        tenantId,
        productsWithVariants: variants.productsWithMultipleVariants,
        totalVariants: variants.totalVariants
      });

      // Utiliser le mapping fourni ou créer un mapping par défaut
      let columnMapping = {};
      if (mappingJson) {
        try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

          columnMapping = JSON.parse(mappingJson);
        } catch (e) {
          return errorResponse('Invalid column mapping format', 400);
        }
      } else {
        // Mapping par défaut
        headers.forEach(h => {
          columnMapping[h] = h;
        });
      }

      // Importer avec gestion des variantes
      const variantResults = await importProductsWithVariants(
        variants,
        rows,
        columnMapping,
        tenantId,
        userId,
        env
      );

      logger.info('Products with variants imported', {
        tenantId,
        productsCreated: variantResults.productsCreated,
        variantsCreated: variantResults.variantsCreated,
        errors: variantResults.errors.length
      });

      return successResponse({
        message: 'Import completed with variants',
        productsCreated: variantResults.productsCreated,
        variantsCreated: variantResults.variantsCreated,
        errors: variantResults.errors
      });
    }

    // Mode standard (sans variantes)
    // Utiliser le mapping fourni ou créer un mapping par défaut
    let columnMapping = {};
    if (mappingJson) {
      try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

        columnMapping = JSON.parse(mappingJson);
      } catch (e) {
        return errorResponse('Invalid column mapping format', 400);
      }
    } else {
      // Mapping par défaut : on suppose que les colonnes du CSV correspondent directement
      headers.forEach(h => {
        columnMapping[h] = h;
      });
    }

    // Créer le mapping inversé (colonne système -> colonne CSV)
    const reverseMapping = {};
    Object.entries(columnMapping).forEach(([csvCol, systemCol]) => {
      reverseMapping[systemCol] = csvCol;
    });

    // Vérifier les colonnes requises
    const requiredColumns = ['category', 'title'];
    const missingColumns = requiredColumns.filter(col => !reverseMapping[col]);
    if (missingColumns.length > 0) {
      return errorResponse(`Missing required fields in mapping: ${missingColumns.join(', ')}`, 400);
    }

    const results = {
      imported: 0,
      errors: []
    };

    // Parser et importer chaque ligne (déjà nettoyée par parseFile)
    for (let i = 0; i < rows.length; i++) {
      try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

        const row = rows[i];

        // Fonction helper pour récupérer une valeur en utilisant le mapping
        const getMappedValue = (systemField) => {
          const csvColumn = reverseMapping[systemField];
          if (!csvColumn || !row[csvColumn]) return null;
          return row[csvColumn];
        };

        // Générer ID unique pour ce produit
        const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Champs système standards (ne vont PAS dans attributes)
        const systemFields = ['category', 'title', 'description', 'price', 'price_currency', 'available', 'city', 'postal_code', 'address', 'tags'];

        // Construire l'objet attributes avec TOUTES les autres colonnes du CSV
        const attributes = {};
        headers.forEach(header => {
          const systemField = columnMapping[header];
          if (!systemField || !systemFields.includes(systemField)) {
            const value = row[header];
            if (value !== null && value !== undefined && value !== '') {
              if (typeof value === 'string' && value.trim() === '') return;
              attributes[header] = value;
            }
          }
        });

        // Récupérer les valeurs mappées
        const categoryValue = getMappedValue('category');
        const titleValue = getMappedValue('title');
        const descValue = getMappedValue('description');
        const priceValue = getMappedValue('price');
        const currencyValue = getMappedValue('price_currency');
        const availableValue = getMappedValue('available');

        // Valider et nettoyer category (REQUIS)
        const category = categoryValue && categoryValue.toString().trim() !== ''
          ? categoryValue.toString().trim()
          : 'real_estate'; // Par défaut real_estate au lieu de uncategorized

        // Valider et nettoyer title (REQUIS)
        const title = titleValue && titleValue.toString().trim() !== ''
          ? titleValue.toString().trim()
          : 'Untitled';

        // Description (NULLABLE)
        const description = descValue && descValue.toString().trim() !== ''
          ? descValue.toString().trim()
          : null;

        // Prix (NULLABLE)
        let price = null;
        if (priceValue) {
          const parsedPrice = typeof priceValue === 'number' ? priceValue : parseFloat(priceValue);
          if (!isNaN(parsedPrice)) price = parsedPrice;
        }

        // Devise (DEFAULT 'EUR')
        const price_currency = currencyValue && currencyValue.toString().trim() !== ''
          ? currencyValue.toString().trim()
          : 'EUR';

        // Disponibilité (DEFAULT 1 - disponible par défaut)
        const available = (availableValue === '0' || availableValue === 'false' || availableValue === false) ? 0 : 1;

        // Location
        const location = {
          city: getMappedValue('city') || '',
          postal_code: getMappedValue('postal_code') || '',
          address: getMappedValue('address') || ''
        };

        // Tags
        const tagsValue = getMappedValue('tags');
        const tags = tagsValue && typeof tagsValue === 'string'
          ? tagsValue.split(';').map(t => t.trim()).filter(t => t !== '')
          : [];

        // Insérer le produit dans D1
        await env.DB.prepare(`
          INSERT INTO products (
            id, tenant_id, category, title, description,
            price, price_currency, available, attributes, location, tags,
            status, created_by, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, datetime('now'), datetime('now')
          )
        `).bind(
          productId,
          tenantId,
          category,
          title,
          description,
          price,
          price_currency,
          available,
          JSON.stringify(attributes),
          JSON.stringify(location),
          JSON.stringify(tags),
          'active',
          userId || null
        ).run();

        results.imported++;

      } catch (error) {
        results.errors.push({
          line: i + 1,
          error: error.message
        });
      }
    }

    logger.info('Products imported', {
      tenantId,
      imported: results.imported,
      errors: results.errors.length
    });

    return successResponse({
      message: 'Import completed',
      imported: results.imported,
      errors: results.errors
    });

  } catch (error) {
    logger.error('Import products error', { error: error.message });
    return errorResponse('Failed to import products', 500);
  }
}

/**
 * POST /api/v1/products/check-stock - Vérifier le stock d'une variante
 */
async function checkStock(request, env, tenantId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    const body = await request.json();
    const { query } = body;

    if (!query || !query.title) {
      return errorResponse('Missing query.title parameter', 400);
    }

    if (!query.attributes || typeof query.attributes !== 'object') {
      return errorResponse('Missing or invalid query.attributes parameter', 400);
    }

    const result = await checkStockByAttributes(tenantId, query, env);

    return successResponse(result);

  } catch (error) {
    logger.error('Check stock error', { tenantId, error: error.message });
    return errorResponse(error.message, 500);
  }
}

/**
 * Helper: Parser les champs JSON d'un produit
 */
function parseProductJson(product) {
  if (!product) return null;

  try {
    return {
      ...product,
      attributes: product.attributes ? JSON.parse(product.attributes) : {},
      images: product.images ? JSON.parse(product.images) : [],
      videos: product.videos ? JSON.parse(product.videos) : [],
      location: product.location ? JSON.parse(product.location) : {},
      tags: product.tags ? JSON.parse(product.tags) : [],
      variants: product.variants ? JSON.parse(product.variants) : []
    };
  } catch (error) {
    logger.warn('Failed to parse product JSON', { productId: product.id, error: error.message });
    return product;
  }
}

/**
 * GET /api/v1/products/categories - Liste des catégories
 */
async function listCategories(request, env, tenantId) {
  try {
    // Authentification requise
    const authResult = await auth.requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;
    const userId = user.id;

    const categories = await env.DB.prepare(`
      SELECT id, key, name, description, icon, color, fields, display_order
      FROM product_categories
      WHERE tenant_id = ?
      ORDER BY display_order ASC, name ASC
    `).bind(tenantId).all();

    return successResponse({
      categories: categories.results || [],
      total: categories.results?.length || 0
    });
  } catch (error) {
    logger.error('List categories error', { error: error.message, tenantId });
    return errorResponse('Failed to list categories', 500);
  }
}
