-- Migration: Création de la table product_variants pour gérer les variantes de produits
-- Date: 2025-12-13
-- Description: Permet de gérer les produits avec attributs (couleur, taille, etc.) et stock par variante

-- 1. Créer la table product_variants
CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  -- Identification
  sku TEXT NOT NULL,
  barcode TEXT,

  -- Attributs de la variante (couleur, taille, matériau, etc.)
  -- Format JSON: {"color": "red", "size": 42, "material": "leather"}
  attributes TEXT NOT NULL DEFAULT '{}',

  -- Prix et stock
  price REAL,              -- Si NULL, utiliser le prix du produit parent
  compare_at_price REAL,   -- Prix barré
  cost_price REAL,         -- Prix de revient
  stock_quantity INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'in_stock', -- in_stock, low_stock, out_of_stock
  available INTEGER DEFAULT 1,

  -- Images spécifiques à la variante
  images TEXT,             -- JSON array: ["image1.jpg", "image2.jpg"]

  -- Métadonnées
  position INTEGER DEFAULT 0,        -- Ordre d'affichage
  weight REAL,                       -- Poids en kg
  requires_shipping INTEGER DEFAULT 1,

  -- Timestamps
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- 2. Créer les index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_tenant ON product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_variants_available ON product_variants(available);
CREATE INDEX IF NOT EXISTS idx_variants_stock_status ON product_variants(stock_status);

-- 3. Index composite pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_variants_tenant_product ON product_variants(tenant_id, product_id);
CREATE INDEX IF NOT EXISTS idx_variants_tenant_available ON product_variants(tenant_id, available);

-- Note: Pour requêter sur les attributs JSON, utiliser json_extract:
-- SELECT * FROM product_variants WHERE json_extract(attributes, '$.color') = 'red';
-- SELECT * FROM product_variants WHERE json_extract(attributes, '$.size') = 42;
