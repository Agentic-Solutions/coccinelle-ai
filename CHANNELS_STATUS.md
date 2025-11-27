# 🚀 Canaux de Communication - Status du Projet

**Date :** 25 janvier 2025
**Version :** 1.0.0

---

## 📊 Vue d'ensemble

Implémentation des 4 canaux de communication (Phone, SMS, Email, WhatsApp) pour Coccinelle.AI SaaS avec agents IA (Sara).

### Architecture

| Canal | Modèle | Géré par | Status |
|-------|--------|----------|--------|
| **Phone (Voix)** | Centralisé Vapi | Admin | 🟡 Frontend OK, Backend à faire |
| **SMS** | Centralisé Twilio | Admin | 🟡 Frontend OK, Backend à faire |
| **Email** | BYOS | Client | 🟡 Frontend OK, Backend à faire |
| **WhatsApp** | BYOW | Client | 🟡 Frontend OK, Backend à faire |

---

## ✅ Ce qui est TERMINÉ

### 1. Frontend Next.js (100%)

✅ **Pages de configuration** (`coccinelle-saas/app/dashboard/settings/channels/`)
- `page.tsx` - Hub des canaux avec stats
- `phone/page.tsx` - Config canal voix + Sara
- `sms/page.tsx` - Config SMS + templates
- `email/page.tsx` - Config Email SMTP
- `whatsapp/page.tsx` - Config WhatsApp (OAuth + Manuel)

✅ **Features implémentées**
- Toggle Enable/Disable pour chaque canal
- Configuration complète avec validation
- Guides opérateurs pour transfert d'appel (Phone)
- Guides SMTP pour Email (Gmail, Outlook, SendGrid)
- OAuth 360dialog pour WhatsApp
- Tests de canaux (boutons de test)
- Messages d'erreur et de succès
- Responsive design

✅ **Intégration onboarding**
- `src/components/onboarding/CompletionStep.jsx` initialisé
- Création automatique des configs localStorage

### 2. Base de données D1 (100%)

✅ **Migration SQL** (`database/migration-channels-communication.sql`)
- 6 tables créées et déployées en LOCAL
- Adaptée pour Cloudflare D1 (SQLite)
- Triggers et index optimisés

✅ **Tables créées**
1. `channel_configurations` - Config des 4 canaux par tenant
2. `channel_messages_log` - Log de tous les messages
3. `call_logs` - Log des appels vocaux (Vapi/Twilio)
4. `rendez_vous` - Gestion des RDV (agent appointment)
5. `qualified_prospects` - Prospects immobilier qualifiés (agent qualification)
6. `tickets` - Support client (agent support)

✅ **Documentation**
- `database/README-CHANNELS.md` - Guide déploiement D1
- `.env.example` - Variables d'environnement complètes
- `CANAUX_COMMUNICATION.md` - Architecture détaillée

---

## ⏳ Ce qui reste à FAIRE

### 1. Backend APIs (0% - PRIORITAIRE)

⏳ **APIs Worker à créer**

**Config endpoints**
- `POST /api/channels/phone/config` - Sauvegarder config Phone
- `GET /api/channels/:type/config` - Récupérer config d'un canal
- `PUT /api/channels/:type/config` - Mettre à jour config
- `POST /api/channels/:type/toggle` - Activer/Désactiver un canal

**Messaging endpoints**
- `POST /api/channels/sms/send` - Envoyer SMS via Twilio
- `POST /api/channels/email/send` - Envoyer Email via SMTP client
- `POST /api/channels/whatsapp/send` - Envoyer WhatsApp
- `POST /api/channels/test` - Tester un canal

**Webhooks**
- `POST /webhooks/twilio/voice` - Réception appels Twilio → Vapi
- `POST /webhooks/twilio/sms` - Réception SMS (si besoin)
- `POST /webhooks/whatsapp` - Réception messages WhatsApp

### 2. Intégration Vapi (0% - COMPLEXE)

⏳ **À implémenter**

**Provisioning**
- Créer un assistant Vapi par tenant
- Lier Knowledge Base Pinecone par tenant
- Stocker `assistant_id` dans `channel_configurations`

**Webhook Twilio → Vapi**
```
Appel entrant → Twilio
  ↓
Webhook /webhooks/twilio/voice
  ↓
Identifier tenant (ForwardedFrom)
  ↓
Récupérer assistant_id du tenant
  ↓
Transférer à Vapi avec assistant_id
```

**Function Calling**
Créer endpoint `/api/vapi/functions` pour :
- `check_availability` - Vérifier créneaux dispo
- `book_appointment` - Réserver RDV
- `qualify_prospect` - Qualifier prospect immobilier
- `create_ticket` - Créer ticket support

### 3. Chiffrement (0% - SÉCURITÉ)

⏳ **Credentials clients à chiffrer**
- Credentials SMTP (Email)
- Tokens WhatsApp Business API
- Stocker dans `channel_configurations.config_encrypted`

**Lib recommandée**
```typescript
import { subtle } from 'crypto';
// AES-256-GCM avec clé dans env.ENCRYPTION_KEY
```

### 4. Déploiement Production (0%)

⏳ **Actions nécessaires**

**Base de données**
```bash
# Déployer migration en PRODUCTION (pas fait)
wrangler d1 execute coccinelle-db --remote --file=database/migration-channels-communication.sql
```

**Variables d'environnement**
```bash
# Ajouter secrets Cloudflare
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put VAPI_API_KEY
wrangler secret put ENCRYPTION_KEY
```

