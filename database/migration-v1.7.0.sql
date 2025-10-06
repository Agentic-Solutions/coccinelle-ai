-- Migration v1.7.0 : Ajout table vapi_call_logs
-- À exécuter avec : npx wrangler d1 execute coccinelle-db --remote --file=database/migration-v1.7.0.sql

CREATE TABLE IF NOT EXISTS vapi_call_logs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  call_id TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  direction TEXT CHECK(direction IN ('inbound', 'outbound')),
  status TEXT CHECK(status IN ('queued', 'ringing', 'in-progress', 'completed', 'failed', 'busy', 'no-answer')),
  started_at TEXT,
  ended_at TEXT,
  duration_seconds INTEGER,
  cost_usd REAL,
  
  -- Informations prospect
  prospect_id TEXT,
  prospect_name TEXT,
  prospect_email TEXT,
  
  -- Données de l'appel
  transcript TEXT,
  summary TEXT,
  sentiment_score REAL,
  
  -- Function calls exécutés
  functions_called TEXT, -- JSON array des tools utilisés
  
  -- Résultat
  appointment_created INTEGER DEFAULT 0,
  appointment_id TEXT,
  
  -- Erreurs
  error_message TEXT,
  error_type TEXT,
  
  -- Métadonnées
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (prospect_id) REFERENCES prospects(id),
  FOREIGN KEY (appointment_id) REFERENCES appointments(id)
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_vapi_calls_tenant ON vapi_call_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_status ON vapi_call_logs(status);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_date ON vapi_call_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_prospect ON vapi_call_logs(prospect_id);
CREATE INDEX IF NOT EXISTS idx_vapi_calls_appointment ON vapi_call_logs(appointment_id);
