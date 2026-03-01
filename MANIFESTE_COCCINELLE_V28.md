# 🐞 Coccinelle.ai - Manifeste de Session V28

**Date**: 23 janvier 2026  
**Session**: Configuration WhatsApp via Meta Cloud API

---

## ✅ Réalisations de cette session

### 1. WhatsApp Multi-tenant (Code Twilio) - COMPLET ✅

| Tâche | Status |
|-------|--------|
| Nouveau fichier `whatsapp.js` avec routage multi-tenant | ✅ |
| Correction `channel` → `channel_type` | ✅ |
| Mapping créé (+33939035760 → test7) | ✅ |
| Déployé sur Cloudflare Workers | ✅ |

**Problème découvert** : Les numéros Twilio (+33939035760, +33939035761) ne sont PAS WhatsApp-enabled. Ils sont uniquement voix/SMS.

### 2. Décision Architecture WhatsApp - PRISE ✅

| Option | Coût | Décision |
|--------|------|----------|
| Twilio WhatsApp | Usage + config | ❌ Pas de numéro WA |
| 360dialog Partner | 500€/mois | ❌ Trop cher pour MVP |
| **Meta Cloud API** | Gratuit (juste conversations) | ✅ **CHOISI** |

### 3. Meta Cloud API - EN COURS ⏳

| Étape | Status |
|-------|--------|
| App Meta "coccinelle.ai" existe | ✅ |
| Configurer WhatsApp dans l'app | ⏳ En cours |
| Configurer webhook | ⏳ À faire |
| Modifier code backend | ⏳ À faire |
| Tester | ⏳ À faire |

---

## 📊 Architecture WhatsApp Meta Cloud API

```
┌─────────────────────────────────────────────────────────────────┐
│  Client final envoie WhatsApp au numéro du tenant               │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Meta Cloud API                                           │   │
│  │ Webhook → https://coccinelle-api.../webhooks/meta/wa     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Coccinelle Worker                                        │   │
│  │ 1. Identifie tenant via Phone Number ID                  │   │
│  │ 2. Sara répond via Meta API                              │   │
│  │ 3. Stocke dans omni_conversations                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 État global des canaux (23 janvier 2026)

| Canal | Envoi | Réception | Status |
|-------|-------|-----------|--------|
| **Email** | ✅ Resend | ⏳ DNS Cloudflare en propagation | 🟡 90% |
| **SMS** | ✅ Twilio | ✅ Webhook | ✅ Prêt |
| **WhatsApp** | ⏳ Meta Cloud API | ⏳ À configurer | 🟡 En cours |
| **Téléphone** | ⚠️ Bug Retell | ✅ Webhook | 🔴 À diagnostiquer |

---

## 📝 TODO WhatsApp (Futur)

| Priorité | Option | Coût | Quand |
|----------|--------|------|-------|
| 🔜 | Meta Cloud API Embedded Signup | Gratuit | Quand MVP validé |
| 💰 | 360dialog Partner | 500€/mois | Si besoin solution clé-en-main |

---

## 🗂️ Fichiers modifiés cette session

### Backend
```
src/modules/omnichannel/webhooks/whatsapp.js  # ✏️ Nouveau code multi-tenant
```

### Base de données
```sql
-- Mapping créé
INSERT INTO omni_phone_mappings (phone_number, tenant_id, channel_type, is_active) 
VALUES ('+33939035760', 'tenant_dGVzdDdAdGVzdC5jb20', 'whatsapp', 1);
```

---

## 🔧 Configuration

### Chemins
- **Backend** : `/Users/amrouche.7/match-immo-mcp/coccinelle-ai/`
- **Frontend** : `/Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas/`

### Ports (Développement)
- Backend Wrangler : **8787**
- Frontend Next.js : **3000**

### Comptes de test
| Environnement | Email | Password |
|---------------|-------|----------|
| Local | `admin@coccinelle-test.com` | `CoccinelleTest123` |
| Production | `admin@coccinelle-prod.com` | `CoccinelleProd123` |

### Meta App
| Attribut | Valeur |
|----------|--------|
| Nom | coccinelle.ai |
| ID | 25451229527845708 |
| Mode | En développement |
| Entreprise | Agentic solutions |

### Tenants avec slug
| Tenant | Slug | ID |
|--------|------|-----|
| Test7 | test7 | tenant_dGVzdDdAdGVzdC5jb20 |
| test13 | test13 | tenant_dGVzdDEzQHRlc3QxMy5jb20 |

---

## 🚀 Prochaines étapes

### Priorité 1 : Configurer WhatsApp dans Meta App
1. Ouvrir l'app "coccinelle.ai" sur developers.facebook.com
2. Ajouter le produit "WhatsApp" si pas déjà fait
3. Configurer un numéro de test (Meta fournit un numéro sandbox gratuit)
4. Récupérer les credentials :
   - Phone Number ID
   - WhatsApp Business Account ID
   - Access Token (permanent)

### Priorité 2 : Configurer le webhook Meta
1. Dans Meta App → WhatsApp → Configuration
2. URL webhook : `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/meta/whatsapp`
3. Verify token : à définir
4. S'abonner aux événements `messages`

### Priorité 3 : Créer le handler webhook Meta
1. Créer `/src/modules/omnichannel/webhooks/meta-whatsapp.js`
2. Gérer la vérification webhook (GET)
3. Gérer les messages entrants (POST)
4. Envoyer les réponses via Meta API

### Priorité 4 : Vérifier DNS Email
```bash
dig coccinelle.ai NS +short
```
Attendu : `clara.ns.cloudflare.com` et `kip.ns.cloudflare.com`

---

## 📋 Message pour nouvelle conversation

```
Je continue le développement de Coccinelle.ai.

**Session précédente (23 janvier 2026)** :
✅ Code WhatsApp multi-tenant créé et déployé (whatsapp.js)
✅ Mapping créé : +33939035760 → tenant test7
⚠️ Découvert : Numéros Twilio pas WhatsApp-enabled
✅ Décision : Utiliser Meta Cloud API (gratuit) au lieu de Twilio/360dialog
✅ App Meta "coccinelle.ai" existe déjà (ID: 25451229527845708)
⏳ En cours : Configuration WhatsApp dans l'app Meta

**Dernière action** :
J'ai ouvert l'app "coccinelle.ai" sur developers.facebook.com
→ Prochaine étape : Ajouter/configurer WhatsApp dans cette app

**Prochaines étapes** :
1. Dans l'app Meta → Ajouter le produit "WhatsApp" (si pas déjà fait)
2. Configurer numéro de test sandbox
3. Récupérer credentials (Phone Number ID, Access Token)
4. Configurer webhook vers Coccinelle
5. Créer le handler `/webhooks/meta/whatsapp` dans le backend

**TODO noté (futur)** :
- Meta Cloud API Embedded Signup (pour onboarding clients)
- 360dialog Partner (500€/mois) - alternative

**Chemins** :
- Backend : /Users/amrouche.7/match-immo-mcp/coccinelle-ai/
- Frontend : /Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas/
- Manifeste : MANIFESTE_COCCINELLE_V28.md

**Comptes** :
- Local : admin@coccinelle-test.com / CoccinelleTest123
- Prod : admin@coccinelle-prod.com / CoccinelleProd123
```

---

*Généré le 23 janvier 2026* 🐞
