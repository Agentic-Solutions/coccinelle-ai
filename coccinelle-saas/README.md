# Coccinelle.AI - Plateforme SaaS

Plateforme SaaS complète pour l'automatisation des interactions clients avec l'IA vocale Sara.

## 🚀 Stack Technique

- **Framework** : Next.js 15.5.6 avec App Router + Turbopack
- **Runtime** : React 19.1.0
- **Styling** : Tailwind CSS
- **Déploiement** : Cloudflare Pages
- **API Backend** : Cloudflare Workers + D1
- **AI** : Anthropic Claude (Haiku)
- **Communication** : Twilio (SMS, WhatsApp, Voice)
- **Email** : Resend

## 📦 Installation

```bash
# Installer les dépendances
npm install --legacy-peer-deps

# Lancer en développement
npm run dev

# Build pour production
npm run build

# Build pour Cloudflare Pages
npm run pages:build
```

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env.local` - voir `.env.local` pour un exemple complet.

## 📁 Structure du Projet

```
coccinelle-saas/
├── app/                          # Pages Next.js (App Router)
│   ├── api/                      # API Routes
│   │   ├── knowledge/            # Knowledge Base
│   │   │   ├── import-google/    # Import Google Business
│   │   │   └── structure-ai/     # Structuration IA
│   ├── dashboard/                # Dashboard principal
│   │   ├── knowledge/            # Base de connaissances
│   │   └── settings/             # Paramètres
│   └── client/                   # Interface client
├── src/components/               # Composants React
│   └── dashboard/                # Composants dashboard
├── lib/                          # Utilitaires
└── ...
```

## 🎯 Fonctionnalités Principales

### 1. Base de Connaissances Auto-Build
- ✅ Crawl de sites web
- ✅ Import depuis Google Business Profile
- ✅ Structuration automatique avec IA (Claude)
- ✅ Ajout manuel d'informations
- ✅ Visibilité sur les informations manquantes

### 2. Agent IA Sara
- ✅ Appels vocaux intelligents
- ✅ Prise de rendez-vous automatique
- ✅ Qualification de prospects
- ✅ Analytics des performances

### 3. Multi-Canal
- ✅ SMS, WhatsApp, Email, Voix

### 4. CRM & Analytics
- ✅ Gestion clients, rendez-vous, biens
- ✅ Dashboard temps réel
- ✅ Alertes intelligentes

## 🧪 Qualité du Code

Voir [SONARCLOUD_SETUP.md](./SONARCLOUD_SETUP.md)

```bash
npm run sonar
```

## 🌐 Déploiement

Voir [CLOUDFLARE_DEPLOY.md](./CLOUDFLARE_DEPLOY.md)

```bash
npm run pages:build
npm run pages:deploy
```

## 📝 Scripts

```bash
npm run dev          # Développement
npm run build        # Build production
npm run sonar        # Analyse SonarCloud
npm run pages:deploy # Déployer Cloudflare
```

---

**Développé avec ❤️ par l'équipe Coccinelle.AI**
