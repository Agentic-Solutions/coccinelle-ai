# 📋 COCCINELLE.AI - Décisions & Architecture Canaux

**Document de référence permanent**  
**Créé le** : 28 janvier 2026  
**Dernière mise à jour** : 30 janvier 2026  

> ⚠️ **IMPORTANT** : Ce document contient les décisions ACTÉES avec Youssef.  
> Claude ne doit PAS simplifier ou changer ces décisions sans accord explicite.

---

## 🎯 Principe fondamental

**L'UX client doit être la plus simple possible.**  
Les clients de Coccinelle (salons, restaurants, agences...) ne sont PAS techniques.  
Ils doivent pouvoir connecter leurs canaux en **moins de 5 minutes** sans aide.

---

## 🌐 DÉPLOIEMENT PRODUCTION

### URLs de Production

| Service | URL |
|---------|-----|
| **Frontend** | https://coccinelle-saas.pages.dev |
| **Backend API** | https://coccinelle-api.youssef-amrouche.workers.dev |

### Commandes de déploiement

**Frontend (Cloudflare Pages)** :
```bash
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas
npm run pages:build && npx wrangler pages deploy .vercel/output/static --project-name=coccinelle-saas
```

**Backend (Cloudflare Workers)** :
```bash
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai
npx wrangler deploy
```

---

## 📧 CANAL EMAIL - Architecture OAuth Multi-Provider

### Décision actée : Support Gmail, Outlook, Yahoo

| Provider | Technologie | Status |
|----------|-------------|--------|
| **Gmail** | Google OAuth 2.0 | 🟡 Backend OK, app en mode test |
| **Outlook** | Microsoft Graph API | 🔴 Backend OK, secrets non configurés |
| **Yahoo** | Yahoo OAuth 2.0 | 🔴 Backend OK, Client ID à vérifier |

### Fichiers Backend OAuth

| Fichier | Description |
|---------|-------------|
| `src/modules/oauth/routes.js` | Routeur principal avec CORS |
| `src/modules/oauth/google.js` | Handlers Google OAuth |
| `src/modules/oauth/outlook.js` | Handlers Microsoft OAuth |
| `src/modules/oauth/yahoo.js` | Handlers Yahoo OAuth |

### Tables Base de Données

| Table | Description |
|-------|-------------|
| `oauth_google_tokens` | Tokens Gmail |
| `oauth_outlook_tokens` | Tokens Outlook |
| `oauth_yahoo_tokens` | Tokens Yahoo |

### Endpoints OAuth
```
# Google
GET  /api/v1/oauth/google/authorize   # Démarre flow OAuth
GET  /api/v1/oauth/google/callback    # Callback Google
GET  /api/v1/oauth/google/status      # Vérifie connexion
DELETE /api/v1/oauth/google/disconnect # Déconnecte

# Outlook (même pattern)
GET  /api/v1/oauth/outlook/authorize
GET  /api/v1/oauth/outlook/callback
GET  /api/v1/oauth/outlook/status
DELETE /api/v1/oauth/outlook/disconnect

# Yahoo (même pattern)
GET  /api/v1/oauth/yahoo/authorize
GET  /api/v1/oauth/yahoo/callback
GET  /api/v1/oauth/yahoo/status
DELETE /api/v1/oauth/yahoo/disconnect
```

### Secrets Cloudflare requis

| Secret | Provider | Status |
|--------|----------|--------|
| `GOOGLE_CLIENT_ID` | Gmail | ✅ |
| `GOOGLE_CLIENT_SECRET` | Gmail | ✅ |
| `GOOGLE_REDIRECT_URI` | Gmail | ✅ |
| `MICROSOFT_CLIENT_ID` | Outlook | ❌ À configurer |
| `MICROSOFT_CLIENT_SECRET` | Outlook | ❌ À configurer |
| `MICROSOFT_REDIRECT_URI` | Outlook | ❌ À configurer |
| `YAHOO_CLIENT_ID` | Yahoo | ⚠️ À vérifier |
| `YAHOO_CLIENT_SECRET` | Yahoo | ✅ |
| `YAHOO_REDIRECT_URI` | Yahoo | ✅ |

---

## 📱 CANAL WHATSAPP

### Décision actée : Meta Embedded Signup

| Aspect | Décision |
|--------|----------|
| **Solution choisie** | Meta Cloud API avec Embedded Signup |
| **Numéro** | +33 9 39 03 57 61 |
| **Status** | 🟡 En validation chez Meta |

---

## 📞 CANAL TÉLÉPHONE

| Composant | Status |
|-----------|--------|
| Agent Retell | ✅ Configuré |
| Intégration Twilio | 🔴 Bug à corriger |

---

## 💬 CANAL SMS

| Composant | Status |
|-----------|--------|
| Envoi/Réception Twilio | ✅ Fait |
| Routage multi-tenant | ✅ Fait |

---

## 🎯 PRIORITÉS ACTUELLES

1. **Corriger Yahoo OAuth** ← Client ID à vérifier
2. **Ajouter testeurs Gmail** ← Dans Google Console
3. **Configurer Azure/Outlook** ← Créer app + secrets
4. **Diagnostiquer bug Retell** ← Téléphone

---

*Document de référence - Ne pas modifier sans accord de Youssef*
