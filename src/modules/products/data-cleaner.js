/**
 * Module de nettoyage et détection intelligente de données
 * Compatible avec n'importe quel format CSV (même mal formaté)
 */

/**
 * Détecte si le CSV contient des variantes de produits
 * (plusieurs lignes avec même produit mais attributs différents)
 */
export function detectVariantStructure(headers, rows) {
  if (rows.length === 0) {
    return { hasVariants: false };
  }

  // Colonnes qui indiquent la présence de variantes
  const variantIndicators = [
    'sku', 'color', 'couleur', 'size', 'taille', 'pointure',
    'stock', 'quantity', 'quantite', 'variant', 'variante'
  ];

  // Vérifier si au moins une colonne de variante est présente
  const hasVariantColumns = headers.some(h =>
    variantIndicators.some(v => h.toLowerCase().includes(v))
  );

  if (!hasVariantColumns) {
    return { hasVariants: false };
  }

  // Identifier les colonnes qui pourraient être le titre du produit
  const titleColumns = headers.filter(h => {
    const lower = h.toLowerCase();
    return lower.includes('title') || lower.includes('titre') ||
           lower.includes('product') || lower.includes('produit') ||
           lower.includes('nom') || lower.includes('name');
  });

  if (titleColumns.length === 0) {
    return { hasVariants: false };
  }

  // Grouper par titre de produit
  const titleColumn = titleColumns[0];
  const productGroups = {};

  rows.forEach(row => {
    const title = row[titleColumn];
    if (!title || title.trim() === '') return;

    if (!productGroups[title]) {
      productGroups[title] = [];
    }
    productGroups[title].push(row);
  });

  // Si au moins un produit a plusieurs lignes, c'est probablement des variantes
  const hasMultipleRows = Object.values(productGroups).some(group => group.length > 1);

  if (!hasMultipleRows) {
    return { hasVariants: false };
  }

  // Identifier les colonnes de variantes (attributs qui diffèrent entre les lignes)
  const variantColumns = headers.filter(h => {
    const lower = h.toLowerCase();
    return ['color', 'couleur', 'size', 'taille', 'pointure', 'material', 'matiere', 'materiau'].some(v => lower.includes(v));
  });

  // Identifier les colonnes de stock
  const stockColumns = headers.filter(h => {
    const lower = h.toLowerCase();
    return ['stock', 'quantity', 'quantite', 'dispo', 'available'].some(v => lower.includes(v));
  });

  return {
    hasVariants: true,
    titleColumn,
    variantColumns,
    stockColumns,
    productGroups,
    groupCount: Object.keys(productGroups).length,
    totalVariants: rows.length,
    productsWithMultipleVariants: Object.values(productGroups).filter(g => g.length > 1).length
  };
}

/**
 * Détecte le type de données d'une colonne en analysant son contenu
 */
