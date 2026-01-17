/**
 * ================================================================
 * COCCINELLE AI - SCHÉMA COMPLET DE BASE DE DONNÉES
 * ================================================================
 *
 * Version : 4.0.0 (Schéma unifié et complet)
 * Date : 2025-01-06
 *
 * Ce fichier contient TOUTES les tables nécessaires au fonctionnement
 * de l'application, dans le bon ordre (respect des foreign keys).
 *
 * USAGE :
 *   rm -rf .wrangler/state/v3/d1
 *   npx wrangler d1 execute coccinelle-db --local --file=database/schema-complete.sql
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
  onboarding_completed INTEGER DEFAULT 0,
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

-- Index Section 1
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);

-- ================================================================
-- SECTION 2 : ONBOARDING
-- ================================================================

CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  user_id TEXT NOT NULL,
  current_step INTEGER DEFAULT 1,
  status TEXT DEFAULT 'in_progress',
  metadata TEXT,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index Section 2
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON onboarding_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_status ON onboarding_sessions(status);

-- ================================================================
-- SECTION 3 : AGENTS COMMERCIAUX
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

-- Index Section 3
CREATE INDEX IF NOT EXISTS idx_commercial_agents_tenant ON commercial_agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_availability_agent ON availability_slots(agent_id);

-- ================================================================
-- SECTION 4 : RENDEZ-VOUS
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

-- Index Section 4
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_agent ON appointments(agent_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

-- ================================================================
-- SECTION 5 : BASE DE CONNAISSANCES (RAG)
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

-- Index Section 5
CREATE INDEX IF NOT EXISTS idx_kb_docs_tenant ON knowledge_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_chunks_doc ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_kb_crawl_tenant ON knowledge_crawl_jobs(tenant_id);

-- ================================================================
-- SECTION 6 : PRODUITS & SERVICES
-- ================================================================

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  icon TEXT,
  color TEXT,
  display_order INTEGER DEFAULT 0,
  is_system INTEGER DEFAULT 0,
  fields TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES product_categories(id) ON DELETE SET NULL,
  UNIQUE(tenant_id, key)
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT,
  assignment_type TEXT DEFAULT 'shared',
  sku TEXT,
  category TEXT NOT NULL,
  type TEXT,
  title TEXT NOT NULL,
  description TEXT,
  short_description TEXT,
  price REAL,
  price_currency TEXT DEFAULT 'EUR',
  compare_at_price REAL,
  stock_quantity INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'in_stock',
  available INTEGER DEFAULT 1,
  attributes TEXT,
  images TEXT,
  videos TEXT,
  location TEXT,
  keywords TEXT,
  tags TEXT,
  has_variants INTEGER DEFAULT 0,
  variants TEXT,
  status TEXT DEFAULT 'active',
  published_at DATETIME,
  created_by TEXT,
  updated_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES commercial_agents(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  sku TEXT,
  position INTEGER DEFAULT 0,
  attributes TEXT,
  price REAL,
  stock_quantity INTEGER DEFAULT 0,
  stock_status TEXT DEFAULT 'in_stock',
  available INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index Section 6
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_key ON product_categories(key);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON product_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_agent ON products(agent_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_tenant ON product_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

-- ================================================================
-- SECTION 7 : CRM & CUSTOMERS
-- ================================================================

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  source TEXT,
  tags TEXT,
  preferred_contact_method TEXT,
  language TEXT DEFAULT 'fr',
  timezone TEXT DEFAULT 'Europe/Paris',
  total_appointments INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  last_contact_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
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

-- Index Section 7
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_last_contact ON customers(last_contact_at);
CREATE INDEX IF NOT EXISTS idx_prospects_tenant ON prospects(tenant_id);

-- ================================================================
-- SECTION 8 : OMNICHANNEL
-- ================================================================

CREATE TABLE IF NOT EXISTS omni_agent_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  agent_name TEXT DEFAULT 'Sara',
  agent_type TEXT DEFAULT 'multi_purpose',
  agent_personality TEXT DEFAULT 'professional',
  voice_provider TEXT DEFAULT 'elevenlabs',
  voice_id TEXT,
  voice_settings TEXT,
  voice_language TEXT DEFAULT 'fr-FR',
  system_prompt TEXT,
  greeting_message TEXT DEFAULT 'Bonjour, je suis Sara, votre assistante virtuelle.',
  fallback_message TEXT DEFAULT 'Je n''ai pas bien compris, pouvez-vous reformuler ?',
  transfer_message TEXT DEFAULT 'Je vous transfère vers un conseiller.',
  channels_config TEXT,
  max_conversation_duration INTEGER DEFAULT 600,
  interruption_enabled INTEGER DEFAULT 1,
  auto_noise_detection INTEGER DEFAULT 1,
  sentiment_analysis_enabled INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS omni_phone_mappings (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  tenant_id TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS omni_conversations (
  id TEXT PRIMARY KEY,
  conversation_sid TEXT UNIQUE,
  tenant_id TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  customer_name TEXT,
  active_channels TEXT,
  current_channel TEXT,
  channel_switches TEXT,
  conversation_context TEXT,
  last_intent TEXT,
  last_sentiment TEXT,
  call_sid TEXT,
  first_message_at DATETIME,
  last_message_at DATETIME,
  status TEXT DEFAULT 'active',
  closed_reason TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS omni_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text',
  sender_role TEXT NOT NULL,
  message_sid TEXT,
  duration INTEGER,
  transcript TEXT,
  sentiment TEXT,
  intent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES omni_conversations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS omni_cloudflare_auth (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at DATETIME,
  cloudflare_account_id TEXT,
  cloudflare_account_email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS omni_email_configs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT UNIQUE NOT NULL,
  domain TEXT NOT NULL,
  email_address TEXT NOT NULL,
  resend_domain_id TEXT,
  forwarding_address TEXT,
  dns_provider TEXT,
  dns_zone_id TEXT,
  dns_verified INTEGER DEFAULT 0,
  forwarding_verified INTEGER DEFAULT 0,
  resend_verified INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  auto_config_enabled INTEGER DEFAULT 0,
  last_verification_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index Section 8
CREATE INDEX IF NOT EXISTS idx_omni_agent_tenant ON omni_agent_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_phone_number ON omni_phone_mappings(phone_number);
CREATE INDEX IF NOT EXISTS idx_omni_phone_tenant ON omni_phone_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_conv_tenant ON omni_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_conv_status ON omni_conversations(status);
CREATE INDEX IF NOT EXISTS idx_omni_conv_sid ON omni_conversations(conversation_sid);
CREATE INDEX IF NOT EXISTS idx_omni_msg_conv ON omni_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_omni_msg_created ON omni_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_omni_cloudflare_tenant ON omni_cloudflare_auth(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_email_tenant ON omni_email_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_omni_email_domain ON omni_email_configs(domain);
CREATE INDEX IF NOT EXISTS idx_omni_email_status ON omni_email_configs(status);

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

-- Index Section 9
CREATE INDEX IF NOT EXISTS idx_analytics_tenant ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_events(created_at);

-- ================================================================
-- FIN DU SCHÉMA COMPLET
-- ================================================================
