-- Migration: Twilio ConversationRelay Support
-- Date: 2024-11-27
-- Description: Tables pour les appels Twilio et les conversations vocales

-- Table calls (mise à jour pour Twilio)
-- Vérifie si la table existe déjà et ajoute les colonnes manquantes

-- Si la table n'existe pas, la créer
CREATE TABLE IF NOT EXISTS calls (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    twilio_call_sid TEXT,
    from_number TEXT,
    to_number TEXT,
    direction TEXT DEFAULT 'inbound', -- 'inbound' ou 'outbound'
    status TEXT DEFAULT 'initiated', -- initiated, ringing, in_progress, completed, busy, failed, no_answer, canceled
    duration INTEGER DEFAULT 0, -- en secondes
    end_reason TEXT,
    agent_id TEXT,
    prospect_id TEXT,
    metadata TEXT, -- JSON
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_calls_tenant_id ON calls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calls_twilio_call_sid ON calls(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

-- Table call_messages: Stocke les messages de chaque conversation
CREATE TABLE IF NOT EXISTS call_messages (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL,
    role TEXT NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    tool_name TEXT, -- Si c'était un tool call
    tool_result TEXT, -- Résultat du tool call (JSON)
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE INDEX IF NOT EXISTS idx_call_messages_call_id ON call_messages(call_id);

-- Table call_summaries: Résumé des conversations
CREATE TABLE IF NOT EXISTS call_summaries (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL UNIQUE,
    tenant_id TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 0,
    summary TEXT,
    sentiment TEXT, -- 'positive', 'neutral', 'negative'
    intent TEXT, -- intention principale détectée
    appointment_booked INTEGER DEFAULT 0, -- 1 si RDV pris
    transfer_requested INTEGER DEFAULT 0, -- 1 si transfert demandé
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (call_id) REFERENCES calls(id),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_call_summaries_tenant_id ON call_summaries(tenant_id);

-- Table call_events: Événements d'appel (pour analytics)
CREATE TABLE IF NOT EXISTS call_events (
    id TEXT PRIMARY KEY,
    call_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'start', 'end', 'transfer', 'dtmf', 'error', etc.
    payload TEXT, -- JSON avec détails
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (call_id) REFERENCES calls(id)
);

CREATE INDEX IF NOT EXISTS idx_call_events_call_id ON call_events(call_id);
CREATE INDEX IF NOT EXISTS idx_call_events_type ON call_events(event_type);

-- Table tenant_channels (pour stocker config téléphone)
-- Ajouter les champs spécifiques à la voix si pas déjà présents
CREATE TABLE IF NOT EXISTS tenant_channels (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    channel_type TEXT NOT NULL, -- 'phone', 'sms', 'email', 'whatsapp'
    phone_number TEXT,
    is_enabled INTEGER DEFAULT 1,
    voice_id TEXT DEFAULT 'Polly.Lea-Neural', -- Voix TTS
    language TEXT DEFAULT 'fr-FR',
    welcome_message TEXT,
    transfer_number TEXT, -- Numéro de transfert humain
    config TEXT, -- JSON avec config additionnelle
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    UNIQUE(tenant_id, channel_type)
);

CREATE INDEX IF NOT EXISTS idx_tenant_channels_tenant ON tenant_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_channels_phone ON tenant_channels(phone_number);

-- Vue pour les statistiques d'appels
CREATE VIEW IF NOT EXISTS v_call_stats AS
SELECT
    tenant_id,
    DATE(created_at) as call_date,
    COUNT(*) as total_calls,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
    SUM(CASE WHEN status = 'failed' OR status = 'no_answer' THEN 1 ELSE 0 END) as failed_calls,
    AVG(CASE WHEN duration > 0 THEN duration ELSE NULL END) as avg_duration,
    SUM(duration) as total_duration
FROM calls
GROUP BY tenant_id, DATE(created_at);

-- Données de test pour le tenant demo
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

-- Second numéro de test
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
