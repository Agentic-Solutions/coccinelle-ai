-- Migration 0072 — Durée de prestation sur products
-- Date : 6 juillet 2026 · Chantier Prestations (fusion services → products)
-- Contexte : source unique des prestations = products avec type='service'. La durée
--   de RDV (booking) était portée par la table `services` (dépréciée). On l'ajoute sur
--   products pour que la prestation porte sa propre durée, lisible par le booking.
-- Effet : additive. products.appointment_type_id existe déjà (schéma) ; on ne câble que
--   la nouvelle colonne duration_minutes. Aucune donnée existante modifiée.

ALTER TABLE products ADD COLUMN duration_minutes INTEGER;
