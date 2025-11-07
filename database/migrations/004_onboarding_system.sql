-- =====================================================
-- MIGRATION 004 : SYSTÈME AUTOPILOT ONBOARDING
-- Version : v2.8.0
-- Date : 24 octobre 2025
-- Description : Tables pour le système d'onboarding automatisé
-- =====================================================

-- Table : onboarding_sessions
-- Stocke les sessions d'onboarding avec progression et données
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id TEXT PRIMARY KEY,                    -- Format: onb_timestamp_random
  tenant_id TEXT NOT NULL,                -- Référence au tenant
  user_id TEXT NOT NULL,                  -- Utilisateur qui fait l'onboarding
  
  -- Progression
  current_step INTEGER DEFAULT 1,         -- Étape actuelle (1-6)
  total_steps INTEGER DEFAULT 6,          -- Nombre total d'étapes
  progress_percentage INTEGER DEFAULT 0,   -- Pourcentage de complétion
  
  -- Données collectées (JSON)
  business_data JSON,                     -- Étape 2: Infos business
  agents_data JSON,                       -- Étape 3: Agents créés
  vapi_data JSON,                         -- Étape 4: Config VAPI
  kb_data JSON,                           -- Étape 5: Knowledge Base
  completion_data JSON,                   -- Étape 6: Données finales
  
  -- Métadonnées
  status TEXT DEFAULT 'in_progress',      -- in_progress, completed, abandoned
  source TEXT DEFAULT 'web',              -- web, mobile, api
  
  -- Timestamps
  started_at TEXT NOT NULL,               -- Date de début
  last_updated_at TEXT NOT NULL,          -- Dernière mise à jour
  completed_at TEXT,                      -- Date de complétion
  abandoned_at TEXT,                      -- Date d'abandon (si applicable)
  
  -- Audit
  ip_address TEXT,                        -- IP de l'utilisateur
  user_agent TEXT,                        -- Navigateur utilisé
  
  -- Flags
  is_active INTEGER DEFAULT 1,            -- Soft delete
  
  -- Contraintes
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  CHECK (current_step >= 1 AND current_step <= total_steps),
  CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- Index pour recherches rapides
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_tenant 
  ON onboarding_sessions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status 
  ON onboarding_sessions(status);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_started 
  ON onboarding_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user 
  ON onboarding_sessions(user_id);

