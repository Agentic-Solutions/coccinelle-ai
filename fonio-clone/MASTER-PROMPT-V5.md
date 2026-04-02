# AGENTIC OS — MASTER PROMPT UNIVERSEL
# Version 5.3 — Complet et définitif
# Youssef Amrouche — Agentic Solutions — Toulouse, France
# Domaine produit : 1agentic.io
# Domaine société : agenticsolutions.fr
# Ce fichier est la SOURCE DE VÉRITÉ principale d'Agentic OS
# Tout agent commence par lire ce fichier

---

## SECTION 1 — CONTEXTE FONDATEUR

Fondateur  : Youssef Amrouche
Entreprise : SAS Agentic Solutions (SIREN 944504679)
Ville      : Toulouse, France (57B CHE DES ETROITS, 31400)
Email      : youssef.amrouche@outlook.fr
Slack      : #agentic-os-builds + #sales
Cloudflare : 9c27dcacc982caff25e46d0756c87837
Domaine produit : 1agentic.io
Domaine société : agenticsolutions.fr
Expérience : 25 ans call center (Teleperformance, CCA, Arvato, SFR)
Profil     : Non-développeur — AI Product Architect
Certifs    : PMP, HEC Paris Digital Marketing, ESSEC Key Account, Big Data & AI

PROJETS ACTIFS :
1store.io       → ~/Downloads/creatorstore      → production
                  Frontend : https://creatorstore.youssef-amrouche.workers.dev
                  API      : https://onestore-api.youssef-amrouche.workers.dev
                  D1       : onestore-db (880e0154-3ac3-49dc-b4e3-a1190fdf4d0b)
                  Bugs     : download R2, webhooks Stripe, emails Resend

Coccinelle.ai   → ~/Downloads/coccinelle-ai    → production
                  API      : https://coccinelle-api.youssef-amrouche.workers.dev
                  Sara     : agent_08a97cb2a5c40c7e3274f8fa64
                  Voixia   : module interne — valeurs hardcodées à corriger

SIRH 360        → ~/Downloads/sirh-360-simple  → development
                  92% tests passent, seed data manquante

1Compta.io      → ~/Downloads/1compta          → development
1care.io        → ~/Downloads/1care            → prototype
1WMS.io         → ~/Downloads/wmsforge         → development
Agentic OS      → ~/Downloads/agentic-os       → in-progress

---

## SECTION 2 — STACK TECHNIQUE STANDARD

Frontend   : Next.js 15+ App Router, TypeScript strict, Tailwind CSS, Shadcn/ui
Backend    : Cloudflare Workers + Hono
Database   : Cloudflare D1 (SQLite)
Fichiers   : Cloudflare R2
Auth       : JWT via Web Crypto API (JAMAIS jsonwebtoken npm)
Paiements  : Stripe (Checkout + Webhooks + Connect)
Emails     : Resend
Voix IA    : Retell AI + Cartesia Sonic-3 + Claude Haiku
Téléphonie : Twilio
Déploiement: OpenNext + Cloudflare Pages + Workers

---

## SECTION 3 — 37 CONTRAINTES ABSOLUES

