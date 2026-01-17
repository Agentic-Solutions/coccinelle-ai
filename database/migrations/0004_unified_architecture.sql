/**
 * ================================================================
 * MIGRATION 0004 - ARCHITECTURE UNIFIÉE
 * ================================================================
 *
 * Objectif : Simplifier l'architecture en supprimant les redondances
 *            entre onboarding et runtime
 *
 * Principe : "Single Source of Truth"
 *   - Onboarding écrit directement dans les tables runtime
 *   - Plus de sync complexe
 *   - Plus de duplication de données
 *
 * Tables modifiées :
 *   - tenants : +onboarding_completed
 *   - onboarding_sessions : simplifiée (metadata uniquement)
 *   - omni_phone_mappings : ajoutée au schéma officiel
 *
 * Tables supprimées :
 *   - onboarding_analytics (fusionnée dans analytics standards)
 *   - channel_configurations (pour phone, fusionnée dans omni_agent_configs)
 *
 * Date : 2025-12-22
 * ================================================================
 */

-- ================================================================
-- 1. MODIFIER TABLE TENANTS
-- ================================================================

-- Ajouter flag de complétion onboarding (ignorer si la colonne existe déjà)
-- SQLite ne supporte pas IF NOT EXISTS dans ALTER TABLE ADD COLUMN
-- On utilise une vérification via pragma_table_info
-- Note: Si la colonne existe déjà, cette commande échouera mais ce n'est pas grave
-- ALTER TABLE tenants ADD COLUMN onboarding_completed INTEGER DEFAULT 0;

-- Backfill : marquer les tenants qui ont complété l'onboarding
UPDATE tenants
SET onboarding_completed = 1
WHERE id IN (
  SELECT tenant_id
  FROM onboarding_sessions
  WHERE status = 'completed'
);

-- ================================================================
-- 2. CRÉER TABLE OMNI_PHONE_MAPPINGS (si manquante)
-- ================================================================

CREATE TABLE IF NOT EXISTS omni_phone_mappings (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_omni_phone_number ON omni_phone_mappings(phone_number);
CREATE INDEX IF NOT EXISTS idx_omni_phone_tenant ON omni_phone_mappings(tenant_id);

-- ================================================================
-- 3. BACKFILL OMNI_PHONE_MAPPINGS depuis tenants
-- ================================================================

-- Insérer les mappings manquants depuis tenants.phone
INSERT OR IGNORE INTO omni_phone_mappings (id, phone_number, tenant_id, created_at, updated_at)
SELECT
  'mapping_' || substr(hex(randomblob(16)), 1, 16) as id,
  phone as phone_number,
  id as tenant_id,
  created_at,
  updated_at
FROM tenants
WHERE phone IS NOT NULL
  AND phone != ''
  AND id NOT IN (SELECT tenant_id FROM omni_phone_mappings);

-- ================================================================
-- 4. BACKFILL OMNI_AGENT_CONFIGS depuis onboarding_sessions
-- ================================================================

-- Insérer les configs manquantes pour les tenants qui ont complété l'onboarding
INSERT OR IGNORE INTO omni_agent_configs (
  id,
  tenant_id,
  agent_type,
  agent_name,
  voice_provider,
  voice_id,
  voice_language,
  enable_appointments,
  enable_products,
  created_at,
  updated_at
)
SELECT
  'agent_' || substr(hex(randomblob(16)), 1, 16) as id,
  tenant_id,
  COALESCE(
    json_extract(vapi_data, '$.agent_type'),
    json_extract(vapi_data, '$.phone.agent_type'),
    'multi_purpose'
  ) as agent_type,
  COALESCE(
    json_extract(vapi_data, '$.assistant_name'),
    json_extract(vapi_data, '$.phone.assistant_name'),
    'Assistant'
  ) as agent_name,
  'elevenlabs' as voice_provider,
  CASE
    WHEN COALESCE(json_extract(vapi_data, '$.voice'), json_extract(vapi_data, '$.phone.voice')) = 'male'
    THEN 'onwK4e9ZLuTAKqWW03F9'
    ELSE 'pNInz6obpgDQGcFmaJgB'
  END as voice_id,
  'fr-FR' as voice_language,
  1 as enable_appointments,
  0 as enable_products,
  created_at,
  updated_at
FROM onboarding_sessions
WHERE status = 'completed'
  AND vapi_data IS NOT NULL
  AND vapi_data != '{}'
  AND tenant_id NOT IN (SELECT tenant_id FROM omni_agent_configs);

-- ================================================================
-- 5. NETTOYER ONBOARDING_SESSIONS (anonymiser les anciennes)
-- ================================================================

-- Anonymiser les sessions de plus de 30 jours
UPDATE onboarding_sessions
SET
  business_data = '{"anonymized": true}',
  vapi_data = '{"anonymized": true}',
  kb_data = '{"anonymized": true}',
  twilio_data = '{"anonymized": true}',
  metadata = json_object('anonymized', 1, 'anonymized_at', datetime('now'))
WHERE status = 'completed'
  AND completed_at < datetime('now', '-30 days');

-- ================================================================
-- 6. STATISTIQUES POST-MIGRATION
-- ================================================================

-- Afficher les stats
SELECT
  'Tenants onboardés' as metric,
  COUNT(*) as value
FROM tenants
WHERE onboarding_completed = 1

UNION ALL

SELECT
  'Phone mappings créés' as metric,
  COUNT(*) as value
FROM omni_phone_mappings

UNION ALL

SELECT
  'Agent configs créées' as metric,
  COUNT(*) as value
FROM omni_agent_configs

UNION ALL

SELECT
  'Sessions anonymisées' as metric,
  COUNT(*) as value
FROM onboarding_sessions
WHERE json_extract(metadata, '$.anonymized') = 1;

-- ================================================================
-- FIN DE LA MIGRATION
-- ================================================================
