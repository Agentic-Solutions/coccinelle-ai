# Configuration des Canaux de Communication

## 📋 Vue d'ensemble

Ce document décrit la configuration complète des 4 canaux de communication disponibles dans Coccinelle.AI SaaS.

## 🏗️ Architecture

| Canal | Modèle | Géré par | Configuration requise |
|-------|--------|----------|----------------------|
| **Téléphone (Voix)** | Centralisé | Coccinelle.AI | Vapi API (env vars) |
| **SMS** | Centralisé | Coccinelle.AI | Twilio (env vars) |
| **Email** | BYOS (Bring Your Own SMTP) | Client | SMTP personnel |
| **WhatsApp** | BYOW (Bring Your Own WhatsApp) | Client | WhatsApp Business API |

---

## 📂 Structure des fichiers

### Pages principales

```
app/dashboard/settings/channels/
├── page.tsx                    # Hub des canaux (vue d'ensemble)
├── sms/page.tsx               # Configuration SMS
├── email/page.tsx             # Configuration Email
└── whatsapp/page.tsx          # Configuration WhatsApp
```

### Composants d'onboarding

```
src/components/onboarding/
├── ChannelSelectionStep.jsx   # Sélection des canaux
└── CompletionStep.jsx         # Initialisation des configs
```

---

## 🔧 Configuration détaillée par canal

### 1. Téléphone (Voix) - Sara

**Modèle:** Centralisé Coccinelle.AI

**Configuration:**
- Géré par l'admin dans le backend
- Credentials Vapi stockés dans variables d'environnement
- Client active/désactive uniquement

**LocalStorage key:** `phone_client_config`

**Structure de données:**
```json
{
  "enabled": true,
  "configured": true
}
```

**Page de configuration:** `/dashboard/settings/sara`

---

### 2. SMS

**Modèle:** Centralisé Coccinelle.AI (un seul numéro Twilio français)

**Configuration:**
- Géré par l'admin dans le backend
- Credentials Twilio stockés dans variables d'environnement
- Client choisit les types de messages et active/désactive

**LocalStorage key:** `sms_client_config`

**Structure de données:**
```json
{
  "enabled": false,
  "configured": false,
  "templates": {
    "rdvConfirmation": true,
    "rdvRappel": true,
    "promotions": false
  }
}
```

**Types de messages:**
- Confirmation de rendez-vous (envoyé immédiatement après prise de RDV)
- Rappel de rendez-vous (envoyé 24h avant)
- Promotions et offres (campagnes marketing)

**Page de configuration:** `/dashboard/settings/channels/sms`

**Fonctionnalités:**
- Toggle Enable/Disable
- Sélection des types de messages
- Bouton "Envoyer un SMS de test"
- Warning si non configuré par l'admin

---

### 3. Email

**Modèle:** BYOS (Bring Your Own SMTP) - Client fournit son serveur SMTP

**Configuration:**
- Géré par le client dans le frontend
- Credentials SMTP sauvegardés côté client (à chiffrer avant envoi au backend)
- Configuration complète du serveur SMTP

**LocalStorage key:** `email_client_config`

**Structure de données:**
```json
{
  "enabled": false,
  "configured": false,
  "smtp": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": true,
    "user": "email@exemple.com",
    "password": "mot-de-passe-app",
    "fromEmail": "contact@entreprise.com",
    "fromName": "Entreprise"
  },
  "templates": {
    "rdvConfirmation": true,
    "rdvRappel": true,
    "newsletter": false,
    "promotions": false
  }
}
```

**Fournisseurs SMTP populaires supportés:**
- Gmail (smtp.gmail.com:587)
- Outlook (smtp-mail.outlook.com:587)
- SendGrid (smtp.sendgrid.net:587)
- Tout autre serveur SMTP standard

**Page de configuration:** `/dashboard/settings/channels/email`

