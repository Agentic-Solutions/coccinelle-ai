-- 0076_client_compliance.sql
-- Chantier Conformité — revente de numéros FR par client final.
-- Additif et non destructif. Une ligne par client final (tenant enfant) :
-- vérification SIRET (INSEE via recherche-entreprises.api.gouv.fr) +
-- Regulatory Bundle Twilio dédié (SIRET + adresse + End-User + pièce dirigeant).
--
-- RÈGLE MÉTIER : l'attribution d'un numéro est BLOQUÉE tant que
-- bundle_status != 'approved'. Le tenant maître (numéros démo) reste sur le
-- bundle maître (TWILIO_FR_BUNDLE_SID) via fallback code — aucune ligne ici
-- requise pour lui.
--
-- Pas de FK stricte sur tenant_id (cf. chaîne FK tenants observée en J1) :
-- éviter de bloquer la suppression d'un tenant.
CREATE TABLE IF NOT EXISTS client_compliance (
  id                  TEXT PRIMARY KEY,
  tenant_id           TEXT NOT NULL,               -- tenant enfant (client final)
  siret               TEXT,                        -- 14 chiffres
  company_name        TEXT,                        -- raison sociale saisie
  insee_status        TEXT DEFAULT 'pending',      -- pending | verified | mismatch | closed | not_found
  insee_checked_at    TEXT,
  address_line        TEXT,
  postal_code         TEXT,
  city                TEXT,
  country             TEXT DEFAULT 'FR',
  twilio_bundle_sid   TEXT,
  twilio_enduser_sid  TEXT,
  twilio_address_sid  TEXT,
  bundle_status       TEXT DEFAULT 'draft',        -- draft | pending-review | approved | rejected
  kyc_status          TEXT DEFAULT 'none',         -- none | uploaded | attached
  rejection_reason    TEXT,
  created_at          TEXT,
  updated_at          TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_compliance_tenant ON client_compliance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_compliance_bundle_status ON client_compliance(bundle_status);

-- Garde-fou attribution : un numéro n'est attribuable que si le bundle du
-- client est dans le statut requis. DEFAULT 'approved' = strict.
ALTER TABLE number_pool ADD COLUMN required_bundle_status TEXT DEFAULT 'approved';
