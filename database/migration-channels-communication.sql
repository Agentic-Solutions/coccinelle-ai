-- =====================================================
-- MIGRATION: Canaux de Communication
-- Date: 2025-01-25
-- Description: Tables pour Phone, SMS, Email, WhatsApp
-- Base: Cloudflare D1 (SQLite)
-- =====================================================

-- =====================================================
-- Table: channel_configurations
-- Description: Configuration des 4 canaux par tenant
-- =====================================================
CREATE TABLE IF NOT EXISTS channel_configurations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('phone', 'sms', 'email', 'whatsapp')),

  -- Status
  enabled INTEGER DEFAULT 0,  -- 0=false, 1=true
  configured INTEGER DEFAULT 0,

  -- Configuration chiffrée (TEXT en SQLite)
  -- Pour SMS/Phone: vide (géré par admin)
  -- Pour Email: SMTP credentials chiffrés
  -- Pour WhatsApp: API tokens chiffrés
  config_encrypted TEXT,

  -- Configuration publique (JSON en TEXT)
  -- Pour Phone: { clientPhoneNumber, sara: {...}, transferConfigured }
  -- Pour SMS: { templates: {...} }
  -- Pour Email: { smtp: { host, port, fromEmail, fromName }, templates: {...} }
  -- Pour WhatsApp: { connectionMethod, whatsappNumber, templates: {...} }
  config_public TEXT DEFAULT '{}',

  -- Templates activés (JSON en TEXT)
  templates TEXT DEFAULT '{}',

  -- Vapi/Retell assistant ID (pour le canal phone uniquement)
  assistant_id TEXT,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Contrainte unique
  UNIQUE(tenant_id, channel_type)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_channel_configs_tenant ON channel_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_configs_enabled ON channel_configurations(tenant_id, enabled);
CREATE INDEX IF NOT EXISTS idx_channel_configs_type ON channel_configurations(channel_type);

-- =====================================================
-- Table: channel_messages_log
-- Description: Log de tous les messages envoyés
-- =====================================================
CREATE TABLE IF NOT EXISTS channel_messages_log (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('phone', 'sms', 'email', 'whatsapp')),

  -- Destinataire
  to_address TEXT NOT NULL, -- email, phone, etc.

  -- Template et contenu
  template_name TEXT,
  subject TEXT, -- Pour emails
  content TEXT,

  -- Variables du template (JSON en TEXT)
  template_variables TEXT DEFAULT '{}',

  -- Statut
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  external_message_id TEXT, -- ID du fournisseur (Twilio, etc.)
  error_message TEXT,
  error_code TEXT,

  -- Métadonnées
  provider TEXT, -- 'twilio', 'smtp', 'whatsapp', 'vapi'
  cost_cents INTEGER, -- Coût en centimes
  duration_seconds INTEGER, -- Pour les appels vocaux

  -- Timestamps
  sent_at DATETIME,
  delivered_at DATETIME,
  read_at DATETIME,
  failed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performance et analytics
CREATE INDEX IF NOT EXISTS idx_messages_log_tenant ON channel_messages_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_log_channel ON channel_messages_log(channel_type);
CREATE INDEX IF NOT EXISTS idx_messages_log_status ON channel_messages_log(status);
CREATE INDEX IF NOT EXISTS idx_messages_log_to ON channel_messages_log(to_address);
CREATE INDEX IF NOT EXISTS idx_messages_log_template ON channel_messages_log(template_name);
CREATE INDEX IF NOT EXISTS idx_messages_log_external_id ON channel_messages_log(external_message_id);

