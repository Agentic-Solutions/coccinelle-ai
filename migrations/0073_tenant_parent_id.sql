-- 0073_tenant_parent_id.sql
-- Portail revendeur VoixIA.io (J1-J2)
-- Lien tenant enfant (= un agent vocal) -> tenant parent (= le revendeur).
-- Additif et non destructif : parent_tenant_id est NULL pour tous les tenants
-- Coccinelle existants (ils restent des comptes racine). Aucun impact sur
-- resolve-phone, log-call, ni sur l'auth existante.
ALTER TABLE tenants ADD COLUMN parent_tenant_id TEXT;
CREATE INDEX IF NOT EXISTS idx_tenants_parent ON tenants(parent_tenant_id);
