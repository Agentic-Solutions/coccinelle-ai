# 🐞 Coccinelle.ai - Manifeste de Session V29

**Date**: 23 janvier 2026  
**Session**: WhatsApp Meta Cloud API + Email Routing Cloudflare

---

## ✅ Réalisations de cette session

### 1. WhatsApp Meta Cloud API - 90% ✅

| Tâche | Status |
|-------|--------|
| Handler webhook créé (`meta-whatsapp.js`) | ✅ |
| Route `/webhooks/meta/whatsapp` ajoutée | ✅ |
| Déployé sur Cloudflare Workers | ✅ |
| Webhook vérifié par Meta | ✅ |
| Abonné aux événements "messages" | ✅ |
| Vérification entreprise Meta | ⏳ En cours (~2 jours) |

**Blocage** : Le compte WhatsApp Business est "locked" en attendant la vérification de l'entreprise "Agentic Solutions" par Meta.

### 2. Email Routing Cloudflare - 90% ✅

| Tâche | Status |
|-------|--------|
| DNS coccinelle.ai transféré vers Cloudflare | ✅ |
| Enregistrements MX Cloudflare configurés | ✅ |
| Enregistrements SPF configurés | ✅ |
| Email Routing activé | ✅ |
| Règle `test@coccinelle.ai` créée | ✅ |
| Test forwarding vers Outlook | ❌ Bloqué par Outlook |
| Test forwarding vers Gmail | ⏳ En cours |

**Blocage** : Microsoft Outlook bloque les emails forwardés par Cloudflare. Test avec Gmail en cours.

---

## 🔑 Credentials WhatsApp Meta

### Numéro de TEST (sandbox)
| Information | Valeur |
|-------------|--------|
| Numéro | +1 555 144 1226 |
| Phone Number ID | `883453898184903` |
| WABA ID | `1366785598272425` |

### Numéro de PRODUCTION
| Information | Valeur |
|-------------|--------|
| Numéro | +33 9 39 03 57 60 |
| Phone Number ID | `917756968084685` |
| WABA ID | `3443641465776367` |

### Configuration webhook
| Information | Valeur |
|-------------|--------|
| URL | `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/meta/whatsapp` |
| Verify Token | `coccinelle_meta_verify_2026` |
| Événements | `messages` |

### Meta App
| Attribut | Valeur |
|----------|--------|
| Nom | coccinelle.ai |
| ID | 25451229527845708 |
| Business ID | 2345023065947916 |

---

## 📊 État global des canaux (23 janvier 2026)

| Canal | Envoi | Réception | Status |
|-------|-------|-----------|--------|
| **Email** | ✅ Resend | ✅ Cloudflare Email Routing | 🟡 Test Gmail en cours |
| **SMS** | ✅ Twilio | ✅ Webhook | ✅ Prêt |
| **WhatsApp** | ⏳ Meta Cloud API | ✅ Webhook configuré | 🟡 Attente vérification Meta |
| **Téléphone** | ⚠️ Bug Retell | ✅ Webhook | 🔴 À diagnostiquer |

---

## 🗂️ Fichiers modifiés cette session

### Backend
```
src/modules/omnichannel/webhooks/meta-whatsapp.js  # ✨ NOUVEAU - Handler Meta WhatsApp
src/index.js  # ✏️ Ajout import + route /webhooks/meta/whatsapp
```

### DNS (Cloudflare)
```
MX coccinelle.ai → route1.mx.cloudflare.net (priorité 32)
MX coccinelle.ai → route2.mx.cloudflare.net (priorité 9)
MX coccinelle.ai → route3.mx.cloudflare.net (priorité 88)
TXT coccinelle.ai → "v=spf1 include:_spf.mx.cloudflare.net ~all"
TXT cf2024-1._domainkey.coccinelle.ai → DKIM key
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

### Tenants avec slug
| Tenant | Slug | ID |
|--------|------|-----|
| Test7 | test7 | tenant_dGVzdDdAdGVzdC5jb20 |
| test13 | test13 | tenant_dGVzdDEzQHRlc3QxMy5jb20 |

---

## 🚀 Prochaines étapes

### Priorité 1 : Finaliser test Email Routing
1. ✅ Ajouter `y.amrouche1301@gmail.com` comme destination
2. ⏳ Vérifier l'adresse Gmail (cliquer sur lien de confirmation)
3. Modifier la règle `test@coccinelle.ai` → Gmail
4. Tester l'envoi d'email
5. Vérifier réception sur Gmail

### Priorité 2 : Attendre vérification Meta (~2 jours)
- La vérification de l'entreprise "Agentic Solutions" est en cours
- Une fois approuvé, WhatsApp fonctionnera automatiquement

### Priorité 3 : Configurer Resend pour @coccinelle.ai
1. Ajouter le domaine coccinelle.ai dans Resend
2. Configurer les enregistrements DNS (SPF, DKIM)
3. Tester l'envoi depuis `sara@coccinelle.ai`

### Priorité 4 : Diagnostiquer bug Retell (téléphone)
- Le canal téléphone a un bug à investiguer

---

## 📋 Message pour nouvelle conversation
```
Je continue le développement de Coccinelle.ai.

**Session précédente (23 janvier 2026)** :

### WhatsApp Meta Cloud API - 90% ✅
- ✅ Handler webhook créé : `src/modules/omnichannel/webhooks/meta-whatsapp.js`
- ✅ Route ajoutée : `/webhooks/meta/whatsapp`
- ✅ Déployé sur Cloudflare Workers
- ✅ Webhook vérifié par Meta, abonné à "messages"
- ⏳ **BLOCAGE** : Compte WhatsApp Business "locked" → Vérification entreprise en cours (~2 jours)

**Credentials WhatsApp** :
- Phone Number ID (test) : 883453898184903
- Phone Number ID (prod) : 917756968084685
- WABA ID (test) : 1366785598272425
- Verify Token : coccinelle_meta_verify_2026

### Email Routing Cloudflare - 90% ✅
- ✅ DNS transféré vers Cloudflare (MX + SPF OK)
- ✅ Email Routing activé
- ✅ Règle `test@coccinelle.ai` créée
- ❌ Test forwarding Outlook → Bloqué (problème connu Cloudflare/Outlook)
- ⏳ Test forwarding Gmail → En cours

**Dernière action** :
J'ai ajouté `y.amrouche1301@gmail.com` comme destination dans Cloudflare Email Routing.
→ Prochaine étape : Vérifier l'adresse Gmail puis tester l'envoi

**Prochaines étapes** :
1. Vérifier l'adresse Gmail (cliquer sur lien de confirmation reçu)
2. Modifier la règle test@coccinelle.ai pour utiliser Gmail
3. Envoyer un email test et vérifier réception
4. Attendre vérification Meta pour WhatsApp (~2 jours)
5. Configurer Resend pour envoyer depuis @coccinelle.ai

**Chemins** :
- Backend : /Users/amrouche.7/match-immo-mcp/coccinelle-ai/
- Frontend : /Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas/
- Manifeste : MANIFESTE_COCCINELLE_V29.md

**Comptes** :
- Local : admin@coccinelle-test.com / CoccinelleTest123
- Prod : admin@coccinelle-prod.com / CoccinelleProd123
```

---

*Généré le 23 janvier 2026* 🐞
