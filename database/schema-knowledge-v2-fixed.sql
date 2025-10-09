-- ============================================
-- KNOWLEDGE BASE SCHEMA v2.0 - FIXED
-- Seulement les NOUVELLES tables (pas d'ALTER)
-- ============================================

-- Table services
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL,
  price REAL,
  currency TEXT DEFAULT 'EUR',
  category TEXT,
  preparation_time INTEGER DEFAULT 0,
  cleanup_time INTEGER DEFAULT 5,
  max_advance_booking_days INTEGER DEFAULT 90,
  min_advance_booking_hours INTEGER DEFAULT 2,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_services_tenant ON services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

-- Table agent_services
CREATE TABLE IF NOT EXISTS agent_services (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  proficiency_level TEXT DEFAULT 'expert',
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
  UNIQUE(agent_id, service_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_services_agent ON agent_services(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_services_service ON agent_services(service_id);

-- Table knowledge_documents
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_url TEXT,
  title TEXT NOT NULL,
  content TEXT,
  content_hash TEXT,
  word_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  metadata TEXT,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  crawled_at DATETIME,
  indexed_at DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_docs_tenant ON knowledge_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_hash ON knowledge_documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_status ON knowledge_documents(status);

-- Table knowledge_chunks
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  token_count INTEGER DEFAULT 0,
  vector_id TEXT,
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON knowledge_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON knowledge_chunks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chunks_vector ON knowledge_chunks(vector_id);

-- Table crawl_jobs
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  root_url TEXT NOT NULL,
  max_pages INTEGER DEFAULT 50,
  max_depth INTEGER DEFAULT 3,
  include_patterns TEXT,
  exclude_patterns TEXT,
  pages_crawled INTEGER DEFAULT 0,
  pages_found INTEGER DEFAULT 0,
  documents_created INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  started_at DATETIME,
  completed_at DATETIME,
  duration_seconds INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_crawl_jobs_tenant ON crawl_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status ON crawl_jobs(status);

-- Table knowledge_faq
CREATE TABLE IF NOT EXISTS knowledge_faq (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT,
  priority INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  last_used_at DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_faq_tenant ON knowledge_faq(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faq_category ON knowledge_faq(category);

-- Table knowledge_snippets
CREATE TABLE IF NOT EXISTS knowledge_snippets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  usage_context TEXT,
  variables TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_snippets_tenant ON knowledge_snippets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_snippets_context ON knowledge_snippets(usage_context);

-- Table search logs
CREATE TABLE IF NOT EXISTS knowledge_search_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  query TEXT NOT NULL,
  results_found INTEGER DEFAULT 0,
  top_result_score REAL,
  search_method TEXT,
  response_time_ms INTEGER,
  user_satisfied INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_search_logs_tenant ON knowledge_search_logs(tenant_id);

SELECT 'Schema KB v2.0 FIXED créé avec succès!' AS message;
