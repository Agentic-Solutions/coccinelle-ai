-- Créer tenant de test: Nestenn Toulouse Rangueil
-- Version simplifiée sans product_categories

-- 1. Créer le tenant
INSERT INTO tenants (
  id, name, email, api_key, timezone, created_at
) VALUES (
  'tenant_nestenn_test',
  'Nestenn Toulouse Rangueil',
  'admin@nestenn-test.fr',
  'test_api_key_nestenn_' || hex(randomblob(16)),
  'Europe/Paris',
  datetime('now')
);

-- 2. Créer 2 agents immobiliers
INSERT INTO commercial_agents (
  id, tenant_id, first_name, last_name, email, is_active, created_at
) VALUES
  (
    'agent_nestenn_1',
    'tenant_nestenn_test',
    'Sophie',
    'Martin',
    'sophie@nestenn-toulouse-rangueil.fr',
    1,
    datetime('now')
  ),
  (
    'agent_nestenn_2',
    'tenant_nestenn_test',
    'Pierre',
    'Dubois',
    'pierre@nestenn-toulouse-rangueil.fr',
    1,
    datetime('now')
  );

-- 3. Créer disponibilités par défaut (9h-18h, Lun-Ven) pour les 2 agents
INSERT INTO availability_slots (id, tenant_id, agent_id, day_of_week, start_time, end_time, is_available)
SELECT
  'slot_' || agent_id || '_' || day,
  'tenant_nestenn_test',
  agent_id,
  day,
  '09:00',
  '18:00',
  1
FROM (
  SELECT 'agent_nestenn_1' as agent_id UNION ALL
  SELECT 'agent_nestenn_2'
) agents
CROSS JOIN (
  SELECT 1 as day UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) days;
