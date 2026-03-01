-- Migration: Table pour stocker les emails traités par Sara
-- Date: 30 janvier 2026

CREATE TABLE IF NOT EXISTS processed_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    provider TEXT NOT NULL,           -- 'gmail' ou 'outlook'
    message_id TEXT NOT NULL,         -- ID unique du message chez le provider
    from_email TEXT NOT NULL,         -- Expéditeur
    to_email TEXT,                    -- Destinataire
    subject TEXT,                     -- Sujet
    body_snippet TEXT,                -- Extrait du corps
    sara_response TEXT,               -- Réponse générée par Sara
    status TEXT DEFAULT 'pending',    -- 'pending', 'sent', 'error'
    processed_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, message_id)
);

-- Index pour les recherches
CREATE INDEX IF NOT EXISTS idx_processed_emails_tenant ON processed_emails(tenant_id);
CREATE INDEX IF NOT EXISTS idx_processed_emails_status ON processed_emails(status);
CREATE INDEX IF NOT EXISTS idx_processed_emails_date ON processed_emails(processed_at);
