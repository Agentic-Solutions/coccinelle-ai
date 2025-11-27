-- Migration CRM Integration
-- Étend la structure existante pour supporter le CRM complet
-- Compatible avec prospects existants

-- 1. Étendre la table prospects pour le CRM
-- On garde 'prospects' pour compatibilité mais on l'enrichit
ALTER TABLE prospects ADD COLUMN preferred_channel TEXT DEFAULT 'phone'; -- email, sms, whatsapp, phone
ALTER TABLE prospects ADD COLUMN segment TEXT DEFAULT 'prospect'; -- prospect, client, vip, inactive
ALTER TABLE prospects ADD COLUMN total_orders INTEGER DEFAULT 0;
ALTER TABLE prospects ADD COLUMN total_revenue REAL DEFAULT 0.0;
ALTER TABLE prospects ADD COLUMN currency TEXT DEFAULT 'EUR';
ALTER TABLE prospects ADD COLUMN last_contact_at TEXT;
ALTER TABLE prospects ADD COLUMN last_order_at TEXT;
ALTER TABLE prospects ADD COLUMN address TEXT;
ALTER TABLE prospects ADD COLUMN city TEXT;
ALTER TABLE prospects ADD COLUMN postal_code TEXT;
ALTER TABLE prospects ADD COLUMN country TEXT DEFAULT 'FR';
ALTER TABLE prospects ADD COLUMN metadata TEXT; -- JSON pour données additionnelles

-- 2. Table des tags clients
CREATE TABLE IF NOT EXISTS customer_tags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_tags_prospect ON customer_tags(prospect_id);
CREATE INDEX IF NOT EXISTS idx_customer_tags_tag ON customer_tags(tag);

-- 3. Table des notes clients
CREATE TABLE IF NOT EXISTS customer_notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT, -- Agent ID ou 'system'
  created_at TEXT DEFAULT (datetime('now')),
  metadata TEXT, -- JSON pour données additionnelles
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_notes_prospect ON customer_notes(prospect_id);
CREATE INDEX IF NOT EXISTS idx_customer_notes_created_at ON customer_notes(created_at DESC);

-- 4. Table des activités clients (interactions)
CREATE TABLE IF NOT EXISTS customer_activities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  type TEXT NOT NULL, -- message_received, message_sent, email, call, visit, order, etc.
  channel TEXT, -- email, sms, whatsapp, phone, web
  description TEXT,
  metadata TEXT, -- JSON pour données détaillées (message ID, etc.)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_activities_prospect ON customer_activities(prospect_id);
CREATE INDEX IF NOT EXISTS idx_customer_activities_type ON customer_activities(type);
CREATE INDEX IF NOT EXISTS idx_customer_activities_created_at ON customer_activities(created_at DESC);

-- 5. Table des configurations d'intégrations CRM
CREATE TABLE IF NOT EXISTS crm_integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  system_type TEXT NOT NULL, -- 'native', 'hubspot', 'salesforce', etc.
  is_active INTEGER DEFAULT 1,
  credentials TEXT, -- JSON chiffré contenant les clés API
  settings TEXT, -- JSON pour paramètres spécifiques
  last_sync_at TEXT,
  sync_status TEXT DEFAULT 'idle', -- idle, syncing, error
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_integrations_tenant_system ON crm_integrations(tenant_id, system_type);

-- 6. Table de mapping pour synchronisation externe (HubSpot, Salesforce)
CREATE TABLE IF NOT EXISTS crm_sync_mappings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  external_id TEXT NOT NULL, -- ID dans le CRM externe (HubSpot contact ID, etc.)
  external_system TEXT NOT NULL, -- 'hubspot', 'salesforce'
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'synced', -- synced, pending, error
  metadata TEXT, -- JSON pour données de sync
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (integration_id) REFERENCES crm_integrations(id) ON DELETE CASCADE,
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_sync_mappings_external ON crm_sync_mappings(integration_id, external_id);
CREATE INDEX IF NOT EXISTS idx_crm_sync_mappings_prospect ON crm_sync_mappings(prospect_id);

-- 7. Table des préférences de communication
CREATE TABLE IF NOT EXISTS customer_communication_preferences (
  id TEXT PRIMARY KEY,
  prospect_id TEXT NOT NULL UNIQUE,
  email_enabled INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 1,
  whatsapp_enabled INTEGER DEFAULT 1,
  phone_enabled INTEGER DEFAULT 1,
  marketing_consent INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);

-- 8. Vue pour faciliter les requêtes CRM (compatible avec l'interface Customer)
CREATE VIEW IF NOT EXISTS v_customers AS
SELECT
  p.id,
  p.tenant_id,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.preferred_channel,
  p.segment,
  p.total_orders,
  p.total_revenue,
  p.currency,
  p.last_contact_at,
  p.last_order_at,
  p.address,
  p.city,
  p.postal_code,
  p.country,
  p.status,
  p.created_at,
  p.metadata,
  -- Agrégations
  (SELECT COUNT(*) FROM customer_notes WHERE prospect_id = p.id) as notes_count,
  (SELECT COUNT(*) FROM customer_activities WHERE prospect_id = p.id) as activities_count,
  (SELECT GROUP_CONCAT(tag, ',') FROM customer_tags WHERE prospect_id = p.id) as tags
FROM prospects p;

-- Données initiales pour les configurations CRM
-- Activer le CRM natif par défaut pour tous les tenants existants
INSERT OR IGNORE INTO crm_integrations (id, tenant_id, system_type, is_active, credentials, settings)
SELECT
  'crm-native-' || id,
  id,
  'native',
  1,
  '{}',
  '{}'
FROM tenants;