R01. TURBOPACK INTERDIT — "build": "next build --webpack"
R02. NEXT_PUBLIC_* dans .env.production UNIQUEMENT
R03. ORDRE DÉPLOIEMENT : D1 → Worker API → Frontend
R04. database_id JAMAIS placeholder — auto-patcher
R05. Vars sensibles → wrangler secret put UNIQUEMENT
R06. Vérifier le bon Worker avant secret put
R07. OpenNext OBLIGATOIRE pour SSR Cloudflare
R08. Worker API et Frontend = 2 projets séparés
R09. Fallback api-client JAMAIS localhost
R10. Cloudflare Pages cache → timestamp ou --skip-caching
R11. JAMAIS grep -P → grep -E ou python3
R12. sed -i '' sur macOS (sed -i sur Linux)
R13. JAMAIS HTML dans heredoc bash
R14. JWT_SECRET : openssl rand -hex 64 → secret put
R15. Rate limiting 5 req/min/IP sur /api/auth/*
R16. CORS liste blanche stricte, JAMAIS origin '*'
R17. Webhooks Stripe : HMAC avant traitement + 200 immédiat
R18. Download tokens : usage unique + expiration 24h
R19. JWT : httpOnly cookies, JAMAIS localStorage
R20. GitGuardian avant push → .gitignore complet
R21. SQL injection impossible → .bind() partout
R22. Headers sécurité : X-Content-Type-Options, X-Frame-Options
R23. DELETE /api/auth/me obligatoire (RGPD)
R24. TypeScript strict — JAMAIS any
R25. Commentaires UNIQUEMENT en français
R26. JAMAIS backticks dans vanilla JS
R27. Smoke tests après chaque deploy
R28. Build réussi AVANT déclaration de succès
R29. INTERDIT : jsonwebtoken, axios, moment.js, lodash
R30. SIRH 360 : seed data requise (leave_types + rôles)
R31. 1Compta.io : artifacts JSX sans backticks
R32. Coccinelle.ai : pas de MCP Retell → appels directs API
R33. JWT Web Crypto API ≠ Node.js jsonwebtoken
R34. Data Maroc : Cloudflare edge Casablanca, pas Data Localization
R35. Voixia : toutes valeurs depuis env.*, jamais hardcodées

R36. BACKUP OBLIGATOIRE avant toute mission sur projet existant
     ORDRE IMMUABLE avant d intervention :
     1. git add -A && git commit -m "backup avant mission [date]"
     2. npx wrangler d1 export --remote --output=backup_[date].sql
     3. Snapshot MEMORY.md dans projects/logs/[projet]/
     JAMAIS modifier le code avant confirmation backup complet.
     Le Backup Agent est le PREMIER agent lance sur tout projet existant.
     Sur nouveau projet from scratch : backup non requis.

R37. STATUTS DE PROJET — 6 états possibles dans registry.json
     draft      : projet cree, pas encore de code
                  Visible dans "Brouillons" du dashboard
     in_progress : mission en cours — agents au travail
                  Visible dans "En cours" du dashboard
     paused     : mission interrompue — peut reprendre
                  Visible dans "En cours" du dashboard
                  MEMORY.md contient l etat exact de la pause
     development: code existant, pas encore en prod
     production : deploye et accessible publiquement
     archived   : projet abandonne — conserve en lecture seule
     JAMAIS supprimer un projet — toujours archiver.
     Un projet interrompu = status paused + snapshot sauvegarde.

---

## SECTION 4 — ARCHITECTURE COMPLÈTE v5.0

~/Downloads/agentic-os/
├── MASTER-PROMPT-V5.md           ← CE FICHIER
├── AGENTIC-OS-BOOTSTRAP-V5.md    ← Prompt de construction
├── MASTER_ORCHESTRATOR.md        ← Cerveau du système
├── SALES-ORCHESTRATOR.md         ← Système de vente
├── package.json + cli.js + README.md + .gitignore
│
├── dashboard/                    ← Next.js 15 (12 pages)
│   └── src/app/
│       ├── page.tsx              ← 3 sections : Brouillons/En cours/Projets
│       │   BROUILLONS (draft) / EN COURS (in_progress+paused)
│       │   PROJETS (development+production+archived)
│       ├── projects/new/         ← INTAKE AGENT CHAT ← NOUVEAU
│       ├── projects/[id]/        ← Terminal + missions
│       ├── sales/                ← Pipeline Kanban
│       ├── sales/report/         ← Rapport quotidien
│       ├── landing-builder/      ← Wizard LP 6 étapes
│       ├── settings/             ← Clés API + profil
│       ├── analytics/            ← Métriques globales
│       ├── templates/            ← Bibliothèque templates
│       ├── scheduler/            ← Missions planifiées
│       ├── evolution/            ← AUTO-APPRENTISSAGE ← NOUVEAU
│       └── demo/                 ← MODE DÉMO ← NOUVEAU
│
├── api/                          ← Worker Cloudflare Hono
│   └── src/
│       ├── index.ts              ← 20 routes montées
│       ├── routes/               ← 16 fichiers de routes
│       ├── crons/
│       │   ├── sales-cron.ts     ← 8h/9h/14h/18h
│       │   └── learning-cron.ts  ← Lundi 2h ← NOUVEAU
│       ├── lib/
│       │   ├── claude-runner.ts
│       │   ├── skill-injector.ts
│       │   ├── notifier.ts
│       │   ├── email-sales-templates.ts
│       │   ├── intake-processor.ts    ← NOUVEAU
│       │   └── collective-learner.ts  ← NOUVEAU
│       └── db/
│           ├── schema.sql
│           ├── sales-schema.sql
│           └── intake-schema.sql      ← NOUVEAU
│
├── agents/                       ← 29 agents définis
│   ├── ceo/cto/cpo/cfo/clo/cmo-agent.md
│   ├── sales-orchestrator.md
│   ├── workers/ (10 experts)
│   └── transversal/ (8 gardiens)
│       ├── intake-agent.md            ← NOUVEAU
│       ├── collective-intelligence-agent.md ← NOUVEAU
│       ├── feedback-agent.md          ← NOUVEAU
│       ├── evolution-agent.md         ← NOUVEAU
│       ├── truth-agent.md
│       ├── observer-agent.md
│       ├── memory-agent.md
│       ├── reviewer-agent.md
│       └── rollback-agent.md
│
├── missions/                     ← 25 templates
│   └── intake-improvement.md     ← NOUVEAU
│
├── landing/                      ← LP + 4 templates
│
└── projects/
    ├── registry.json
    ├── memory/                   ← 7 MEMORY.md
    ├── logs/                     ← Logs par projet
    ├── intake/                   ← NOUVEAU
    │   ├── learned_questions.json ← 7 questions initiales
    │   ├── sessions/
    │   └── patterns/
    ├── versions/                 ← Historique versions ← NOUVEAU
    ├── roadmap/
    ├── legal/
    └── press/

---

## SECTION 5 — SYSTÈME D'AGENTS v5.0 (26 agents)

HIÉRARCHIE :
CEO Agent (orchestrateur)
├── CPO Agent → Produit, roadmap RICE
├── CTO Agent → Architecture, stack
├── CFO Agent → Finance, coûts
├── CLO Agent → Legal, RGPD
├── CMO Agent → Marketing, growth
└── Sales Orchestrator → Vente autonome

WORKER AGENTS (10) :
backend-expert / frontend-expert / security-expert
voice-ai-expert / devops-expert / legal-expert
stripe-expert / test-expert / mobile-expert / monitoring-expert
ux-expert / observability-expert / backup-agent

WORKER AGENTS (11 — ajout ux-expert) :
ux-expert : User flows, parcours client, empty states,
onboarding, conversion, accessibilité de base.
Intervient AVANT frontend-expert sur chaque feature.
Checklist : CTA visible, empty states, loading states,
erreurs compréhensibles, max 3 étapes avant valeur.

AGENTS TRANSVERSAUX (8) :
intake-agent          → PREMIER APPELÉ — comprend le besoin
collective-intelligence → Apprend de tous les projets
feedback-agent        → Collecte notes post-build
evolution-agent       → Versioning automatique
truth-agent           → 40 points — BLOQUE si < 35
observer-agent        → Surveille les conflits
memory-agent          → Met à jour MEMORY.md
reviewer-agent        → Valide avant merge
rollback-agent        → Annule si régression

PROTOCOLE ANTI-COLLISION :
Fichiers jamais modifiés directement :
worker/src/index.ts / worker/src/db/schema.sql
worker/wrangler.toml / src/app/(dashboard)/layout.tsx
src/lib/api-client.ts
Les agents créent _patch_agentN_fichier.ts
L'orchestrateur fait le merge final.

---

## SECTION 6 — INTAKE AGENT (détail complet)

QUAND : Avant toute nouvelle mission de création d'app
RÔLE : Transformer une description vague en brief parfait

QUESTIONS FIXES (socle permanent) :
1. "Décris ton app en 1 phrase"
2. "Quel problème elle résout ?"
3. "C'est pour des entreprises (B2B) ou des particuliers (B2C) ?"
4. "Les 3 features sans lesquelles l'app ne sert à rien ?"
5. "Tu as besoin de paiements en ligne ?"
6. "Tu veux un agent vocal ?"
7. "C'est un MVP pour valider ou une app finale ?"

QUESTIONS APPRISES (évoluent automatiquement) :
Lire projects/intake/learned_questions.json
Filtrer par project_type et success_rate > 0.7
Poser en ordre de confiance décroissante

QUESTIONS INITIALES CONNUES (7) :
- Multi-tenant pour SaaS B2B (success_rate: 0.73)
- Données de santé RGPD renforcé (success_rate: 0.89)
- Invitation collaborateurs B2B (success_rate: 0.68)
- Système de notifications (success_rate: 0.71)
- Appels entrants ou sortants voice agent (success_rate: 0.95)
- Dashboard analytics voice agent (success_rate: 0.82)
- Offline/online app mobile (success_rate: 0.78)

OUTPUT : Brief structuré JSON + confidence_score 0-100
Si confidence < 70 → poser des questions complémentaires
Si confidence >= 70 → afficher brief + demander confirmation

---

## SECTION 7 — BOUCLE D'AUTO-APPRENTISSAGE

```
UTILISATEUR décrit son besoin
        ↓
INTAKE AGENT pose questions (fixes + apprises)
        ↓
BRIEF PARFAIT généré (confidence_score)
        ↓
AGENTS construisent l'app
        ↓
TRUTH AGENT valide (40 points)
        ↓
APP DÉPLOYÉE
        ↓
30 MINUTES APRÈS
FEEDBACK AGENT demande une note (1-5 étoiles)
        ↓
COLLECTIVE INTELLIGENCE analyse :
- Si corrections post-build → question manquante ?
- Si rating < 3 → feature manquante ?
        ↓
PATTERN DÉTECTÉ 5+ fois
        ↓
NOUVELLE QUESTION SUGGÉRÉE
confidence > 90% → auto-validée
confidence 70-90% → Youssef valide
        ↓
QUESTION AJOUTÉE dans learned_questions.json
        ↓
PROCHAINS PROJETS bénéficient de cette question
        ↓
EVOLUTION AGENT :
5+ questions validées → MASTER-PROMPT-V5.1.md
Notification email + changelog détaillé
```

PROPRIÉTÉ DE L'INTELLIGENCE :
- Toutes les données stockées dans D1 Cloudflare (tes serveurs)
- Jamais de données personnelles dans la télémétrie
- user_hash anonymisé (jamais l'email)
- Consentement explicite dans les CGV
- Tu es propriétaire de la Knowledge Base
- La Knowledge Base = ton avantage compétitif défendable

---

## SECTION 8 — TRUTH AGENT (40 points)

BLOC A — Déploiement (10 pts) :
A1-A10 : webpack, .env.production, ordre D1→API→Frontend,
database_id, secret put, bon Worker, OpenNext,
2 projets séparés, pas localhost, build réussi

BLOC B — Sécurité (15 pts) :
B1-B15 : JWT 64chars, rate limiting, CORS whitelist,
HMAC Stripe, httpOnly cookies, download tokens,
pas de secrets, .gitignore, DELETE me, headers,
SQL bind, logs propres, validation, pas de stack trace, HTTPS

BLOC C — Qualité (10 pts) :
C1-C10 : TypeScript 0 erreurs, français, grep-E,
sed macOS, pas backticks, smoke tests, MEMORY.md,
pas TODO, env documentées, pas de dépendances interdites

BLOC D — Stack (5 pts) :
D1-D5 : App Router, Hono, D1, Web Crypto, fetch natif

SEUIL : 35/40 minimum pour déployer

---

## SECTION 9 — SYSTÈME DE VENTE AUTONOME

6 PRODUITS :
1store.io / Coccinelle.ai / SIRH 360 / 1Compta.io
Dev sur mesure / Agentic OS (149/299/499€/mois)

7 CANAUX :
LinkedIn / Cold Email / WhatsApp / Sara Retell AI
Instagram DMs / Google Ads / Meta Ads

SCORING : > 80 pts → Sara appelle dans 2h

CRONS : 8h rapport / 9h emails / 14h relances / 18h scores

---

## SECTION 10 — UNIVERSAL APP BUILDER

Lire missions/universal-app-builder.md

PHASE -2 : Intake Agent — interview utilisateur
PHASE -1 : Truth Agent — valide le plan
PHASE 0  : CEO analyse, affiche plan
PHASE 1  : Préparation (D1, structure, MEMORY.md)
PHASE 2  : 8 agents parallèles
PHASE 2.5: Truth Agent — valide (>= 35/40)
PHASE 3  : Déploiement ordre strict
PHASE 4  : Tests flux complet
PHASE 5  : MAJ mémoire + notification
PHASE 6  : Feedback Agent (30min après)

---

## SECTION 11 — LANDING PAGE BUILDER

Wizard 6 étapes dans /landing-builder
4 templates : modern / minimal / bold / gradient
11 sections dont intake_demo (NOUVEAU)
HTML standalone + Next.js + API preview/generate

---

## SECTION 12 — SKILL INJECTOR

voice-agent → expert-retell-twilio
saas-web-app → dev-assistant-youssef
seo → seo-specialist
copy → copywriter-saas
marketing → directeur-marketing-digital
email → email-marketing-specialist
ads → media-buyer
growth → growth-hacker
community → community-manager
finance → expert-finance-crypto
influencer → influencer-manager
content → content-manager
data → data-analyst-marketing
design → graphic-designer
video → video-motion-designer

---

## SECTION 13 — PARCOURS UTILISATEUR v5.0

ÉTAPE 1 — Première connexion
→ http://localhost:3000
→ Mode démo proposé automatiquement
→ Configurer clés API dans /settings

ÉTAPE 2 — Créer une nouvelle app
→ Cliquer "+ Nouveau projet"
→ INTAKE AGENT pose les questions (chat)
→ Brief structuré affiché + confidence score
→ Confirmer → agents lancés

ÉTAPE 3 — Les agents travaillent
→ AgentTerminal live avec couleurs
→ Truth Agent valide avant déploiement
→ Email + Slack à la fin

ÉTAPE 4 — Feedback (30 min après)
→ "Comment tu évalues le résultat ? ⭐⭐⭐⭐⭐"
→ Alimente l'intelligence collective

ÉTAPE 5 — Améliorer et gérer
→ 25 missions disponibles
→ /evolution → voir ce qu'Agentic OS a appris
→ Rapport quotidien 8h

---

## SECTION 14 — CLI v5.0

node cli.js --new "description"     ← Intake Agent intégré
node cli.js --project X --mission Y
node cli.js --status
node cli.js --memory 1store
node cli.js --list
node cli.js --sales "prospection"
node cli.js --feedback 1store-io 5 "parfait"
node cli.js --evolution             ← NOUVEAU
node cli.js --demo                  ← NOUVEAU

---

## SECTION 15 — COMMENT UTILISER CE PROMPT

CAS 1 — Bootstrap from scratch :
Coller AGENTIC-OS-BOOTSTRAP-V5.md dans Claude Code

CAS 2 — Créer une app :
"Lis Section 10 (Universal App Builder)
 → Intake Agent posera les questions"

CAS 3 — Mission sur projet existant :
"Lis Section 8 (Truth Agent) + MEMORY.md [projet]
 → Lance mission [nom]"

CAS 4 — Voir l'apprentissage :
"Lis Section 7 (Boucle d'apprentissage)
 → Affiche projects/intake/learned_questions.json"

CAS 5 — Valider des questions suggérées :
"Lis Section 7 → Lance missions/intake-improvement.md"

---

## SECTION 16 — WORKFLOW DE MISSION COMPLET

1. Lire MASTER-PROMPT-V5.md + registry.json + MEMORY.md
2. Intake Agent — interview (si nouveau projet)
3. Truth Agent — valide le plan
4. Lancer agents en parallèle via Task tool
5. Merger les patches
6. Truth Agent — 40 points (>= 35 pour déployer)
7. Déployer : D1 → Worker API → Frontend
8. Smoke tests
9. MAJ MEMORY.md + registry.json + logs
10. Notifier Resend + Slack
11. Feedback Agent — 30min après

---

## SECTION 17 — FORMAT RAPPORT FINAL

╔══════════════════════════════════════════════════════╗
║  AGENTIC OS v5.0 — MISSION TERMINÉE                 ║
╚══════════════════════════════════════════════════════╝
Projet    : [nom] ([status])
Mission   : [description]
Durée     : [Xh Xmin]
Agents    : [liste]
Intake    : confidence [X]% — [N] questions posées

TRUTH AGENT : [X]/40
├── A Déploiement : [X]/10
├── B Sécurité    : [X]/15
├── C Qualité     : [X]/10
└── D Stack       : [X]/5

URLS :
├── Frontend : https://[nom].youssef-amrouche.workers.dev
└── API      : https://[nom]-api.youssef-amrouche.workers.dev

SECRETS À CONFIGURER :
└── npx wrangler secret put JWT_SECRET
    npx wrangler secret put [autres]

FEEDBACK : Dans 30 minutes tu recevras une demande
de notation pour améliorer le système.

📧 youssef.amrouche@outlook.fr
💬 #agentic-os-builds

---

## SECTION 18 — OBSERVABILITÉ

Chaque Worker Cloudflare doit avoir :
- api/src/lib/logger.ts : logs JSON structures
- api/src/middleware/tracing.ts : request_id sur chaque requete
- Alertes sur : error rate > 1%, p95 > 2s, uptime < 99.9%
- JAMAIS de donnees personnelles dans les logs
- JAMAIS de cles ou tokens dans les logs
- Rotation automatique apres 30 jours (RGPD)

Format log obligatoire :
{
  "level": "info|warn|error|debug",
  "timestamp": "ISO8601",
  "service": "agentic-os-api",
  "request_id": "uuid-v4",
  "action": "mission.run",
  "duration_ms": 234,
  "user_hash": "sha256-anonyme",
  "truth_score": 37,
  "error": null
}

---

## SOURCES DE VÉRITÉ (ordre de priorité)

1. MASTER-PROMPT-V5.md (ce fichier)
2. missions/universal-app-builder.md
3. agents/transversal/truth-agent.md (40 points)
4. agents/transversal/intake-agent.md
5. MASTER_ORCHESTRATOR.md
6. projects/intake/learned_questions.json
7. MEMORY.md du projet concerné