-- =====================================================
-- Table: rendez_vous
-- Description: Gestion des rendez-vous (agent appointment)
-- =====================================================
CREATE TABLE IF NOT EXISTS rendez_vous (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Informations client
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,

  -- Informations RDV
  rdv_date DATE NOT NULL,
  rdv_time TIME NOT NULL,
  rdv_type TEXT, -- 'visite', 'estimation', 'signature', etc.
  rdv_duration_minutes INTEGER DEFAULT 60,
  rdv_location TEXT,

  -- Statut
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),

  -- Notes
  notes TEXT,
  internal_notes TEXT, -- Notes privées (non visible par le client)

  -- Rappels envoyés
  reminder_24h_sent INTEGER DEFAULT 0,
  reminder_1h_sent INTEGER DEFAULT 0,
  confirmation_sent INTEGER DEFAULT 0,

  -- Lien vers l'appel qui a créé le RDV (si applicable)
  call_id TEXT,
  created_by TEXT DEFAULT 'sara', -- 'sara', 'manual', 'web'

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME,
  completed_at DATETIME
);

-- Index
CREATE INDEX IF NOT EXISTS idx_rdv_tenant ON rendez_vous(tenant_id, rdv_date DESC);
CREATE INDEX IF NOT EXISTS idx_rdv_status ON rendez_vous(status);
CREATE INDEX IF NOT EXISTS idx_rdv_customer_phone ON rendez_vous(customer_phone);
CREATE INDEX IF NOT EXISTS idx_rdv_date ON rendez_vous(rdv_date, rdv_time);
CREATE INDEX IF NOT EXISTS idx_rdv_reminders ON rendez_vous(rdv_date, reminder_24h_sent, reminder_1h_sent);

-- =====================================================
-- Table: qualified_prospects
-- Description: Gestion des prospects qualifiés (agent qualification immobilier)
-- Note: Différent de la table 'prospects' CRM existante
-- =====================================================
CREATE TABLE IF NOT EXISTS qualified_prospects (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Informations contact
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,

  -- Qualification
  source TEXT, -- 'phone', 'sms', 'email', 'whatsapp', 'web'
  interest_type TEXT, -- 'achat', 'vente', 'location', 'estimation', etc.
  budget_min INTEGER,
  budget_max INTEGER,
  location_preference TEXT,
  property_type TEXT, -- 'appartement', 'maison', 'terrain', etc.

  -- Score de qualification (0-100)
  qualification_score INTEGER DEFAULT 0,
  qualification_status TEXT DEFAULT 'new' CHECK (qualification_status IN ('new', 'qualified', 'not_qualified', 'follow_up', 'converted', 'lost')),

  -- Notes
  notes TEXT,
  qualification_notes TEXT,

  -- Lien vers l'appel qui a créé le prospect
  call_id TEXT,
  created_by TEXT DEFAULT 'sara',

  -- Suivi
  last_contact_at DATETIME,
  next_follow_up_at DATETIME,
  converted_to_client INTEGER DEFAULT 0,
  converted_at DATETIME,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_qualified_prospects_tenant ON qualified_prospects(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qualified_prospects_status ON qualified_prospects(qualification_status);
CREATE INDEX IF NOT EXISTS idx_qualified_prospects_phone ON qualified_prospects(phone);
CREATE INDEX IF NOT EXISTS idx_qualified_prospects_email ON qualified_prospects(email);
CREATE INDEX IF NOT EXISTS idx_qualified_prospects_score ON qualified_prospects(qualification_score DESC);
CREATE INDEX IF NOT EXISTS idx_qualified_prospects_follow_up ON qualified_prospects(next_follow_up_at);

-- =====================================================
-- Table: tickets
-- Description: Gestion des tickets de support (agent support)
-- =====================================================
CREATE TABLE IF NOT EXISTS tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Informations client
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,

  -- Ticket
  subject TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'technique', 'facturation', 'question', 'reclamation', etc.
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  -- Statut
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),

  -- Assignation
  assigned_to TEXT, -- Email ou ID de l'agent humain
  assigned_at DATETIME,

  -- Résolution
  resolution_notes TEXT,
  resolved_at DATETIME,
  closed_at DATETIME,

  -- Lien vers l'appel qui a créé le ticket
  call_id TEXT,
  created_by TEXT DEFAULT 'sara',

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_category ON tickets(category);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_customer_phone ON tickets(customer_phone);

-- =====================================================
-- Table: call_logs
-- Description: Log de tous les appels vocaux (Vapi/Twilio)
-- =====================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Informations appel
  call_sid TEXT UNIQUE, -- Twilio Call SID
  assistant_id TEXT, -- Vapi Assistant ID

  -- Numéros
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  forwarded_from TEXT, -- Numéro du client (identification tenant)

  -- Direction
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),

  -- Statut
  call_status TEXT, -- 'initiated', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer'

  -- Durée et coût
  duration_seconds INTEGER,
  cost_cents INTEGER,

  -- Transcription et analyse
  recording_url TEXT,
  transcript TEXT,
  summary TEXT, -- Résumé généré par Sara
  sentiment TEXT, -- 'positive', 'neutral', 'negative'

  -- Actions effectuées pendant l'appel (JSON en TEXT)
  actions_performed TEXT DEFAULT '[]', -- Liste des function calls exécutés
  rdv_created TEXT, -- ID du rendez_vous si créé
  qualified_prospect_created TEXT, -- ID du qualified_prospect si créé
  ticket_created TEXT, -- ID du ticket si créé

  -- Timestamps
  started_at DATETIME,
  ended_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_calls_tenant ON call_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_sid ON call_logs(call_sid);