-- =====================================================
-- Table : onboarding_analytics
-- Stocke les métriques d'onboarding pour analytics
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_analytics (
  id TEXT PRIMARY KEY,                    -- Format: ona_timestamp_random
  session_id TEXT NOT NULL,               -- Référence à la session
  tenant_id TEXT NOT NULL,
  
  -- Métriques de temps
  total_duration_seconds INTEGER,         -- Durée totale en secondes
  step_1_duration INTEGER,                -- Temps passé sur chaque étape
  step_2_duration INTEGER,
  step_3_duration INTEGER,
  step_4_duration INTEGER,
  step_5_duration INTEGER,
  step_6_duration INTEGER,
  
  -- Métriques d'interaction
  total_clicks INTEGER DEFAULT 0,         -- Nombre de clics
  back_button_clicks INTEGER DEFAULT 0,   -- Retours en arrière
  help_views INTEGER DEFAULT 0,           -- Vues du help
  
  -- Métriques de génération auto
  agents_auto_generated BOOLEAN DEFAULT FALSE,
  vapi_auto_configured BOOLEAN DEFAULT FALSE,
  kb_auto_initialized BOOLEAN DEFAULT FALSE,
  
  -- Résultats
  agents_created_count INTEGER DEFAULT 0,
  documents_created_count INTEGER DEFAULT 0,
  crawl_launched BOOLEAN DEFAULT FALSE,
  
  -- Success indicators
  completed BOOLEAN DEFAULT FALSE,
  abandoned_at_step INTEGER,              -- À quelle étape abandonné si applicable
  
  -- Timestamps
  created_at TEXT NOT NULL,
  
  -- Contraintes
  FOREIGN KEY (session_id) REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Index pour analytics
CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_session 
  ON onboarding_analytics(session_id);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_completed 
  ON onboarding_analytics(completed);

CREATE INDEX IF NOT EXISTS idx_onboarding_analytics_created 
  ON onboarding_analytics(created_at DESC);

-- =====================================================
-- Table : onboarding_templates
-- Templates de configuration par industrie
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_templates (
  id TEXT PRIMARY KEY,                    -- Format: ont_industry_name
  industry TEXT NOT NULL UNIQUE,          -- real_estate, beauty, healthcare, etc.
  
  -- Configuration agents par défaut
  default_agents JSON NOT NULL,           -- Liste d'agents suggérés
  
  -- Configuration VAPI
  vapi_system_prompt TEXT NOT NULL,       -- Prompt système pour cette industrie
  vapi_first_message TEXT NOT NULL,       -- Message d'accueil
  vapi_voice_settings JSON,               -- Paramètres de voix recommandés
  
  -- Configuration Knowledge Base
  default_documents JSON NOT NULL,        -- Documents à créer automatiquement
  default_faqs JSON NOT NULL,             -- FAQs par défaut
  suggested_crawl_patterns JSON,          -- Patterns pour le crawl
  
  -- Métadonnées
  display_name TEXT NOT NULL,             -- Nom affiché (ex: "Immobilier")
  description TEXT,                       -- Description de l'industrie
  icon TEXT,                              -- Icône emoji ou URL
  
  -- Flags
  is_active INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Index pour templates
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_industry 
  ON onboarding_templates(industry);

CREATE INDEX IF NOT EXISTS idx_onboarding_templates_active 
  ON onboarding_templates(is_active);

-- =====================================================
-- DONNÉES DE SEED : Templates par défaut
-- =====================================================

-- Template Immobilier
INSERT OR IGNORE INTO onboarding_templates (
  id, industry, display_name, description, icon,
  default_agents, vapi_system_prompt, vapi_first_message,
  vapi_voice_settings, default_documents, default_faqs,
  suggested_crawl_patterns, is_active, created_at, updated_at
) VALUES (
  'ont_real_estate',
  'real_estate',
  'Immobilier',
  'Agences immobilières, promoteurs, mandataires',
  '🏠',
  
  -- default_agents
  '[
    {"name": "Sophie Dubois", "speciality": "Vente résidentielle", "email_suffix": "sophie"},
    {"name": "Marc Laurent", "speciality": "Location commerciale", "email_suffix": "marc"},
    {"name": "Julie Martin", "speciality": "Gestion locative", "email_suffix": "julie"}
  ]',
  
  -- vapi_system_prompt
  'Tu es Sara, assistante vocale pour {COMPANY_NAME}, agence immobilière. Tu parles UNIQUEMENT français.

RÈGLES STRICTES :
- Sois bref et professionnel, maximum 2 phrases à la fois
- Pose UNE question à la fois
- Écoute le client jusqu''au bout AVANT de répondre
- Ne parle JAMAIS de prix ou estimations sans consulter un agent

PROCESSUS PRISE DE RENDEZ-VOUS :
1. Demande le nom complet du client
2. Demande le téléphone
3. Demande l''email
4. Demande le type de projet (achat, vente, location, estimation)
5. Propose des créneaux disponibles
6. Confirme le rendez-vous

SERVICES DISPONIBLES :
- Visites de biens
- Estimations gratuites
- Conseils en investissement
- Gestion locative

Ton objectif : prendre le rendez-vous rapidement et efficacement.',
  
  -- vapi_first_message
  'Bonjour, je suis Sara, l''assistante de {COMPANY_NAME}. Comment puis-je vous aider avec votre projet immobilier ?',
  
  -- vapi_voice_settings
  '{"provider": "11labs", "stability": 0.7, "clarity": 0.85, "speed": 1.1}',
  
  -- default_documents
  '[
    {"title": "Services de l''agence", "content": "Notre agence propose : visites accompagnées, estimations gratuites, accompagnement juridique, gestion locative."},
    {"title": "Process de visite", "content": "Pour organiser une visite : 1) Prenez rendez-vous, 2) Un agent vous contacte, 3) Visite du bien, 4) Débriefing et conseils."},
    {"title": "Horaires", "content": "Nous sommes disponibles du lundi au samedi, de 9h à 19h. Sur rendez-vous uniquement."}
  ]',
  
  -- default_faqs
  '[
    {"question": "Comment prendre rendez-vous ?", "answer": "Vous pouvez nous appeler, nous envoyer un email, ou utiliser notre système de prise de rendez-vous en ligne."},
    {"question": "Les estimations sont-elles payantes ?", "answer": "Non, toutes nos estimations sont gratuites et sans engagement."},
    {"question": "Quels types de biens proposez-vous ?", "answer": "Nous proposons maisons, appartements, terrains, locaux commerciaux, en vente et en location."}
  ]',
  
  -- suggested_crawl_patterns
  '{"include": ["/biens/", "/services/", "/agence/"], "exclude": ["/admin/", "/login/"]}',
  
  1,
  datetime('now'),
  datetime('now')
);

