# Intégration CRM avec la Base de Données

## 📊 Vue d'ensemble

Le système CRM de Coccinelle.AI s'intègre avec votre base de données Cloudflare D1 existante en étendant la table `prospects` et en ajoutant des tables complémentaires.

## 🗄️ Architecture Base de Données

### Tables Principales

#### 1. **prospects** (étendue pour CRM)
Table centrale qui stocke les clients/prospects.

**Colonnes existantes :**
- `id`, `tenant_id`, `first_name`, `last_name`, `phone`, `email`, `status`, `created_at`

**Nouvelles colonnes CRM :**
```sql
preferred_channel     TEXT    -- Canal de communication préféré
segment              TEXT    -- Segment client (prospect, client, vip)
total_orders         INTEGER -- Nombre total de commandes
total_revenue        REAL    -- Chiffre d'affaires total
currency             TEXT    -- Devise (EUR par défaut)
last_contact_at      TEXT    -- Dernière interaction
last_order_at        TEXT    -- Dernière commande
address              TEXT    -- Adresse complète
city                 TEXT    -- Ville
postal_code          TEXT    -- Code postal
country              TEXT    -- Pays (FR par défaut)
metadata             TEXT    -- JSON pour données additionnelles
```

#### 2. **customer_notes**
Stocke toutes les notes associées aux clients.

```sql
CREATE TABLE customer_notes (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT,              -- Agent ID ou 'system'
  created_at TEXT DEFAULT (datetime('now')),
  metadata TEXT,                 -- JSON
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);
```

#### 3. **customer_activities**
Historique de toutes les interactions avec les clients.

```sql
CREATE TABLE customer_activities (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  type TEXT NOT NULL,            -- message_received, email, call, visit
  channel TEXT,                  -- email, sms, whatsapp, phone, web
  description TEXT,
  metadata TEXT,                 -- JSON avec détails (message ID, etc.)
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);
```

#### 4. **customer_tags**
Tags pour catégoriser les clients.

```sql
CREATE TABLE customer_tags (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (prospect_id) REFERENCES prospects(id) ON DELETE CASCADE
);
```

#### 5. **crm_integrations**
Configuration des intégrations CRM (HubSpot, Salesforce).

```sql
CREATE TABLE crm_integrations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  system_type TEXT NOT NULL,     -- 'native', 'hubspot', 'salesforce'
  is_active INTEGER DEFAULT 1,
  credentials TEXT,              -- JSON chiffré
  settings TEXT,                 -- JSON
  last_sync_at TEXT,
  sync_status TEXT DEFAULT 'idle',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 6. **crm_sync_mappings**
Mapping entre vos clients et les CRM externes.

```sql
CREATE TABLE crm_sync_mappings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  integration_id TEXT NOT NULL,
  prospect_id TEXT NOT NULL,     -- ID local
  external_id TEXT NOT NULL,     -- ID dans HubSpot/Salesforce
  external_system TEXT NOT NULL,
  last_synced_at TEXT,
  sync_status TEXT DEFAULT 'synced',
  metadata TEXT
);
```

### Vue Simplifiée : `v_customers`

Vue qui agrège toutes les données clients :

```sql
CREATE VIEW v_customers AS
SELECT
  p.*,
  (SELECT COUNT(*) FROM customer_notes WHERE prospect_id = p.id) as notes_count,
  (SELECT COUNT(*) FROM customer_activities WHERE prospect_id = p.id) as activities_count,
  (SELECT GROUP_CONCAT(tag, ',') FROM customer_tags WHERE prospect_id = p.id) as tags
FROM prospects p;
```

## 🔌 Intégration avec le Code

### 1. Service Base de Données (`src/services/customer/db.ts`)

Ce service fait le pont entre les modules CRM et D1 :

```typescript
import { getCRMDatabaseService } from '@/services/customer/db';

// Dans une API Route ou Server Action
export async function GET(request: Request, { env }: { env: any }) {
  const db = env.DB; // Cloudflare D1
  const tenantId = 'your-tenant-id';

  const crmDB = getCRMDatabaseService(db, tenantId);

  // Créer un client
  const customer = await crmDB.createCustomer({
    firstName: 'Sophie',
    lastName: 'Martin',
    email: 'sophie@example.com',
    phone: '+33612345678',
    segment: 'prospect',
    tags: ['premier-contact', 'sms'],
  });

  // Rechercher
  const results = await crmDB.searchCustomers('Sophie');

  // Ajouter une note
  await crmDB.addCustomerNote(customer.id, 'Client intéressé par T3 Paris 15e');

  // Logger une interaction
  await crmDB.logInteraction(customer.id, 'message_received', 'sms', {
    messageId: 'msg_123',
    content: 'Bonjour...',
  });
}
```

### 2. Auto-Création de Profils (`src/services/customer/autoCreateService.ts`)

Le service d'auto-création utilise le CRM DB :

```typescript
import { getCRMDatabaseService } from '@/services/customer/db';

