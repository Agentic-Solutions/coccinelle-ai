-- Migration 0060: Services/Prestations + liaison commercial_agents
-- Permet le booking intelligent multi-membres par prestation

-- Ajouter colonnes manquantes a la table services
ALTER TABLE services ADD COLUMN color TEXT DEFAULT '#6366f1';
ALTER TABLE services ADD COLUMN category TEXT;

-- Table de liaison : quel agent fait quelle prestation (avec duree custom optionnelle)
CREATE TABLE IF NOT EXISTS commercial_agent_services (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  service_id TEXT NOT NULL,
  custom_duration_minutes INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(agent_id, service_id)
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_cas_tenant ON commercial_agent_services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cas_agent ON commercial_agent_services(agent_id);
CREATE INDEX IF NOT EXISTS idx_cas_service ON commercial_agent_services(service_id);

-- 4 prestations demo pour le tenant test
INSERT OR IGNORE INTO services (id, tenant_id, name, description, duration_minutes, price, color, category, is_active, created_at)
VALUES
  ('svc_demo_001', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'Visite de bien', 'Visite guidee d un bien immobilier avec un conseiller', 60, NULL, '#6366f1', 'immobilier', 1, datetime('now')),
  ('svc_demo_002', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'Estimation', 'Estimation gratuite de votre bien par un expert', 45, NULL, '#10b981', 'immobilier', 1, datetime('now')),
  ('svc_demo_003', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'Signature compromis', 'Rendez-vous de signature du compromis de vente', 90, NULL, '#f59e0b', 'juridique', 1, datetime('now')),
  ('svc_demo_004', 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy', 'Consultation', 'Consultation decouverte de 30 minutes', 30, NULL, '#3b82f6', 'general', 1, datetime('now'));