**Fonctionnalités:**
- Configuration SMTP complète (serveur, port, TLS/SSL)
- Email et mot de passe de connexion
- Email et nom de l'expéditeur
- Liens vers guides des fournisseurs populaires
- Toggle Enable/Disable
- Sélection des types d'emails
- Test email avec adresse personnalisée

---

### 4. WhatsApp

**Modèle:** BYOW (Bring Your Own WhatsApp) - Client connecte son compte WhatsApp Business

**Configuration:**
- Géré par le client dans le frontend
- 2 méthodes de connexion disponibles

**LocalStorage key:** `whatsapp_client_config`

**Structure de données:**
```json
{
  "enabled": false,
  "configured": false,
  "connectionMethod": "oauth|manual",
  "whatsappNumber": "+33 6 12 34 56 78",
  "templates": {
    "rdvConfirmation": true,
    "rdvRappel": true,
    "promotions": false,
    "reponseAuto": true
  }
}
```

**Page de configuration:** `/dashboard/settings/channels/whatsapp`

#### Méthode 1 : Connexion OAuth (RECOMMANDÉE)

**Fournisseur:** 360dialog

**Avantages:**
- Configuration en 2 clics
- Pas de manipulation de tokens
- Connexion sécurisée automatique
- Opérationnel en 5 minutes

**Processus:**
1. Clic sur "Connecter mon WhatsApp Business"
2. Redirection vers 360dialog OAuth
3. Autorisation du compte WhatsApp
4. Redirection automatique avec token
5. Configuration terminée

