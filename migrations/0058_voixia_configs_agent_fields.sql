-- Migration 0058: Ajouter agent_name et agent_type a voixia_configs
-- Pour supporter la vue "Mes agents" avec liste + types

ALTER TABLE voixia_configs ADD COLUMN agent_name TEXT;
ALTER TABLE voixia_configs ADD COLUMN agent_type TEXT DEFAULT 'single_prompt';

-- Mettre a jour le tenant de test avec un nom d'agent
UPDATE voixia_configs SET agent_name = 'Fati', agent_type = 'single_prompt'
WHERE tenant_id = 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';
