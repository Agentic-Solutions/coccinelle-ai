-- Migration: Ajouter le support des types d'agents prédéfinis
-- Date: 2025-12-17

-- Ajouter la colonne agent_type pour définir le type d'agent
ALTER TABLE omni_agent_configs ADD COLUMN agent_type TEXT DEFAULT 'custom';

-- Ajouter la colonne tools_config pour activer/désactiver les outils
ALTER TABLE omni_agent_configs ADD COLUMN tools_config TEXT DEFAULT NULL;

-- Ajouter la colonne workflow_config pour personnaliser le workflow
ALTER TABLE omni_agent_configs ADD COLUMN workflow_config TEXT DEFAULT NULL;

-- Mettre à jour les agents existants avec le type 'real_estate_reception' si ils ont un system_prompt immobilier
UPDATE omni_agent_configs
SET agent_type = 'real_estate_reception'
WHERE system_prompt LIKE '%immobilier%' OR system_prompt LIKE '%real estate%';

-- Créer un index sur agent_type pour les requêtes
CREATE INDEX IF NOT EXISTS idx_omni_agent_configs_agent_type ON omni_agent_configs(agent_type);
