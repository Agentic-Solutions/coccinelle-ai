# Architecture: Système de variantes de produits

## Cas d'usage

**Scénario**: Client appelle l'agent vocal
- "Bonjour, avez-vous la Nike Air Max en rouge, taille 42 ?"
- Agent doit répondre: "Oui, il nous reste 5 paires en stock" OU "Non, cette taille n'est plus disponible en rouge"

## Architecture proposée

### Option A: Table de variantes (RECOMMANDÉ)

**Avantages**:
- Requêtes SQL rapides par attributs
- Stock par variante
- Prix par variante (ex: taille 46 plus chère)
- SKU unique par variante
- Scalable (millions de variantes)

**Structure**:
```
products
├── id: prod_abc123
├── category: "shoes"
├── title: "Nike Air Max"
├── description: "..."
└── base_price: 129.99

product_variants
├── id: var_abc123_red_42
├── product_id: prod_abc123
├── sku: "NIKE-AM-RED-42"
├── attributes: {"color": "red", "size": 42}
├── price: 129.99 (peut override base_price)
├── stock_quantity: 5
├── available: 1
└── images: ["variant-red-42.jpg"]
```

### Option B: Variantes dans JSON (Simple mais limité)

**Avantages**:
- Pas de nouvelle table
- Simple pour petits catalogues

**Inconvénients**:
- Difficile à requêter par SQL
- Performances dégradées avec beaucoup de variantes

```json
{
  "id": "prod_abc123",
  "title": "Nike Air Max",
  "variants": [
    {
      "sku": "NIKE-AM-RED-42",
      "attributes": {"color": "red", "size": 42},
      "stock": 5,
      "price": 129.99
    },
    {
      "sku": "NIKE-AM-RED-43",
      "attributes": {"color": "red", "size": 43},
      "stock": 0,
      "price": 129.99
    }
  ]
}
```

## Solution choisie: Option A (Table de variantes)

### 1. Schéma de base de données

```sql
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  -- Identification
  sku TEXT NOT NULL,
  barcode TEXT,

  -- Attributs de la variante (couleur, taille, matériau, etc.)
  attributes TEXT NOT NULL, -- JSON: {"color": "red", "size": 42, "material": "leather"}

  -- Prix et stock
  price REAL,              -- Si NULL, utiliser le prix du produit parent
  compare_at_price REAL,   -- Prix barré
  cost_price REAL,         -- Prix de revient
  stock_quantity INTEGER DEFAULT 0,
  stock_status TEXT,       -- in_stock, low_stock, out_of_stock
  available INTEGER DEFAULT 1,

  -- Images spécifiques à la variante
  images TEXT,             -- JSON array

  -- Métadonnées
  position INTEGER,        -- Ordre d'affichage
  weight REAL,            -- Poids en kg
  requires_shipping INTEGER DEFAULT 1,

  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_tenant ON product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_available ON product_variants(available);

-- Index pour recherche par attributs (JSON)
-- Note: D1 supporte json_extract pour requêtes sur JSON
```

### 2. Format CSV pour import avec variantes

#### Format 1: Une ligne par variante
```csv
product_title,category,description,base_price,sku,color,size,stock,variant_price
Nike Air Max,shoes,Sneakers confortables,129.99,NIKE-AM-RED-42,Rouge,42,5,
Nike Air Max,shoes,Sneakers confortables,129.99,NIKE-AM-RED-43,Rouge,43,0,
Nike Air Max,shoes,Sneakers confortables,129.99,NIKE-AM-BLACK-42,Noir,42,3,
Adidas Ultra Boost,shoes,Chaussures de running,159.99,ADIDAS-UB-WHITE-42,Blanc,42,10,
```

**Logique d'import**:
- Grouper par `product_title`
- Créer 1 produit parent par groupe
- Créer 1 variante par ligne

#### Format 2: Colonnes dynamiques (avancé)
```csv
product_title,category,base_price,variants
Nike Air Max,shoes,129.99,"[{""sku"":""NIKE-AM-RED-42"",""color"":""Rouge"",""size"":42,""stock"":5}]"
```

