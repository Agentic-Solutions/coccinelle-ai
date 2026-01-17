-- ============================================
-- MIGRATION: Intégrations CRM & E-commerce
-- Date: 29 novembre 2025
-- Version: 1.0.0
-- ============================================

-- Table principale des intégrations par tenant
CREATE TABLE IF NOT EXISTS tenant_integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  integration_type TEXT NOT NULL, -- 'hubspot', 'salesforce', 'woocommerce', 'shopify', etc.
  integration_name TEXT NOT NULL, -- Nom personnalisé par le client
  enabled INTEGER DEFAULT 0, -- 0 = désactivé, 1 = activé

  -- Configuration publique (non sensible)
  config_public TEXT, -- JSON avec config visible

  -- Configuration sensible (chiffrée)
  config_encrypted TEXT, -- JSON avec API keys, tokens, secrets

  -- OAuth data (si applicable)
  oauth_provider TEXT, -- 'hubspot_oauth', 'salesforce_oauth', etc.
  oauth_access_token TEXT,
  oauth_refresh_token TEXT,
  oauth_expires_at TEXT,
  oauth_scope TEXT,

  -- n8n webhook URL
  n8n_webhook_url TEXT, -- URL du webhook n8n pour cette intégration

  -- Sync settings
  sync_direction TEXT DEFAULT 'bidirectional', -- 'to_platform', 'from_platform', 'bidirectional'
  sync_frequency TEXT DEFAULT 'realtime', -- 'realtime', 'hourly', 'daily'
  last_sync_at TEXT,
  last_sync_status TEXT, -- 'success', 'failed', 'pending'
  last_sync_error TEXT,

  -- Metadata
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  created_by TEXT, -- user_id qui a créé l'intégration

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON tenant_integrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON tenant_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON tenant_integrations(enabled);

-- ============================================
-- Table de mapping des champs
-- Permet de mapper les champs Coccinelle vers les champs de la plateforme
-- ============================================

