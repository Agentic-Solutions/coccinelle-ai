# 🚀 GUIDE DÉPLOIEMENT CLOUDFLARE PAGES
**Date**: 2025-11-14
**Projet**: Coccinelle.AI SaaS Frontend
**Stack**: Next.js 15.5.6 + Cloudflare Pages

---

## ✅ STATUT ACTUEL

### Backend API
- ✅ **Déjà déployé** sur Cloudflare Workers
- URL : `https://coccinelle-api.youssef-amrouche.workers.dev`
- Statut : Opérationnel

### Frontend Next.js
- ⚠️ **En développement local**
- Prêt pour déploiement avec quelques ajustements

---

## 📋 PRÉREQUIS

### 1. Compte Cloudflare
- [ ] Compte Cloudflare créé
- [ ] Workers & Pages activés
- [ ] Domaine configuré (optionnel)

### 2. Outils Locaux
- [x] Node.js installé (v20+)
- [x] npm installé
- [ ] wrangler CLI installé

### 3. Code
- [x] Git repository
- [x] Next.js app fonctionnelle
- [x] Build local réussi

---

## 🔧 ÉTAPE 1 : INSTALLATION DE WRANGLER

### Installation Globale
```bash
npm install -g wrangler

# Vérifier l'installation
wrangler --version
```

### Connexion à Cloudflare
```bash
wrangler login
```

Ceci ouvrira un navigateur pour authentifier votre compte Cloudflare.

---

## 📦 ÉTAPE 2 : INSTALLER @CLOUDFLARE/NEXT-ON-PAGES

Next.js sur Cloudflare Pages nécessite un adaptateur spécial.

```bash
npm install --save-dev @cloudflare/next-on-pages
```

### Ajouter script de build Cloudflare dans package.json

```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build --turbopack",
    "start": "next start",
    "lint": "eslint",
    "pages:build": "npx @cloudflare/next-on-pages",
    "pages:dev": "npx @cloudflare/next-on-pages --watch",
    "pages:deploy": "npm run pages:build && wrangler pages deploy .vercel/output/static"
  }
}
```

---

## 🛠️ ÉTAPE 3 : CRÉER wrangler.toml

Créer le fichier `wrangler.toml` à la racine du projet :

```toml
name = "coccinelle-saas"
compatibility_date = "2024-11-14"
pages_build_output_dir = ".vercel/output/static"

[env.production]
name = "coccinelle-saas"
routes = [
  { pattern = "coccinelle.ai", custom_domain = true },
  { pattern = "app.coccinelle.ai", custom_domain = true }
]

[env.production.vars]
NEXT_PUBLIC_API_URL = "https://coccinelle-api.youssef-amrouche.workers.dev"
NEXT_PUBLIC_API_KEY = "prod-key-CHANGEME"

[env.preview]
name = "coccinelle-saas-preview"

[env.preview.vars]
NEXT_PUBLIC_API_URL = "https://coccinelle-api.youssef-amrouche.workers.dev"
NEXT_PUBLIC_API_KEY = "demo-key-12345"
```

---

## ⚙️ ÉTAPE 4 : MODIFIER next.config.ts

Next.js sur Cloudflare Pages a quelques limitations. Mettre à jour la config :

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supprimer experimental.turbo pour la production
  // (Turbopack n'est pas supporté pour le build Cloudflare)

  // Configuration pour Cloudflare Pages
  output: 'export', // ⚠️ ATTENTION : Ceci désactive l'API Routes
  images: {
    unoptimized: true, // Cloudflare Pages ne supporte pas Image Optimization
  },

  // Si vous voulez garder les API routes, utilisez plutôt :
  // (Décommentez ci-dessous et commentez output: 'export')
  /*
  experimental: {
    runtime: 'edge',
  },
  */
};