### 3. API pour requêtes de stock

#### Endpoint: GET /api/v1/products/:id/variants

Récupérer toutes les variantes d'un produit:
```bash
GET /api/v1/products/prod_abc123/variants?tenantId=tenant_demo_001
```

Réponse:
```json
{
  "success": true,
  "product": {
    "id": "prod_abc123",
    "title": "Nike Air Max",
    "category": "shoes"
  },
  "variants": [
    {
      "id": "var_abc123_red_42",
      "sku": "NIKE-AM-RED-42",
      "attributes": {
        "color": "Rouge",
        "size": 42
      },
      "stock_quantity": 5,
      "available": true,
      "price": 129.99
    }
  ],
  "total_stock": 8
}
```

#### Endpoint: POST /api/v1/products/check-stock

Requête spécifique pour l'agent vocal:
```bash
POST /api/v1/products/check-stock
{
  "tenantId": "tenant_demo_001",
  "query": {
    "title": "Nike Air Max",
    "attributes": {
      "color": "rouge",
      "size": "42"
    }
  }
}
```

Réponse:
```json
{
  "success": true,
  "found": true,
  "product": {
    "id": "prod_abc123",
    "title": "Nike Air Max"
  },
  "variant": {
    "id": "var_abc123_red_42",
    "sku": "NIKE-AM-RED-42",
    "attributes": {
      "color": "Rouge",
      "size": 42
    },
    "stock_quantity": 5,
    "available": true,
    "price": 129.99
  },
  "message": "Oui, il reste 5 paires de Nike Air Max en rouge, taille 42"
}
```

Si rupture de stock:
```json
{
  "success": true,
  "found": true,
  "product": {
    "id": "prod_abc123",
    "title": "Nike Air Max"
  },
  "variant": {
    "stock_quantity": 0,
    "available": false
  },
  "alternatives": [
    {
      "attributes": {"color": "Rouge", "size": 43},
      "stock_quantity": 2,
      "message": "Nous avons la taille 43 en rouge (2 disponibles)"
    },
    {
      "attributes": {"color": "Noir", "size": 42},
      "stock_quantity": 3,
      "message": "Nous avons la taille 42 en noir (3 disponibles)"
    }
  ],
  "message": "Désolé, la Nike Air Max rouge taille 42 n'est plus en stock. Puis-je vous proposer la taille 43 en rouge ou la taille 42 en noir ?"
}
```

### 4. Utilisation par l'agent vocal

#### Dans le prompt système de l'agent:
```
Tu as accès à l'API de vérification de stock pour les produits avec variantes.

Quand un client demande la disponibilité d'un produit avec des caractéristiques spécifiques:
1. Extrais: nom du produit, attributs (couleur, taille, etc.)
2. Appelle check-stock avec ces informations
3. Réponds naturellement avec le stock disponible
4. Si rupture, propose des alternatives

Exemples:
Client: "Avez-vous la Nike Air Max en rouge, taille 42 ?"
→ API: check-stock({title: "Nike Air Max", attributes: {color: "rouge", size: 42}})
→ Réponse: "Oui, il nous reste 5 paires de Nike Air Max rouge en taille 42, au prix de 129.99€"

Client: "Je cherche la Adidas Ultra Boost blanche en 43"
→ API: check-stock({title: "Adidas Ultra Boost", attributes: {color: "blanche", size: 43}})
→ Si rupture: "Désolé, nous n'avons plus de Adidas Ultra Boost blanche en 43. Puis-je vous proposer la taille 42 ou la couleur noire en 43 ?"
```

### 5. Détection automatique dans l'import CSV

Le data-cleaner peut détecter automatiquement les variantes:

