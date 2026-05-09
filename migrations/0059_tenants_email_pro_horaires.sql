-- Migration 0059: Add email_pro and horaires columns to tenants
-- Required for onboarding refonte (4 steps)

ALTER TABLE tenants ADD COLUMN email_pro TEXT;
ALTER TABLE tenants ADD COLUMN horaires TEXT;
