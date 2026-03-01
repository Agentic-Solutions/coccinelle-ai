-- Table pour tracker les emails traités par Sara
CREATE TABLE IF NOT EXISTS email_processed (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email_id TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT,
  original_body TEXT,
  sara_reply TEXT,
  processed_at TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'sent',
  UNIQUE(tenant_id, email_id)
);

CREATE INDEX IF NOT EXISTS idx_email_processed_tenant ON email_processed(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_processed_email_id ON email_processed(email_id);
