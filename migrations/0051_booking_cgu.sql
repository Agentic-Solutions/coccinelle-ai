-- Migration 0051: Booking public + CGU acceptance
-- Ajoute cgu_accepted_at sur users pour la conformité légale

ALTER TABLE users ADD COLUMN cgu_accepted_at DATETIME;
