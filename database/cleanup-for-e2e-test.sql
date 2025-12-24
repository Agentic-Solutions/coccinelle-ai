-- =====================================================
-- SCRIPT DE NETTOYAGE POUR TEST END-TO-END
-- Date: 18 Décembre 2025
-- Usage: Vider les données tout en conservant la structure
-- =====================================================

-- IMPORTANT: Ce script supprime TOUTES les données
-- Ne pas utiliser en production avec des vraies données!

-- =====================================================
-- 1. TABLES OMNICHANNEL
-- =====================================================

-- Conversations et messages
DELETE FROM omni_messages;
DELETE FROM omni_conversations;

-- Configurations agents
DELETE FROM omni_agent_configs;

-- Phone mappings
DELETE FROM omni_phone_mappings;

-- =====================================================
-- 2. TABLES ONBOARDING
-- =====================================================

DELETE FROM onboarding_sessions;

-- =====================================================
-- 3. TABLES KNOWLEDGE BASE
-- =====================================================

DELETE FROM knowledge_documents;
DELETE FROM knowledge_chunks;

-- =====================================================
-- 4. TABLES PRODUCTS
-- =====================================================

DELETE FROM products;
DELETE FROM product_categories;

-- =====================================================
-- 5. TABLES APPOINTMENTS
-- =====================================================

DELETE FROM appointments;

-- =====================================================
-- 6. TABLES PROSPECTS ET AGENTS
-- =====================================================

DELETE FROM prospects;
DELETE FROM availability_slots;
DELETE FROM commercial_agents;

-- =====================================================
-- 7. TABLES UTILISATEURS (CONSERVER L'ADMIN)
-- =====================================================

-- Supprimer tous les utilisateurs SAUF l'admin
DELETE FROM users WHERE email != 'test7@test.com';

-- =====================================================
-- 8. TABLES TENANTS (CONSERVER LE TENANT DE TEST)
-- =====================================================

-- Supprimer tous les tenants sauf celui du test
DELETE FROM tenants WHERE id != 'tenant_dGVzdDdAdGVzdC5jb20';

-- Réinitialiser les données du tenant de test
UPDATE tenants
SET
  company_name = NULL,
  sector = NULL,
  subscription_tier = 'free',
  subscription_status = 'active'
WHERE id = 'tenant_dGVzdDdAdGVzdC5jb20';

-- =====================================================
-- 9. VÉRIFICATION POST-NETTOYAGE
-- =====================================================

-- Compter les enregistrements restants
SELECT 'omni_conversations' as table_name, COUNT(*) as count FROM omni_conversations
UNION ALL
SELECT 'omni_messages', COUNT(*) FROM omni_messages
UNION ALL
SELECT 'omni_agent_configs', COUNT(*) FROM omni_agent_configs
UNION ALL
SELECT 'omni_phone_mappings', COUNT(*) FROM omni_phone_mappings
UNION ALL
SELECT 'onboarding_sessions', COUNT(*) FROM onboarding_sessions
UNION ALL
SELECT 'knowledge_documents', COUNT(*) FROM knowledge_documents
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'prospects', COUNT(*) FROM prospects
UNION ALL
SELECT 'agents', COUNT(*) FROM commercial_agents
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'tenants', COUNT(*) FROM tenants;

-- =====================================================
-- 10. RÉSULTAT ATTENDU
-- =====================================================

-- Après ce nettoyage, vous devriez avoir:
-- - 0 conversations, messages, agent configs, phone mappings
-- - 0 sessions d'onboarding
-- - 0 documents KB, produits, appointments, prospects, agents
-- - 1 user (test7@test.com)
-- - 1 tenant (tenant_dGVzdDdAdGVzdC5jb20) réinitialisé

-- =====================================================
-- COMMENT EXÉCUTER CE SCRIPT
-- =====================================================

-- Option 1: Via Cloudflare Dashboard
-- 1. Aller sur https://dash.cloudflare.com
-- 2. Workers & Pages > D1 > coccinelle-db
-- 3. Console > Coller ce script > Execute

-- Option 2: Via wrangler (après ré-authentification)
-- npx wrangler d1 execute coccinelle-db --remote --file=database/cleanup-for-e2e-test.sql

-- Option 3: Via curl sur l'API
-- Créer un endpoint dédié dans routes.js pour exécuter ce nettoyage
