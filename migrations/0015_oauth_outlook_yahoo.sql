-- Migration: Tables OAuth pour Outlook et Yahoo
-- Date: 2026-01-29

-- Table tokens Outlook/Microsoft
CREATE TABLE IF NOT EXISTS oauth_outlook_tokens (
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

CREATE INDEX IF NOT EXISTS idx_oauth_outlook_tenant ON oauth_outlook_tokens(tenant_id);

-- Table tokens Yahoo
CREATE TABLE IF NOT EXISTS oauth_yahoo_tokens (
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

CREATE INDEX IF NOT EXISTS idx_oauth_yahoo_tenant ON oauth_yahoo_tokens(tenant_id);