export async function handleIncomingMessage(
  db: D1Database,
  tenantId: string,
  from: string,
  content: string,
  channel: 'email' | 'sms' | 'whatsapp' | 'phone'
) {
  const crmDB = getCRMDatabaseService(db, tenantId);

  // Chercher client existant
  let customer = await crmDB.getCustomerByPhone(from);

  if (!customer) {
    // Auto-créer
    customer = await crmDB.createCustomer({
      firstName: extractFirstName(content) || 'Client',
      lastName: extractLastName(content) || 'Inconnu',
      phone: from,
      preferredChannel: channel,
      segment: 'prospect',
      tags: ['auto-created', 'premier-contact', channel],
    });
  }

  // Logger l'interaction
  await crmDB.logInteraction(customer.id, 'message_received', channel, {
    content,
    timestamp: new Date(),
  });

  return customer;
}
```

### 3. Webhooks SMS/WhatsApp

Les webhooks utilisent l'auto-création :

```typescript
// app/api/webhooks/twilio/sms/route.ts
import { getCRMDatabaseService } from '@/services/customer/db';

export async function POST(request: Request, { env }: { env: any }) {
  const formData = await request.formData();
  const from = formData.get('From') as string;
  const body = formData.get('Body') as string;

  const db = env.DB;
  const tenantId = getTenantIdFromNumber(formData.get('To'));

  const customer = await handleIncomingMessage(db, tenantId, from, body, 'sms');

  // Générer réponse IA
  const aiResponse = await generateAIResponse(customer, body, tenantId);

  return new Response(twimlResponse(aiResponse), {
    headers: { 'Content-Type': 'text/xml' },
  });
}
```

## 🚀 Migration et Déploiement

### 1. Appliquer la Migration

```bash
# En local avec Wrangler
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai

# Appliquer la migration sur D1 local
wrangler d1 execute coccinelle-db --local --file=database/migration-crm-integration.sql

# Appliquer en production
wrangler d1 execute coccinelle-db --file=database/migration-crm-integration.sql
```

### 2. Vérifier la Migration

```bash
# Lister les tables
wrangler d1 execute coccinelle-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Vérifier la structure
wrangler d1 execute coccinelle-db --command="PRAGMA table_info(prospects);"
```

## 📈 Flux de Données

```
┌─────────────────┐
│  SMS/WhatsApp   │
│    Webhook      │
└────────┬────────┘
         │
         v
┌─────────────────────────┐
│  autoCreateService      │
│  - Extrait nom          │
│  - Cherche client       │
│  - Crée si nécessaire   │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│  CRMDatabaseService     │
│  - Insert/Update DB     │
│  - Log activités        │
└────────┬────────────────┘
         │
         v
┌─────────────────────────┐
│   Cloudflare D1         │
│   - prospects           │
│   - customer_activities │
│   - customer_notes      │
│   - customer_tags       │
└─────────────────────────┘
```

## 🔄 Synchronisation avec CRM Externes

### HubSpot
```typescript
import { HubSpotCustomers } from '@/modules/integrations/customers/hubspot/customers';

const hubspot = new HubSpotCustomers({
  accessToken: 'your-token',
  portalId: '12345',
});

// Sync local -> HubSpot
const localCustomer = await crmDB.getCustomer('cust_123');
const hubspotContact = await hubspot.createCustomer(localCustomer);

// Sauvegarder le mapping
await db.prepare(`
  INSERT INTO crm_sync_mappings (id, tenant_id, integration_id, prospect_id, external_id, external_system)
  VALUES (?, ?, ?, ?, ?, ?)
`).bind(
  'mapping_123',
  tenantId,
  'integration_hubspot',
  localCustomer.id,
  hubspotContact.id,
  'hubspot'
).run();
```

## 📊 Exemples de Requêtes

### Clients VIP avec plus de 5 commandes
```sql
SELECT * FROM v_customers
WHERE segment = 'vip'
AND total_orders > 5
ORDER BY total_revenue DESC;
```

### Activité du dernier mois
```sql
SELECT
  p.first_name,
  p.last_name,
  COUNT(*) as interactions
FROM customer_activities ca
JOIN prospects p ON ca.prospect_id = p.id
WHERE ca.created_at >= datetime('now', '-30 days')
GROUP BY ca.prospect_id
ORDER BY interactions DESC;
```

### Clients sans contact depuis 30 jours
```sql
SELECT * FROM v_customers
WHERE last_contact_at < datetime('now', '-30 days')
OR last_contact_at IS NULL
ORDER BY created_at DESC;
```

## ✅ Compatibilité

- **Backwards Compatible** : La table `prospects` existante continue de fonctionner
- **Migration Progressive** : Les nouvelles colonnes ont des valeurs par défaut
- **Pas de Perte de Données** : Les données existantes sont préservées
- **CRM Natif Activé** : Tous les tenants existants ont le CRM natif activé par défaut

## 🔐 Sécurité

- **Tenant Isolation** : Toutes les requêtes filtrent par `tenant_id`
- **Credentials Chiffrés** : Les clés API externes sont stockées en JSON chiffré
- **ON DELETE CASCADE** : Les notes/activités sont supprimées avec le client
- **Indexes** : Optimisé pour les recherches fréquentes

## 🎯 Prochaines Étapes

1. **Appliquer la migration SQL** sur votre base D1
2. **Configurer les variables d'environnement** pour HubSpot/Salesforce
3. **Tester l'auto-création** avec un SMS de test
4. **Configurer les webhooks** Twilio/WhatsApp
5. **Activer les synchronisations** CRM externes si nécessaire
