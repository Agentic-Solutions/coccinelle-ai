-- Migration 0045: Onboarding & Activation (M3 Trial + M4 Checklist + M13 Weekly Report)
-- M3: Trial 14j visible
ALTER TABLE tenants ADD COLUMN trial_ends_at DATETIME;
UPDATE tenants SET trial_ends_at = datetime('now', '+14 days') WHERE trial_ends_at IS NULL;

-- M4: Checklist Setup
ALTER TABLE tenants ADD COLUMN setup_completed_at DATETIME;
ALTER TABLE tenants ADD COLUMN test_call_done INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN onboarding_completed INTEGER DEFAULT 0;

-- M13: Email recap hebdomadaire
ALTER TABLE users ADD COLUMN weekly_report_enabled INTEGER DEFAULT 1;
