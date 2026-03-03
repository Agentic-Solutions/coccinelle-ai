-- Migration 0041: User invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'employee',
  token TEXT UNIQUE NOT NULL,
  message TEXT,
  invited_by TEXT,
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant ON user_invitations(tenant_id);