**Implementation:**
```javascript
const handleOAuthConnect = () => {
  const authUrl = `https://hub.360dialog.com/dashboard/app/connect?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${tenantId}`;
  window.location.href = authUrl;
};
```

#### Méthode 2 : Configuration manuelle

**Pour:** Utilisateurs ayant déjà un compte WhatsApp Business API

**Processus:**
1. Créer un compte Meta Business
2. Activer WhatsApp Business API
3. Obtenir le Token API
4. Saisir Token API + Phone Number ID + Numéro WhatsApp dans l'interface

**Documentation fournie:**
- Tutoriel vidéo intégré
- Guide pas-à-pas en 4 étapes
- Liens vers documentation Meta
- Option d'assistance payante (99€)

**Fonctionnalités:**
- Toggle Enable/Disable
- Sélection des types de messages WhatsApp
- Test WhatsApp

---

## 🎯 Flux utilisateur

### Onboarding

1. **Étape "Sélection des canaux"**
   - Utilisateur sélectionne les canaux souhaités (phone, sms, email, whatsapp)
   - Sauvegarde dans `onboarding_channels`

2. **Étapes de configuration par canal**
   - Configuration simplifiée pour chaque canal sélectionné
   - Sauvegarde dans `onboarding_channel_configs`

3. **Étape "Completion"**
   - Initialisation des configs au format standard pour chaque canal
   - Création des entries localStorage :
     - `phone_client_config`
     - `sms_client_config`
     - `email_client_config`
     - `whatsapp_client_config`
   - Message de rappel pour finaliser SMS/Email/WhatsApp dans les paramètres

### Dans le dashboard

1. **Page hub des canaux** : `/dashboard/settings/channels`
   - Vue d'ensemble de tous les canaux
   - Statistiques : Disponibles, Configurés, Actifs
   - Navigation vers configuration de chaque canal
   - Badges "Géré par Coccinelle.AI" vs "Vous gérez"

2. **Configuration individuelle**
   - Chaque canal a sa page dédiée
   - Interface adaptée au modèle (centralisé vs BYOS/BYOW)
   - Options de configuration et test

---

## 🔐 Sécurité

### Credentials management

**SMS & Phone (Centralisé):**
- Credentials stockés dans variables d'environnement backend
- Jamais exposés au frontend
- Client ne voit que enable/disable et options

**Email & WhatsApp (BYOS/BYOW):**
- Credentials saisis par le client dans le frontend
- **TODO:** Chiffrement avant envoi au backend
- **TODO:** Stockage sécurisé dans la base de données (chiffré)
- Validation côté backend avant stockage

### Recommandations

1. **Variables d'environnement requises (backend):**
   ```env
   # Vapi (Phone)
   VAPI_API_KEY=xxx
   VAPI_PHONE_NUMBER=xxx

   # Twilio (SMS)
   TWILIO_ACCOUNT_SID=xxx
   TWILIO_AUTH_TOKEN=xxx
   TWILIO_PHONE_NUMBER=xxx
   ```

2. **Chiffrement des credentials clients:**
   - Utiliser crypto library pour chiffrer avant envoi
   - Stocker clé de chiffrement dans variables d'environnement
   - Ne jamais logger les credentials

3. **Validation:**
   - Valider format des emails/numéros de téléphone
   - Tester la connexion SMTP/WhatsApp avant sauvegarde
   - Rate limiting sur les endpoints sensibles

---

## 📡 APIs à implémenter (Backend)

### 1. POST `/api/channels/sms/send`

Envoyer un SMS via Twilio centralisé

**Request:**
```json
{
  "tenantId": "tenant_123",
  "to": "+33612345678",
  "template": "rdvConfirmation",
  "variables": {
    "clientName": "Jean Dupont",
    "rdvDate": "2025-01-15",
    "rdvTime": "14:00"
  }
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "SM1234567890",
  "status": "sent"
}
```

### 2. POST `/api/channels/email/send`

Envoyer un email via SMTP du client

**Request:**
```json
{
  "tenantId": "tenant_123",
  "to": "client@exemple.com",
  "template": "rdvConfirmation",
  "variables": {
    "clientName": "Jean Dupont",
    "rdvDate": "2025-01-15",
    "rdvTime": "14:00"
  }
}
```

**Process:**
1. Récupérer config SMTP du tenant depuis DB (déchiffrer)
2. Se connecter au serveur SMTP du client
3. Envoyer l'email avec le template
4. Logger l'envoi

**Response:**
```json
{
  "success": true,
  "messageId": "abc123",
  "status": "sent"
}
```

### 3. POST `/api/channels/whatsapp/send`

Envoyer un message WhatsApp via compte du client

**Request:**
```json
{
  "tenantId": "tenant_123",
  "to": "+33612345678",
  "template": "rdvConfirmation",
  "variables": {
    "clientName": "Jean Dupont",
    "rdvDate": "2025-01-15",
    "rdvTime": "14:00"
  }
}
```

**Process:**
1. Récupérer config WhatsApp du tenant depuis DB (déchiffrer token)
2. Appeler WhatsApp Business API avec le token client
3. Envoyer le message
4. Logger l'envoi

**Response:**
```json
{
  "success": true,
  "messageId": "wamid.xxx",
  "status": "sent"
}
```

### 4. POST `/api/channels/test`

Tester un canal de communication

**Request:**
```json
{
  "tenantId": "tenant_123",
  "channel": "sms|email|whatsapp",
  "to": "+33612345678|email@exemple.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test message sent successfully"
}
```

---

## 🗄️ Schéma de base de données (Recommandé)

### Table `channel_configurations`

```sql
CREATE TABLE channel_configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL, -- 'phone', 'sms', 'email', 'whatsapp'
  enabled BOOLEAN DEFAULT FALSE,
  configured BOOLEAN DEFAULT FALSE,

  -- Configuration chiffrée (JSON)
  config_encrypted TEXT,

  -- Templates activés (JSON)
  templates JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, channel_type)
);

