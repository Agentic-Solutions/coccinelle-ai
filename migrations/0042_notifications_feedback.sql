-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  data TEXT,
  read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, read);

-- Feedback post-RDV
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  rating INTEGER,
  comment TEXT,
  token TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_feedback_appointment ON feedback(appointment_id);
CREATE INDEX IF NOT EXISTS idx_feedback_token ON feedback(token);

-- Rappel envoyé sur les RDV
ALTER TABLE appointments ADD COLUMN reminder_sent INTEGER DEFAULT 0;