-- Template Beauté & Bien-être
INSERT OR IGNORE INTO onboarding_templates (
  id, industry, display_name, description, icon,
  default_agents, vapi_system_prompt, vapi_first_message,
  vapi_voice_settings, default_documents, default_faqs,
  suggested_crawl_patterns, is_active, created_at, updated_at
) VALUES (
  'ont_beauty',
  'beauty',
  'Beauté & Bien-être',
  'Salons de coiffure, instituts de beauté, spas',
  '💇',
  
  -- default_agents
  '[
    {"name": "Emma Rousseau", "speciality": "Coiffure", "email_suffix": "emma"},
    {"name": "Léa Petit", "speciality": "Soins esthétiques", "email_suffix": "lea"}
  ]',
  
  -- vapi_system_prompt
  'Tu es Sara, assistante vocale pour {COMPANY_NAME}, institut de beauté. Tu parles UNIQUEMENT français.

RÈGLES STRICTES :
- Sois chaleureuse mais professionnelle
- Maximum 2 phrases à la fois
- Pose UNE question à la fois

PROCESSUS PRISE DE RENDEZ-VOUS :
1. Demande le nom complet
2. Demande le téléphone
3. Demande le type de prestation souhaitée
4. Propose des créneaux disponibles
5. Confirme le rendez-vous

SERVICES DISPONIBLES :
- Coupe et coiffage
- Coloration
- Soins capillaires
- Maquillage
- Soins du visage et corps

Politique d''annulation : Annulation gratuite jusqu''à 24h avant le rendez-vous.',
  
  -- vapi_first_message
  'Bonjour, je suis Sara de {COMPANY_NAME}. Comment puis-je vous aider à prendre rendez-vous ?',
  
  -- vapi_voice_settings
  '{"provider": "11labs", "stability": 0.8, "clarity": 0.9, "speed": 1.0}',
  
  -- default_documents
  '[
    {"title": "Catalogue des prestations", "content": "Nos prestations : coupe (à partir de 30€), coloration (à partir de 60€), soins (à partir de 40€), maquillage (à partir de 50€)."},
    {"title": "Politique d''annulation", "content": "Annulation gratuite jusqu''à 24h avant le RDV. Passé ce délai, 50% du montant sera facturé."}
  ]',
  
  -- default_faqs
  '[
    {"question": "Quels sont vos tarifs ?", "answer": "Nos tarifs varient selon les prestations. Coupes à partir de 30€, colorations à partir de 60€."},
    {"question": "Puis-je annuler mon rendez-vous ?", "answer": "Oui, gratuitement jusqu''à 24h avant. Au-delà, 50% du montant sera facturé."}
  ]',
  
  -- suggested_crawl_patterns
  '{"include": ["/prestations/", "/tarifs/", "/equipe/"], "exclude": ["/admin/"]}',
  
  1,
  datetime('now'),
  datetime('now')
);

-- =====================================================
-- FIN DE LA MIGRATION 004
-- =====================================================
