-- ═══════════════════════════════════════════════════════════════
-- FONIO CLONE - Migration D1 (SQLite)
-- ═══════════════════════════════════════════════════════════════
-- Exécuter via : npm run d1:migrate (local) ou npm run d1:migrate:prod (production)
-- Ou via le dashboard Cloudflare → D1 → Console

-- ═══════════════════════════════════════
-- TABLE: organizations
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  logo_url TEXT,
  website TEXT,
  timezone TEXT DEFAULT 'Europe/Paris',
  language TEXT DEFAULT 'fr',
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  telnyx_connection_id TEXT,
  telnyx_messaging_profile_id TEXT,
  monthly_minutes_limit INTEGER DEFAULT 500,
  monthly_minutes_used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: users (Better Auth — colonnes camelCase obligatoires)
-- ═══════════════════════════════════════
-- Les colonnes name, email, emailVerified, image, createdAt, updatedAt
-- sont imposées par Better Auth (Kysely adapter, camelCase)
-- Les colonnes custom (organization_id, role, phone, etc.) restent en snake_case
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  emailVerified INTEGER DEFAULT 0,
  name TEXT NOT NULL,
  image TEXT,
  role TEXT DEFAULT 'agent' CHECK (role IN ('owner', 'admin', 'manager', 'agent')),
  phone TEXT,
  extension TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'invited')),
  is_available INTEGER DEFAULT 1,
  last_login_at TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: sessions (Better Auth — colonnes camelCase obligatoires)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expiresAt TEXT NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: accounts (Better Auth — colonnes camelCase obligatoires)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  accessToken TEXT,
  refreshToken TEXT,
  accessTokenExpiresAt TEXT,
  refreshTokenExpiresAt TEXT,
  scope TEXT,
  idToken TEXT,
  password TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: verification (Better Auth — colonnes camelCase obligatoires)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS verification (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: phone_numbers
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS phone_numbers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  telnyx_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  friendly_name TEXT,
  country_code TEXT DEFAULT 'FR',
  type TEXT DEFAULT 'local' CHECK (type IN ('local', 'mobile', 'toll_free')),
  capabilities_voice INTEGER DEFAULT 1,
  capabilities_sms INTEGER DEFAULT 1,
  capabilities_mms INTEGER DEFAULT 0,
  assigned_to TEXT REFERENCES users(id),
  ai_agent_id TEXT,
  routing_type TEXT DEFAULT 'user' CHECK (routing_type IN ('user', 'ai_agent', 'ivr', 'queue')),
  ivr_menu_id TEXT,
  call_queue_id TEXT,
  monthly_cost REAL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'released', 'suspended')),
  purchased_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: contacts (CRM)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  phone_secondary TEXT,
  company TEXT,
  job_title TEXT,
  address TEXT,
  city TEXT,
  country TEXT,
  tags TEXT DEFAULT '[]',
  notes TEXT,
  source TEXT CHECK (source IN ('website', 'referral', 'ads', 'manual', 'ai_call')),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'customer', 'lost')),
  lead_score INTEGER DEFAULT 0,
  last_contacted_at TEXT,
  total_calls INTEGER DEFAULT 0,
  total_call_duration INTEGER DEFAULT 0,
  custom_fields TEXT DEFAULT '{}',
  created_by TEXT REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: ai_agents (RetellAI)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS ai_agents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  retell_agent_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  voice_id TEXT,
  language TEXT DEFAULT 'fr-FR',
  prompt TEXT NOT NULL,
  greeting_message TEXT,
  tools TEXT DEFAULT '[]',
  knowledge_base TEXT DEFAULT '[]',
  max_call_duration INTEGER DEFAULT 300,
  transfer_to TEXT REFERENCES users(id),
  transfer_phone TEXT,
  webhook_url TEXT,
  is_active INTEGER DEFAULT 1,
  total_calls INTEGER DEFAULT 0,
  avg_call_duration INTEGER DEFAULT 0,
  satisfaction_score REAL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: calls
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  telnyx_call_control_id TEXT,
  telnyx_call_session_id TEXT,
  retell_call_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  phone_number_id TEXT REFERENCES phone_numbers(id),
  contact_id TEXT REFERENCES contacts(id),
  user_id TEXT REFERENCES users(id),
  ai_agent_id TEXT REFERENCES ai_agents(id),
  status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'in_progress', 'completed', 'missed', 'voicemail', 'failed')),
  duration INTEGER DEFAULT 0,
  wait_time INTEGER DEFAULT 0,
  recording_url TEXT,
  recording_duration INTEGER,
  voicemail_url TEXT,
  transcript TEXT,
  transcript_summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  tags TEXT DEFAULT '[]',
  notes TEXT,
  cost REAL,
  metadata TEXT DEFAULT '{}',
  started_at TEXT,
  answered_at TEXT,
  ended_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: sms_messages
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS sms_messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  telnyx_message_id TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  phone_number_id TEXT REFERENCES phone_numbers(id),
  contact_id TEXT REFERENCES contacts(id),
  user_id TEXT REFERENCES users(id),
  body TEXT NOT NULL,
  media_urls TEXT DEFAULT '[]',
  status TEXT DEFAULT 'sent' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
  cost REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: voicemails
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS voicemails (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  call_id TEXT REFERENCES calls(id),
  phone_number_id TEXT REFERENCES phone_numbers(id),
  contact_id TEXT REFERENCES contacts(id),
  from_number TEXT NOT NULL,
  duration INTEGER DEFAULT 0,
  audio_url TEXT NOT NULL,
  transcript TEXT,
  is_read INTEGER DEFAULT 0,
  read_by TEXT REFERENCES users(id),
  read_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: ivr_menus
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS ivr_menus (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  welcome_message TEXT NOT NULL,
  welcome_audio_url TEXT,
  options TEXT NOT NULL DEFAULT '[]',
  timeout_seconds INTEGER DEFAULT 10,
  timeout_action TEXT DEFAULT 'repeat' CHECK (timeout_action IN ('repeat', 'voicemail', 'transfer')),
  max_retries INTEGER DEFAULT 3,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: call_queues
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS call_queues (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  music_on_hold_url TEXT,
  max_wait_time INTEGER DEFAULT 300,
  max_queue_size INTEGER DEFAULT 10,
  distribution TEXT DEFAULT 'round_robin' CHECK (distribution IN ('round_robin', 'longest_idle', 'skills_based')),
  members TEXT DEFAULT '[]',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: call_recordings
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS call_recordings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  call_id TEXT REFERENCES calls(id) ON DELETE CASCADE,
  recording_url TEXT NOT NULL,
  r2_key TEXT,
  duration INTEGER DEFAULT 0,
  file_size INTEGER,
  format TEXT DEFAULT 'mp3',
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: subscriptions (Stripe)
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('starter', 'pro', 'enterprise')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'trialing')),
  current_period_start TEXT,
  current_period_end TEXT,
  cancel_at TEXT,
  cancelled_at TEXT,
  trial_start TEXT,
  trial_end TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- TABLE: audit_logs
-- ═══════════════════════════════════════
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT DEFAULT '{}',
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ═══════════════════════════════════════
-- INDEX pour les performances
-- ═══════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(userId);
CREATE INDEX IF NOT EXISTS idx_calls_org ON calls(organization_id);
CREATE INDEX IF NOT EXISTS idx_calls_contact ON calls(contact_id);
CREATE INDEX IF NOT EXISTS idx_calls_user ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_calls_created ON calls(created_at);
CREATE INDEX IF NOT EXISTS idx_calls_telnyx ON calls(telnyx_call_control_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_sms_org ON sms_messages(organization_id);
CREATE INDEX IF NOT EXISTS idx_sms_telnyx ON sms_messages(telnyx_message_id);
CREATE INDEX IF NOT EXISTS idx_phone_numbers_org ON phone_numbers(organization_id);
CREATE INDEX IF NOT EXISTS idx_voicemails_org ON voicemails(organization_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_agents_org ON ai_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_ai_agents_retell ON ai_agents(retell_agent_id);
CREATE INDEX IF NOT EXISTS idx_recordings_call ON call_recordings(call_id);
