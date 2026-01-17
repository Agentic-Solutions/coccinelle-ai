-- Migration: Table products universelle multi-secteurs
-- Remplace la table properties spécifique à l'immobilier
-- Compatible: Immobilier, E-commerce, Services, Restauration, etc.

-- 1. Créer la nouvelle table products universelle
CREATE TABLE IF NOT EXISTS products (
  -- Identifiants
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  sku TEXT,                         -- Référence produit/service

  -- Classification (universel)
  category TEXT NOT NULL,           -- "real_estate", "shoes", "services", "food", etc.
  type TEXT,                        -- Sous-catégorie flexible

  -- Informations de base (universel)
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,           -- Pour listings

  -- Prix et disponibilité (universel)
  price REAL,
  price_currency TEXT DEFAULT 'EUR',
  compare_at_price REAL,            -- Prix barré (promos)
  stock_quantity INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'in_stock', -- "in_stock", "out_of_stock", "preorder"
  available INTEGER DEFAULT 1,      -- Actif/inactif

  -- Métadonnées flexibles par secteur (JSON)
  attributes TEXT DEFAULT '{}',     -- Champs spécifiques au secteur

  -- Images et médias (universel)
  images TEXT DEFAULT '[]',         -- Array d'URLs JSON
  videos TEXT DEFAULT '[]',         -- Array d'URLs vidéos JSON

  -- Localisation (optionnel selon secteur)
  location TEXT DEFAULT '{}',       -- JSON: {address, city, lat, lng, postal_code, etc.}

  -- SEO et recherche
  keywords TEXT,                    -- Mots-clés recherche
  tags TEXT DEFAULT '[]',           -- Tags JSON array

  -- Variantes (pour e-commerce)
  has_variants INTEGER DEFAULT 0,
  variants TEXT DEFAULT '[]',       -- JSON array de variantes

  -- Statut et publication
  status TEXT DEFAULT 'active',     -- "active", "draft", "archived"
  published_at DATETIME,

  -- Métadonnées
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  updated_by TEXT,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category, tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku, tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(available, tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- 2. Migrer les données existantes de properties vers products
INSERT INTO products (
  id,
  tenant_id,
  category,
  type,
  title,
  description,
  price,
  available,
  location,
  created_at,
  status
)
SELECT
  id,
  tenant_id,
  'real_estate' as category,
  type,
  title,
  NULL as description,
  price,
  available,
  json_object(
    'address', COALESCE(address, ''),
    'city', COALESCE(city, '')
  ) as location,
  created_at,
  CASE WHEN available = 1 THEN 'active' ELSE 'archived' END as status
FROM properties
WHERE NOT EXISTS (SELECT 1 FROM products WHERE products.id = properties.id);

-- 3. Créer une vue de compatibilité pour l'ancien code
CREATE VIEW IF NOT EXISTS properties_view AS
SELECT
  id,
  tenant_id,
  type,
  title,
  json_extract(location, '$.address') as address,
  json_extract(location, '$.city') as city,
  price,
  available,
  created_at
FROM products
WHERE category = 'real_estate';

-- 4. Table product_matches universelle (remplace property_matches)
CREATE TABLE IF NOT EXISTS product_matches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  product_id TEXT NOT NULL,

  -- Score et matching
  match_score REAL DEFAULT 0,       -- 0-100
  match_criteria TEXT DEFAULT '{}', -- JSON des critères matchés

  -- Statut de l'interaction
  status TEXT DEFAULT 'new',        -- "new", "viewed", "interested", "contacted", "converted"
  viewed_at DATETIME,
  contacted_at DATETIME,

  -- Notes et suivi
  notes TEXT,
  agent_id TEXT,

  -- Métadonnées
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (prospect_id) REFERENCES prospects(id),
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (agent_id) REFERENCES agents(id)
);

CREATE INDEX IF NOT EXISTS idx_product_matches_tenant ON product_matches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_matches_prospect ON product_matches(prospect_id);
CREATE INDEX IF NOT EXISTS idx_product_matches_product ON product_matches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_matches_status ON product_matches(status);

-- 5. Migrer property_matches vers product_matches
INSERT INTO product_matches (
  id,
  tenant_id,
  prospect_id,
  product_id,
  match_score,
  status,
  created_at
)
SELECT
  pm.id,
  pr.tenant_id,
  pm.prospect_id,
  pm.property_id as product_id,
  pm.score as match_score,
  'new' as status,
  pm.created_at
FROM property_matches pm
INNER JOIN prospects pr ON pm.prospect_id = pr.id
WHERE NOT EXISTS (SELECT 1 FROM product_matches WHERE product_matches.id = pm.id);

-- Commentaire : Ne pas supprimer les anciennes tables pour compatibilité
-- DROP TABLE IF EXISTS properties;
-- DROP TABLE IF EXISTS property_matches;

-- Note : Les anciennes tables restent accessibles pour rétrocompatibilité
-- Nouveau code doit utiliser 'products' et 'product_matches'
