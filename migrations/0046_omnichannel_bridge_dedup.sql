-- Migration 0045 : Omnichannel Bridge — M8 Channel Switching + M9 Dedup
-- Date : 2026-03-04

-- M9 : Ajout colonne interaction_count sur prospects
ALTER TABLE prospects ADD COLUMN interaction_count INTEGER DEFAULT 1;

-- M9 : Ajout colonne updated_at sur prospects (si manquante)
-- Note : ALTER TABLE ADD COLUMN est idempotent si la colonne existe deja dans D1
-- Si erreur "duplicate column", ignorer
ALTER TABLE prospects ADD COLUMN updated_at DATETIME;

-- M9 : Index unique partiel sur (tenant_id, phone) pour dedup par telephone
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_tenant_phone
  ON prospects(tenant_id, phone) WHERE phone IS NOT NULL;

-- M9 : Index unique partiel sur (tenant_id, email) pour dedup par email
CREATE UNIQUE INDEX IF NOT EXISTS idx_prospects_tenant_email
  ON prospects(tenant_id, email) WHERE email IS NOT NULL;
