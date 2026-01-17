-- ============================================
-- BILLING MODULE - DATABASE SCHEMA
-- ============================================
-- Module: Billing & Usage Tracking
-- Version: 1.0.0
-- Description: Gestion de la facturation, plans, abonnements et consommation

-- ============================================
-- TABLE: billing_plans
-- Description: Plans d'abonnement disponibles
-- ============================================
CREATE TABLE IF NOT EXISTS billing_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  plan_id TEXT NOT NULL UNIQUE,          -- 'starter', 'pro', 'enterprise', 'free_trial'
  name TEXT NOT NULL,                     -- Nom du plan
  description TEXT,                       -- Description du plan

  -- Tarification
  monthly_price_cents INTEGER NOT NULL,   -- Prix mensuel en centimes
  yearly_price_cents INTEGER,             -- Prix annuel en centimes (optionnel)
  currency TEXT DEFAULT 'EUR',            -- Devise

  -- Limites incluses
  included_calls INTEGER NOT NULL DEFAULT 0,         -- Nombre d'appels inclus/mois
  included_sms INTEGER NOT NULL DEFAULT 0,           -- Nombre de SMS inclus/mois
  included_tts_minutes INTEGER NOT NULL DEFAULT 0,   -- Minutes TTS incluses/mois
  included_storage_gb INTEGER NOT NULL DEFAULT 0,    -- Stockage GB inclus

  -- Tarifs au-delà des limites (overage)
  overage_call_price_cents INTEGER NOT NULL,         -- Prix par appel supplémentaire
  overage_sms_price_cents INTEGER NOT NULL,          -- Prix par SMS supplémentaire
  overage_tts_minute_price_cents INTEGER NOT NULL,   -- Prix par minute TTS supplémentaire

  -- Fonctionnalités
  features_json TEXT,                     -- JSON: liste des features disponibles
  max_users INTEGER DEFAULT 1,            -- Nombre max d'utilisateurs
  max_channels INTEGER DEFAULT 4,         -- Nombre max de canaux activés

  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,         -- Plan actif ou archivé
  stripe_price_id TEXT,                   -- ID Stripe Price pour ce plan
  stripe_product_id TEXT,                 -- ID Stripe Product

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_plans_plan_id ON billing_plans(plan_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON billing_plans(is_active);

-- ============================================
-- TABLE: billing_subscriptions
-- Description: Abonnements actifs des utilisateurs
-- ============================================
CREATE TABLE IF NOT EXISTS billing_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subscription_id TEXT NOT NULL UNIQUE,   -- UUID unique
  tenant_id TEXT NOT NULL,                -- Lien vers le tenant
  plan_id TEXT NOT NULL,                  -- Référence au plan

  -- Stripe
  stripe_customer_id TEXT,                -- ID client Stripe
  stripe_subscription_id TEXT,            -- ID subscription Stripe

  -- Statut
  status TEXT NOT NULL,                   -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid'

  -- Période
  billing_period TEXT DEFAULT 'monthly',  -- 'monthly' ou 'yearly'
  current_period_start DATETIME,          -- Début période en cours
  current_period_end DATETIME,            -- Fin période en cours
  trial_start DATETIME,                   -- Début trial
  trial_end DATETIME,                     -- Fin trial

  -- Paiement
  payment_method TEXT,                    -- Type de méthode de paiement
  last_payment_date DATETIME,             -- Date dernier paiement
  next_payment_date DATETIME,             -- Date prochain paiement

  -- Annulation
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at DATETIME,

  -- Metadata
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (plan_id) REFERENCES billing_plans(plan_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON billing_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON billing_subscriptions(stripe_subscription_id);

-- ============================================
-- TABLE: billing_usage
-- Description: Tracking de consommation en temps réel
-- ============================================
CREATE TABLE IF NOT EXISTS billing_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usage_id TEXT NOT NULL UNIQUE,          -- UUID unique
  tenant_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,

  -- Type d'usage
  usage_type TEXT NOT NULL,               -- 'call', 'sms', 'tts', 'storage', 'whatsapp'

  -- Détails usage
  quantity INTEGER NOT NULL DEFAULT 1,    -- Quantité consommée
  unit TEXT NOT NULL,                     -- 'minutes', 'sms', 'calls', 'gb'

  -- Coût
  unit_price_cents INTEGER NOT NULL,      -- Prix unitaire en centimes
  total_price_cents INTEGER NOT NULL,     -- Prix total = quantity * unit_price

  -- Metadata
  resource_id TEXT,                       -- ID de la ressource (call_id, sms_id, etc.)
  resource_metadata TEXT,                 -- JSON: metadata additionnelles

  -- Période de facturation
  billing_period_start DATETIME NOT NULL,
  billing_period_end DATETIME NOT NULL,

  -- Timestamps
  occurred_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (subscription_id) REFERENCES billing_subscriptions(subscription_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_usage_tenant ON billing_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_subscription ON billing_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_type ON billing_usage(usage_type);
CREATE INDEX IF NOT EXISTS idx_usage_period ON billing_usage(billing_period_start, billing_period_end);
CREATE INDEX IF NOT EXISTS idx_usage_occurred ON billing_usage(occurred_at);

-- ============================================
-- TABLE: billing_invoices
-- Description: Factures générées
-- ============================================
CREATE TABLE IF NOT EXISTS billing_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id TEXT NOT NULL UNIQUE,        -- UUID unique
  tenant_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,

  -- Stripe
  stripe_invoice_id TEXT,                 -- ID facture Stripe

  -- Numérotation
  invoice_number TEXT NOT NULL UNIQUE,    -- Numéro de facture (INV-2024-001)

  -- Période
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,

  -- Montants (en centimes)
  subtotal_cents INTEGER NOT NULL DEFAULT 0,        -- Sous-total
  subscription_amount_cents INTEGER NOT NULL,       -- Montant abonnement
  overage_amount_cents INTEGER NOT NULL DEFAULT 0,  -- Montant overage
  tax_amount_cents INTEGER NOT NULL DEFAULT 0,      -- Montant TVA
  total_cents INTEGER NOT NULL,                     -- Total TTC

  -- Statut
  status TEXT NOT NULL,                   -- 'draft', 'open', 'paid', 'void', 'uncollectible'

  -- Paiement
  payment_date DATETIME,
  payment_method TEXT,

  -- Fichiers
  pdf_url TEXT,                           -- URL du PDF de la facture

  -- Détails usage (JSON)
  usage_summary TEXT,                     -- JSON: résumé de la consommation
  line_items TEXT,                        -- JSON: lignes de facturation

  -- Dates importantes
  due_date DATETIME,
  issue_date DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (subscription_id) REFERENCES billing_subscriptions(subscription_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON billing_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON billing_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_period ON billing_invoices(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON billing_invoices(stripe_invoice_id);

-- ============================================
-- TABLE: billing_payment_methods
-- Description: Méthodes de paiement enregistrées
-- ============================================
CREATE TABLE IF NOT EXISTS billing_payment_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_method_id TEXT NOT NULL UNIQUE,  -- UUID unique
  tenant_id TEXT NOT NULL,

  -- Stripe
  stripe_payment_method_id TEXT,           -- ID Stripe PaymentMethod

  -- Type
  type TEXT NOT NULL,                      -- 'card', 'sepa_debit', 'bank_transfer'

  -- Carte (si type = card)
  card_brand TEXT,                         -- 'visa', 'mastercard', etc.
  card_last4 TEXT,                         -- 4 derniers chiffres
  card_exp_month INTEGER,                  -- Mois d'expiration
  card_exp_year INTEGER,                   -- Année d'expiration

  -- SEPA (si type = sepa_debit)
  sepa_last4 TEXT,

  -- Statut
  is_default BOOLEAN DEFAULT FALSE,        -- Méthode par défaut

  -- Metadata
  billing_details TEXT,                    -- JSON: nom, email, adresse

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_payment_methods_tenant ON billing_payment_methods(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON billing_payment_methods(is_default);

-- ============================================
-- DONNÉES INITIALES: Plans par défaut
-- ============================================
INSERT OR IGNORE INTO billing_plans (
  plan_id, name, description,
  monthly_price_cents, yearly_price_cents,
  included_calls, included_sms, included_tts_minutes, included_storage_gb,
  overage_call_price_cents, overage_sms_price_cents, overage_tts_minute_price_cents,
  features_json, max_users, max_channels
) VALUES
-- Plan Free Trial (7 jours gratuits)
('free_trial', 'Essai Gratuit', 'Essai gratuit 7 jours - Toutes fonctionnalités',
  0, 0,
  50, 50, 30, 1,
  0, 0, 0,
  '["all_channels","basic_analytics","email_support"]',
  1, 4
),

-- Plan Starter
('starter', 'Starter', 'Pour les petites agences et indépendants',
  4900, 49000,  -- 49€/mois ou 490€/an (2 mois offerts)
  100, 200, 120, 5,
  25, 10, 50,  -- 0.25€/appel, 0.10€/SMS, 0.50€/min TTS
  '["all_channels","basic_analytics","email_support","knowledge_base","1_agent"]',
  2, 4
),

-- Plan Pro
('pro', 'Pro', 'Pour les agences en croissance',
  9900, 99000,  -- 99€/mois ou 990€/an
  500, 1000, 600, 20,
  20, 8, 40,  -- 0.20€/appel, 0.08€/SMS, 0.40€/min TTS
  '["all_channels","advanced_analytics","priority_support","knowledge_base","crm_integrations","3_agents","custom_branding"]',
  5, 4
),

-- Plan Enterprise
('enterprise', 'Enterprise', 'Pour les grandes agences',
  24900, 249000,  -- 249€/mois ou 2490€/an
  2000, 5000, 3000, 100,
  15, 5, 30,  -- 0.15€/appel, 0.05€/SMS, 0.30€/min TTS
  '["all_channels","advanced_analytics","dedicated_support","knowledge_base","crm_integrations","unlimited_agents","custom_branding","api_access","white_label","sla_99_9"]',
  999, 4
);

-- ============================================
-- TRIGGERS: Auto-update updated_at
-- ============================================
CREATE TRIGGER IF NOT EXISTS update_billing_plans_timestamp
AFTER UPDATE ON billing_plans
BEGIN
  UPDATE billing_plans SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_billing_subscriptions_timestamp
AFTER UPDATE ON billing_subscriptions
BEGIN
  UPDATE billing_subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_billing_invoices_timestamp
AFTER UPDATE ON billing_invoices
BEGIN
  UPDATE billing_invoices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_billing_payment_methods_timestamp
AFTER UPDATE ON billing_payment_methods
BEGIN
  UPDATE billing_payment_methods SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