export default nextConfig;
```

### ⚠️ CHOIX IMPORTANT : Export Statique vs Edge Runtime

**Option A : Export Statique (Recommandé pour démarrer)**
```typescript
output: 'export',
images: { unoptimized: true }
```
✅ Plus simple
✅ Plus rapide
❌ Pas d'API Routes Next.js
→ Solution : Toutes les API routes sont déjà sur Workers (OK pour nous !)

**Option B : Edge Runtime (Pour API Routes Next.js)**
```typescript
experimental: { runtime: 'edge' }
```
✅ API Routes fonctionnent
❌ Plus complexe
❌ Nécessite @cloudflare/next-on-pages

**Notre cas** : **Option A recommandée** car API déjà sur Workers ✅

---

## 🔨 ÉTAPE 5 : BUILD LOCAL DE TEST

Avant de déployer, tester le build localement :

```bash
# Build Next.js
npm run build

# Tester avec @cloudflare/next-on-pages
npm run pages:build

# Preview local avec Wrangler
wrangler pages dev .vercel/output/static
```

Si tout fonctionne → Prêt pour déploiement !

---

## 🚀 ÉTAPE 6 : DÉPLOIEMENT SUR CLOUDFLARE PAGES

### Méthode 1 : Via CLI (Recommandé)

```bash
# Build et déployer en une commande
npm run pages:deploy

# Ou manuellement
npx @cloudflare/next-on-pages
wrangler pages deploy .vercel/output/static
```

### Méthode 2 : Via Dashboard Cloudflare (Plus simple)

1. **Aller sur** : https://dash.cloudflare.com
2. **Pages** → **Create a project**
3. **Connect to Git** → Sélectionner votre repository
4. **Build settings** :
   - Framework preset : `Next.js`
   - Build command : `npx @cloudflare/next-on-pages`
   - Build output directory : `.vercel/output/static`
5. **Environment variables** :
   ```
   NEXT_PUBLIC_API_URL=https://coccinelle-api.youssef-amrouche.workers.dev
   NEXT_PUBLIC_API_KEY=prod-key-CHANGEME
   NODE_VERSION=20
   ```
6. **Save and Deploy** ✅

---

## 🌐 ÉTAPE 7 : CONFIGURER LE DOMAINE CUSTOM

### Ajouter un Domaine Personnalisé

1. **Pages** → Votre projet → **Custom domains**
2. **Add a custom domain** : `app.coccinelle.ai`
3. Cloudflare ajoutera automatiquement les DNS records
4. Attendre propagation DNS (~5 min)

### URL Finales

- **Production** : `https://app.coccinelle.ai`
- **Preview** : `https://coccinelle-saas.pages.dev`
- **API** : `https://coccinelle-api.youssef-amrouche.workers.dev` (existant)

---

## ✅ ÉTAPE 8 : VARIABLES D'ENVIRONNEMENT

### Dans Cloudflare Dashboard

**Pages** → Votre projet → **Settings** → **Environment variables**

**Production** :
```
NEXT_PUBLIC_API_URL=https://coccinelle-api.youssef-amrouche.workers.dev
NEXT_PUBLIC_API_KEY=prod-key-SECURE-CHANGEME
```

**Preview** :
```
NEXT_PUBLIC_API_URL=https://coccinelle-api.youssef-amrouche.workers.dev
NEXT_PUBLIC_API_KEY=demo-key-12345
```

---

## 🔍 VÉRIFICATIONS POST-DÉPLOIEMENT

### Checklist

- [ ] **Site accessible** : `https://coccinelle-saas.pages.dev`
- [ ] **Signup fonctionne** : Tester création compte
- [ ] **Login fonctionne** : Tester connexion
- [ ] **Onboarding fonctionne** : Tester parcours complet
- [ ] **Dashboard charge** : Vérifier toutes les pages
- [ ] **API connectée** : Vérifier appels API réussissent
- [ ] **localStorage fonctionne** : Mode démo OK
- [ ] **Images chargent** : Vérifier Logo et assets
- [ ] **CSS appliqué** : Vérifier Tailwind fonctionne

### Tests à Effectuer

