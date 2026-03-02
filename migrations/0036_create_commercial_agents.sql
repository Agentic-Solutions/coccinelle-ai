-- Migration 0036: Create commercial_agents table
-- Required by /webhooks/twilio/voice which does LEFT JOIN commercial_agents

CREATE TABLE IF NOT EXISTS commercial_agents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialties TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_commercial_agents_tenant ON commercial_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_commercial_agents_active ON commercial_agents(is_active);
