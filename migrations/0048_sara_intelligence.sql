-- Migration 0048: Sara Intelligence — appointment_type_id sur appointments + confirmation tracking
-- Date : 2026-03-08

-- N2 : Lien appointment_types → appointments
ALTER TABLE appointments ADD COLUMN appointment_type_id TEXT;

-- N3 : Tracking de la confirmation envoyée
ALTER TABLE appointments ADD COLUMN confirmation_sent INTEGER DEFAULT 0;
ALTER TABLE appointments ADD COLUMN confirmation_channel TEXT;
