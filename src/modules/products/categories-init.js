/**
 * Initialisation intelligente des catégories de produits par tenant
 * Basé sur l'industrie/secteur d'activité
 */

function generateId(prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Mapping industries → catégories de produits pertinentes
 */
const INDUSTRY_CATEGORIES_MAP = {
  // Immobilier
  'real_estate': ['real_estate'],
  'immobilier': ['real_estate'],

  // Commerce / Retail
  'retail': ['retail'],
  'ecommerce': ['retail'],
  'commerce': ['retail'],
  'boutique': ['retail'],

  // Restauration
  'restaurant': ['food'],
  'restauration': ['food'],
  'food': ['food'],
  'cafe': ['food'],
  'bar': ['food'],

  // Services (artisans, professionnels)
  'services': ['services', 'retail'], // Services + pièces détachées
  'artisan': ['services', 'retail'],
  'plomberie': ['services', 'retail'],
  'electricite': ['services', 'retail'],
  'plumber': ['services', 'retail'],
  'electrician': ['services', 'retail'],
  'reparation': ['services', 'retail'],
  'maintenance': ['services', 'retail'],

  // Défaut générique
  'default': ['services', 'retail']
};

/**
 * Définitions des catégories système
 */
const SYSTEM_CATEGORIES = {
  'real_estate': {
    name: 'Immobilier',
    description: 'Biens immobiliers: appartements, maisons, locaux commerciaux',
    icon: 'Home',
    color: 'blue',
    fields: [
      { key: 'surface', label: 'Surface (m²)', type: 'number', required: false },
      { key: 'rooms', label: 'Nombre de pièces', type: 'number', required: false },
      { key: 'bedrooms', label: 'Chambres', type: 'number', required: false },
      { key: 'floor', label: 'Étage', type: 'number', required: false }
    ]
  },
  'retail': {
    name: 'Commerce',
    description: 'Marchandises et articles de commerce : vêtements, chaussures, accessoires, électronique, etc.',
    icon: 'ShoppingBag',
    color: 'purple',
    fields: [
      { key: 'brand', label: 'Marque', type: 'text', required: false },
      { key: 'model', label: 'Modèle', type: 'text', required: false },
      { key: 'color', label: 'Couleur', type: 'text', required: false }
    ]
  },
  'food': {
    name: 'Restauration',
    description: 'Produits alimentaires et plats de restauration',
    icon: 'UtensilsCrossed',
    color: 'orange',
    fields: [
      { key: 'ingredients', label: 'Ingrédients', type: 'text', required: false },
      { key: 'spicy', label: 'Épicé', type: 'checkbox', required: false }
    ]
  },
  'services': {
    name: 'Services',
    description: 'Services professionnels et prestations',
    icon: 'Briefcase',
    color: 'green',
    fields: [
      { key: 'duration', label: 'Durée', type: 'text', required: false },
      { key: 'online', label: 'En ligne', type: 'checkbox', required: false }
    ]
  }
};

/**
 * Initialise les catégories de produits pour un nouveau tenant
 * selon son industrie/secteur d'activité
 */
export async function initializeProductCategories(env, tenantId, industry) {
  try {
    console.log(`Initializing product categories for tenant ${tenantId}, industry: ${industry}`);

    // Normaliser l'industry (minuscules, trim)
    const normalizedIndustry = (industry || 'default').toLowerCase().trim();

    // Récupérer les catégories à créer pour cette industrie
    const categoriesToCreate = INDUSTRY_CATEGORIES_MAP[normalizedIndustry] || INDUSTRY_CATEGORIES_MAP['default'];

    let categoriesCreated = 0;
    let displayOrder = 1;

    for (const categoryKey of categoriesToCreate) {
      const categoryDef = SYSTEM_CATEGORIES[categoryKey];

      if (!categoryDef) {
        console.warn(`Category definition not found for key: ${categoryKey}`);
        continue;
      }

      const categoryId = generateId('cat');

      // Vérifier si la catégorie existe déjà pour ce tenant
      const existing = await env.DB.prepare(`
        SELECT id FROM product_categories
        WHERE tenant_id = ? AND key = ?
      `).bind(tenantId, categoryKey).first();

      if (existing) {
        console.log(`Category ${categoryKey} already exists for tenant ${tenantId}, skipping`);
        continue;
      }

      // Créer la catégorie
      await env.DB.prepare(`
        INSERT INTO product_categories (
          id, tenant_id, key, name, description,
          icon, color, is_system, fields, display_order, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'active', datetime('now'), datetime('now'))
      `).bind(
        categoryId,
        tenantId,
        categoryKey,
        categoryDef.name,
        categoryDef.description,
        categoryDef.icon,
        categoryDef.color,
        JSON.stringify(categoryDef.fields),
        displayOrder
      ).run();

      categoriesCreated++;
      displayOrder++;

      console.log(`✅ Created category: ${categoryDef.name} (${categoryKey}) for tenant ${tenantId}`);
    }

    return {
      success: true,
      categoriesCreated,
      categories: categoriesToCreate.map(key => SYSTEM_CATEGORIES[key]?.name).filter(Boolean)
    };

  } catch (error) {
    console.error('Error initializing product categories:', error);
    return {
      success: false,
      error: error.message,
      categoriesCreated: 0
    };
  }
}

/**
 * Ajoute une catégorie supplémentaire à un tenant existant
 */
export async function addCategoryToTenant(env, tenantId, categoryKey) {
  try {
    const categoryDef = SYSTEM_CATEGORIES[categoryKey];

    if (!categoryDef) {
      return {
        success: false,
        error: `Category ${categoryKey} not found`
      };
    }

    // Vérifier si elle existe déjà
    const existing = await env.DB.prepare(`
      SELECT id FROM product_categories
      WHERE tenant_id = ? AND key = ?
    `).bind(tenantId, categoryKey).first();

    if (existing) {
      return {
        success: false,
        error: 'Category already exists for this tenant'
      };
    }

    // Trouver le prochain display_order
    const maxOrder = await env.DB.prepare(`
      SELECT MAX(display_order) as max_order
      FROM product_categories
      WHERE tenant_id = ?
    `).bind(tenantId).first();

    const displayOrder = (maxOrder?.max_order || 0) + 1;
    const categoryId = generateId('cat');

    await env.DB.prepare(`
      INSERT INTO product_categories (
        id, tenant_id, key, name, description,
        icon, color, is_system, fields, display_order, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'active', datetime('now'), datetime('now'))
    `).bind(
      categoryId,
      tenantId,
      categoryKey,
      categoryDef.name,
      categoryDef.description,
      categoryDef.icon,
      categoryDef.color,
      JSON.stringify(categoryDef.fields),
      displayOrder
    ).run();

    return {
      success: true,
      category: {
        id: categoryId,
        key: categoryKey,
        name: categoryDef.name
      }
    };

  } catch (error) {
    console.error('Error adding category:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