export function detectColumnType(columnName, values) {
  const samples = values.slice(0, 10).filter(v => v && v.trim());
  const colNameLower = columnName.toLowerCase();

  if (samples.length === 0) {
    return { type: 'empty', confidence: 1.0, shouldIgnore: true };
  }

  // Priorité haute: Détection basée sur le NOM de la colonne pour les variantes
  if (colNameLower.includes('stock') || colNameLower.includes('quantity') || colNameLower.includes('quantite')) {
    return { type: 'stock', confidence: 0.9, shouldIgnore: false };
  }

  if (colNameLower.includes('color') || colNameLower.includes('couleur')) {
    return { type: 'color', confidence: 0.9, shouldIgnore: false };
  }

  if (colNameLower.includes('size') || colNameLower.includes('taille') || colNameLower.includes('pointure')) {
    return { type: 'size', confidence: 0.9, shouldIgnore: false };
  }

  if (colNameLower === 'sku' || colNameLower.includes('reference')) {
    return { type: 'sku', confidence: 0.9, shouldIgnore: false };
  }

  // Détection URL
  const urlPattern = /^https?:\/\//;
  const urlCount = samples.filter(v => urlPattern.test(v)).length;
  if (urlCount / samples.length > 0.7) {
    return { type: 'url', confidence: urlCount / samples.length, shouldIgnore: true };
  }

  // Détection chemin image
  const imagePattern = /\.(jpg|jpeg|png|gif|svg|webp)$/i;
  const imageCount = samples.filter(v => imagePattern.test(v)).length;
  if (imageCount / samples.length > 0.7) {
    return { type: 'image', confidence: imageCount / samples.length, shouldIgnore: true };
  }

  // Détection classe CSS (contient underscore, tirets, pourcentages)
  const cssPattern = /^[a-z_\-0-9%\[\]]+$/i;
  const cssCount = samples.filter(v => cssPattern.test(v) && (v.includes('_') || v.includes('-') || v.includes('['))).length;
  if (cssCount / samples.length > 0.7) {
    return { type: 'css_class', confidence: cssCount / samples.length, shouldIgnore: true };
  }

  // Détection prix (€, EUR, $, USD avec chiffres)
  const pricePattern = /[\d\s]+[.,\d]*\s*(€|EUR|euros?|usd|\$)/i;
  const priceCount = samples.filter(v => pricePattern.test(v)).length;
  if (priceCount / samples.length > 0.6) {
    return { type: 'price', confidence: priceCount / samples.length, shouldIgnore: false };
  }

  // Détection surface (m², m2, mètres carrés)
  const surfacePattern = /[\d\s]+[.,\d]*\s*(m²|m2|mètres?\s*carrés?)/i;
  const surfaceCount = samples.filter(v => surfacePattern.test(v)).length;
  if (surfaceCount / samples.length > 0.6) {
    return { type: 'surface', confidence: surfaceCount / samples.length, shouldIgnore: false };
  }

  // Détection nombre de pièces/chambres
  const roomsPattern = /^\d+\s*(pièces?|chambres?|rooms?)/i;
  const roomsCount = samples.filter(v => roomsPattern.test(v)).length;
  if (roomsCount / samples.length > 0.6) {
    return { type: 'rooms', confidence: roomsCount / samples.length, shouldIgnore: false };
  }

  // Détection code postal français
  const postalPattern = /^\d{5}$/;
  const postalCount = samples.filter(v => postalPattern.test(v.trim())).length;
  if (postalCount / samples.length > 0.6) {
    return { type: 'postal_code', confidence: postalCount / samples.length, shouldIgnore: false };
  }

  // Détection type de bien immobilier (AVANT city car plus spécifique)
  const realEstatePattern = /^(appartement|maison|villa|studio|loft|immeuble|terrain|local|bureau|commerce).*(?:à vendre|à louer|en vente|en location)/i;
  const realEstateCount = samples.filter(v => realEstatePattern.test(v)).length;
  if (realEstateCount / samples.length > 0.6) {
    return { type: 'real_estate_type', confidence: realEstateCount / samples.length, shouldIgnore: false };
  }

  // Détection ville (commence par majuscule, pas de chiffres)
  const cityPattern = /^[A-ZÀÂÄÉÈÊËÏÎÔÙÛÜ][a-zàâäéèêëïîôùûü\s\-']+$/;
  const cityCount = samples.filter(v => cityPattern.test(v.trim())).length;
  if (cityCount / samples.length > 0.5) {
    return { type: 'city', confidence: cityCount / samples.length, shouldIgnore: false };
  }

  // Détection stock/quantité (nombres simples ou avec unités)
  const stockPattern = /^\d+(\s*(pcs?|pièces?|units?|unités?|disponibles?|en stock))?$/i;
  const stockCount = samples.filter(v => stockPattern.test(v.trim())).length;
  if (stockCount / samples.length > 0.7) {
    return { type: 'stock', confidence: stockCount / samples.length, shouldIgnore: false };
  }

  // Détection couleur (noms de couleurs courants)
  const colorPattern = /^(rouge|red|bleu|blue|vert|green|jaune|yellow|noir|black|blanc|white|gris|grey|gray|rose|pink|orange|violet|purple|marron|brown|beige|marine|navy)$/i;
  const colorCount = samples.filter(v => colorPattern.test(v.trim())).length;
  if (colorCount / samples.length > 0.6) {
    return { type: 'color', confidence: colorCount / samples.length, shouldIgnore: false };
  }

  // Détection taille/pointure (nombres avec optionnellement unités)
  const sizePattern = /^(XXS|XS|S|M|L|XL|XXL|XXXL|\d{1,3}(\.\d)?|[3-5][0-9])$/i;
  const sizeCount = samples.filter(v => sizePattern.test(v.trim())).length;
  if (sizeCount / samples.length > 0.6) {
    return { type: 'size', confidence: sizeCount / samples.length, shouldIgnore: false };
  }

  // Détection SKU (format alphanumérique avec tirets/underscores)
  const skuPattern = /^[A-Z0-9\-_]{5,}$/i;
  const skuCount = samples.filter(v => skuPattern.test(v.trim())).length;
  if (skuCount / samples.length > 0.7) {
    return { type: 'sku', confidence: skuCount / samples.length, shouldIgnore: false };
  }

  // Détection catégorie/type (mots courts répétitifs)
  const uniqueValues = new Set(samples.map(v => v.toLowerCase()));
  if (uniqueValues.size <= 5 && samples.length > 5) {
    return { type: 'category', confidence: 0.8, shouldIgnore: false };
  }

  // Détection description (texte long)
  const avgLength = samples.reduce((acc, v) => acc + v.length, 0) / samples.length;
  if (avgLength > 50) {
    return { type: 'description', confidence: 0.7, shouldIgnore: false };
  }

  // Détection titre (texte moyen)
  if (avgLength > 15 && avgLength <= 50) {
    return { type: 'title', confidence: 0.6, shouldIgnore: false };
  }

  // Par défaut : texte générique
  return { type: 'text', confidence: 0.5, shouldIgnore: false };
}

/**
 * Nettoie une valeur selon son type détecté
 */
export function cleanValue(value, type) {
  if (!value || typeof value !== 'string') return value;

  const trimmed = value.trim();

  switch (type) {
    case 'price':
      // Enlever €, EUR, espaces, garder seulement les chiffres et point/virgule
      const price = trimmed
        .replace(/[€$]/g, '')
        .replace(/EUR|USD|euros?/gi, '')
        .replace(/\s/g, '')
        .replace(',', '.');
      return parseFloat(price) || 0;

    case 'surface':
      // Enlever m², m2, espaces
      const surface = trimmed
        .replace(/m²|m2|mètres?\s*carrés?/gi, '')
        .replace(/\s/g, '')
        .replace(',', '.');
      return parseFloat(surface) || 0;

    case 'rooms':
      // Extraire le nombre
      const rooms = trimmed.match(/\d+/);
      return rooms ? parseInt(rooms[0]) : 0;

    case 'postal_code':
      // Garder seulement les 5 chiffres
      const postal = trimmed.replace(/\D/g, '').substring(0, 5);
      return postal || '';

    case 'city':
      // Enlever code postal si présent, capitaliser
      const city = trimmed
        .replace(/^\d{5}\s*/, '')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
      return city;

    case 'real_estate_type':
      // Extraire juste le type (Appartement, Maison, etc.) sans "à vendre"
      const match = trimmed.match(/^(appartement|maison|villa|studio|loft|immeuble|terrain|local|bureau|commerce)/i);
      if (match) {
        return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      }
      return trimmed;

    case 'stock':
      // Enlever les unités, garder seulement le nombre
      const stock = trimmed.replace(/\s*(pcs?|pièces?|units?|unités?|disponibles?|en stock)/gi, '').trim();
      return parseInt(stock) || 0;

    case 'color':
    case 'colour':
      // Capitaliser la première lettre
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();

    case 'size':
      // Garder tel quel mais trimmer
      return trimmed.toUpperCase(); // XS, S, M, L, XL ou 42, 43, etc.

    case 'sku':
      // Garder tel quel en uppercase
      return trimmed.toUpperCase();

    case 'category':
    case 'title':
    case 'description':
    case 'text':
      return trimmed;

    default:
      return trimmed;
  }
}

/**
 * Analyse et nettoie toutes les colonnes d'un CSV
 */
export function analyzeAndCleanCSV(headers, rows) {
  const analysis = {};
  const cleanedRows = [];
  const columnsToKeep = [];

  // Analyser chaque colonne
  headers.forEach((header, index) => {
    const columnValues = rows.map(row => row[header] || '');
    const detection = detectColumnType(header, columnValues);

    analysis[header] = {
      index,
      originalName: header,
      detectedType: detection.type,
      confidence: detection.confidence,
      shouldIgnore: detection.shouldIgnore,
      sampleValues: columnValues.slice(0, 3)
    };

    if (!detection.shouldIgnore) {
      columnsToKeep.push(header);
    }
  });

  // Nettoyer les données
  rows.forEach(row => {
    const cleanedRow = {};

    columnsToKeep.forEach(header => {
      const originalValue = row[header];
      const type = analysis[header].detectedType;
      cleanedRow[header] = cleanValue(originalValue, type);
    });

    cleanedRows.push(cleanedRow);
  });

  return {
    analysis,
    cleanedHeaders: columnsToKeep,
    cleanedRows,
    ignoredColumns: headers.filter(h => analysis[h].shouldIgnore),
    totalColumns: headers.length,
    keptColumns: columnsToKeep.length
  };
}

/**
 * Suggère un mapping intelligent basé sur les types détectés
 */
export function suggestSmartMapping(analysis) {
  const mapping = {};
  let hasTitle = false;
  let hasCategory = false;

  Object.entries(analysis).forEach(([header, info]) => {
    if (info.shouldIgnore) return;

    switch (info.detectedType) {
      case 'price':
        mapping[header] = 'price';
        break;
      case 'surface':
        mapping[header] = 'surface';
        break;
      case 'rooms':
        mapping[header] = 'rooms';
        break;
      case 'postal_code':
        mapping[header] = 'postal_code';
        break;
      case 'city':
        mapping[header] = 'city';
        break;
      case 'real_estate_type':
        // Première occurrence = title, deuxième = category
        if (!hasTitle) {
          mapping[header] = 'title';
          hasTitle = true;
        } else if (!hasCategory) {
          // Si on a déjà un title, cette colonne devient category
          mapping[header] = 'category';
          hasCategory = true;
        }
        break;
      case 'category':
        if (info.confidence > 0.7) {
          mapping[header] = 'category';
          hasCategory = true;
        }
        break;
      case 'title':
        if (info.confidence > 0.6) {
          mapping[header] = 'title';
          hasTitle = true;
        }
        break;
      case 'description':
        if (info.confidence > 0.6) {
          mapping[header] = 'description';
        }
        break;
    }
  });

  // Si on n'a pas de category, utiliser une valeur par défaut
  if (!hasCategory && Object.keys(mapping).length > 0) {
    // Créer une catégorie virtuelle basée sur real_estate_type si disponible
    const realEstateCol = Object.entries(analysis).find(([_, info]) =>
      info.detectedType === 'real_estate_type' && !info.shouldIgnore
    );
    if (realEstateCol) {
      mapping[realEstateCol[0] + '_category'] = 'category';
    }
  }

  return mapping;
}
