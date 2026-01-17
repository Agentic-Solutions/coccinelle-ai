# 🔌 Coccinelle - Intégrations CRM & E-commerce

## 📋 Vue d'ensemble

Le système d'intégrations Coccinelle permet aux clients de connecter leurs CRM, plateformes e-commerce et outils marketing pour synchroniser automatiquement leurs données.

---

## 🏗️ Architecture

```
Client Dashboard (Frontend)
    ↓
Backend API (/api/v1/integrations)
    ↓
n8n (Workflows automation)
    ↓
Plateformes externes (HubSpot, Salesforce, etc.)
```

---

## 📦 Composants

### 1. Base de données (6 tables)

| Table | Description |
|-------|-------------|
| `tenant_integrations` | Intégrations configurées par tenant |
| `available_integrations` | Catalogue des intégrations disponibles |
| `integration_field_mappings` | Mapping des champs entre Coccinelle et plateformes |
| `integration_sync_logs` | Historique des synchronisations |
| `integration_sync_queue` | Queue des événements à synchroniser |
| `integration_webhook_logs` | Logs des webhooks entrants |

### 2. Backend API (13 endpoints)

#### Liste et configuration

```bash
GET    /api/v1/integrations                    # Liste intégrations disponibles
GET    /api/v1/integrations/configured         # Intégrations configurées du tenant
GET    /api/v1/integrations/:id                # Détails d'une intégration
POST   /api/v1/integrations                    # Créer intégration
PUT    /api/v1/integrations/:id                # Mettre à jour
DELETE /api/v1/integrations/:id                # Supprimer
```

#### Actions

```bash
POST   /api/v1/integrations/:id/enable         # Activer
POST   /api/v1/integrations/:id/disable        # Désactiver
POST   /api/v1/integrations/:id/sync           # Déclencher sync manuelle
POST   /api/v1/integrations/:id/test           # Tester connexion
GET    /api/v1/integrations/:id/logs           # Récupérer logs
```

#### Webhooks

```bash
POST   /webhooks/integrations/:platform        # Webhook entrant
```

### 3. Frontend (2 pages)

```
/dashboard/integrations            → Liste des intégrations
/dashboard/integrations/new        → Créer une nouvelle intégration
/dashboard/integrations/:id        → Gérer une intégration (à créer)
```

### 4. n8n Workflows (3 workflows créés)

```
n8n-workflows/
├── hubspot-integration.json       → Sync HubSpot
├── salesforce-integration.json    → Sync Salesforce
└── woocommerce-integration.json   → Sync WooCommerce
```

---

## 🚀 Intégrations disponibles

| Plateforme | Type | Auth | Contacts | Deals | Produits | Commandes |
|------------|------|------|----------|-------|----------|-----------|
| **HubSpot** | CRM | OAuth2 | ✅ | ✅ | ❌ | ❌ |
| **Salesforce** | CRM | OAuth2 | ✅ | ✅ | ❌ | ❌ |
| **WooCommerce** | E-commerce | API Key | ✅ | ❌ | ✅ | ✅ |
| **Shopify** | E-commerce | OAuth2 | ✅ | ❌ | ✅ | ✅ |
| **Pipedrive** | CRM | API Key | ✅ | ✅ | ❌ | ❌ |
| **Zendesk** | Support | OAuth2 | ✅ | ❌ | ❌ | ❌ |

---

## 🔧 Configuration client (Guide utilisateur)

### Étape 1 : Accéder aux intégrations

1. Se connecter au Dashboard Coccinelle
2. Aller dans **Paramètres** → **Intégrations**
3. Voir les intégrations disponibles par catégorie

### Étape 2 : Connecter une intégration

#### Option A : OAuth (HubSpot, Salesforce, Shopify)

1. Cliquer sur **"Connecter"** sur la carte de l'intégration
2. Cliquer sur **"Connecter avec [Plateforme]"**
3. Autoriser l'accès sur la page de la plateforme
4. Retour automatique sur Coccinelle

#### Option B : Clé API (WooCommerce, Pipedrive)

1. Cliquer sur **"Connecter"** sur la carte de l'intégration
2. Entrer :
   - **Nom de l'intégration** (ex: "Mon WooCommerce")
   - **Clé API** (depuis votre plateforme)
   - **Secret API** (si applicable)
   - **URL** (pour WooCommerce)
3. Configurer :
   - **Direction de sync** (bidirectionnelle, vers plateforme, depuis plateforme)
   - **Fréquence** (temps réel, horaire, quotidienne)
4. Cliquer sur **"Créer l'intégration"**

### Étape 3 : Tester la connexion

1. Aller dans l'intégration configurée
2. Cliquer sur **"Tester la connexion"**
3. Vérifier le statut (vert = OK, rouge = erreur)

### Étape 4 : Activer la synchronisation

1. Toggle **"Activer"** sur ON
2. Les données commencent à se synchroniser automatiquement

---

## 🔑 Obtenir les clés API

### HubSpot

