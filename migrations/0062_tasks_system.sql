-- Migration 0062: Task management system
-- Tables: task_types, tasks, assignment_rules
-- Supports intelligent task assignment based on keywords and sector

CREATE TABLE IF NOT EXISTS task_types (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  secteur TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  keywords TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  default_assignee_role TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_task_types_tenant ON task_types(tenant_id, secteur);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_type_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  assignee_id TEXT,
  assignee_name TEXT,
  contact_name TEXT,
  contact_phone TEXT,
  source TEXT DEFAULT 'voixia',
  call_transcript TEXT,
  kb_response TEXT,
  kb_satisfied INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id, status);

CREATE TABLE IF NOT EXISTS assignment_rules (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  task_type_id TEXT NOT NULL,
  assignee_id TEXT NOT NULL,
  assignee_name TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_tenant ON assignment_rules(tenant_id, task_type_id);
