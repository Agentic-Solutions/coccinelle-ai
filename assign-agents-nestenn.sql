-- Migration : Assigner les agents aux biens Nestenn
-- À exécuter après avoir créé le tenant et importé les produits

-- 1. Assigner Sophie Martin (agent_nestenn_1) à tous les biens de Toulouse
UPDATE products
SET agent_id = 'agent_nestenn_1',
    assignment_type = 'exclusive'
WHERE tenant_id = 'tenant_nestenn_test'
  AND agent_id IS NULL;

-- 2. Vérifier l'assignation
SELECT
  p.id,
  p.title,
  p.agent_id,
  (a.first_name || ' ' || a.last_name) as agent_name,
  p.assignment_type
FROM products p
LEFT JOIN commercial_agents a ON p.agent_id = a.id
WHERE p.tenant_id = 'tenant_nestenn_test'
ORDER BY p.created_at DESC
LIMIT 10;

-- 3. Statistiques par agent
SELECT
  (a.first_name || ' ' || a.last_name) as agent_name,
  COUNT(p.id) as properties_count
FROM commercial_agents a
LEFT JOIN products p ON a.id = p.agent_id
WHERE a.tenant_id = 'tenant_nestenn_test'
GROUP BY a.id;
