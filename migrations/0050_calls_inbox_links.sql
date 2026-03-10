-- Migration 0050 : N4 + N7 — Calls enrichment + Inbox ↔ Prospect link
-- Date : 2026-03-08

-- N4 : Ajout colonnes manquantes sur calls pour Retell
-- retell_call_id, post_call_analysis, started_at, ended_at
-- (Ces colonnes sont utilisees par handleRetellWebhook mais n'existent pas dans la migration v2)
ALTER TABLE calls ADD COLUMN retell_call_id TEXT;
ALTER TABLE calls ADD COLUMN post_call_analysis TEXT;
ALTER TABLE calls ADD COLUMN started_at TEXT;
ALTER TABLE calls ADD COLUMN ended_at TEXT;

-- Index pour recherche par retell_call_id
CREATE INDEX IF NOT EXISTS idx_calls_retell_call_id ON calls(retell_call_id);

-- N7 : Ajout prospect_id et customer_id sur omni_conversations
ALTER TABLE omni_conversations ADD COLUMN prospect_id TEXT;
ALTER TABLE omni_conversations ADD COLUMN customer_id TEXT;

-- Index pour la liaison prospect/customer
CREATE INDEX IF NOT EXISTS idx_omni_conversations_prospect ON omni_conversations(prospect_id);
CREATE INDEX IF NOT EXISTS idx_omni_conversations_customer ON omni_conversations(customer_id);

-- Note: customer_phone/customer_email indexes skipped (columns may not exist on omni_conversations)
