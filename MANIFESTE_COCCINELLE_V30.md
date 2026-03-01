# 🐞 Coccinelle.ai - Manifeste de Session V30

**Date**: 23 janvier 2026  
**Session**: Reprise - Email Routing Gmail + WhatsApp Meta

---

## 📍 Où on en est

### WhatsApp Meta Cloud API - 90% ✅
| Tâche | Status |
|-------|--------|
| Handler webhook créé (`meta-whatsapp.js`) | ✅ |
| Route `/webhooks/meta/whatsapp` ajoutée | ✅ |
| Déployé sur Cloudflare Workers | ✅ |
| Webhook vérifié par Meta | ✅ |
| Abonné aux événements "messages" | ✅ |
| Vérification entreprise Meta | ⏳ En cours (~2 jours) |

**Blocage** : Le compte WhatsApp Business est "locked" en attendant la vérification de l'entreprise "Agentic Solutions" par Meta.

### Email Routing Cloudflare - 90% ✅
| Tâche | Status |
|-------|--------|
| DNS coccinelle.ai transféré vers Cloudflare | ✅ |
| Enregistrements MX Cloudflare configurés | ✅ |
| Enregistrements SPF configurés | ✅ |
| Email Routing activé | ✅ |
| Règle `test@coccinelle.ai` créée | ✅ |
| Test forwarding vers Outlook | ❌ Bloqué par Outlook |
| Adresse Gmail ajoutée comme destination | ✅ |
| Vérification adresse Gmail | ⏳ À faire |
| Test forwarding vers Gmail | ⏳ À tester |

---

## 🔑 Credentials

### WhatsApp Meta
| Information | Valeur |
|-------------|--------|
| **Numéro TEST** | +1 555 144 1226 |
| Phone Number ID (test) | `883453898184903` |
| WABA ID (test) | `1366785598272425` |
| **Numéro PROD** | +33 9 39 03 57 60 |
| Phone Number ID (prod) | `917756968084685` |
| WABA ID (prod) | `3443641465776367` |
| Webhook URL | `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/meta/whatsapp` |
| Verify Token | `coccinelle_meta_verify_2026` |

### Meta App
| Attribut | Valeur |
|----------|--------|
| Nom | coccinelle.ai |
| ID | 25451229527845708 |
| Business ID | 2345023065947916 |

---

## 📊 État global des canaux

| Canal | Envoi | Réception | Status |
|-------|-------|-----------|--------|
| **Email** | ✅ Resend | ⏳ Cloudflare Email Routing | 🟡 Test Gmail en cours |
| **SMS** | ✅ Twilio | ✅ Webhook | ✅ Prêt |
| **WhatsApp** | ⏳ Meta Cloud API | ✅ Webhook configuré | 🟡 Attente vérification Meta |
| **Téléphone** | ⚠️ Bug Retell | ✅ Webhook | 🔴 À diagnostiquer |

---

## 🔧 Configuration

### Chemins
| Type | Chemin |
|------|--------|
| **Backend** | `/Users/amrouche.7/match-immo-mcp/coccinelle-ai/` |
| **Frontend** | `/Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas/` |

### Ports (Développement)
| Service | Port |
|---------|------|
| Backend Wrangler | **8787** |
| Frontend Next.js | **3000** |

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

### ⏳ Priorité 1 : Finaliser Email Routing Gmail
1. [ ] Vérifier l'adresse Gmail (cliquer sur lien de confirmation)
2. [ ] Modifier la règle `test@coccinelle.ai` → Gmail
3. [ ] Tester l'envoi d'email
4. [ ] Vérifier réception sur Gmail

### ⏳ Priorité 2 : Attendre vérification Meta (~2 jours)
- La vérification de l'entreprise "Agentic Solutions" est en cours
- Une fois approuvé, WhatsApp fonctionnera automatiquement

### 📋 Priorité 3 : Configurer Resend pour @coccinelle.ai
1. [ ] Ajouter le domaine coccinelle.ai dans Resend
2. [ ] Configurer les enregistrements DNS (SPF, DKIM)
3. [ ] Tester l'envoi depuis `sara@coccinelle.ai`

### 🔴 Priorité 4 : Diagnostiquer bug Retell (téléphone)
- Le canal téléphone a un bug à investiguer

---

## 🗂️ Fichiers clés

### Backend (canaux omnicanal)
```
src/modules/omnichannel/webhooks/meta-whatsapp.js  # Handler Meta WhatsApp
src/modules/omnichannel/webhooks/twilio-sms.js     # Handler Twilio SMS
src/modules/omnichannel/services/email.service.js  # Service email Resend
src/index.js                                        # Routes principales
```

### DNS Cloudflare (coccinelle.ai)
```
MX coccinelle.ai → route1.mx.cloudflare.net (priorité 32)
MX coccinelle.ai → route2.mx.cloudflare.net (priorité 9)
MX coccinelle.ai → route3.mx.cloudflare.net (priorité 88)
TXT coccinelle.ai → "v=spf1 include:_spf.mx.cloudflare.net ~all"
TXT cf2024-1._domainkey.coccinelle.ai → DKIM key
```

---

## 📋 Message pour nouvelle conversation

```
Je continue le développement de Coccinelle.ai.

**Session précédente (23 janvier 2026)** :

### WhatsApp Meta Cloud API - 90% ✅
- ✅ Handler webhook créé et déployé
- ✅ Webhook vérifié par Meta, abonné à "messages"
- ⏳ **BLOCAGE** : Compte WhatsApp "locked" → Vérification entreprise en cours

### Email Routing Cloudflare - 90% ✅
- ✅ DNS transféré vers Cloudflare (MX + SPF OK)
- ✅ Email Routing activé, règle `test@coccinelle.ai` créée
- ✅ Adresse Gmail ajoutée comme destination
- ⏳ À faire : Vérifier Gmail + tester forwarding

**Credentials WhatsApp** :
- Phone Number ID (test) : 883453898184903
- Phone Number ID (prod) : 917756968084685
- Verify Token : coccinelle_meta_verify_2026

**Chemins** :
- Backend : /Users/amrouche.7/match-immo-mcp/coccinelle-ai/
- Frontend : /Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas/
- Manifeste : MANIFESTE_COCCINELLE_V30.md

**Comptes** :
- Local : admin@coccinelle-test.com / CoccinelleTest123
- Prod : admin@coccinelle-prod.com / CoccinelleProd123
```

---

*Généré le 23 janvier 2026* 🐞
