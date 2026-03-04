-- Migration 0045: Support tickets, FAQ items, Churn feedback
-- Features M14 (Support Client) + M15 (Sondage Churn)

-- =============================================
-- TABLE: support_tickets
-- =============================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  admin_response TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(tenant_id, created_at DESC);

-- =============================================
-- TABLE: faq_items
-- =============================================
CREATE TABLE IF NOT EXISTS faq_items (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_faq_items_active ON faq_items(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_faq_items_category ON faq_items(category, is_active);

-- =============================================
-- TABLE: churn_feedback
-- =============================================
CREATE TABLE IF NOT EXISTS churn_feedback (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  would_recommend INTEGER,
  plan_at_cancel TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_churn_feedback_tenant ON churn_feedback(tenant_id);
CREATE INDEX IF NOT EXISTS idx_churn_feedback_created ON churn_feedback(created_at DESC);

-- =============================================
-- SEED: FAQ items (10-15 items)
-- =============================================
INSERT OR IGNORE INTO faq_items (id, question, answer, category, sort_order, is_active, created_at, updated_at) VALUES
  ('faq_seed_01', 'Comment creer mon premier agent vocal ?', 'Rendez-vous dans Configuration > Agents, puis cliquez sur "Creer un agent". Suivez l''assistant pour configurer le nom, la voix et les instructions de votre agent.', 'prise_en_main', 1, 1, datetime('now'), datetime('now')),
  ('faq_seed_02', 'Comment connecter mon numero de telephone ?', 'Allez dans Configuration > Canaux > Voix. Vous pouvez utiliser un numero Twilio existant ou en acheter un directement depuis Coccinelle.AI.', 'prise_en_main', 2, 1, datetime('now'), datetime('now')),
  ('faq_seed_03', 'Comment importer mes contacts existants ?', 'Dans CRM > Prospects, cliquez sur "Importer". Vous pouvez importer un fichier CSV ou connecter votre CRM existant (HubSpot, Salesforce).', 'prise_en_main', 3, 1, datetime('now'), datetime('now')),
  ('faq_seed_04', 'Quels canaux de communication sont disponibles ?', 'Coccinelle.AI supporte : Voix (appels telephoniques), SMS, Email, WhatsApp et Chat web. Chaque canal peut etre active independamment.', 'fonctionnalites', 4, 1, datetime('now'), datetime('now')),
  ('faq_seed_05', 'Comment fonctionne la base de connaissances ?', 'La base de connaissances permet a votre agent de repondre avec precision. Importez vos documents (PDF, Word), ajoutez des FAQ, ou connectez votre site web pour un crawl automatique.', 'fonctionnalites', 5, 1, datetime('now'), datetime('now')),
  ('faq_seed_06', 'Comment configurer les rendez-vous automatiques ?', 'Dans Configuration > Rendez-vous, definissez vos disponibilites et types de rendez-vous. L''agent vocal pourra alors proposer et confirmer des creneaux automatiquement.', 'fonctionnalites', 6, 1, datetime('now'), datetime('now')),
  ('faq_seed_07', 'Comment changer mon plan d''abonnement ?', 'Rendez-vous dans Facturation. Vous pouvez upgrader ou downgrader a tout moment. La facturation est ajustee au prorata.', 'facturation', 7, 1, datetime('now'), datetime('now')),
  ('faq_seed_08', 'Comment annuler mon abonnement ?', 'Dans Facturation, cliquez sur "Gerer mon abonnement" pour acceder au portail Stripe. Vous pouvez annuler a tout moment, l''acces reste actif jusqu''a la fin de la periode.', 'facturation', 8, 1, datetime('now'), datetime('now')),
  ('faq_seed_09', 'Comment obtenir une facture ?', 'Toutes vos factures sont disponibles dans Facturation > Factures. Elles sont aussi envoyees automatiquement par email apres chaque paiement.', 'facturation', 9, 1, datetime('now'), datetime('now')),
  ('faq_seed_10', 'Comment ajouter des membres a mon equipe ?', 'Dans Parametres > Equipe, invitez des collaborateurs par email. Vous pouvez definir des roles (admin, agent, manager) et des permissions specifiques.', 'equipe', 10, 1, datetime('now'), datetime('now')),
  ('faq_seed_11', 'Comment consulter les analytics ?', 'Le tableau de bord Analytics affiche les statistiques d''appels, taux de conversion, duree moyenne, et satisfaction client. Exportez les donnees en CSV a tout moment.', 'fonctionnalites', 11, 1, datetime('now'), datetime('now')),
  ('faq_seed_12', 'Mes donnees sont-elles securisees ?', 'Oui. Toutes les donnees sont chiffrees en transit (TLS) et au repos. Nous sommes heberges sur Cloudflare, conforme RGPD. Vos donnees ne sont jamais partagees avec des tiers.', 'securite', 12, 1, datetime('now'), datetime('now')),
  ('faq_seed_13', 'Comment contacter le support ?', 'Depuis cette page, utilisez le formulaire de contact ou creez un ticket. Pour les plans Business, vous disposez d''un support prioritaire avec un manager dedie.', 'support', 13, 1, datetime('now'), datetime('now'));
