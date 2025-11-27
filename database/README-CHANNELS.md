# Migration: Canaux de Communication

## 📋 Vue d'ensemble

Migration SQL pour Cloudflare D1 (SQLite) ajoutant les tables pour gérer les 4 canaux de communication (Phone, SMS, Email, WhatsApp) et les fonctionnalités des agents IA.

## 🗄️ Tables créées

### 1. **channel_configurations**
Configuration des canaux par tenant (Phone, SMS, Email, WhatsApp).

**Colonnes clés :**
- `tenant_id` : ID du client
- `channel_type` : 'phone', 'sms', 'email', 'whatsapp'
- `enabled` : Canal activé ou non (0/1)
- `configured` : Canal configuré ou non (0/1)
- `config_encrypted` : Credentials chiffrés (SMTP, WhatsApp, etc.)
- `config_public` : Configuration publique (JSON en TEXT)
- `assistant_id` : ID Vapi/Retell (pour phone uniquement)

### 2. **channel_messages_log**
Log de tous les messages envoyés (SMS, Email, WhatsApp).

### 3. **call_logs**
Log de tous les appels vocaux (Vapi/Twilio).

### 4. **rendez_vous**
Gestion des rendez-vous (agent type: appointment).

### 5. **prospects**
Gestion des prospects (agent type: qualification).

### 6. **tickets**
Gestion des tickets de support (agent type: support).

---

## 🚀 Déploiement dans Cloudflare D1

### Prérequis

1. **Wrangler CLI installé** :
   ```bash
   npm install -g wrangler
   ```

2. **Connexion à Cloudflare** :
   ```bash
   wrangler login
   ```

3. **Base de données D1 existante** :
   Vérifier le nom de votre DB dans `wrangler.toml`

### Étape 1 : Lister vos bases D1

```bash
wrangler d1 list
```

Notez le nom de votre base de données (ex: `coccinelle-db`).

### Étape 2 : Exécuter la migration

#### Option A : En local (dev)

```bash
wrangler d1 execute coccinelle-db --local --file=database/migration-channels-communication.sql
```

#### Option B : En production

```bash
wrangler d1 execute coccinelle-db --file=database/migration-channels-communication.sql
```

### Étape 3 : Vérifier la création

```bash
# Lister les tables
wrangler d1 execute coccinelle-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Vérifier une table spécifique
wrangler d1 execute coccinelle-db --command="SELECT * FROM channel_configurations LIMIT 1;"
```

---

## 🔧 Configuration Worker

### Mettre à jour `wrangler.toml`

Ajoutez les bindings D1 si ce n'est pas déjà fait :

```toml
[[d1_databases]]
binding = "DB" # Nom utilisé dans le code Worker
database_name = "coccinelle-db"
database_id = "votre-database-id"
```

### Variables d'environnement

```toml
[vars]
TWILIO_ACCOUNT_SID = "ACxxxxxxxx"
TWILIO_AUTH_TOKEN = "xxxxxxxx"
TWILIO_PHONE_NUMBER = "+33939035761"
VAPI_API_KEY = "xxxxxxxx"
ENCRYPTION_KEY = "votre-cle-32-caracteres"
```

**⚠️ Secrets sensibles :**
```bash
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put VAPI_API_KEY
wrangler secret put ENCRYPTION_KEY
```

---

## 📝 Utilisation dans le Worker

### Exemple : Requêter D1 depuis le Worker

```typescript
// Dans votre Worker Cloudflare

export default {
  async fetch(request, env) {
    const { DB } = env; // Binding D1

    // Récupérer les configs d'un tenant
    const { results } = await DB.prepare(
      'SELECT * FROM channel_configurations WHERE tenant_id = ?'
    ).bind('tenant_demo_001').all();

    return Response.json(results);
  }
};
```

### Exemple : Créer une config Phone

```typescript
import { randomUUID } from 'crypto';

async function createPhoneConfig(db, tenantId, config) {
  const configId = randomUUID();

  await db.prepare(`
    INSERT INTO channel_configurations
    (id, tenant_id, channel_type, enabled, configured, config_public, assistant_id)
    VALUES (?, ?, 'phone', 1, 1, ?, ?)
  `).bind(
    configId,
    tenantId,
    JSON.stringify(config.public),
    config.assistantId
  ).run();

  return configId;
}
```

---

## 🧪 Tester la migration

### Insérer des données de test

```bash
wrangler d1 execute coccinelle-db --command="
INSERT INTO channel_configurations (id, tenant_id, channel_type, enabled, configured, config_public, assistant_id)
VALUES ('cfg_phone_demo', 'tenant_demo_001', 'phone', 1, 1,
  '{\"clientPhoneNumber\": \"+33987654321\", \"sara\": {\"voice\": \"female\"}}',
  'vapi_assistant_demo_123');
"
```

### Requêtes de test

```bash
# Voir toutes les configs
wrangler d1 execute coccinelle-db --command="SELECT * FROM channel_configurations;"

# Compter les RDV par tenant
wrangler d1 execute coccinelle-db --command="
SELECT tenant_id, COUNT(*) as count
FROM rendez_vous
GROUP BY tenant_id;
"

# RDV à venir nécessitant un rappel 24h
wrangler d1 execute coccinelle-db --command="
SELECT * FROM rendez_vous
WHERE rdv_date = date('now', '+1 day')
  AND reminder_24h_sent = 0
  AND status = 'confirmed';
"
```

---

## 🔄 Rollback (si nécessaire)

Si vous devez annuler la migration :

```bash
wrangler d1 execute coccinelle-db --command="
DROP TABLE IF EXISTS channel_configurations;
DROP TABLE IF EXISTS channel_messages_log;
DROP TABLE IF EXISTS call_logs;
DROP TABLE IF EXISTS rendez_vous;
DROP TABLE IF EXISTS prospects;
DROP TABLE IF EXISTS tickets;
"
```

⚠️ **ATTENTION :** Cette commande supprime définitivement toutes les données !

---

## 📊 Différences SQLite vs PostgreSQL

Cette migration utilise SQLite (D1), donc quelques différences par rapport à PostgreSQL :

| PostgreSQL | SQLite (D1) |
|------------|-------------|
| `UUID` | `TEXT` |
| `JSONB` | `TEXT` (stocker JSON en string) |
| `BOOLEAN` | `INTEGER` (0/1) |
| `TIMESTAMP` | `DATETIME` |
| `uuid_generate_v4()` | Générer UUIDs côté app |

---

## 🆘 Troubleshooting

### Erreur : "database does not exist"
```bash
# Lister vos bases D1
wrangler d1 list

# Créer une nouvelle base si nécessaire
wrangler d1 create coccinelle-db
```

### Erreur : "table already exists"
Les tables utilisent `CREATE TABLE IF NOT EXISTS`, donc c'est normal. La migration est idempotente.

### Voir les logs en temps réel
```bash
wrangler tail
```

---

## 📞 Prochaines étapes

1. ✅ **Migration SQL créée**
2. ⏳ **Déployer dans D1** (suivre ce guide)
3. ⏳ **Créer les APIs Worker** (`/api/channels/*`)
4. ⏳ **Intégrer Vapi** (webhooks + function calling)
5. ⏳ **Connecter le frontend Next.js**

---

## 📚 Ressources

- [Cloudflare D1 Docs](https://developers.cloudflare.com/d1/)
- [Wrangler D1 Commands](https://developers.cloudflare.com/workers/wrangler/commands/#d1)
- [SQLite Syntax](https://www.sqlite.org/lang.html)