CREATE INDEX IF NOT EXISTS idx_calls_from ON call_logs(from_number);
CREATE INDEX IF NOT EXISTS idx_calls_forwarded ON call_logs(forwarded_from);
CREATE INDEX IF NOT EXISTS idx_calls_status ON call_logs(call_status);
CREATE INDEX IF NOT EXISTS idx_calls_duration ON call_logs(duration_seconds);

-- =====================================================
-- Triggers pour updated_at
-- =====================================================

-- Trigger pour channel_configurations
CREATE TRIGGER IF NOT EXISTS update_channel_configs_updated_at
AFTER UPDATE ON channel_configurations
FOR EACH ROW
BEGIN
  UPDATE channel_configurations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour rendez_vous
CREATE TRIGGER IF NOT EXISTS update_rdv_updated_at
AFTER UPDATE ON rendez_vous
FOR EACH ROW
BEGIN
  UPDATE rendez_vous SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour qualified_prospects
CREATE TRIGGER IF NOT EXISTS update_qualified_prospects_updated_at
AFTER UPDATE ON qualified_prospects
FOR EACH ROW
BEGIN
  UPDATE qualified_prospects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger pour tickets
CREATE TRIGGER IF NOT EXISTS update_tickets_updated_at
AFTER UPDATE ON tickets
FOR EACH ROW
BEGIN
  UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- =====================================================
-- Données de test (optionnel - à supprimer en prod)
-- =====================================================

-- Insérer une config Phone de test
-- INSERT INTO channel_configurations (id, tenant_id, channel_type, enabled, configured, config_public, assistant_id) VALUES
--   ('cfg_phone_demo', 'tenant_demo_001', 'phone', 1, 1,
--    '{"clientPhoneNumber": "+33987654321", "twilioSharedNumber": "+33939035761", "sara": {"voice": "female", "assistantName": "Sara", "agentType": "reception", "language": "fr-FR"}}',
--    'vapi_assistant_demo_123');

-- Insérer un RDV de test
-- INSERT INTO rendez_vous (id, tenant_id, customer_name, customer_phone, customer_email, rdv_date, rdv_time, rdv_type, status) VALUES
--   ('rdv_demo_001', 'tenant_demo_001', 'Jean Dupont', '+33612345678', 'jean@exemple.com', '2025-02-01', '14:00', 'visite', 'confirmed');

-- =====================================================
-- Fin de la migration
-- =====================================================
