-- Migration 0053: Fix appointments & availability_slots schema
-- Ensures all columns used by the codebase exist on both tables.
-- Columns already added by earlier migrations (0035, 0040, 0042, 0048) are skipped.
-- Date: 2026-03-18

-- =====================================================
-- 1. availability_slots: add tenant_id (missing in schema-v1)
-- =====================================================
-- The availability/routes.js module queries and inserts with tenant_id,
-- but schema-v1 did not define it. Migrations 0040 added break_start,
-- break_end, slot_duration — those may or may not exist depending on
-- whether schema-v1 or schema-unified was used to create the DB.
-- Each ALTER TABLE ADD COLUMN will error if column already exists.
-- In D1, each statement in a migration file is executed independently
-- so a failure on one does not block the rest.

ALTER TABLE availability_slots ADD COLUMN tenant_id TEXT;

-- =====================================================
-- 2. appointments: add columns used by different modules
-- =====================================================
-- Already added by earlier migrations (skipped here):
--   service_id (0035), appointment_type_id (0048),
--   confirmation_sent (0048), confirmation_channel (0048),
--   reminder_sent (0042)
-- These may or may not already exist depending on migration order:

ALTER TABLE appointments ADD COLUMN type TEXT DEFAULT 'visit';
ALTER TABLE appointments ADD COLUMN management_token TEXT;
ALTER TABLE appointments ADD COLUMN duration_minutes INTEGER DEFAULT 30;
ALTER TABLE appointments ADD COLUMN customer_name TEXT;
ALTER TABLE appointments ADD COLUMN customer_email TEXT;
ALTER TABLE appointments ADD COLUMN customer_phone TEXT;
ALTER TABLE appointments ADD COLUMN service_type TEXT;
ALTER TABLE appointments ADD COLUMN property_id TEXT;
ALTER TABLE appointments ADD COLUMN booking_source TEXT;
ALTER TABLE appointments ADD COLUMN call_id TEXT;
ALTER TABLE appointments ADD COLUMN updated_at TEXT;

-- =====================================================
-- 3. Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_availability_slots_tenant ON availability_slots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_agent_day ON availability_slots(agent_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_management_token ON appointments(management_token);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_source ON appointments(tenant_id, booking_source);
