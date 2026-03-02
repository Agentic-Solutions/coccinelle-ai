-- Migration 0035: Add missing service_id column to appointments table
-- prospect_id and scheduled_at already exist in prod

ALTER TABLE appointments ADD COLUMN service_id TEXT;
