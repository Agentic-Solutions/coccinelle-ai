/**
 * Gestion des variantes de produits
 * Création et requête des variantes (couleur, taille, stock, etc.)
 */

/**
 * Importe des produits avec leurs variantes depuis des données CSV nettoyées
 */
export async function importProductsWithVariants(variantInfo, rows, columnMapping, tenantId, userId, env) {
  const results = {
    productsCreated: 0,
    variantsCreated: 0,
    errors: []
  };

  const { productGroups, titleColumn, variantColumns, stockColumns } = variantInfo;

  // Pour chaque groupe de produits
  for (const [productTitle, variants] of Object.entries(productGroups)) {
    try {
      // Créer le produit parent en utilisant les données de la première variante
      const firstVariant = variants[0];
      const productId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Créer un mapping inversé pour faciliter la récupération des valeurs
      const reverseMapping = {};
      Object.entries(columnMapping).forEach(([csvCol, systemCol]) => {
        reverseMapping[systemCol] = csvCol;
      });

      const getMappedValue = (systemField) => {
        const csvColumn = reverseMapping[systemField];
        return csvColumn ? firstVariant[csvColumn] : '';
      };

      // Champs système standards
      const systemFields = ['category', 'title', 'description', 'price', 'price_currency', 'available', 'city', 'postal_code', 'address', 'tags'];

      // Créer le produit parent
      const productData = {
        category: getMappedValue('category'),
        title: productTitle, // Utiliser le titre groupé
        description: getMappedValue('description') || null,
        base_price: getMappedValue('price') ? (typeof getMappedValue('price') === 'number' ? getMappedValue('price') : parseFloat(getMappedValue('price'))) : null,
        price_currency: getMappedValue('price_currency') || 'EUR',
        has_variants: 1 // Marquer que ce produit a des variantes
      };

      // Créer le produit
      await env.DB.prepare(`
        INSERT INTO products (
          id, tenant_id, category, title, description,
          price, price_currency, available, has_variants,
          status, created_by, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, 1, ?,
          'active', ?, datetime('now'), datetime('now')
        )
      `).bind(
        productId,
        tenantId,
        productData.category,
        productData.title,
        productData.description,
        productData.base_price,
        productData.price_currency,
        productData.has_variants,
        userId
      ).run();

      results.productsCreated++;

      // Créer les variantes
      for (let i = 0; i < variants.length; i++) {
        const variantRow = variants[i];
        const variantId = `var_${productId}_${i + 1}`;

        // Extraire les attributs de la variante
        const attributes = {};
        variantColumns.forEach(col => {
          if (variantRow[col] !== null && variantRow[col] !== undefined && variantRow[col] !== '') {
            // Déterminer le nom de l'attribut (color, size, etc.)
            const attrName = col.toLowerCase().includes('color') || col.toLowerCase().includes('couleur') ? 'color' :
                            col.toLowerCase().includes('size') || col.toLowerCase().includes('taille') || col.toLowerCase().includes('pointure') ? 'size' :
                            col.toLowerCase().includes('material') || col.toLowerCase().includes('matiere') ? 'material' :
                            col;
            attributes[attrName] = variantRow[col];
          }
        });

        // Récupérer le stock
        let stock = 0;
        if (stockColumns.length > 0) {
          const stockCol = stockColumns[0];
          stock = variantRow[stockCol];
          if (typeof stock === 'string') {
            stock = parseInt(stock) || 0;
          }
        }

        // Récupérer le SKU si disponible
        let sku = variantRow.sku || variantRow.SKU || '';
        if (!sku) {
          // Générer un SKU basique
          const colorPart = attributes.color ? attributes.color.substring(0, 3).toUpperCase() : '';
          const sizePart = attributes.size || '';
          sku = `${productId.substring(5, 10)}-${colorPart}${sizePart}`.replace(/\s/g, '');
        }

        // Déterminer le status du stock
        const stockStatus = stock === 0 ? 'out_of_stock' : stock < 5 ? 'low_stock' : 'in_stock';
        const available = stock > 0 ? 1 : 0;

        // Prix de la variante (peut override le prix de base)
        const variantPrice = getMappedValue('price');

        // Créer la variante
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
          sku,
          JSON.stringify(attributes),
          variantPrice,
          stock,
          stockStatus,
          available
        ).run();

        results.variantsCreated++;
      }

    } catch (error) {
      results.errors.push({
        product: productTitle,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Vérifie le stock d'un produit avec attributs spécifiques
 */
export async function checkStockByAttributes(tenantId, query, env) {
  const { title, attributes } = query;

  // Rechercher le produit par titre
  const product = await env.DB.prepare(`
    SELECT id, title, category, price
    FROM products
    WHERE tenant_id = ? AND title LIKE ? AND has_variants = 1
    LIMIT 1
  `).bind(tenantId, `%${title}%`).first();

  if (!product) {
    return {
      success: true,
      found: false,
      message: `Produit "${title}" non trouvé`
    };
  }

  // Rechercher la variante avec les attributs demandés
  const variants = await env.DB.prepare(`
    SELECT id, sku, attributes, stock_quantity, available, price
    FROM product_variants
    WHERE product_id = ? AND tenant_id = ?
  `).bind(product.id, tenantId).all();

  if (!variants.results || variants.results.length === 0) {
    return {
      success: true,
      found: true,
      product,
      variant: null,
      message: `Aucune variante trouvée pour "${title}"`
    };
  }

  // Rechercher la variante correspondant aux attributs
  let matchedVariant = null;
  for (const variant of variants.results) {
    const variantAttrs = JSON.parse(variant.attributes);

    // Vérifier si tous les attributs demandés correspondent
    const matches = Object.entries(attributes).every(([key, value]) => {
      const variantValue = variantAttrs[key];
      if (!variantValue) return false;

      // Comparaison insensible à la casse et aux espaces
      return variantValue.toString().toLowerCase().trim() === value.toString().toLowerCase().trim();
    });

    if (matches) {
      matchedVariant = {
        ...variant,
        attributes: variantAttrs
      };
      break;
    }
  }

  if (!matchedVariant) {
    // Proposer des alternatives
    const alternatives = variants.results
      .filter(v => v.available === 1 && v.stock_quantity > 0)
      .slice(0, 3)
      .map(v => {
        const attrs = JSON.parse(v.attributes);
        return {
          attributes: attrs,
          stock_quantity: v.stock_quantity,
          price: v.price,
          message: `${Object.entries(attrs).map(([k, v]) => `${k}: ${v}`).join(', ')} (${v.stock_quantity} disponible${v.stock_quantity > 1 ? 's' : ''})`
        };
      });

    return {
      success: true,
      found: true,
      product,
      variant: null,
      alternatives,
      message: `La combinaison demandée n'est pas disponible. ${alternatives.length > 0 ? 'Voici des alternatives :' : 'Aucune alternative en stock.'}`
    };
  }

  // Variante trouvée
  const inStock = matchedVariant.available === 1 && matchedVariant.stock_quantity > 0;

  return {
    success: true,
    found: true,
    product,
    variant: matchedVariant,
    message: inStock
      ? `Oui, il reste ${matchedVariant.stock_quantity} "${product.title}" ${Object.entries(matchedVariant.attributes).map(([k, v]) => v).join(', ')} en stock au prix de ${matchedVariant.price || product.price}€`
      : `Non, "${product.title}" ${Object.entries(matchedVariant.attributes).map(([k, v]) => v).join(', ')} n'est plus en stock`
  };
}
