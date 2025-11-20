# Guide d'Intégration CRM Externes

Guide complet pour configurer et synchroniser Coccinelle.AI avec HubSpot, Salesforce et autres CRM.

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture de Synchronisation](#architecture)
3. [HubSpot Integration](#hubspot)
4. [Salesforce Integration](#salesforce)
5. [Configuration UI](#configuration-ui)
6. [API Routes](#api-routes)
7. [Webhooks](#webhooks)
8. [Résolution de Conflits](#conflits)

## 🎯 Vue d'ensemble

Le système CRM de Coccinelle.AI supporte 3 modes :

### 1. **CRM Natif** (par défaut)
- Base de données D1 locale
- Aucune synchronisation externe
- Idéal pour démarrer rapidement

### 2. **Synchronisation Unidirectionnelle**
- Coccinelle → CRM externe (push only)
- Clients créés localement sont poussés vers HubSpot/Salesforce
- Pas de synchronisation inverse

### 3. **Synchronisation Bidirectionnelle**
- Coccinelle ↔ CRM externe (sync complet)
- Changements dans les deux sens
- Webhooks pour temps réel

## 🏗️ Architecture de Synchronisation

```
┌─────────────────────┐
│  Coccinelle.AI DB   │
│   (prospects)       │
└──────────┬──────────┘
           │
           │ CRMSyncService
           │
     ┌─────┴─────┐
     │           │
     v           v
┌─────────┐ ┌────────────┐
│ HubSpot │ │ Salesforce │
└────┬────┘ └──────┬─────┘
     │             │
     │  Webhooks   │
     └─────────────┘
```

### Tables Clés

**crm_integrations** - Configuration
```sql
{
  id: 'crm-hubspot-123',
  tenant_id: 'tenant_demo_001',
  system_type: 'hubspot',
  credentials: '{"accessToken": "..."}', -- JSON chiffré
  is_active: 1,
  last_sync_at: '2025-11-16 10:30:00'
}
```

**crm_sync_mappings** - Mapping ID local ↔ ID externe
```sql
{
  prospect_id: 'cust_123',           -- ID local
  external_id: '51',                 -- HubSpot contact ID
  external_system: 'hubspot',
  sync_status: 'synced',
  last_synced_at: '2025-11-16 10:30:00'
}
```

## 🟠 HubSpot Integration

### Étape 1: Obtenir les Credentials

1. **Créer une Private App dans HubSpot**
   ```
   Settings → Integrations → Private Apps → Create
   ```

2. **Permissions requises:**
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.schemas.contacts.read`

3. **Copier l'Access Token**
   ```
   Format: pat-na1-xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### Étape 2: Configuration dans Coccinelle

```typescript
// Via l'UI: /dashboard/settings/integrations
// Ou via API:

const response = await fetch('/api/crm/integrations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemType: 'hubspot',
    credentials: {
      accessToken: 'pat-na1-xxxxx...',
      portalId: '12345678',
    },
    settings: {
      syncDirection: 'bidirectional', // 'to-external', 'from-external', 'bidirectional'
      autoSync: true,
      syncInterval: 300, // secondes
    },
  }),
});
```

### Étape 3: Synchronisation Initiale

```typescript
// Synchroniser tous les clients existants vers HubSpot
const syncResponse = await fetch('/api/crm/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    systemType: 'hubspot',
    direction: 'to-external',
  }),
});

// Résultat:
// {
//   success: true,
//   synced: 42,
//   created: 5,
//   updated: 37,
//   errors: []
// }
```

### Étape 4: Configurer les Webhooks HubSpot

1. **Dans HubSpot:** Settings → Integrations → Webhooks

2. **Créer un Webhook:**
   ```
   Target URL: https://votre-domaine.com/api/crm/webhooks/hubspot

   Events à sélectionner:
   - Contact created
   - Contact property change
   - Contact deleted
   ```

3. **Tester le Webhook:**
   - HubSpot va envoyer un événement test
   - Vérifier les logs Coccinelle

### Mapping des Champs HubSpot

| Coccinelle | HubSpot Property |
|------------|------------------|
| firstName | firstname |
| lastName | lastname |
| email | email |
| phone | phone |
| segment | lifecycle_stage |
| tags | hs_tag |
| totalOrders | num_associated_deals |
| totalRevenue | total_revenue |

## 🔵 Salesforce Integration

### Étape 1: Authentification OAuth2

Salesforce utilise OAuth2 au lieu d'API Keys.

1. **Créer une Connected App dans Salesforce**
   ```
   Setup → Apps → App Manager → New Connected App
   ```

2. **Configuration OAuth:**
   ```
   Callback URL: https://votre-domaine.com/api/crm/oauth/salesforce/callback

   Selected OAuth Scopes:
   - Full access (full)
   - Perform requests at any time (refresh_token, offline_access)
   ```

3. **Obtenir Consumer Key & Secret**

### Étape 2: Flux OAuth

```typescript
// 1. Rediriger vers Salesforce pour autorisation
const authUrl = `https://login.salesforce.com/services/oauth2/authorize?` +
  `response_type=code&` +
  `client_id=${CONSUMER_KEY}&` +
  `redirect_uri=${CALLBACK_URL}&` +
  `scope=full refresh_token`;

window.location.href = authUrl;

// 2. Salesforce redirige vers votre callback avec un code
// GET /api/crm/oauth/salesforce/callback?code=aPrx...

// 3. Échanger le code contre un access_token
const tokenResponse = await fetch('https://login.salesforce.com/services/oauth2/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    client_id: CONSUMER_KEY,
    client_secret: CONSUMER_SECRET,
    redirect_uri: CALLBACK_URL,
  }),
});

// 4. Sauvegarder les credentials
const { access_token, refresh_token, instance_url } = await tokenResponse.json();
```

### Étape 3: Configurer les Outbound Messages

1. **Dans Salesforce:** Setup → Process Automation → Workflow Rules

2. **Créer un Workflow:**
   ```
   Object: Contact
   Evaluation Criteria: Created or edited
   ```

3. **Ajouter une Outbound Message:**
   ```
   Endpoint URL: https://votre-domaine.com/api/crm/webhooks/salesforce

   Fields to Send:
   - Id
   - FirstName
   - LastName
   - Email
   - Phone
   - etc.
   ```

### Mapping des Champs Salesforce

| Coccinelle | Salesforce Field |
|------------|------------------|
| firstName | FirstName |
| lastName | LastName |
| email | Email |
| phone | Phone |
| address | MailingStreet |
| city | MailingCity |
| postalCode | MailingPostalCode |
| segment | Customer_Segment__c (custom) |
| totalOrders | Total_Orders__c (custom) |
| totalRevenue | Total_Revenue__c (custom) |

## 🎨 Configuration UI

La page `/dashboard/settings/integrations` permet de configurer les intégrations visuellement.

**Fonctionnalités :**
- ✅ Activer/Désactiver une intégration
- 🔐 Entrer les credentials (access token, etc.)
- 🔄 Tester la connexion
- 📊 Voir le statut de synchronisation
- 🚀 Lancer une sync manuelle

**Boutons d'action :**
```typescript
// Bouton "Connexion OAuth" pour HubSpot/Salesforce
<button onClick={() => handleOAuthConnect('hubspot')}>
  Connexion OAuth
</button>

// Bouton "Tester la connexion"
<button onClick={() => handleTestConnection('hubspot')}>
  Tester la connexion
</button>

// Bouton "Synchroniser maintenant"
<button onClick={() => handleSyncNow('hubspot')}>
  Synchroniser maintenant
</button>
```

## 🛣️ API Routes

### GET `/api/crm/integrations`
Liste toutes les intégrations configurées.

**Response:**
```json
{
  "integrations": [
    {
      "id": "crm-native",
      "systemType": "native",
      "name": "CRM Natif Coccinelle",
      "isActive": true,
      "status": "connected",
      "lastSyncAt": "2025-11-16T10:30:00Z"
    },
    {
      "id": "crm-hubspot-123",
      "systemType": "hubspot",
      "name": "HubSpot CRM",
      "isActive": true,
      "status": "connected",
      "lastSyncAt": "2025-11-16T10:25:00Z"
    }
  ]
}
```

### POST `/api/crm/integrations`
Créer/Activer une intégration.

**Request:**
```json
{
  "systemType": "hubspot",
  "credentials": {
    "accessToken": "pat-na1-xxxxx",
    "portalId": "12345"
  },
  "settings": {
    "syncDirection": "bidirectional",
    "autoSync": true
  }
}
```

### POST `/api/crm/sync`
Lancer une synchronisation manuelle.

**Request:**
```json
{
  "systemType": "hubspot",
  "direction": "to-external"  // or "from-external"
}
```

**Response:**
```json
{
  "success": true,
  "result": {
    "synced": 42,
    "created": 5,
    "updated": 37,
    "errors": [],
    "duration": 2.5
  }
}
```

## 🪝 Webhooks

### HubSpot Webhook
**URL:** `POST /api/crm/webhooks/hubspot`

**Payload exemple:**
```json
{
  "subscriptionType": "contact.creation",
  "objectId": 12345,
  "propertyName": "email",
  "propertyValue": "new@email.com",
  "portalId": 62515,
  "occurredAt": 1551808228000
}
```

### Salesforce Webhook
**URL:** `POST /api/crm/webhooks/salesforce`

**Payload exemple (SOAP XML):**
```xml
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/">
  <soapenv:Body>
    <notifications>
      <Notification>
        <sObject>
          <sf:Id>0035...</sf:Id>
          <sf:FirstName>John</sf:FirstName>
          <sf:LastName>Doe</sf:LastName>
          <sf:Email>john@example.com</sf:Email>
        </sObject>
      </Notification>
    </notifications>
  </soapenv:Body>
</soapenv:Envelope>
```

## ⚔️ Résolution de Conflits

Quand un client est modifié dans les deux systèmes simultanément :

### Stratégie 1: Last-Write-Wins (par défaut)
```typescript
if (localCustomer.updatedAt > externalCustomer.updatedAt) {
  // Push local → externe
  await syncToExternal(customerId, 'hubspot');
} else {
  // Pull externe → local
  await syncFromExternal(externalId, 'hubspot');
}
```

### Stratégie 2: Master System
```typescript
// Coccinelle est toujours master
settings: {
  conflictResolution: 'local-master'
}

// HubSpot est master
settings: {
  conflictResolution: 'external-master'
}
```

### Stratégie 3: Manuel
```typescript
// Notifier l'utilisateur et demander de choisir
settings: {
  conflictResolution: 'manual'
}
```

## 🔐 Sécurité

### Chiffrement des Credentials
```typescript
// Les access tokens sont stockés chiffrés
const encryptedCredentials = encrypt(JSON.stringify(credentials), SECRET_KEY);

await db.prepare(`
  INSERT INTO crm_integrations (credentials) VALUES (?)
`).bind(encryptedCredentials).run();
```

### Validation des Webhooks

**HubSpot:** Valider la signature
```typescript
const signature = request.headers.get('X-HubSpot-Signature');
const isValid = validateHubSpotSignature(body, signature, CLIENT_SECRET);
```

**Salesforce:** IP Whitelisting
```
Salesforce IPs connues:
- 13.108.*.*
- 13.110.*.*
```

## 📊 Monitoring

### Logs à surveiller
```typescript
console.log('✅ Sync successful');
console.log('❌ Sync failed');
console.log('⚠️ Conflict detected');
console.log('🔄 Syncing...');
```

### Métriques importantes
- Nombre de syncs réussies/échouées
- Durée moyenne de sync
- Nombre de conflits détectés
- Taux d'erreur par intégration

## 🚀 Déploiement

### Variables d'environnement
```bash
# .env.local
HUBSPOT_CLIENT_SECRET=your-secret
SALESFORCE_CONSUMER_KEY=your-key
SALESFORCE_CONSUMER_SECRET=your-secret
CRM_ENCRYPTION_KEY=your-encryption-key-32-chars
```

### Tester en local
```bash
# 1. Configurer HubSpot test account
# 2. Ngrok pour exposer localhost
ngrok http 3000

# 3. URL webhook HubSpot
https://abc123.ngrok.io/api/crm/webhooks/hubspot
```

## ✅ Checklist de Mise en Production

- [ ] Migration SQL appliquée (migration-crm-integration.sql)
- [ ] Variables d'environnement configurées
- [ ] HubSpot Private App créée
- [ ] Salesforce Connected App créée
- [ ] Webhooks configurés
- [ ] Test de synchronisation manuelle
- [ ] Test de synchronisation auto (webhook)
- [ ] Monitoring en place
- [ ] Documentation utilisateur créée