```bash
# 1. Test signup
curl -X POST https://app.coccinelle.ai/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test1234"}'

# 2. Test page principale
curl -I https://app.coccinelle.ai

# 3. Test dashboard (après login)
# Via navigateur : https://app.coccinelle.ai/dashboard
```

---

## ⚠️ PROBLÈMES POTENTIELS ET SOLUTIONS

### 1. Build Errors

**Erreur** : `Error: Page "/dashboard/[...slug]" is incompatible with "output: export"`

**Solution** : Utiliser routes statiques uniquement ou passer à edge runtime

**Fix** :
```typescript
// Option 1 : Éviter dynamic routes avec export
// Option 2 : Utiliser experimental.runtime = 'edge'
```

---

### 2. Images Ne Chargent Pas

**Erreur** : Next/Image ne fonctionne pas

**Solution** : Utiliser `unoptimized: true`

```typescript
images: {
  unoptimized: true
}
```

---

### 3. API Calls Fail (CORS)

**Erreur** : CORS errors dans la console

**Solution** : Configurer CORS dans votre API Cloudflare Workers

```javascript
// Dans votre API Worker
headers: {
  'Access-Control-Allow-Origin': 'https://app.coccinelle.ai',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
```

---

### 4. localStorage Undefined (SSR)

**Erreur** : `ReferenceError: localStorage is not defined`

**Solution** : Utiliser useEffect ou vérifier `typeof window`

```typescript
useEffect(() => {
  const data = localStorage.getItem('key');
}, []);

// Ou
if (typeof window !== 'undefined') {
  localStorage.setItem('key', 'value');
}
```

---

## 🎯 OPTIMISATIONS CLOUDFLARE

### 1. Caching

Cloudflare Pages cache automatiquement les assets statiques.

**Cache Rules** (optionnel) :
- HTML : 1 heure
- CSS/JS : 1 an (avec hash)
- Images : 1 mois

### 2. Performance

**Activer** :
- ✅ Auto Minify (HTML, CSS, JS)
- ✅ Brotli Compression
- ✅ HTTP/3 (QUIC)
- ✅ Early Hints

**Pages** → Votre projet → **Settings** → **Speed**

### 3. Security

**Activer** :
- ✅ Always Use HTTPS
- ✅ Automatic HTTPS Rewrites
- ✅ Security Headers

---

## 📊 MONITORING

### Cloudflare Analytics

**Pages** → Votre projet → **Analytics**

Métriques disponibles :
- Requests/day
- Bandwidth
- Unique visitors
- Top pages
- Status codes

### Logs en Temps Réel

```bash
# Voir les logs du déploiement
wrangler pages deployment tail

# Voir les logs du projet
wrangler pages deployment list
```

---

## 💰 COÛTS

### Cloudflare Pages (Free Tier)

✅ **Gratuit** pour :
- 500 builds/month
- Unlimited requests
- Unlimited bandwidth
- Automatic SSL
- Global CDN

### Workers (API déjà déployé)

✅ **Gratuit** pour :
- 100,000 requests/day
- 10ms CPU time/request

**Si dépassement** :
- Workers Paid : $5/month (10M requests)
- Pages Pro : $20/month (5,000 builds)

**Pour Coccinelle.AI** : **Free Tier suffisant** au démarrage ✅

---

## 🚀 DÉPLOIEMENT CONTINU (CI/CD)

### Auto-Deploy sur Git Push

Cloudflare Pages s'intègre directement avec GitHub :

1. **Connecter repository** GitHub
2. **Activer auto-deploy**
3. **Chaque push** sur `main` → Deploy automatique

### Preview Deployments

- Chaque **Pull Request** → Preview URL unique
- Format : `https://pr-123.coccinelle-saas.pages.dev`
- Idéal pour tester avant merge

---

## 📝 COMMANDES RAPIDES

### Développement Local
```bash
npm run dev                 # Dev local avec Turbopack
npm run pages:dev           # Dev avec Cloudflare Pages simulation
```

