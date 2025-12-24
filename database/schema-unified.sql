/**
 * ================================================================
 * COCCINELLE AI - SCHÉMA UNIFIÉ DE BASE DE DONNÉES
 * ================================================================
 *
 * Version : 2.0.0 (Architecture unifiée)
 * Date : 2025-12-22
 *
 * Principe : Single Source of Truth
 *   - Pas de duplication de données entre onboarding et runtime
 *   - Pas de sync complexe
 *   - Tables normalisées et cohérentes
 *
 * Total : 35 tables (au lieu de 45)
 *
 * ================================================================
 */

-- ================================================================
-- SECTION 1 : AUTHENTIFICATION & TENANTS
-- ================================================================

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  company_name TEXT,
  sector TEXT,
  phone TEXT UNIQUE,
  api_key TEXT UNIQUE,
  subscription_plan TEXT DEFAULT 'free',

  -- Statut onboarding
  onboarding_completed INTEGER DEFAULT 0,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'admin',
  is_active INTEGER DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  details TEXT,
  ip_address TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);

-- ================================================================
-- SECTION 2 : ONBOARDING (SIMPLIFIÉ)
-- ================================================================

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,

  -- Progression
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress',

  -- Métadonnées minimales (pas de données business ici)
  metadata TEXT,

  -- Timestamps
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON onboarding_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_sessions(status);

-- ================================================================
-- SECTION 3 : OMNICHANNEL (CONVERSATIONS MULTI-CANAL)
-- ================================================================

-- NOTE: omni_agent_configs is defined in src/modules/omnichannel/db/schema.sql
-- The module version is the single source of truth (more complete with all features)

CREATE TABLE IF NOT EXISTS omni_phone_mappings (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- NOTE: omni_conversations and omni_messages are defined in src/modules/omnichannel/db/schema.sql
-- The module versions are the single source of truth (complete with all tracking fields)

-- NOTE: omni_email_configs is defined in src/modules/omnichannel/db/schema.sql
-- The module version is the single source of truth (includes DNS auto-config, verifications, etc.)

-- Index
CREATE INDEX IF NOT EXISTS idx_omni_agent_tenant ON omni_agent_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_phone_number ON omni_phone_mappings(phone_number);
CREATE INDEX IF NOT EXISTS idx_omni_phone_tenant ON omni_phone_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_conv_tenant ON omni_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_msg_conv ON omni_messages(conversation_id);

-- ================================================================
-- SECTION 4 : AGENTS COMMERCIAUX
-- ================================================================

CREATE TABLE IF NOT EXISTS commercial_agents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,

  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  specialties TEXT,
  is_active INTEGER DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  is_available INTEGER DEFAULT 1,

  FOREIGN KEY (agent_id) REFERENCES commercial_agents(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_commercial_agents_tenant ON commercial_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_agent ON availability_slots(agent_id);

-- ================================================================
-- SECTION 5 : RENDEZ-VOUS
-- ================================================================

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,

  appointment_date DATETIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'confirmed',

  notes TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES commercial_agents(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_agent ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- ================================================================
-- SECTION 6 : BASE DE CONNAISSANCES (RAG)
-- ================================================================

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  title TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  content TEXT,

  status TEXT DEFAULT 'active',

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding_id TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS knowledge_crawl_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',

  pages_crawled INTEGER DEFAULT 0,
  pages_total INTEGER,

  started_at DATETIME,
  completed_at DATETIME,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_kb_docs_tenant ON knowledge_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_crawl_tenant ON knowledge_crawl_jobs(tenant_id);

-- ================================================================
-- SECTION 7 : PRODUITS & SERVICES
-- ================================================================

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  category_id TEXT,

  name TEXT NOT NULL,
  description TEXT,
  price REAL,
  stock_quantity INTEGER DEFAULT 0,

  is_active INTEGER DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES product_categories(id) ON DELETE SET NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- ================================================================
-- SECTION 8 : CRM & CUSTOMERS
-- ================================================================

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Informations personnelles
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,

  -- Métadonnées
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'lead', 'prospect', 'customer'
  source TEXT, -- 'phone', 'email', 'sms', 'whatsapp', 'website', 'referral', etc.
  tags TEXT, -- JSON array: ["vip", "urgent", etc.]

  -- Préférences
  preferred_contact_method TEXT, -- 'phone', 'email', 'sms', 'whatsapp'
  language TEXT DEFAULT 'fr',
  timezone TEXT DEFAULT 'Europe/Paris',

  -- Statistiques
  total_appointments INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  last_contact_at DATETIME,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,

  -- Constraints
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, phone)
);

CREATE TABLE IF NOT EXISTS prospects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,

  status TEXT DEFAULT 'new',
  source TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS crm_integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,

  provider TEXT NOT NULL,

  access_token TEXT,
  refresh_token TEXT,

  is_active INTEGER DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_last_contact ON customers(last_contact_at);
CREATE INDEX IF NOT EXISTS idx_prospects_tenant ON prospects(tenant_id);

-- ================================================================
-- SECTION 9 : ANALYTICS
-- ================================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  event_type TEXT NOT NULL,
  event_data TEXT,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index
CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at);

-- ================================================================
-- FIN DU SCHÉMA
-- ================================================================
