# Migration Customers - Phase 3 SSOT

## Vue d'ensemble

Cette migration crée une table `customers` unifiée qui consolide les informations clients dispersées dans plusieurs tables :
- `appointments` (customer_name, customer_email, customer_phone)
- `prospects` (first_name, last_name, email, phone)
- `omni_conversations` (customer_name, customer_email, customer_phone)

## Objectifs

1. **Single Source of Truth** : Une seule table pour toutes les informations clients
2. **Déduplication** : Éviter les doublons de clients entre différentes tables
3. **Enrichissement** : Ajouter des métadonnées utiles (préférences, statistiques, etc.)
4. **Migration progressive** : Pas de breaking changes, colonnes existantes conservées

## Architecture

### Table `customers`

```sql
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Informations personnelles
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,

  -- Métadonnées
  status TEXT DEFAULT 'active',
  source TEXT,
  tags TEXT, -- JSON

  -- Préférences
  preferred_contact_method TEXT,
  language TEXT DEFAULT 'fr',
  timezone TEXT DEFAULT 'Europe/Paris',

  -- Statistiques (auto-calculées)
  total_appointments INTEGER DEFAULT 0,
  total_conversations INTEGER DEFAULT 0,
  last_contact_at DATETIME,

  -- Constraints
  UNIQUE(tenant_id, email),
  UNIQUE(tenant_id, phone)
);
```

### Relations ajoutées

- `appointments.customer_id` → `customers.id` (nullable, pour compatibilité)
- `omni_conversations.customer_id` → `customers.id` (nullable, pour compatibilité)

## Exécution de la migration

```bash
# Via wrangler (production)
wrangler d1 execute coccinelle-db --file=database/migrations/0005_create_customers_table.sql

# Via sqlite local (dev)
sqlite3 .wrangler/state/v3/d1/coccinelle-db/db.sqlite < database/migrations/0005_create_customers_table.sql
```

## Vérification post-migration

```sql
-- Compter les customers créés
SELECT COUNT(*) as total_customers FROM customers;

-- Vérifier la répartition par source
SELECT source, COUNT(*) as count
FROM customers
GROUP BY source;

-- Vérifier les liens avec appointments
SELECT
  COUNT(*) as total_appointments,
  COUNT(customer_id) as linked_to_customer
FROM appointments;

-- Vérifier les liens avec conversations
SELECT
  COUNT(*) as total_conversations,
  COUNT(customer_id) as linked_to_customer
FROM omni_conversations;

-- Vérifier les doublons potentiels
SELECT email, COUNT(*) as count
FROM customers
WHERE email IS NOT NULL
GROUP BY tenant_id, email
HAVING count > 1;
```

## Prochaines étapes

### Étape 1 : Modifier le code applicatif

1. **Créer un module customers** (`src/modules/customers/routes.js`)
   - GET /api/v1/customers - Liste des clients
   - GET /api/v1/customers/:id - Détails d'un client
   - POST /api/v1/customers - Créer un client
   - PATCH /api/v1/customers/:id - Mettre à jour un client

2. **Modifier les modules existants** pour utiliser `customer_id`
   - `src/modules/appointments/routes.js` : Utiliser customer_id
   - `src/modules/omnichannel/` : Utiliser customer_id dans les conversations

### Étape 2 : Créer des triggers pour maintenir la cohérence

```sql
-- Trigger : Incrémenter total_appointments
CREATE TRIGGER IF NOT EXISTS trg_appointments_insert
AFTER INSERT ON appointments
WHEN NEW.customer_id IS NOT NULL
BEGIN
  UPDATE customers
  SET total_appointments = total_appointments + 1,
      last_contact_at = MAX(last_contact_at, NEW.appointment_date),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.customer_id;
END;

-- Trigger : Incrémenter total_conversations
CREATE TRIGGER IF NOT EXISTS trg_conversations_insert
AFTER INSERT ON omni_conversations
WHEN NEW.customer_id IS NOT NULL
BEGIN
  UPDATE customers
  SET total_conversations = total_conversations + 1,
      last_contact_at = MAX(last_contact_at, NEW.first_message_at),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.customer_id;
END;
```

### Étape 3 : Migration complète (optionnelle)

Une fois que tout le code utilise `customer_id`, on pourra :
1. Supprimer les colonnes redondantes `customer_name`, `customer_email`, `customer_phone` des tables appointments et omni_conversations
2. Rendre la colonne `customer_id` NOT NULL
3. Ajouter des foreign keys strictes

## Rollback

Si besoin de rollback :

```sql
-- Supprimer les colonnes ajoutées
ALTER TABLE appointments DROP COLUMN customer_id;
ALTER TABLE omni_conversations DROP COLUMN customer_id;

-- Supprimer les index
DROP INDEX IF EXISTS idx_appointments_customer;
DROP INDEX IF EXISTS idx_omni_conversations_customer;
DROP INDEX IF EXISTS idx_customers_tenant;
DROP INDEX IF EXISTS idx_customers_email;
DROP INDEX IF EXISTS idx_customers_phone;
DROP INDEX IF EXISTS idx_customers_status;
DROP INDEX IF EXISTS idx_customers_last_contact;

-- Supprimer la table customers
DROP TABLE IF EXISTS customers;
```

## Notes importantes

- ✅ La migration préserve toutes les données existantes
- ✅ Pas de breaking changes : les colonnes customer_* restent en place
- ✅ Migration progressive : customer_id est nullable
- ⚠️ Les doublons sont gérés par UNIQUE constraints sur (tenant_id, email) et (tenant_id, phone)
- ⚠️ Les statistiques (total_appointments, etc.) seront maintenues par triggers après cette migration
