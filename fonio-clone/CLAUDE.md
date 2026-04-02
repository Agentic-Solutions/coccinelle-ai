# FONIO-CLONE — Instructions Projet pour Claude Code

## QUI EST LE DÉVELOPPEUR

**Youssef Amrouche** — Fondateur d'Agentic Solutions SASU
- Débutant en développement — TOUJOURS expliquer pas à pas
- Valide chaque étape avant de passer à la suivante

## LE PROJET

**Fonio-Clone** = SaaS de téléphonie cloud avec agents vocaux IA
- Clone de Fonio.app
- Téléphonie cloud (Telnyx), agents IA (RetellAI), CRM, SMS
- Dashboard complet avec 13+ pages
- Multi-tenant avec rôles (owner, admin, manager, agent)

## STACK TECHNIQUE

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15 App Router + TypeScript strict + Tailwind CSS |
| Backend | Cloudflare Workers (via @cloudflare/next-on-pages) |
| Database | Cloudflare D1 (SQLite) — ID: `4983985f-4220-40bd-9cda-89aa49024a76` |
| Storage | Cloudflare R2 (bucket: `fonio-recordings`) |
| Auth | better-auth (avec D1) |
| Téléphonie | Telnyx (voix, SMS, numéros, WebRTC) — PAS Twilio |
| Voix IA | RetellAI |
| Paiements | Stripe (Checkout + Webhooks) |
| Icônes | lucide-react (PAS @heroicons) |
| Déploiement | Cloudflare Pages |

## RÈGLES ABSOLUES (du MASTER-PROMPT-V5)

R01. TURBOPACK INTERDIT — `"dev": "next dev"` (webpack par défaut)
R07. OpenNext / @cloudflare/next-on-pages pour le build
R16. CORS liste blanche stricte, JAMAIS origin '*'
R19. JWT : httpOnly cookies, JAMAIS localStorage
R21. SQL injection impossible → .bind() partout
R24. TypeScript strict — JAMAIS `any`
R25. Commentaires UNIQUEMENT en français
R29. INTERDIT : jsonwebtoken, axios, moment.js, lodash

## STRUCTURE DU PROJET

```
fonio-clone/
├── CLAUDE.md                          # CE FICHIER
├── MASTER-PROMPT-V5.md                # Règles universelles Agentic OS
├── AGENTIC-OS-BOOTSTRAP-V5.md         # Prompt de construction
├── package.json
├── wrangler.toml                      # Config Cloudflare (D1 + R2)
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── .env.local.example
├── migrations/001_schema.sql          # 15 tables D1/SQLite
│
├── src/
│   ├── types/
│   │   ├── cloudflare.ts              # D1Database, R2Bucket, CloudflareEnv
│   │   ├── database.ts               # Types pour toutes les tables
│   │   └── telnyx.ts                  # Types webhooks Telnyx
│   │
│   ├── lib/
│   │   ├── db.ts                      # Client D1 + helpers R2
│   │   ├── auth.ts                    # better-auth avec D1
│   │   ├── utils.ts                   # cn(), formatPhone, formatDuration...
│   │   └── telnyx/client.ts           # Client API Telnyx complet
│   │
│   ├── components/layout/
│   │   ├── Header.tsx                 # Header avec recherche + notifications
│   │   └── Sidebar.tsx                # Navigation latérale collapsible
│   │
│   ├── app/
│   │   ├── layout.tsx                 # Layout racine
│   │   ├── globals.css                # Variables CSS + Tailwind
│   │   │
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             # Sidebar + Header
│   │   │   ├── page.tsx               # Home KPIs
│   │   │   ├── calls/page.tsx         # Liste appels
│   │   │   ├── calls/[id]/page.tsx    # Détail appel
│   │   │   ├── calls/dialer/page.tsx  # Dialer WebRTC
│   │   │   ├── contacts/page.tsx      # CRM contacts
│   │   │   ├── contacts/[id]/page.tsx # Détail contact
│   │   │   ├── phone-numbers/page.tsx # Numéros virtuels
│   │   │   ├── phone-numbers/buy/page.tsx
│   │   │   ├── ai-agents/page.tsx     # Agents IA
│   │   │   ├── ai-agents/new/page.tsx
│   │   │   ├── sms/page.tsx           # Conversations SMS
│   │   │   ├── voicemail/page.tsx     # Messagerie vocale
│   │   │   ├── analytics/page.tsx     # Analytiques
│   │   │   └── settings/page.tsx      # Paramètres
│   │   │
│   │   └── api/
│   │       ├── auth/[...all]/route.ts # better-auth handler
│   │       └── webhooks/
│   │           ├── telnyx/route.ts    # Webhooks Telnyx
│   │           ├── retell/route.ts    # Webhooks RetellAI
│   │           └── stripe/route.ts    # Webhooks Stripe
```

## CLOUDFLARE

- Account ID: `9c27dcacc982caff25e46d0756c87837`
- D1 Database: `fonio-db` (ID: `4983985f-4220-40bd-9cda-89aa49024a76`)
- R2 Bucket: `fonio-recordings`
- Migration déjà exécutée (37 requêtes, 15 tables créées)

## COMMANDES

```bash
# Développement local
npm run dev

# Build pour Cloudflare
npm run build

# Déployer
npm run deploy

# Migration D1 (déjà faite)
npm run d1:migrate:prod
```

## ÉTAT ACTUEL — CE QUI RESTE À FAIRE

### Priorité 1 — Faire tourner `npm run dev` sans erreur
- Corriger tous les imports cassés
- Corriger les erreurs TypeScript
- S'assurer que toutes les pages s'affichent

### Priorité 2 — Connecter le backend
- API routes fonctionnelles avec D1
- Authentification better-auth opérationnelle
- CRUD contacts, appels, numéros

### Priorité 3 — Intégrations
- Telnyx : acheter numéros, passer appels, envoyer SMS
- RetellAI : créer et gérer agents vocaux
- Stripe : abonnements et facturation

### Priorité 4 — Déploiement
- Configurer les secrets (wrangler secret put)
- Build et déployer sur Cloudflare Pages
- Tests smoke en production

## MÉTHODE DE TRAVAIL

- Utiliser Task tool pour lancer des agents en parallèle
- Chaque agent corrige un domaine spécifique
- Tester après chaque correction
- JAMAIS déployer sans build réussi
