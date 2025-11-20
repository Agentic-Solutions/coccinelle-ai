# Déploiement Cloudflare Pages pour Coccinelle.AI

## Option 1 : Déploiement via Dashboard Cloudflare (Le plus simple)

### Étape 1 : Préparer le repository Git

1. Initialisez Git si ce n'est pas déjà fait :
```bash
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas
git init
git add .
git commit -m "Initial commit - Coccinelle SaaS"
```

2. Créez un repository GitHub :
   - Allez sur [https://github.com/new](https://github.com/new)
   - Nom : `coccinelle-saas`
   - Visibilité : Private (recommandé) ou Public

3. Poussez votre code :
```bash
git remote add origin https://github.com/VOTRE_USERNAME/coccinelle-saas.git
git branch -M main
git push -u origin main
```

### Étape 2 : Connecter Cloudflare Pages

1. Connectez-vous à [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Allez dans **Pages** dans le menu de gauche
3. Cliquez sur **Create a project**
4. Sélectionnez **Connect to Git**
5. Autorisez Cloudflare à accéder à votre GitHub
6. Sélectionnez le repository `coccinelle-saas`

### Étape 3 : Configurer le build

**Build settings :**
- **Framework preset** : Next.js
- **Build command** : `npm run pages:build`
- **Build output directory** : `.vercel/output/static`
- **Root directory** : `/` (laisser vide)
- **Node version** : `18` ou `20`

**Environment variables :**
Ajoutez toutes vos variables d'environnement :

```
ANTHROPIC_API_KEY=votre_clé_anthropic
NEXT_PUBLIC_API_URL=https://coccinelle-api.youssef-amrouche.workers.dev
NEXT_PUBLIC_API_KEY=demo-key-12345
NEXT_PUBLIC_USE_REAL_API=true
TWILIO_ACCOUNT_SID=votre_sid
TWILIO_AUTH_TOKEN=votre_token
TWILIO_PHONE_NUMBER=votre_numero
TWILIO_MESSAGING_SERVICE_SID=votre_messaging_sid
TWILIO_WHATSAPP_NUMBER=votre_whatsapp
RESEND_API_KEY=votre_resend_key
FROM_EMAIL=onboarding@resend.dev
FROM_NAME=Coccinelle.AI
```

### Étape 4 : Déployer

1. Cliquez sur **Save and Deploy**
2. Attendez que le build se termine (3-5 minutes)
3. Votre site sera disponible sur : `https://coccinelle-saas.pages.dev`

### Étape 5 : Configurer un domaine personnalisé (Optionnel)

1. Dans Pages > Votre projet > Custom domains
2. Cliquez sur **Set up a custom domain**
3. Entrez votre domaine : `app.coccinelle.ai` ou `coccinelle.ai`
4. Suivez les instructions pour configurer les DNS

---

## Option 2 : Déploiement via CLI Wrangler (Avancé)

### Prérequis

1. Installer Wrangler CLI :
```bash
npm install -g wrangler
```

2. Se connecter à Cloudflare :
```bash
wrangler login
```

### Configuration

Créez un fichier `wrangler.toml` à la racine :

```toml
name = "coccinelle-saas"
compatibility_date = "2024-01-01"
pages_build_output_dir = ".vercel/output/static"

[env.production]
vars = { ENVIRONMENT = "production" }

[env.preview]
vars = { ENVIRONMENT = "preview" }
```

### Déployer

```bash
# Build le projet
npm run pages:build

# Déployer
npm run pages:deploy

# Ou directement avec wrangler
wrangler pages deploy .vercel/output/static --project-name=coccinelle-saas
```

---

## Configuration post-déploiement

### 1. Variables d'environnement

Dans Cloudflare Dashboard :
1. Pages > coccinelle-saas > Settings > Environment variables
2. Ajoutez les variables pour Production ET Preview
3. Redéployez pour appliquer les changements

### 2. Build Hooks (Déploiement automatique)

1. Settings > Builds & deployments > Build hooks
2. Créez un hook : `deploy-production`
3. Utilisez l'URL du webhook pour déclencher des déploiements depuis GitHub Actions ou autre

### 3. Preview Deployments

Chaque branche/PR créera automatiquement un preview deployment :
- URL : `https://BRANCH-NAME.coccinelle-saas.pages.dev`
- Idéal pour tester avant de merger

### 4. Redirection et Headers

Créez `public/_headers` :

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Créez `public/_redirects` :

```
# SPA fallback
/*    /index.html   200

# API redirect (si besoin)
/api/*  https://coccinelle-api.youssef-amrouche.workers.dev/:splat  200
```

---

## Dépannage

### Build échoue

**Erreur : "Command failed"**
- Vérifiez que `npm run pages:build` fonctionne en local
- Assurez-vous que toutes les dépendances sont dans `package.json`

**Erreur : "Out of memory"**
- Augmentez la limite : ajoutez `NODE_OPTIONS=--max_old_space_size=4096`

**Erreur : "Module not found"**
- Vérifiez les imports relatifs (case-sensitive sur Linux)
- Assurez-vous que tous les packages sont installés

### Déploiement réussit mais site ne fonctionne pas

**Page blanche**
- Ouvrez la console du navigateur pour voir les erreurs
- Vérifiez les variables d'environnement `NEXT_PUBLIC_*`

**Erreurs API**
- Vérifiez que `NEXT_PUBLIC_API_URL` est correct
- Assurez-vous que l'API Worker est déployée et accessible

**Erreurs d'authentification**
- Vérifiez que les tokens/clés API sont corrects
- Assurez-vous que les variables sensibles sont en environnement, pas dans le code

---

## Monitoring et Analytics

### Cloudflare Web Analytics (Gratuit)

1. Pages > coccinelle-saas > Analytics
2. Activez Web Analytics
3. Ajoutez le script dans `app/layout.tsx` :

```tsx
<Script
  defer
  src='https://static.cloudflareinsights.com/beacon.min.js'
  data-cf-beacon='{"token": "VOTRE_TOKEN"}'
/>
```

### Logs en temps réel

```bash
# Voir les logs de déploiement
wrangler pages deployment tail

# Voir les logs de production
wrangler pages deployment tail --env production
```

---

## CI/CD avec GitHub Actions (Automatique)

Cloudflare Pages s'intègre automatiquement avec GitHub :
- ✅ Chaque push sur `main` = déploiement en production
- ✅ Chaque PR = preview deployment automatique
- ✅ Commentaires automatiques sur les PRs avec l'URL du preview
- ✅ Rollback facile depuis le dashboard

Aucune configuration GitHub Actions nécessaire !

---

## Performance et Optimisation

### Edge Caching

Cloudflare Pages met automatiquement en cache :
- Assets statiques (JS, CSS, images)
- Pages HTML (avec bonne configuration)

### Image Optimization

Utilisez Cloudflare Images :
```tsx
<Image
  src="https://imagedelivery.net/ACCOUNT_ID/IMAGE_ID/public"
  alt="..."
/>
```

### Function Analytics

Pour les routes API Next.js :
1. Settings > Functions
2. Activez CPU time & invocations tracking

---

## Coûts

**Pages (Plan gratuit) :**
- ✅ 500 builds/mois
- ✅ Bande passante illimitée
- ✅ 1 build concurrent
- ✅ Déploiements illimités
- ✅ Preview deployments illimités

**Workers (Plan gratuit) :**
- ✅ 100,000 requêtes/jour
- ✅ 10ms CPU time/requête

Si vous dépassez ces limites, le plan Pages Pro coûte $20/mois.

---

## Commandes utiles

```bash
# Lister les déploiements
wrangler pages deployment list --project-name=coccinelle-saas

# Annuler un déploiement
wrangler pages deployment rollback --project-name=coccinelle-saas

# Voir les logs
wrangler pages deployment tail

# Variables d'environnement
wrangler pages project list
```

---

## Liens utiles

- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js on Pages](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [Dashboard Pages](https://dash.cloudflare.com/?to=/:account/pages)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
