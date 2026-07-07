-- Migration 0069 — Backfill de cohérence colonnes tenants (Chantier #2)
-- Contexte : tenants.name est la source unique du nom (règle CLAUDE.md), mais
--   tenants.company_name (doublon legacy) est encore lu brut dans ~10 endroits.
--   Onboarding 'business' et settings/company synchronisent désormais
--   company_name = name à l'écriture ; ce backfill aligne les rows existants.
-- tenants.industry est une colonne morte (source = sector) : on comble seulement
--   les sector manquants depuis industry (vieux rows), sans écraser un sector valide.
-- Idempotent, sûr.
--
-- Application (Youssef, prod, APRÈS le déploiement backend) :
--   npx wrangler@latest d1 execute coccinelle-db-eu --remote --file=migrations/0069_backfill_tenant_company_name.sql

-- 1) Aligner company_name sur name
UPDATE tenants
  SET company_name = name, updated_at = datetime('now')
  WHERE name IS NOT NULL AND (company_name IS NULL OR company_name != name);

-- 2) Combler sector manquant depuis industry (vieux rows uniquement)
UPDATE tenants
  SET sector = industry, updated_at = datetime('now')
  WHERE (sector IS NULL OR sector = '') AND industry IS NOT NULL AND industry != '';
