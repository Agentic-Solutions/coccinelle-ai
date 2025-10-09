-- ============================================
-- SEED KB v2.0 - VERSION ADAPTIVE
-- Crée tenant/agent si nécessaire
-- ============================================

-- 1. Créer tenant de test si n'existe pas
INSERT OR IGNORE INTO tenants (id, name, email, created_at) VALUES
  ('tenant_001', 'Salon Marie - Test', 'contact@salon-marie.fr', CURRENT_TIMESTAMP);

-- 2. Créer agent de test si n'existe pas
INSERT OR IGNORE INTO agents (id, tenant_id, name, email, phone, created_at) VALUES
  ('agent_001', 'tenant_001', 'Sara Martinez', 'sara@salon-marie.fr', '+33612345678', CURRENT_TIMESTAMP);

-- 3. Services
INSERT OR IGNORE INTO services (id, tenant_id, name, description, duration_minutes, price, currency, category, preparation_time, cleanup_time, display_order) VALUES
  ('service_001', 'tenant_001', 'Coupe Homme', 'Coupe classique avec shampooing', 30, 25.00, 'EUR', 'coiffure', 0, 5, 1),
  ('service_002', 'tenant_001', 'Coupe Femme', 'Coupe avec shampooing et brushing', 60, 45.00, 'EUR', 'coiffure', 0, 10, 2),
  ('service_003', 'tenant_001', 'Coloration Complète', 'Coloration avec soin', 120, 85.00, 'EUR', 'coloration', 10, 15, 3),
  ('service_004', 'tenant_001', 'Mèches', 'Mèches ou balayage', 150, 95.00, 'EUR', 'coloration', 10, 15, 4),
  ('service_005', 'tenant_001', 'Brushing', 'Brushing simple', 30, 20.00, 'EUR', 'coiffure', 0, 5, 5);

-- 4. Agent services
INSERT OR IGNORE INTO agent_services (id, agent_id, service_id, proficiency_level) VALUES
  ('as_001', 'agent_001', 'service_001', 'expert'),
  ('as_002', 'agent_001', 'service_002', 'expert'),
  ('as_003', 'agent_001', 'service_003', 'expert'),
  ('as_004', 'agent_001', 'service_004', 'expert'),
  ('as_005', 'agent_001', 'service_005', 'expert');

-- 5. FAQ
INSERT OR IGNORE INTO knowledge_faq (id, tenant_id, question, answer, category, keywords, priority) VALUES
  ('faq_001', 'tenant_001', 'Utilisez-vous des produits bio ?', 'Oui ! Nous utilisons exclusivement des produits professionnels bio.', 'product', '["bio", "produits"]', 10),
  ('faq_002', 'tenant_001', 'Quelle est votre politique d''annulation ?', 'Vous pouvez annuler jusqu''à 24h avant sans frais.', 'policy', '["annulation"]', 9),
  ('faq_003', 'tenant_001', 'Combien de temps dure une coloration ?', 'Une coloration complète dure environ 2 heures.', 'service', '["coloration", "durée"]', 7);

-- 6. Snippets
INSERT OR IGNORE INTO knowledge_snippets (id, tenant_id, name, content, category, usage_context) VALUES
  ('snippet_001', 'tenant_001', 'greeting_standard', 'Bonjour et bienvenue chez Salon Marie !', 'greeting', 'greeting'),
  ('snippet_002', 'tenant_001', 'horaires_ouverture', 'Nous sommes ouverts du lundi au samedi de 9h à 19h.', 'schedule', 'general');

SELECT 'Seed KB v2.0 appliqué avec succès!' AS message,
  (SELECT COUNT(*) FROM services) AS services,
  (SELECT COUNT(*) FROM agent_services) AS agent_services,
  (SELECT COUNT(*) FROM knowledge_faq) AS faq;
