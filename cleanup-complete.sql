-- Nettoyage complet de la base de données
-- Suppression dans l'ordre inverse des dépendances

-- 1. Tables qui dépendent d'autres entités
DELETE FROM appointment_notifications;
DELETE FROM call_events;
DELETE FROM call_interactions;
DELETE FROM call_messages;
DELETE FROM call_summaries;
DELETE FROM call_logs;
DELETE FROM vapi_call_logs;
DELETE FROM vapi_calls;
DELETE FROM channel_messages_log;
DELETE FROM knowledge_search_logs;
DELETE FROM integration_webhook_logs;
DELETE FROM integration_sync_logs;
DELETE FROM integration_sync_queue;
DELETE FROM omni_messages;
DELETE FROM audit_logs;
DELETE FROM analytics_daily;

-- 2. Tables intermédiaires
DELETE FROM availability_slots;
DELETE FROM calendar_blocks;
DELETE FROM agent_services;
DELETE FROM agent_invitations;
DELETE FROM product_matches;
DELETE FROM product_variants;
DELETE FROM property_matches;
DELETE FROM qualified_prospects;
DELETE FROM rendez_vous;
DELETE FROM tickets;
DELETE FROM sessions;

-- 3. Tables métier
DELETE FROM appointments;
DELETE FROM calls;
DELETE FROM products;
DELETE FROM knowledge_chunks;
DELETE FROM knowledge_documents;
DELETE FROM knowledge_faq;
DELETE FROM knowledge_snippets;
DELETE FROM knowledge_base;
DELETE FROM crawl_jobs;
DELETE FROM knowledge_crawl_jobs;

-- 4. Onboarding
DELETE FROM onboarding_analytics;
DELETE FROM onboarding_sessions;

-- 5. Configuration
DELETE FROM channel_configurations;
DELETE FROM integration_field_mappings;
DELETE FROM tenant_integrations;
DELETE FROM tenant_channels;
DELETE FROM omni_phone_mappings;
DELETE FROM omni_email_configs;
DELETE FROM omni_agent_configs;
DELETE FROM omni_conversations;
DELETE FROM appointment_types;
DELETE FROM services;

-- 6. Catégories et prospects/properties
DELETE FROM product_categories;
DELETE FROM prospects;
DELETE FROM properties;

-- 7. Agents et users
DELETE FROM commercial_agents;
DELETE FROM users;

-- 8. Billing
DELETE FROM billing_usage;
DELETE FROM billing_invoices;
DELETE FROM billing_payment_methods;
DELETE FROM billing_subscriptions;

-- 9. Tenants (tout dernier)
DELETE FROM tenants;

-- Vérification
SELECT 'Cleanup completed!' as message;
SELECT 'Tenants: ' || COUNT(*) as check FROM tenants
UNION ALL SELECT 'Agents: ' || COUNT(*) FROM commercial_agents
UNION ALL SELECT 'Products: ' || COUNT(*) FROM products
UNION ALL SELECT 'Categories: ' || COUNT(*) FROM product_categories;
