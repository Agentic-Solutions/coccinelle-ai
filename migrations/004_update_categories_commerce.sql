-- Migration: Remplacer "Chaussures" par "Commerce" (catégorie générique)
-- Date: 2025-12-13
-- Description: Catégorie Commerce générique pour tous types de marchandises

-- 1. Supprimer l'ancienne catégorie "Chaussures"
DELETE FROM product_categories WHERE key = 'shoes' AND tenant_id = 'tenant_demo_001';

-- 2. Créer la nouvelle catégorie "Commerce" générique
INSERT INTO product_categories (id, tenant_id, key, name, description, icon, color, is_system, fields, display_order)
VALUES
  (
    'cat_system_retail',
    'tenant_demo_001',
    'retail',
    'Commerce',
    'Marchandises et articles de commerce : vêtements, chaussures, accessoires, électronique, etc.',
    'ShoppingBag',
    'purple',
    1,
    '[
      {"key": "brand", "label": "Marque", "type": "text", "required": false},
      {"key": "model", "label": "Modèle", "type": "text", "required": false},
      {"key": "color", "label": "Couleur", "type": "text", "required": false}
    ]',
    2
  );

-- 3. Mettre à jour les produits existants de type "shoes" vers "retail"
UPDATE products
SET category = 'retail'
WHERE category = 'shoes' AND tenant_id = 'tenant_demo_001';