-- Index pour performance
CREATE INDEX idx_channel_configs_tenant ON channel_configurations(tenant_id);
CREATE INDEX idx_channel_configs_enabled ON channel_configurations(tenant_id, enabled);
```

### Table `channel_messages_log`

```sql
CREATE TABLE channel_messages_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_type VARCHAR(20) NOT NULL,

  -- Destinataire
  to_address VARCHAR(255) NOT NULL, -- email, phone, etc.

  -- Template et contenu
  template_name VARCHAR(100),
  content TEXT,

  -- Statut
  status VARCHAR(20) NOT NULL, -- 'sent', 'failed', 'pending'
  external_message_id VARCHAR(255), -- ID du fournisseur (Twilio, etc.)
  error_message TEXT,

  -- Metadata
  sent_at TIMESTAMP DEFAULT NOW(),

  -- Index
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performance et analytics
CREATE INDEX idx_messages_log_tenant ON channel_messages_log(tenant_id, sent_at DESC);
CREATE INDEX idx_messages_log_channel ON channel_messages_log(channel_type);
CREATE INDEX idx_messages_log_status ON channel_messages_log(status);
```

---

## ✅ Checklist de déploiement

### Backend

- [ ] Ajouter variables d'environnement (Vapi, Twilio)
- [ ] Créer tables de base de données
- [ ] Implémenter chiffrement des credentials clients
- [ ] Créer API `/api/channels/sms/send`
- [ ] Créer API `/api/channels/email/send`
- [ ] Créer API `/api/channels/whatsapp/send`
- [ ] Créer API `/api/channels/test`
- [ ] Ajouter rate limiting sur les APIs
- [ ] Logs et monitoring

### Frontend

- [x] Page hub des canaux (`/dashboard/settings/channels`)
- [x] Page configuration SMS (`/dashboard/settings/channels/sms`)
- [x] Page configuration Email (`/dashboard/settings/channels/email`)
- [x] Page configuration WhatsApp (`/dashboard/settings/channels/whatsapp`)
- [x] Initialisation des configs dans l'onboarding
- [ ] Connecter les pages aux APIs backend (remplacer localStorage)
- [ ] Implémenter OAuth WhatsApp avec 360dialog
- [ ] Chiffrement côté client avant envoi credentials

### Tests

- [ ] Test envoi SMS via Twilio
- [ ] Test envoi Email via différents SMTP
- [ ] Test OAuth WhatsApp avec 360dialog
- [ ] Test configuration manuelle WhatsApp
- [ ] Test flow complet d'onboarding
- [ ] Test rate limiting et sécurité

---

## 📝 Notes importantes

1. **Séparation des responsabilités:**
   - **Canaux centralisés (Phone, SMS):** Admin configure une fois, tous les clients utilisent
   - **Canaux BYOS/BYOW (Email, WhatsApp):** Chaque client configure son propre compte

2. **Pourquoi cette architecture ?**
   - **SMS:** Twilio ne fournit pas de pool de numéros français → un seul numéro centralisé
   - **Phone:** Service Vapi centralisé pour tous les clients
   - **Email:** Permet aux clients d'utiliser leur propre domaine et réputation email
   - **WhatsApp:** Nécessite compte WhatsApp Business du client pour branding correct

3. **Évolution future possible:**
   - Permettre BYOT (Bring Your Own Twilio) pour SMS en option premium
   - Multi-numéros Twilio si disponible
   - Templates d'emails/SMS personnalisables par le client
   - Analytics détaillés par canal

---

## 🆘 Support

**Questions fréquentes:**

**Q: Pourquoi le client ne peut pas gérer SMS comme Email ?**
R: Twilio ne fournit pas de numéros français en pool. Nous utilisons donc un seul numéro centralisé pour tous les clients.

**Q: Pourquoi WhatsApp nécessite le compte du client ?**
R: Pour que les messages WhatsApp apparaissent avec le nom de l'entreprise du client, pas "Coccinelle.AI".

**Q: Le client voit-il les credentials Twilio/Vapi ?**
R: Non, ces credentials sont stockés en variables d'environnement backend et jamais exposés au frontend.

**Q: Comment sécuriser les credentials Email/WhatsApp du client ?**
R: Ils doivent être chiffrés côté client avant envoi, puis stockés chiffrés en base de données.

---

**Dernière mise à jour:** 2025-01-24
**Version:** 1.0.0
