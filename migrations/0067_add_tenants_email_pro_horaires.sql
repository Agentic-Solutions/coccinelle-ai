-- Migration 0067 — Ajoute les colonnes email_pro et horaires à tenants
-- Contexte : le module onboarding (src/modules/onboarding/routes.js) LIT ces colonnes
--   dans GET /api/v1/onboarding/state (SELECT t.email_pro, t.horaires) et les ÉCRIT
--   dans POST /api/v1/onboarding/step case 'business' (UPDATE ... email_pro, horaires).
--   Ces colonnes n'existaient pas dans le schéma prod (coccinelle-db-eu) => D1 renvoyait
--   « no such column » => 500 sur /state et /step => onboarding cassé (0 complétion).
-- Additif, nullable, sans DEFAULT : aucune perte de données, rétro-compatible.
--
-- Application (à faire par Youssef, prod) :
--   npx wrangler@latest d1 execute coccinelle-db-eu --remote --file=migrations/0067_add_tenants_email_pro_horaires.sql

ALTER TABLE tenants ADD COLUMN email_pro TEXT;
ALTER TABLE tenants ADD COLUMN horaires TEXT;
