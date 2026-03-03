-- Migration 0040: Scheduling & Availability
-- tenant_id already exists in prod
ALTER TABLE availability_slots ADD COLUMN break_start TEXT;
ALTER TABLE availability_slots ADD COLUMN break_end TEXT;
ALTER TABLE availability_slots ADD COLUMN slot_duration INTEGER DEFAULT 30;

-- Table des types de RDV
CREATE TABLE IF NOT EXISTS appointment_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  description TEXT,
  price REAL,
  currency TEXT DEFAULT 'EUR',
  color TEXT DEFAULT '#3B82F6',
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_appointment_types_tenant ON appointment_types(tenant_id);

-- Horaires d'ouverture de l'entreprise
CREATE TABLE IF NOT EXISTS business_hours (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  is_open INTEGER DEFAULT 1,
  open_time TEXT DEFAULT '09:00',
  close_time TEXT DEFAULT '18:00',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_business_hours_tenant ON business_hours(tenant_id);

-- Lien produit → type RDV
ALTER TABLE products ADD COLUMN appointment_type_id TEXT;
