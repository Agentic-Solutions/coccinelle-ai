-- Migration: Twilio ConversationRelay Support v2
-- Date: 2024-11-27
-- Description: Mise à jour du schéma pour Twilio

-- 1. Renommer l'ancienne table calls
ALTER TABLE calls RENAME TO calls_old;

-- 2. Créer la nouvelle table calls avec le bon schéma
CREATE TABLE calls (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'tenant_demo_001',
    twilio_call_sid TEXT,
    from_number TEXT,
    to_number TEXT,
    direction TEXT DEFAULT 'inbound',
    status TEXT DEFAULT 'initiated',
    duration INTEGER DEFAULT 0,
    end_reason TEXT,
    agent_id TEXT,
    prospect_id TEXT,
    transcript TEXT,
    sentiment_score REAL,
    qualification_data TEXT,
    next_action TEXT,
    metadata TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- 3. Migrer les données existantes
INSERT INTO calls (id, tenant_id, prospect_id, duration, transcript, sentiment_score, qualification_data, next_action, status, created_at)
SELECT id, 'tenant_demo_001', prospect_id, duration, transcript, sentiment_score, qualification_data, next_action, 'completed', created_at
FROM calls_old;

-- 4. Supprimer l'ancienne table
DROP TABLE calls_old;

-- 5. Créer les index
CREATE INDEX IF NOT EXISTS idx_calls_tenant_id ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_call_sid ON calls(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- 6. Table call_messages
CREATE TABLE IF NOT EXISTS call_messages (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    tool_name TEXT,
    tool_result TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE INDEX IF NOT EXISTS idx_call_messages_call_id ON call_messages(call_id);

-- 7. Table call_summaries
CREATE TABLE IF NOT EXISTS call_summaries (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    summary TEXT,
    sentiment TEXT,
    intent TEXT,
    appointment_booked INTEGER DEFAULT 0,
    transfer_requested INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE INDEX IF NOT EXISTS idx_call_summaries_tenant_id ON call_summaries(tenant_id);

-- 8. Table call_events (si pas déjà créée)
CREATE TABLE IF NOT EXISTS call_events (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE INDEX IF NOT EXISTS idx_call_events_call_id ON call_events(call_id);
CREATE INDEX IF NOT EXISTS idx_call_events_type ON call_events(event_type);

-- 9. Table tenant_channels (config téléphone par tenant)
CREATE TABLE IF NOT EXISTS tenant_channels (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    channel_type TEXT NOT NULL,
    phone_number TEXT,
    is_enabled INTEGER DEFAULT 1,
    voice_id TEXT DEFAULT 'Polly.Lea-Neural',
    language TEXT DEFAULT 'fr-FR',
    welcome_message TEXT,
    transfer_number TEXT,
    config TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(tenant_id, channel_type, phone_number)
);

CREATE INDEX IF NOT EXISTS idx_tenant_channels_tenant ON tenant_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_channels_phone ON tenant_channels(phone_number);

-- 10. Données de test
INSERT OR IGNORE INTO tenant_channels (id, tenant_id, channel_type, phone_number, voice_id, language, welcome_message, transfer_number)
VALUES (
    'tc_phone_demo_001',
    'tenant_demo_001',
    'phone',
    '+33939035760',
    'Polly.Lea-Neural',
    'fr-FR',
    'Bonjour, bienvenue chez Coccinelle. Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?',
    '+33600000000'
);

INSERT OR IGNORE INTO tenant_channels (id, tenant_id, channel_type, phone_number, voice_id, language, welcome_message, transfer_number)
VALUES (
    'tc_phone_demo_002',
    'tenant_demo_001',
    'phone',
    '+33939035761',
    'Polly.Lea-Neural',
    'fr-FR',
    'Bonjour et bienvenue. Je suis Sara, comment puis-je vous aider aujourd hui ?',
    '+33600000000'
);
