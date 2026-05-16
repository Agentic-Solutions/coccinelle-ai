-- Migration 0064: Member skills — unified competency table
-- Links team members to task types and services
-- Replaces assignment_rules for task routing (retrocompat maintained)

CREATE TABLE IF NOT EXISTS member_skills (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  skill_type TEXT NOT NULL DEFAULT 'task',
  task_type_id TEXT,
  service_id TEXT,
  duration_minutes INTEGER,
  priority INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_member_skills_member ON member_skills(member_id, is_active);
CREATE INDEX IF NOT EXISTS idx_member_skills_tenant ON member_skills(tenant_id, skill_type);
CREATE INDEX IF NOT EXISTS idx_member_skills_task ON member_skills(task_type_id, is_active);
