-- Migration 0044: Ajouter les colonnes manquantes a appointment_types
-- La table a ete creee avant la migration 0040, donc CREATE TABLE IF NOT EXISTS
-- n'a pas ajoute les nouvelles colonnes.
ALTER TABLE appointment_types ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE appointment_types ADD COLUMN updated_at TEXT DEFAULT (datetime('now'));
ALTER TABLE appointment_types ADD COLUMN price REAL;
ALTER TABLE appointment_types ADD COLUMN currency TEXT DEFAULT 'EUR';
ALTER TABLE appointment_types ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 30;
