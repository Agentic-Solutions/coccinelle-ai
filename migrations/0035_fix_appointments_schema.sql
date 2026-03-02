-- Migration 0035: Add missing columns to appointments table
-- The code expects prospect_id, service_id, scheduled_at but the table only has
-- customer_name, appointment_date from the original schema.

ALTER TABLE appointments ADD COLUMN prospect_id TEXT;
ALTER TABLE appointments ADD COLUMN service_id TEXT;
ALTER TABLE appointments ADD COLUMN scheduled_at DATETIME;