### Build & Test
```bash
npm run build               # Build Next.js
npm run pages:build         # Build pour Cloudflare
wrangler pages dev .vercel/output/static  # Test local du build
```

### Déploiement
```bash
npm run pages:deploy        # Deploy sur Cloudflare Pages
wrangler pages deployment tail  # Voir les logs
```

---

## ✅ CHECKLIST FINALE AVANT DÉPLOIEMENT

### Code
- [x] Build local réussi (`npm run build`)
- [x] Tous les tests passent
- [x] Pas d'erreurs TypeScript
- [x] Pas de warnings critiques
- [ ] Environment variables configurées
- [ ] API URL correcte en production

### Configuration
- [ ] `wrangler.toml` créé
- [ ] `next.config.ts` adapté pour Cloudflare
- [ ] `package.json` avec scripts Cloudflare
- [ ] `.gitignore` inclut `.vercel/`

### Cloudflare
- [ ] Compte Cloudflare créé
- [ ] wrangler CLI installé et login OK
- [ ] Repository Git connecté (si auto-deploy)
- [ ] Variables d'environnement configurées
- [ ] Domaine custom configuré (optionnel)

### Post-Déploiement
- [ ] Site accessible
- [ ] Toutes les pages fonctionnent
- [ ] API calls réussissent
- [ ] localStorage fonctionne
- [ ] Tests utilisateur effectués

---

## 🎯 PROCHAINES ÉTAPES APRÈS DÉPLOIEMENT

### Court Terme (J+1)
1. ✅ Tester exhaustivement le site en production
2. ✅ Monitorer les logs Cloudflare
3. ✅ Vérifier Analytics (traffic, erreurs)
4. ✅ Configurer alertes (optional)

### Moyen Terme (Semaine 1)
1. Optimiser performance (Core Web Vitals)
2. Configurer monitoring (Sentry, LogRocket)
3. Setup CI/CD complet
4. Tests A/B (optionnel)

### Long Terme (Mois 1)
1. Analyser métriques utilisateurs
2. Optimisations basées sur données
3. Scaling si nécessaire (Workers Paid)

---

## 📚 RESSOURCES UTILES

### Documentation
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [@cloudflare/next-on-pages](https://github.com/cloudflare/next-on-pages)
- [Next.js on Cloudflare](https://developers.cloudflare.com/pages/framework-guides/nextjs)

### Support
- [Cloudflare Discord](https://discord.gg/cloudflaredev)
- [Cloudflare Community](https://community.cloudflare.com)
- [Wrangler GitHub Issues](https://github.com/cloudflare/workers-sdk/issues)

---

## ✅ RÉSUMÉ : ÉTAPES MINIMALES

Pour déployer **rapidement** (15 minutes) :

```bash
# 1. Installer wrangler
npm install -g wrangler
wrangler login

# 2. Installer l'adaptateur
npm install --save-dev @cloudflare/next-on-pages

# 3. Créer wrangler.toml (copier depuis ce guide)

# 4. Modifier next.config.ts (ajouter output: 'export')

# 5. Build et déployer
npx @cloudflare/next-on-pages
wrangler pages deploy .vercel/output/static
```

**Ou via Dashboard** (10 minutes) :
1. Connecter GitHub repo
2. Configurer build settings
3. Deploy ✅

---

## 🎉 CONCLUSION

**Statut** : ✅ **PRÊT À DÉPLOYER**

**Pré-requis** :
- ✅ Code fonctionnel
- ✅ API déjà sur Workers
- ⚠️ Besoin : Installer adapter + config

**Temps estimé** :
- Setup : 15 minutes
- Premier déploiement : 5 minutes
- Tests : 30 minutes
- **Total : ~1 heure**

**Coût** : **GRATUIT** (Free Tier Cloudflare)

**Recommandation** : **Déployer maintenant** sur preview, tester, puis passer en production ✅

---

*Guide créé le 2025-11-14*
*Next.js 15.5.6 + Cloudflare Pages*
*Prêt pour production* 🚀