```javascript
// Dans data-cleaner.js
export function detectVariantStructure(headers, rows) {
  // Détecter si le CSV contient des variantes
  const variantIndicators = ['sku', 'color', 'size', 'taille', 'couleur', 'stock'];
  const hasVariants = headers.some(h =>
    variantIndicators.some(v => h.toLowerCase().includes(v))
  );

  if (!hasVariants) {
    return { hasVariants: false };
  }

  // Grouper par produit (même title)
  const productGroups = {};
  rows.forEach(row => {
    const title = row.title || row.nom || row.product_title;
    if (!productGroups[title]) {
      productGroups[title] = [];
    }
    productGroups[title].push(row);
  });

  // Identifier les colonnes de variantes
  const variantColumns = headers.filter(h => {
    const lower = h.toLowerCase();
    return ['color', 'couleur', 'size', 'taille', 'pointure', 'sku'].includes(lower);
  });

  return {
    hasVariants: true,
    productGroups,
    variantColumns,
    groupCount: Object.keys(productGroups).length,
    totalVariants: rows.length
  };
}
```

### 6. Migration depuis la structure actuelle

Pour les produits existants sans variantes, deux options:

**Option 1**: Créer une variante par défaut
```javascript
// Pour chaque produit existant, créer une variante "default"
INSERT INTO product_variants (
  id, product_id, tenant_id, sku,
  attributes, stock_quantity, available, price
) VALUES (
  'var_' || product_id || '_default',
  product_id,
  tenant_id,
  sku || '-DEFAULT',
  '{}',  -- Pas d'attributs spécifiques
  stock_quantity,
  available,
  price
);
```

**Option 2**: Mode hybride
- Produits avec `has_variants = 0` → utiliser la table products directement
- Produits avec `has_variants = 1` → requêter product_variants

## Exemple complet d'utilisation

### Import CSV avec variantes:
```csv
product_title,category,description,base_price,sku,color,size,stock
Nike Air Max,shoes,Sneakers confortables,129.99,NIKE-AM-RED-42,Rouge,42,5
Nike Air Max,shoes,Sneakers confortables,129.99,NIKE-AM-RED-43,Rouge,43,0
Nike Air Max,shoes,Sneakers confortables,129.99,NIKE-AM-BLACK-42,Noir,42,3
```

### Résultat en base de données:

**Table products**:
```
id: prod_nike_am_001
title: Nike Air Max
category: shoes
description: Sneakers confortables
base_price: 129.99
has_variants: 1
```

**Table product_variants**:
```
id: var_nike_am_red_42
product_id: prod_nike_am_001
sku: NIKE-AM-RED-42
attributes: {"color": "Rouge", "size": 42}
stock_quantity: 5

id: var_nike_am_red_43
product_id: prod_nike_am_001
sku: NIKE-AM-RED-43
attributes: {"color": "Rouge", "size": 43}
stock_quantity: 0

id: var_nike_am_black_42
product_id: prod_nike_am_001
sku: NIKE-AM-BLACK-42
attributes: {"color": "Noir", "size": 42}
stock_quantity: 3
```

### Requête agent vocal:
```javascript
// Agent reçoit: "La Nike Air Max rouge en 42 est-elle disponible ?"

const result = await fetch('/api/v1/products/check-stock', {
  method: 'POST',
  body: JSON.stringify({
    tenantId: 'tenant_demo_001',
    query: {
      title: 'Nike Air Max',
      attributes: {
        color: 'rouge',
        size: 42
      }
    }
  })
});

// Réponse: stock_quantity = 5
// Agent répond: "Oui, nous avons 5 paires de Nike Air Max rouge en taille 42 disponibles"
```

## Prochaines étapes

1. ✅ Créer la table `product_variants`
2. ✅ Modifier l'import CSV pour détecter et créer les variantes
3. ✅ Créer l'API `check-stock` pour l'agent vocal
4. ✅ Ajouter la détection de variantes dans le data-cleaner
5. ✅ Mettre à jour le frontend pour afficher les variantes
6. ✅ Intégrer avec l'agent vocal pour les requêtes de stock

---

**Voulez-vous que je commence l'implémentation ?**
