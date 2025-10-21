-- ============================================
-- MIGRATION MULTI-TENANT v3.0 - ADDITIVE
-- Coccinelle.AI - Auth + Tenants + Agents
-- Date: 21 octobre 2025
-- ============================================
-- STRATÉGIE: Ajouter colonnes aux tables existantes
-- ============================================

-- ==========================================
-- 1. MISE À JOUR TABLE TENANTS
-- ==========================================
-- Ajouter les colonnes manquantes une par une

ALTER TABLE tenants ADD COLUMN company_name TEXT;
ALTER TABLE tenants ADD COLUMN slug TEXT;
ALTER TABLE tenants ADD COLUMN sector TEXT DEFAULT 'generic';
ALTER TABLE tenants ADD COLUMN admin_email TEXT;
ALTER TABLE tenants ADD COLUMN admin_phone TEXT;
ALTER TABLE tenants ADD COLUMN address TEXT;
ALTER TABLE tenants ADD COLUMN city TEXT;
ALTER TABLE tenants ADD COLUMN postal_code TEXT;
ALTER TABLE tenants ADD COLUMN country TEXT DEFAULT 'FR';
ALTER TABLE tenants ADD COLUMN calendar_provider TEXT DEFAULT 'internal';
ALTER TABLE tenants ADD COLUMN calendar_config TEXT;
ALTER TABLE tenants ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE tenants ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE tenants ADD COLUMN subscription_plan TEXT DEFAULT 'starter';
ALTER TABLE tenants ADD COLUMN trial_ends_at DATETIME;
ALTER TABLE tenants ADD COLUMN subscription_ends_at DATETIME;
ALTER TABLE tenants ADD COLUMN max_agents INTEGER DEFAULT 1;
ALTER TABLE tenants ADD COLUMN max_calls_per_month INTEGER DEFAULT 100;
ALTER TABLE tenants ADD COLUMN max_knowledge_docs INTEGER DEFAULT 50;
ALTER TABLE tenants ADD COLUMN module_sara INTEGER DEFAULT 1;
ALTER TABLE tenants ADD COLUMN module_crm_real_estate INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN module_crm_hair_salon INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN module_crm_generic INTEGER DEFAULT 0;
ALTER TABLE tenants ADD COLUMN logo_url TEXT;
ALTER TABLE tenants ADD COLUMN primary_color TEXT DEFAULT '#3B82F6';
ALTER TABLE tenants ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE tenants ADD COLUMN activated_at DATETIME;
ALTER TABLE tenants ADD COLUMN cancelled_at DATETIME;

-- Créer index sur slug
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ==========================================
-- 2. MISE À JOUR TABLE USERS
-- ==========================================
-- Vérifier la structure actuelle et ajouter colonnes manquantes

-- Note: On suppose que users existe mais avec une structure différente
-- Ajouter colonnes pour auth complète

-- Si la table users n'a pas ces colonnes, on les ajoute
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users ADD COLUMN avatar_url TEXT;
ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'agent';
ALTER TABLE users ADD COLUMN permissions TEXT;
ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN email_verified_at DATETIME;
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN password_reset_token TEXT;
ALTER TABLE users ADD COLUMN password_reset_expires_at DATETIME;
ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Si tenant_id n'existe pas
ALTER TABLE users ADD COLUMN tenant_id TEXT;

-- Créer index
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);

-- ==========================================
-- 3. CRÉER TABLE SESSIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ==========================================
-- 4. MISE À JOUR TABLE AGENTS
-- ==========================================
-- Ajouter colonnes manquantes

ALTER TABLE agents ADD COLUMN user_id TEXT;
ALTER TABLE agents ADD COLUMN avatar_url TEXT;
ALTER TABLE agents ADD COLUMN title TEXT;
ALTER TABLE agents ADD COLUMN bio TEXT;
ALTER TABLE agents ADD COLUMN specialties TEXT;
ALTER TABLE agents ADD COLUMN calendar_provider TEXT DEFAULT 'internal';
ALTER TABLE agents ADD COLUMN calendar_config TEXT;
ALTER TABLE agents ADD COLUMN default_availability TEXT;
ALTER TABLE agents ADD COLUMN total_appointments INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN total_calls_received INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN avg_rating REAL DEFAULT 0.0;
ALTER TABLE agents ADD COLUMN is_available INTEGER DEFAULT 1;
ALTER TABLE agents ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Créer index
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant_id ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);

-- ==========================================
-- 5. CRÉER TABLE AGENT_INVITATIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  invited_by_user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  expires_at DATETIME NOT NULL,
  accepted_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON agent_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON agent_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON agent_invitations(status);

-- ==========================================
-- 6. CRÉER TABLE AUDIT_LOGS
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  changes TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- ==========================================
-- 7. AJOUTER TENANT_ID AUX TABLES EXISTANTES
-- ==========================================
-- Ajouter tenant_id si pas déjà présent

-- Prospects
ALTER TABLE prospects ADD COLUMN tenant_id TEXT DEFAULT 'tenant_demo_001';
CREATE INDEX IF NOT EXISTS idx_prospects_tenant_id ON prospects(tenant_id);

-- Appointments
ALTER TABLE appointments ADD COLUMN tenant_id TEXT DEFAULT 'tenant_demo_001';
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);

-- Vapi_calls
ALTER TABLE vapi_calls ADD COLUMN tenant_id TEXT DEFAULT 'tenant_demo_001';
CREATE INDEX IF NOT EXISTS idx_vapi_calls_tenant_id ON vapi_calls(tenant_id);

-- Knowledge_documents
ALTER TABLE knowledge_documents ADD COLUMN tenant_id TEXT DEFAULT 'tenant_demo_001';
CREATE INDEX IF NOT EXISTS idx_knowledge_documents_tenant_id ON knowledge_documents(tenant_id);

-- ==========================================
-- 8. METTRE À JOUR TENANT DÉMO
-- ==========================================
-- Mettre à jour le tenant existant avec les nouvelles colonnes

UPDATE tenants 
SET 
  company_name = 'Agence Démo Coccinelle',
  slug = 'demo',
  sector = 'real_estate',
  admin_email = COALESCE(email, 'demo@coccinelle.ai'),
  status = 'active',
  subscription_plan = 'professional',
  activated_at = datetime('now')
WHERE id = (SELECT id FROM tenants LIMIT 1);

-- ==========================================
-- 9. VÉRIFICATIONS
-- ==========================================
-- Vérifier les colonnes ajoutées

SELECT 
  'Colonnes tenants:' as check_name,
  COUNT(*) as column_count
FROM pragma_table_info('tenants');

SELECT 
  'Colonnes users:' as check_name,
  COUNT(*) as column_count
FROM pragma_table_info('users');

SELECT 
  'Colonnes agents:' as check_name,
  COUNT(*) as column_count
FROM pragma_table_info('agents');

SELECT 
  'Nouvelles tables créées:' as check_name,
  COUNT(*) as table_count
FROM sqlite_master 
WHERE type='table' 
AND name IN ('sessions', 'agent_invitations', 'audit_logs');

-- Afficher le tenant mis à jour
SELECT 
  id,
  company_name,
  slug,
  status,
  subscription_plan
FROM tenants
LIMIT 1;

-- ==========================================
-- FIN MIGRATION ADDITIVE
-- ==========================================
-- Total: 3 nouvelles tables + colonnes ajoutées aux tables existantes
-- Temps d'exécution estimé: ~3 secondes
-- ==========================================