CREATE TABLE IF NOT EXISTS integration_field_mappings (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,

  -- Champ source (Coccinelle)
  source_field TEXT NOT NULL, -- Ex: 'prospect.first_name'
  source_type TEXT NOT NULL, -- 'prospect', 'appointment', 'call_log', etc.

  -- Champ destination (plateforme)
  destination_field TEXT NOT NULL, -- Ex: 'firstName' (HubSpot), 'FirstName' (Salesforce)
  destination_type TEXT, -- Type de champ dans la plateforme

  -- Transformation
  transform_function TEXT, -- JS function pour transformer la valeur si besoin

  -- Direction
  sync_direction TEXT DEFAULT 'to_platform', -- 'to_platform', 'from_platform', 'both'

  -- Metadata
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (integration_id) REFERENCES tenant_integrations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_field_mappings_integration ON integration_field_mappings(integration_id);

-- ============================================
-- Table des logs de synchronisation
-- ============================================

CREATE TABLE IF NOT EXISTS integration_sync_logs (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  -- Sync details
  sync_type TEXT NOT NULL, -- 'prospect_created', 'appointment_created', 'call_completed', etc.
  sync_direction TEXT NOT NULL, -- 'to_platform', 'from_platform'

  -- Source data
  source_entity_type TEXT NOT NULL, -- 'prospect', 'appointment', 'call_log'
  source_entity_id TEXT NOT NULL,

  -- Destination data
  destination_entity_type TEXT, -- 'contact', 'lead', 'deal', 'order', etc.
  destination_entity_id TEXT, -- ID dans la plateforme externe

  -- Status
  status TEXT NOT NULL, -- 'pending', 'processing', 'success', 'failed'
  error_message TEXT,
  error_code TEXT,

  -- Request/Response
  request_payload TEXT, -- JSON du payload envoyé
  response_payload TEXT, -- JSON de la réponse

  -- Timing
  started_at TEXT NOT NULL,
  completed_at TEXT,
  duration_ms INTEGER,

  -- Retry
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TEXT,

  -- Metadata
  created_at TEXT NOT NULL,

  FOREIGN KEY (integration_id) REFERENCES tenant_integrations(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_integration ON integration_sync_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_tenant ON integration_sync_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON integration_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created ON integration_sync_logs(created_at);

-- ============================================
-- Table des événements à synchroniser (queue)
-- ============================================

CREATE TABLE IF NOT EXISTS integration_sync_queue (
  id TEXT PRIMARY KEY,
  integration_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  -- Event
  event_type TEXT NOT NULL, -- 'prospect.created', 'prospect.updated', 'appointment.created', etc.
  event_data TEXT NOT NULL, -- JSON avec les données de l'événement

  -- Priority
  priority INTEGER DEFAULT 5, -- 1 = highest, 10 = lowest

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'

  -- Retry
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  last_error TEXT,

  -- Timing
  scheduled_at TEXT NOT NULL, -- Quand doit être traité
  processed_at TEXT,

  -- Metadata
  created_at TEXT NOT NULL,

  FOREIGN KEY (integration_id) REFERENCES tenant_integrations(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_integration ON integration_sync_queue(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON integration_sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_scheduled ON integration_sync_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON integration_sync_queue(priority);

-- ============================================
-- Table des webhooks entrants (depuis plateformes)
-- ============================================

CREATE TABLE IF NOT EXISTS integration_webhook_logs (
  id TEXT PRIMARY KEY,
  integration_id TEXT,
  tenant_id TEXT,

  -- Webhook details
  source_platform TEXT NOT NULL, -- 'hubspot', 'salesforce', etc.
  event_type TEXT NOT NULL, -- Type d'événement reçu

  -- Request
  request_method TEXT NOT NULL,
  request_headers TEXT, -- JSON
  request_body TEXT, -- JSON
  request_ip TEXT,

  -- Processing
  processed INTEGER DEFAULT 0,
  processing_status TEXT, -- 'success', 'failed', 'ignored'
  processing_error TEXT,

  -- Metadata
  received_at TEXT NOT NULL,
  processed_at TEXT,

  FOREIGN KEY (integration_id) REFERENCES tenant_integrations(id) ON DELETE SET NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_integration ON integration_webhook_logs(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_platform ON integration_webhook_logs(source_platform);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_received ON integration_webhook_logs(received_at);

-- ============================================
-- Données par défaut : Intégrations disponibles
-- ============================================

-- Cette table stocke les intégrations disponibles dans le système
CREATE TABLE IF NOT EXISTS available_integrations (
  id TEXT PRIMARY KEY,

  -- Info
  name TEXT NOT NULL, -- 'HubSpot', 'Salesforce', etc.
  slug TEXT NOT NULL UNIQUE, -- 'hubspot', 'salesforce'
  category TEXT NOT NULL, -- 'crm', 'ecommerce', 'marketing', 'support'

  -- Display
  description TEXT,
  logo_url TEXT,

  -- Auth
  auth_type TEXT NOT NULL, -- 'oauth2', 'api_key', 'basic_auth'
  oauth_authorize_url TEXT,
  oauth_token_url TEXT,
  oauth_scopes TEXT, -- JSON array

  -- Config required
  config_fields TEXT, -- JSON array des champs de config requis

  -- n8n
  n8n_node_type TEXT, -- 'n8n-nodes-base.hubspot'
  n8n_workflow_template TEXT, -- URL ou JSON du template n8n

  -- Features
  supports_contacts INTEGER DEFAULT 0,
  supports_deals INTEGER DEFAULT 0,
  supports_products INTEGER DEFAULT 0,
  supports_orders INTEGER DEFAULT 0,
  supports_webhooks INTEGER DEFAULT 0,

  -- Status
  enabled INTEGER DEFAULT 1,
  beta INTEGER DEFAULT 0,

  -- Metadata
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Insérer les intégrations disponibles
INSERT OR IGNORE INTO available_integrations (id, name, slug, category, description, auth_type, supports_contacts, supports_deals, supports_webhooks, enabled, created_at, updated_at) VALUES
('int_hubspot', 'HubSpot', 'hubspot', 'crm', 'Synchronisez vos contacts et opportunités avec HubSpot CRM', 'oauth2', 1, 1, 1, 1, datetime('now'), datetime('now')),
('int_salesforce', 'Salesforce', 'salesforce', 'crm', 'Connectez-vous à Salesforce pour gérer leads et opportunités', 'oauth2', 1, 1, 1, 1, datetime('now'), datetime('now')),
('int_woocommerce', 'WooCommerce', 'woocommerce', 'ecommerce', 'Synchronisez vos commandes et clients WooCommerce', 'api_key', 1, 0, 1, 1, datetime('now'), datetime('now')),
('int_shopify', 'Shopify', 'shopify', 'ecommerce', 'Intégrez votre boutique Shopify avec Coccinelle', 'oauth2', 1, 0, 1, 1, datetime('now'), datetime('now')),
('int_pipedrive', 'Pipedrive', 'pipedrive', 'crm', 'Synchronisez vos deals avec Pipedrive', 'api_key', 1, 1, 1, 1, datetime('now'), datetime('now')),
('int_zendesk', 'Zendesk', 'zendesk', 'support', 'Créez des tickets Zendesk depuis Coccinelle', 'oauth2', 1, 0, 1, 1, datetime('now'), datetime('now'));

-- ============================================
-- FIN DE LA MIGRATION
-- ============================================
