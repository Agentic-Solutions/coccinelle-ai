-- 0074_number_pool.sql
-- Sprint VoixIA.io J3 — pool manuel de numéros Twilio pré-achetés.
-- Additif et non destructif. Un numéro du pool est attribué à un agent
-- (tenant enfant) : à l'attribution, on crée aussi la ligne
-- omni_phone_mappings (channel_type='voice', is_active=1) qui permet à
-- resolve-phone de router l'appel vers le bon agent.
--
-- assigned_tenant_id est une colonne libre (PAS de FK stricte) pour éviter
-- de bloquer la suppression d'un tenant (cf. chaîne FK tenants observée en J1).
-- La libération remet status='available'.
CREATE TABLE IF NOT EXISTS number_pool (
  id                  TEXT PRIMARY KEY,
  phone_number        TEXT UNIQUE NOT NULL,      -- format E.164 (+33…)
  label               TEXT,                      -- ex. "Paris 09"
  country             TEXT DEFAULT 'FR',
  twilio_sid          TEXT,                      -- référence Twilio (optionnel)
  status              TEXT NOT NULL DEFAULT 'available',  -- available | assigned
  assigned_tenant_id  TEXT,                      -- agent-tenant bénéficiaire
  assigned_at         TEXT,
  created_at          TEXT
);
CREATE INDEX IF NOT EXISTS idx_number_pool_status ON number_pool(status);
CREATE INDEX IF NOT EXISTS idx_number_pool_assigned ON number_pool(assigned_tenant_id);