1. Aller sur [https://app.hubspot.com](https://app.hubspot.com)
2. **Settings** → **Integrations** → **API Key**
3. Générer une nouvelle clé API
4. Copier dans Coccinelle

### Salesforce

1. **Setup** → **Apps** → **App Manager**
2. Créer une **Connected App**
3. Activer **OAuth**
4. Configurer les scopes nécessaires

### WooCommerce

1. **WooCommerce** → **Settings** → **Advanced** → **REST API**
2. Cliquer sur **"Add key"**
3. Permissions : **Read/Write**
4. Copier **Consumer Key** et **Consumer Secret**

### Shopify

1. **Apps** → **Develop apps** → **Create app**
2. Configurer les **Scopes** (read_customers, write_customers, etc.)
3. Installer l'app
4. Copier **API Key** et **API Secret**

---

## 🔄 Flux de synchronisation

### Événements déclencheurs

| Événement Coccinelle | Action dans CRM |
|----------------------|-----------------|
| Prospect créé | Créer contact |
| Prospect mis à jour | Mettre à jour contact |
| Rendez-vous créé | Créer deal/opportunité |
| Appel complété | Logger activité |

### Exemple : Création d'un prospect

```
1. Sara (agent vocal) crée un prospect dans Coccinelle
   ↓
2. Backend Coccinelle envoie webhook à n8n
   POST https://coccinelle-n8n.onrender.com/webhook/coccinelle/hubspot
   {
     "action": "create_contact",
     "data": {
       "first_name": "John",
       "last_name": "Doe",
       "email": "john@example.com",
       "phone": "+33612345678"
     }
   }
   ↓
3. n8n reçoit le webhook et crée le contact dans HubSpot
   ↓
4. HubSpot retourne l'ID du contact créé
   ↓
5. n8n notifie Coccinelle (callback)
   POST https://coccinelle-api.../integrations/{id}/sync-callback
   {
     "success": true,
     "hubspot_id": "12345"
   }
   ↓
6. Coccinelle stocke hubspot_id dans le prospect
```

---

## 🛠️ Configuration n8n

### Importer les workflows

1. Se connecter à n8n : https://coccinelle-n8n.onrender.com
2. **Workflows** → **Import from File**
3. Sélectionner `n8n-workflows/hubspot-integration.json`
4. Répéter pour Salesforce et WooCommerce

### Configurer les credentials

#### HubSpot

1. **Credentials** → **Add Credential** → **HubSpot API**
2. Entrer la clé API HubSpot
3. Tester la connexion

#### Salesforce

1. **Credentials** → **Add Credential** → **Salesforce OAuth2**
2. Configuration OAuth :
   - Client ID
   - Client Secret
   - Authorize URL
3. Autoriser l'accès

#### WooCommerce

1. **Credentials** → **Add Credential** → **WooCommerce API**
2. Entrer :
   - Consumer Key
   - Consumer Secret
   - URL de la boutique

### Activer les workflows

1. Ouvrir chaque workflow
2. Remplacer `HUBSPOT_CREDENTIALS_ID` par l'ID réel du credential
3. **Activer** le workflow (toggle en haut à droite)

---

## 📊 Monitoring et logs

### Dashboard d'intégrations

- **Statut** : Actif / Inactif
- **Dernière sync** : Date et heure
- **Statut de la sync** : Succès / Échec
- **Nombre d'erreurs** : Compteur

### Logs détaillés

```sql
SELECT * FROM integration_sync_logs
WHERE integration_id = 'int_xxx'
ORDER BY created_at DESC
LIMIT 100;
```

Affiche :
- Type de sync
- Statut (success/failed)
- Message d'erreur (si échec)
- Payload envoyé
- Réponse reçue
- Durée d'exécution

---

## 🐛 Troubleshooting

### Erreur : "Intégration non configurée"

**Solution** : Vérifier que la clé API est valide et que les credentials sont corrects

### Erreur : "Sync échouée"

1. Vérifier les logs : `/api/v1/integrations/:id/logs`
2. Tester la connexion : POST `/api/v1/integrations/:id/test`
3. Vérifier les permissions de la clé API

### Webhook n8n ne répond pas

1. Vérifier que n8n est démarré : https://coccinelle-n8n.onrender.com
2. Vérifier que le workflow est **activé**
3. Tester le webhook directement avec curl :

```bash
curl -X POST https://coccinelle-n8n.onrender.com/webhook/coccinelle/hubspot \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Contact dupliqué dans CRM

**Solution** : Configurer le mapping de champs pour utiliser l'email comme identifiant unique

---

## 🔒 Sécurité

### Stockage des credentials

- Clés API stockées dans `config_encrypted` (chiffré)
- OAuth tokens stockés séparément
- Jamais exposés dans les réponses API publiques

### Permissions

- Chaque tenant ne voit que ses propres intégrations
- Authentification requise sur tous les endpoints
- Webhooks validés par signature

---

## 📈 Prochaines étapes

### À développer

- [ ] OAuth flow complet (HubSpot, Salesforce, Shopify)
- [ ] Page de gestion d'intégration individuelle
- [ ] Mapping de champs personnalisé via UI
- [ ] Retry automatique en cas d'échec
- [ ] Notifications par email en cas d'erreur
- [ ] Statistiques de synchronisation avancées

### Intégrations futures

- Mailchimp
- Intercom
- Stripe
- Google Sheets
- Slack
- Microsoft Dynamics

---

## 📞 Support

En cas de problème :

1. Consulter les logs : `/dashboard/integrations/:id`
2. Tester la connexion
3. Vérifier la documentation de la plateforme
4. Contacter support@coccinelle.ai

---

**Date de création** : 29 novembre 2025
**Version** : 1.0.0
**Auteur** : Équipe Coccinelle.AI
