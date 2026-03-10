-- Migration 0049 : Coherence — Harmoniser Sara + lier prospect aux RDV
-- Date : 2026-03-10

-- =====================================================
-- I1 : Renommer "Julien" en "Sara" dans les configs existantes
-- =====================================================

-- Mettre a jour omni_agent_configs : nom d'agent Julien -> Sara
UPDATE omni_agent_configs
SET agent_name = 'Sara',
    greeting_message = REPLACE(greeting_message, 'Julien', 'Sara'),
    updated_at = datetime('now')
WHERE agent_name = 'Julien';

-- Mettre a jour channel_configurations : JSON config_public contenant Julien
UPDATE channel_configurations
SET config_public = REPLACE(config_public, '"assistantName":"Julien"', '"assistantName":"Sara"'),
    updated_at = datetime('now')
WHERE config_public LIKE '%Julien%';

-- =====================================================
-- I3 : Ajouter prospect_id aux appointments (si manquant)
-- =====================================================

-- prospect_id already exists on appointments (added in earlier migration)
-- Just create the index if missing
CREATE INDEX IF NOT EXISTS idx_appointments_prospect ON appointments(prospect_id);
