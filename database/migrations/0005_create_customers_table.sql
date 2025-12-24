/**
 * Migration 0005: Create Customers Table
 *
 * Phase 3 of SSOT refactoring: Create unified customers table
 *
 * Cette migration crée une table customers unifiée qui consolide
 * les informations clients dispersées dans appointments, prospects
 * et omni_conversations.
 *
 * IMPORTANT: Cette migration ne supprime pas les colonnes existantes
 * dans les autres tables pour éviter les breaking changes.
 * Les colonnes customer_* dans appointments et omni_conversations
 * seront progressivement migrées vers des foreign keys.
 */

-- ================================================================
-- ÉTAPE 1 : Créer la table customers
-- ================================================================

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Informations personnelles
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,

  -- Métadonnées
  status TEXT DEFAULT 'active', -- 'active', 'inactive', 'lead', 'prospect', 'customer'
  source TEXT, -- 'phone', 'email', 'sms', 'whatsapp', 'website', 'referral', etc.
  tags TEXT, -- JSON array: ["vip", "urgent", etc.]

  -- Préférences
  preferred_contact_method TEXT, -- 'phone', 'email', 'sms', 'whatsapp'
  language TEXT DEFAULT 'fr',
  timezone TEXT DEFAULT 'Europe/Paris',

  -- Statistiques
  total_appointments INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  last_contact_at DATETIME,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Foreign Keys
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,

  -- Constraints
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, phone)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_last_contact ON customers(last_contact_at);

-- ================================================================
-- ÉTAPE 2 : Migrer les données depuis prospects
-- ================================================================

-- Insérer les prospects existants dans customers
INSERT OR IGNORE INTO customers (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  status,
  source,
  created_at,
  updated_at
)
SELECT
  'cust_' || substr(id, 6), -- Convertir prospect_xxx en cust_xxx
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  CASE
    WHEN status = 'new' THEN 'lead'
    WHEN status = 'contacted' THEN 'prospect'
    WHEN status = 'qualified' THEN 'prospect'
    ELSE 'active'
  END,
  source,
  created_at,
  updated_at
FROM prospects
WHERE email IS NOT NULL OR phone IS NOT NULL;

-- ================================================================
-- ÉTAPE 3 : Migrer les données depuis omni_conversations
-- ================================================================

-- Insérer les clients des conversations qui n'existent pas déjà
INSERT OR IGNORE INTO customers (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  status,
  source,
  last_contact_at,
  total_conversations,
  created_at,
  updated_at
)
SELECT
  'cust_' || lower(hex(randomblob(8))),
  tenant_id,
  -- Extraire prénom/nom si customer_name contient un espace
  CASE
    WHEN customer_name LIKE '% %' THEN substr(customer_name, 1, instr(customer_name, ' ') - 1)
    ELSE customer_name
  END as first_name,
  CASE
    WHEN customer_name LIKE '% %' THEN substr(customer_name, instr(customer_name, ' ') + 1)
    ELSE NULL
  END as last_name,
  customer_email,
  customer_phone,
  'customer',
  current_channel,
  last_message_at,
  1,
  first_message_at,
  updated_at
FROM omni_conversations
WHERE (customer_email IS NOT NULL OR customer_phone IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM customers c
    WHERE c.tenant_id = omni_conversations.tenant_id
      AND (c.email = omni_conversations.customer_email OR c.phone = omni_conversations.customer_phone)
  );

-- ================================================================
-- ÉTAPE 4 : Migrer les données depuis appointments
-- ================================================================

-- Insérer les clients des rendez-vous qui n'existent pas déjà
INSERT OR IGNORE INTO customers (
  id,
  tenant_id,
  first_name,
  last_name,
  email,
  phone,
  status,
  source,
  total_appointments,
  last_contact_at,
  created_at,
  updated_at
)
SELECT
  'cust_' || lower(hex(randomblob(8))),
  tenant_id,
  -- Extraire prénom/nom si customer_name contient un espace
  CASE
    WHEN customer_name LIKE '% %' THEN substr(customer_name, 1, instr(customer_name, ' ') - 1)
    ELSE customer_name
  END as first_name,
  CASE
    WHEN customer_name LIKE '% %' THEN substr(customer_name, instr(customer_name, ' ') + 1)
    ELSE NULL
  END as last_name,
  customer_email,
  customer_phone,
  'customer',
  'appointment',
  1,
  appointment_date,
  created_at,
  updated_at
