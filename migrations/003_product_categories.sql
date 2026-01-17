-- Migration: Catégories de produits personnalisables
-- Date: 2025-12-10
-- Description: Permet aux tenants de créer leurs propres catégories de produits

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,                    -- Clé unique (ex: "vehicles", "books")
  name TEXT NOT NULL,                   -- Nom affiché (ex: "Véhicules", "Livres")
  description TEXT,                     -- Description de la catégorie
  icon TEXT DEFAULT 'Package',          -- Nom de l'icône Lucide (ex: "Car", "Book")
  color TEXT DEFAULT 'blue',            -- Couleur: blue, purple, orange, green, red, yellow
  is_system INTEGER DEFAULT 0,          -- 1 = catégorie système (non modifiable)

  -- Champs dynamiques configurables pour cette catégorie
  fields TEXT DEFAULT '[]',             -- JSON array des champs personnalisés
                                        -- Ex: [{"key": "brand", "label": "Marque", "type": "text", "required": true}]

  -- Métadonnées
  display_order INTEGER DEFAULT 0,      -- Ordre d'affichage
  status TEXT DEFAULT 'active',         -- active, archived

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  created_by TEXT,

  UNIQUE(tenant_id, key)                -- Une seule catégorie par clé et par tenant
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_status ON product_categories(status);
CREATE INDEX IF NOT EXISTS idx_product_categories_key ON product_categories(key);

-- Insérer les catégories système par défaut pour tenant_demo_001
INSERT INTO product_categories (id, tenant_id, key, name, description, icon, color, is_system, fields, display_order)
VALUES
  (
    'cat_system_real_estate',
    'tenant_demo_001',
    'real_estate',
    'Immobilier',
    'Biens immobiliers: appartements, maisons, locaux commerciaux',
    'Home',
    'blue',
    1,
    '[
      {"key": "surface", "label": "Surface (m²)", "type": "number", "required": false},
      {"key": "rooms", "label": "Nombre de pièces", "type": "number", "required": false},
      {"key": "bedrooms", "label": "Chambres", "type": "number", "required": false},
      {"key": "floor", "label": "Étage", "type": "number", "required": false}
    ]',
    1
  ),
  (
    'cat_system_shoes',
    'tenant_demo_001',
    'shoes',
    'Chaussures',
    'Articles de chaussures et accessoires',
    'ShoppingBag',
    'purple',
    1,
    '[
      {"key": "brand", "label": "Marque", "type": "text", "required": false},
      {"key": "size", "label": "Pointure", "type": "text", "required": false},
      {"key": "color", "label": "Couleur", "type": "text", "required": false}
    ]',
    2
  ),
  (
    'cat_system_food',
    'tenant_demo_001',
    'food',
    'Restauration',
    'Produits alimentaires et plats de restauration',
    'UtensilsCrossed',
    'orange',
    1,
    '[
      {"key": "ingredients", "label": "Ingrédients", "type": "text", "required": false},
      {"key": "spicy", "label": "Épicé", "type": "checkbox", "required": false}
    ]',
    3
  ),
  (
    'cat_system_services',
    'tenant_demo_001',
    'services',
    'Services',
    'Services professionnels et prestations',
    'Briefcase',
    'green',
    1,
    '[
      {"key": "duration", "label": "Durée", "type": "text", "required": false},
      {"key": "online", "label": "En ligne", "type": "checkbox", "required": false}
    ]',
    4
  );
