-- Migration 0068 — Ajoute la colonne address à tenants (Chantier #1A)
-- Contexte : Paramètres › Mon entreprise lit/écrit tenants.address
--   (settings/routes.js : GET lit tenant.address, PUT /settings/company fait
--    UPDATE tenants SET address = ?). La colonne n'existait pas => 500 « no such
--    column: address » à CHAQUE sauvegarde de l'onglet Mon entreprise.
-- Additif, nullable, sans DEFAULT : rétro-compatible, aucune perte de données.
-- Après migration : l'onboarding (case 'knowledge') écrit aussi tenants.address
--   (source unique, pré-remplit Paramètres).
--
-- Application (Youssef, prod) :
--   npx wrangler@latest d1 execute coccinelle-db-eu --remote --file=migrations/0068_add_tenants_address.sql

ALTER TABLE tenants ADD COLUMN address TEXT;
