-- Migration: Table OAuth Google
-- Date: 2026-01-31

-- Table tokens Google/Gmail
CREATE TABLE IF NOT EXISTS oauth_google_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_oauth_google_tenant ON oauth_google_tokens(tenant_id);
