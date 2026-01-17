-- Migration: Agent Assignment pour Products
-- Permet d'assigner des produits soit à TOUS les agents (shared) soit à un agent spécifique
-- Scénario A: agent_id = NULL → produit visible par tous les agents du tenant
-- Scénario B: agent_id = 'agent_123' → produit visible uniquement par cet agent

-- 1. Ajouter colonne agent_id (optionnel)
-- Si NULL → produit partagé à tous les agents du tenant
-- Si défini → produit spécifique à cet agent
ALTER TABLE products ADD COLUMN agent_id TEXT;

-- 2. Ajouter colonne assignment_type pour clarté
-- 'shared' → visible par tous les agents du tenant (agent_id = NULL)
-- 'agent_specific' → visible uniquement par l'agent spécifié (agent_id défini)
ALTER TABLE products ADD COLUMN assignment_type TEXT DEFAULT 'shared';

-- 3. Ajouter foreign key vers agents
-- Note: SQLite ne supporte pas ADD CONSTRAINT après création
-- Cette contrainte sera vérifiée au niveau applicatif

-- 4. Index pour performance sur les requêtes par agent
CREATE INDEX IF NOT EXISTS idx_products_agent ON products(agent_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_assignment ON products(assignment_type, tenant_id);

-- 5. Mettre à jour tous les produits existants
-- Par défaut, tous les produits existants sont partagés (scénario A)
UPDATE products
SET assignment_type = 'shared',
    agent_id = NULL
WHERE assignment_type IS NULL OR agent_id IS NOT NULL;

-- Note: Comportement attendu
-- ============================
-- Query pour produits visibles par un agent spécifique:
-- SELECT * FROM products
-- WHERE tenant_id = ?
--   AND (agent_id IS NULL OR agent_id = ?)
--   AND available = 1
--   AND status = 'active'
--
-- Exemples:
-- - Produit avec agent_id = NULL → visible par agent_1, agent_2, agent_3 (tous)
-- - Produit avec agent_id = 'agent_1' → visible uniquement par agent_1
-- - Produit avec agent_id = 'agent_2' → visible uniquement par agent_2