**Worker**
- Mettre à jour `wrangler.toml` avec bindings D1
- Déployer Worker avec nouvelles routes

### 5. Tests (0%)

⏳ **À tester**
- Envoi SMS via Twilio centralisé
- Envoi Email via SMTP client (Gmail, Outlook, SendGrid)
- OAuth WhatsApp 360dialog
- Configuration manuelle WhatsApp
- Appels vocaux via Vapi + Twilio
- Function calling (RDV, Prospects, Tickets)
- Rappels automatiques 24h/1h avant RDV

---

## 🗺️ Roadmap

### Phase 1 : Backend APIs (EN COURS)
**Durée estimée :** 2-3 jours
- Créer les endpoints de configuration
- Implémenter envoi SMS (Twilio)
- Implémenter envoi Email (SMTP)
- Implémenter envoi WhatsApp
- Tests unitaires

### Phase 2 : Intégration Vapi
**Durée estimée :** 3-4 jours
- Setup webhook Twilio → Vapi
- Provisioning assistant par tenant
- Function calling (check_availability, book_appointment)
- Tests appels vocaux
- Gestion erreurs et fallbacks

### Phase 3 : Sécurité & Production
**Durée estimée :** 1-2 jours
- Chiffrement credentials clients
- Rate limiting sur les APIs
- Déploiement migration D1 en prod
- Variables d'environnement production
- Logs et monitoring

### Phase 4 : Tests & Optimisations
**Durée estimée :** 2-3 jours
- Tests end-to-end tous canaux
- Tests de charge
- Optimisations performances
- Documentation finale

---

## 🔧 Configuration requise

### Variables d'environnement (dans Worker)

**OBLIGATOIRES**
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx # secret
TWILIO_PHONE_NUMBER=+33939035761
VAPI_API_KEY=xxxxxxxx # secret
ENCRYPTION_KEY=32-caracteres-random # secret
```

**OPTIONNELLES**
```bash
PINECONE_API_KEY=xxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxx
WHATSAPP_360DIALOG_CLIENT_ID=xxxxxxxx
WHATSAPP_360DIALOG_CLIENT_SECRET=xxxxxxxx
```

### Wrangler.toml

```toml
[[d1_databases]]
binding = "DB"
database_name = "coccinelle-db"
database_id = "f4d7ff42-fc12-4c16-9c19-ada63c023827"

[vars]
TWILIO_PHONE_NUMBER = "+33939035761"
```

---

## 📂 Structure des fichiers

```
coccinelle-ai/
├── coccinelle-saas/               # Frontend Next.js
│   ├── app/dashboard/settings/channels/
│   │   ├── page.tsx               ✅ Hub canaux
│   │   ├── phone/page.tsx         ✅ Config Phone
│   │   ├── sms/page.tsx           ✅ Config SMS
│   │   ├── email/page.tsx         ✅ Config Email
│   │   └── whatsapp/page.tsx      ✅ Config WhatsApp
│   ├── .env.example               ✅ Variables exemple
│   └── src/components/onboarding/
│       └── CompletionStep.jsx     ✅ Init configs
│
├── database/                      # Base de données
│   ├── migration-channels-communication.sql  ✅ Migration D1
│   └── README-CHANNELS.md         ✅ Guide déploiement
│
├── src/                           # Worker Cloudflare (À FAIRE)
│   ├── index.ts                   ⏳ Routes principales
│   ├── routes/
│   │   ├── channels.ts            ⏳ APIs canaux
│   │   └── webhooks.ts            ⏳ Webhooks Twilio/WhatsApp
│   ├── services/
│   │   ├── twilio.ts              ⏳ Service Twilio
│   │   ├── vapi.ts                ⏳ Service Vapi
│   │   ├── smtp.ts                ⏳ Service SMTP
│   │   └── whatsapp.ts            ⏳ Service WhatsApp
│   └── utils/
│       └── encryption.ts          ⏳ Chiffrement
│
├── CANAUX_COMMUNICATION.md        ✅ Architecture complète
└── CHANNELS_STATUS.md             ✅ Ce fichier
```

---

## 🆘 Points d'attention

### 1. Table prospects renommée
⚠️ La table `prospects` existait déjà (CRM générique). Notre table s'appelle `qualified_prospects` pour éviter les conflits.

### 2. Numéro Twilio partagé
⚠️ Un seul numéro Twilio (+33 9 39 03 57 61) pour tous les clients. Identification via `ForwardedFrom` dans le webhook.

### 3. OAuth WhatsApp
⚠️ L'OAuth 360dialog nécessite un compte partenaire 360dialog et configuration de redirect URL.

### 4. Migration D1 locale uniquement
⚠️ La migration est déployée en LOCAL (.wrangler/state). Penser à déployer en PROD avec `--remote`.

---

## 📞 Prochaines actions IMMÉDIATES

1. ✅ **Créer ce document** ← FAIT
2. ⏳ **Créer les APIs backend** ← EN COURS
3. ⏳ **Tester SMS avec Twilio**
4. ⏳ **Intégrer webhook Twilio → Vapi**
5. ⏳ **Déployer en production**

---

## 📝 Notes

- Le frontend utilise actuellement `localStorage` pour stocker les configs (mode démo)
- Les APIs backend vont remplacer `localStorage` par des appels à D1 via le Worker
- Les credentials sensibles (SMTP, WhatsApp) doivent être chiffrés avant stockage en DB
- Le système est conçu pour être scalable et multi-tenant

---

**Dernière mise à jour :** 25 janvier 2025
**Responsable :** Équipe Coccinelle.AI