FROM appointments
WHERE (customer_email IS NOT NULL OR customer_phone IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM customers c
    WHERE c.tenant_id = appointments.tenant_id
      AND (c.email = appointments.customer_email OR c.phone = appointments.customer_phone)
  );

-- ================================================================
-- ÉTAPE 5 : Mettre à jour les statistiques
-- ================================================================

-- Mettre à jour le nombre de conversations pour chaque client
UPDATE customers
SET total_conversations = (
  SELECT COUNT(*)
  FROM omni_conversations
  WHERE omni_conversations.tenant_id = customers.tenant_id
    AND (omni_conversations.customer_email = customers.email
         OR omni_conversations.customer_phone = customers.phone)
);

-- Mettre à jour le nombre de rendez-vous pour chaque client
UPDATE customers
SET total_appointments = (
  SELECT COUNT(*)
  FROM appointments
  WHERE appointments.tenant_id = customers.tenant_id
    AND (appointments.customer_email = customers.email
         OR appointments.customer_phone = customers.phone)
);

-- Mettre à jour la date du dernier contact
UPDATE customers
SET last_contact_at = (
  SELECT MAX(last_contact)
  FROM (
    SELECT MAX(last_message_at) as last_contact
    FROM omni_conversations
    WHERE omni_conversations.tenant_id = customers.tenant_id
      AND (omni_conversations.customer_email = customers.email
           OR omni_conversations.customer_phone = customers.phone)
    UNION ALL
    SELECT MAX(appointment_date) as last_contact
    FROM appointments
    WHERE appointments.tenant_id = customers.tenant_id
      AND (appointments.customer_email = customers.email
           OR appointments.customer_phone = customers.phone)
  )
);

-- ================================================================
-- ÉTAPE 6 : Ajouter la colonne customer_id aux tables existantes
-- ================================================================

-- Ajouter customer_id à appointments (nullable pour compatibilité)
ALTER TABLE appointments ADD COLUMN customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);

-- Ajouter customer_id à omni_conversations (nullable pour compatibilité)
ALTER TABLE omni_conversations ADD COLUMN customer_id TEXT;
CREATE INDEX IF NOT EXISTS idx_omni_conversations_customer ON omni_conversations(customer_id);

-- ================================================================
-- ÉTAPE 7 : Relier les enregistrements existants aux customers
-- ================================================================

-- Lier les appointments aux customers
UPDATE appointments
SET customer_id = (
  SELECT c.id
  FROM customers c
  WHERE c.tenant_id = appointments.tenant_id
    AND (c.email = appointments.customer_email OR c.phone = appointments.customer_phone)
  LIMIT 1
)
WHERE customer_email IS NOT NULL OR customer_phone IS NOT NULL;

-- Lier les conversations aux customers
UPDATE omni_conversations
SET customer_id = (
  SELECT c.id
  FROM customers c
  WHERE c.tenant_id = omni_conversations.tenant_id
    AND (c.email = omni_conversations.customer_email OR c.phone = omni_conversations.customer_phone)
  LIMIT 1
)
WHERE customer_email IS NOT NULL OR customer_phone IS NOT NULL;

-- ================================================================
-- FIN DE LA MIGRATION
-- ================================================================

/**
 * NOTES POUR LES PROCHAINES ÉTAPES :
 *
 * 1. Après vérification que la migration fonctionne bien, on pourra :
 *    - Modifier le code pour utiliser customer_id au lieu de customer_name/email/phone
 *    - Créer des triggers pour maintenir la cohérence
 *    - Éventuellement supprimer les colonnes customer_* redondantes
 *
 * 2. Triggers recommandés à créer :
 *    - Trigger pour incrémenter total_appointments quand un appointment est créé
 *    - Trigger pour incrémenter total_conversations quand une conversation est créée
 *    - Trigger pour mettre à jour last_contact_at automatiquement
 *
 * 3. Cette approche permet une migration progressive sans breaking changes
 */
