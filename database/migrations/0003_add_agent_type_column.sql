-- Migration : Ajout de la colonne agent_type à omni_agent_configs
-- Date : 2025-12-19
-- Description : Permet de stocker le type d'agent choisi pendant l'onboarding

-- Ajouter la colonne agent_type
ALTER TABLE omni_agent_configs
ADD COLUMN agent_type TEXT DEFAULT 'multi_purpose';

-- Mettre à jour les enregistrements existants avec une valeur par défaut
UPDATE omni_agent_configs
SET agent_type = 'multi_purpose'
WHERE agent_type IS NULL;
