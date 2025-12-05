-- ============================================
-- MODULE OMNICHANNEL - Base de données
-- Version : 1.0.0
-- Préfixe : omni_*
-- ============================================

-- Table 1 : Configuration agent par tenant
CREATE TABLE IF NOT EXISTS omni_agent_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT UNIQUE NOT NULL,

  -- Identité agent
  agent_name TEXT DEFAULT 'Sara',
  agent_personality TEXT DEFAULT 'professional', -- 'professional', 'friendly', 'casual'

  -- Configuration vocale
  voice_provider TEXT DEFAULT 'elevenlabs', -- 'elevenlabs', 'cartesia', 'google'
  voice_id TEXT,
  voice_settings TEXT, -- JSON: {"stability": 0.5, "similarity_boost": 0.8}
  voice_language TEXT DEFAULT 'fr-FR',

  -- Prompts personnalisés
  system_prompt TEXT,
  greeting_message TEXT DEFAULT 'Bonjour, je suis Sara, votre assistante virtuelle.',
  fallback_message TEXT DEFAULT 'Je n''ai pas bien compris, pouvez-vous reformuler ?',
  transfer_message TEXT DEFAULT 'Je vous transfère vers un conseiller.',

  -- Configuration canaux
  channels_config TEXT, -- JSON: {"voice": {...}, "sms": {...}}

  -- Comportement
  max_conversation_duration INTEGER DEFAULT 600,
  interruption_enabled BOOLEAN DEFAULT 1,
  auto_noise_detection BOOLEAN DEFAULT 1,
  sentiment_analysis_enabled BOOLEAN DEFAULT 0,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Table 2 : Conversations multi-canal
CREATE TABLE IF NOT EXISTS omni_conversations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_sid TEXT UNIQUE, -- Twilio Conversation SID
  tenant_id TEXT NOT NULL,

  -- Client info
  client_phone TEXT,
  client_email TEXT,
  client_name TEXT,

  -- Canaux actifs
  active_channels TEXT, -- JSON: ["voice", "sms"]
  current_channel TEXT, -- 'voice', 'sms', 'whatsapp', 'email'
  channel_switches TEXT, -- JSON: [{"from": "voice", "to": "sms", "at": "..."}]

  -- Contexte conversation
  conversation_context TEXT, -- JSON: contexte partagé entre canaux
  last_intent TEXT,
  last_sentiment TEXT, -- 'positive', 'neutral', 'negative'

  -- Métadonnées
  call_sid TEXT, -- Si conversation Voice
  first_message_at DATETIME,
  last_message_at DATETIME,

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'closed', 'transferred'
  closed_reason TEXT, -- 'completed', 'timeout', 'transferred', 'error'

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Table 3 : Messages (historique unifié)
CREATE TABLE IF NOT EXISTS omni_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT NOT NULL,

  -- Message
  channel TEXT NOT NULL, -- 'voice', 'sms', 'whatsapp', 'email'
  direction TEXT NOT NULL, -- 'inbound', 'outbound'
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- 'text', 'audio', 'image', 'file'

  -- Metadata
  sender_role TEXT NOT NULL, -- 'agent', 'client', 'system'
  message_sid TEXT, -- Twilio Message SID (si applicable)
  duration INTEGER, -- Pour Voice : durée en secondes

  -- Traitement
  transcript TEXT, -- Transcription si Voice
  sentiment TEXT, -- 'positive', 'neutral', 'negative'
  intent TEXT, -- Intent détecté

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (conversation_id) REFERENCES omni_conversations(id) ON DELETE CASCADE
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_omni_agent_configs_tenant
  ON omni_agent_configs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_omni_conversations_tenant
  ON omni_conversations(tenant_id);

CREATE INDEX IF NOT EXISTS idx_omni_conversations_status
  ON omni_conversations(status);

CREATE INDEX IF NOT EXISTS idx_omni_conversations_sid
  ON omni_conversations(conversation_sid);

CREATE INDEX IF NOT EXISTS idx_omni_messages_conversation
  ON omni_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_omni_messages_created
  ON omni_messages(created_at);

-- Table 4 : Authentification Cloudflare (OAuth)
CREATE TABLE IF NOT EXISTS omni_cloudflare_auth (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT UNIQUE NOT NULL,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at DATETIME,

  -- Account info
  cloudflare_account_id TEXT,
  cloudflare_account_email TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Table 5 : Configuration Email par tenant
CREATE TABLE IF NOT EXISTS omni_email_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT UNIQUE NOT NULL,

  -- Domaine
  domain TEXT NOT NULL,
  email_address TEXT NOT NULL, -- ex: assistant@pme-client.fr

  -- Resend
  resend_domain_id TEXT, -- ID Resend du domaine
  forwarding_address TEXT, -- tenant-xyz@mail.coccinelle.ai

  -- DNS Provider
  dns_provider TEXT, -- 'cloudflare', 'ovh', 'godaddy', 'manual'
  dns_zone_id TEXT, -- ID de la zone DNS (Cloudflare, etc.)

  -- Vérification
  dns_verified BOOLEAN DEFAULT 0,
  forwarding_verified BOOLEAN DEFAULT 0,
  resend_verified BOOLEAN DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'configuring', 'active', 'error'
  error_message TEXT,

  -- Configuration auto
  auto_config_enabled BOOLEAN DEFAULT 0,
  last_verification_at DATETIME,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index pour les nouvelles tables
CREATE INDEX IF NOT EXISTS idx_omni_cloudflare_auth_tenant
  ON omni_cloudflare_auth(tenant_id);

CREATE INDEX IF NOT EXISTS idx_omni_email_configs_tenant
  ON omni_email_configs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_omni_email_configs_domain
  ON omni_email_configs(domain);

CREATE INDEX IF NOT EXISTS idx_omni_email_configs_status
  ON omni_email_configs(status);
