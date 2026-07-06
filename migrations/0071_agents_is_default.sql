-- Migration 0071 — Agent « société » par défaut
-- Date : 6 juillet 2026 · Chantier Horaires SSOT
-- Contexte : source unique des horaires = availability_slots (maître). Chaque tenant
--   possède un agent « société » par défaut dont les créneaux reflètent les horaires
--   d'ouverture saisis à l'onboarding / dans Paramètres. Cette colonne rend cet agent
--   identifiable et le provisioning idempotent (voir src/modules/shared/horaires-slots.js).
-- Effet : additive, aucune donnée existante modifiée. DEFAULT 0 → agents actuels inchangés.

ALTER TABLE agents ADD COLUMN is_default INTEGER DEFAULT 0;
