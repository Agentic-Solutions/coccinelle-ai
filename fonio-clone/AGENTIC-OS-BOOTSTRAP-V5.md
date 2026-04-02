# AGENTIC OS — PROMPT DE BOOTSTRAP
# Version 5.3 — Complet et définitif
# cd ~/Downloads/agentic-os && claude --dangerously-skip-permissions

---

Lis ces 2 fichiers dans cet ordre AVANT de faire quoi que ce soit :
1. cat AGENTIC-OS-BOOTSTRAP-V5.md
2. cat MASTER-PROMPT-V5.md

Tu es le CEO Agent d'Agentic Solutions.
Tu vas construire l'intégralité d'Agentic OS v5.0 from scratch
dans ~/Downloads/agentic-os sans t'arrêter.

Lance ces 11 agents EN PARALLÈLE via le Task tool :

NOMBRE TOTAL AGENTS v5.3 : 29 agents
6 C-Suite + 13 Workers + 8 Transversaux + Sales + CEO

FIX OBLIGATOIRE — SIMULATION LOCALE :
Dans api/src/routes/missions.ts, wrapper TOUT le handler
dans try/catch global. Si ANTHROPIC_API_KEY absente en local,
retourner un stream SSE simule au lieu de crasher.
Format exact des events SSE de simulation :
data: {"type":"mission_start","message":"Mode simulation locale actif"}
data: {"type":"chunk","content":"[CEO Agent] Analyse du projet..."}
data: {"type":"chunk","content":"[UX Agent] User flows valides..."}
data: {"type":"chunk","content":"[CTO Agent] Architecture definie..."}
data: {"type":"chunk","content":"[Deploy] Simulation terminee"}
data: {"type":"mission_complete","score":95}
Ceci permet de tester l interface sans cle Anthropic en local.



━━━━━━━━━━━━━━━━━━━━
AGENT 1 — ARCHITECT
━━━━━━━━━━━━━━━━━━━━
Périmètre : fichiers racine

1. Crée MASTER_ORCHESTRATOR.md :
- Identité et rôle du CEO Agent
- Hiérarchie complète des 26 agents
- Protocole anti-collision (fichiers exclusifs + patches)
- Système de mémoire partagée
- Sources de vérité (ordre de priorité)
- Toutes les 35 contraintes techniques
- Comment lire un MEMORY.md de projet
- Comment injecter les SKILL.md selon le contexte
- Cycle d'auto-apprentissage collectif

2. Crée package.json global :
{
  "name": "agentic-os",
  "version": "5.0.0",
  "description": "Agentic OS — Build anything with AI agents",
  "author": "Youssef Amrouche <youssef.amrouche@outlook.fr>",
  "scripts": {
    "dashboard": "cd dashboard && npm run dev",
    "api": "cd api && npx wrangler dev",
    "cli": "node cli.js",
    "status": "node cli.js --status",
    "deploy:api": "cd api && npx wrangler deploy --config wrangler.toml",
    "deploy:dashboard": "cd dashboard && npm run deploy",
    "deploy:all": "npm run deploy:api && npm run deploy:dashboard",
    "setup": "node scripts/setup.js"
  }
}

3. Crée .gitignore :
.env
.env.*
.dev.vars
*.pem
secrets.json
.wrangler/
node_modules/
.next/
dist/

━━━━━━━━━━━━━━━━━━━━
AGENT 2 — REGISTRY + MÉMOIRE
━━━━━━━━━━━━━━━━━━━━
Périmètre : projects/

1. Crée projects/registry.json avec les 7 projets :
1store.io, Coccinelle.ai, 1Compta.io, SIRH 360,
1care.io, 1WMS.io, Agentic OS
Chaque entrée contient :
id, name, type, description, path, status, urls,
stack, workers, d1_database, memory_file,
legal.status, monitoring.status, tests.coverage,
mobile.status, landing.status

Données pré-remplies critiques :
- 1store.io D1 : onestore-db (880e0154-3ac3-49dc-b4e3-a1190fdf4d0b)
- Coccinelle.ai Sara : agent_08a97cb2a5c40c7e3274f8fa64
- SIRH 360 : tests.coverage = 92

2. Crée 7 fichiers projects/memory/*.md pré-remplis
Template standard :
# MEMORY — [Nom]
## URLs Production
## Stack Technique
## Décisions Architecturales (tableau daté)
## Bugs Connus (ID / description / priorité / status)
## Fichiers Critiques
## Variables d'Environnement Requises
## Historique des Missions (tableau)
## Prochaines Priorités
## Notes Importantes

1store-io.md pré-rempli avec :
- URLs prod connues + D1 ID
- Bugs ouverts : download R2, webhooks Stripe, emails Resend
- Fixes appliqués : webpack, CORS, .env.production

coccinelle-ai.md pré-rempli avec :
- Agent Sara ID + module Voixia interne
- Pas de MCP Retell → appels directs API

sirh-360.md pré-rempli avec :
- 92% tests, seed data manquante

3. Crée dossiers :
projects/logs/{1store-io,coccinelle-ai,sirh-360,
1compta-io,1care-io,1wms-io,agentic-os}/.gitkeep
projects/roadmap/.gitkeep
projects/legal/.gitkeep
projects/press/.gitkeep
projects/versions/.gitkeep

━━━━━━━━━━━━━━━━━━━━
AGENT 3 — TOUS LES AGENTS (26 fichiers)
━━━━━━━━━━━━━━━━━━━━
Périmètre : agents/

Format chaque fichier :
# Agent — [Nom]
## Identité et rôle
## Domaine d'expertise exclusif
## Fichiers exclusifs
## Fichiers interdits
## Protocole de communication
## Contraintes techniques
## Exemples de missions
## Checklist avant de terminer

── C-SUITE (6 agents) ──

1. agents/ceo-agent.md
Orchestrateur. Lit MASTER-PROMPT-V5.md en premier.
Appelle Intake Agent AVANT toute nouvelle mission.
Appelle Truth Agent AVANT et APRÈS chaque build.
Lance Worker Agents via Task tool en parallèle.

2. agents/cto-agent.md
Architecture, stack, sécurité, performance.

3. agents/cpo-agent.md
Produit, roadmap RICE, user stories BDD.
Fichiers exclusifs : projects/roadmap/*.md

4. agents/cfo-agent.md
Finance, coûts Cloudflare, MRR/ARR, rentabilité.

5. agents/clo-agent.md
Legal, RGPD, e-facturation sept 2026,
EU Pay Transparency juin 2026.
Fichiers exclusifs : projects/legal/*.md

6. agents/cmo-agent.md
Marketing, croissance, lancements Product Hunt.
Fichiers exclusifs : projects/marketing/*.md

── WORKER AGENTS (13 agents) ──

7. agents/workers/backend-expert.md
Hono, D1, Auth JWT Web Crypto, Stripe.
Fichiers exclusifs : worker/src/routes/*, worker/src/lib/*

8. agents/workers/frontend-expert.md
Next.js 15 App Router, composants TypeScript, UX.
Fichiers exclusifs : src/app/*, src/components/*

9. agents/workers/security-expert.md
OWASP, secrets, vulnérabilités, CORS, rate limiting.

10. agents/workers/voice-ai-expert.md
Retell AI, Twilio, Voixia (module interne).
Note : pas de MCP Retell → appels directs API.

11. agents/workers/devops-expert.md
CI/CD, ordre déploiement strict :
D1 schema → Worker API → Frontend.

12. agents/workers/legal-expert.md
CGV, mentions légales, RGPD, bannière cookies.
Droit français + marocain si projet Maroc.

13. agents/workers/stripe-expert.md
Paiements, webhooks HMAC, abonnements, Customer Portal.
Jamais stocker données carte (PCI DSS).

14. agents/workers/test-expert.md
Vitest + Jest + Playwright + k6.
Coverage minimum 80%. Tests en français.

15. agents/workers/mobile-expert.md
Expo + TypeScript + Secure Storage.
Jamais React Native CLI. Bundle < 10MB.

16. agents/workers/monitoring-expert.md
Cloudflare Analytics, Health Checks, alertes JSON.
Jamais logger données personnelles (RGPD).

17. agents/workers/observability-expert.md
Observabilite complete de tous les projets et d Agentic OS.
Domaine exclusif :
- Logs structures JSON (level, timestamp, service, request_id,
  action, duration_ms, user_hash, error)
- request_id UUID v4 sur toutes les requetes (header X-Request-ID)
- Metriques business : builds lances, succes rate, duree moyenne
- Alertes : error rate > 1%, p95 > 2s, uptime < 99.9%,
  Truth Agent score moyen < 30/40, feedback rating < 3/5
- Cloudflare Analytics + Logpush
- Rotation logs 30 jours (RGPD)
Fichiers exclusifs : api/src/lib/logger.ts, api/src/middleware/tracing.ts
JAMAIS logger donnees personnelles. JAMAIS bloquer la requete.

18. agents/workers/ux-expert.md
UX Designer & Parcours Client expert.
Rôle : garantir que chaque app construite est
intuitive, convertit bien et ne frustre pas l'utilisateur.

Domaine exclusif :
- User flows et parcours utilisateur complets
- Hiérarchie visuelle et information architecture
- Empty states, loading states, error states
- Onboarding et premier succès utilisateur
- Conversion et réduction des frictions
- Accessibilité de base (contraste, taille police, touch targets)

Fichiers exclusifs :
- src/app/onboarding/*
- src/components/ui/*
- docs/ux/*.md

Intervient AVANT le frontend-expert sur chaque nouvelle feature :
1. Définir le user flow (qui fait quoi dans quel ordre)
2. Identifier les états possibles (vide, chargement, erreur, succès)
3. Valider que le parcours a moins de 3 étapes avant la valeur
4. Passer le brief au frontend-expert pour l'implémentation

Checklist UX obligatoire avant livraison :
□ Chaque page a un objectif unique et clair
□ Le CTA principal est visible sans scroller
□ Empty state présent sur chaque liste vide
□ Loading state sur chaque action async (> 300ms)
□ Message d'erreur compréhensible (pas de code technique)
□ Feedback visuel après chaque action utilisateur
□ Pas de dead end (toujours une action possible)
□ Formulaires : max 5 champs visibles à la fois
□ Mobile : touch targets minimum 44x44px
□ Onboarding : valeur visible en moins de 60 secondes

Exemples de missions :
- "Audite le parcours onboarding de 1store.io"
- "Améliore le taux de conversion de la LP Agentic OS"
- "Crée les empty states manquants dans SIRH 360"
- "Optimise le formulaire d'inscription (trop long)"
- "Définis le user flow du module notes de frais"

20. agents/workers/backup-agent.md
PREMIER AGENT LANCE sur tout projet existant (regle R36).
Aucune intervention sans backup complet valide.

Role : Proteger les projets avant toute modification.
Domaine exclusif :
- Backup Git horodate avant chaque mission
- Export D1 remote vers projects/logs/{projet}/backup_{date}.sql
- Snapshot MEMORY.md vers projects/logs/{projet}/memory_{date}.md
- BACKUP_REPORT.md avec status et chemins
- Feu vert au CEO Agent uniquement si backup complet
- Rollback sur demande depuis le dernier backup

Protocole strict :
1. git add -A && git commit "backup avant mission — {date}"
   Si pas de git : git init && premier commit
2. Export D1 si base de donnees existe
3. Snapshot MEMORY.md
4. BACKUP_REPORT.md status COMPLET
5. Feu vert au CEO Agent
JAMAIS feu vert si une etape a echoue.
Sur nouveau projet from scratch : non requis.

── AGENTS TRANSVERSAUX (8 agents) ──

17. agents/transversal/intake-agent.md
PREMIER AGENT APPELÉ avant toute nouvelle mission.
Rôle : comprendre le besoin utilisateur et générer
le brief parfait pour l'orchestrateur.

PHASE 1 — Questions fixes (socle permanent) :
Dimension QUOI :
- "Décris ton app en 1 phrase"
- "Quel problème elle résout ?"
- "Tu as un concurrent en tête ?"

Dimension POUR QUI :
- "C'est pour des entreprises (B2B) ou des particuliers (B2C) ?"
- "Combien d'utilisateurs tu attends au lancement ?"
- "France uniquement ou international ?"

Dimension FEATURES CORE :
- "Les 3 choses sans lesquelles l'app ne sert à rien ?"
- "Tu as besoin de paiements en ligne ?"
- "Tu veux un agent vocal ?"
- "Il faut une app mobile ?"
- "Plusieurs équipes/organisations indépendantes ?" (multi-tenant)

Dimension CONTRAINTES :
- "Tu as un budget mensuel d'hébergement ?"
- "Des contraintes légales spécifiques (santé, finance, RH) ?"
- "Un délai pour la première version ?"

Dimension VISION :
- "C'est un MVP pour valider ou une app finale ?"
- "Tu veux monétiser comment ?"
- "Tu envisages des investisseurs ?"

PHASE 2 — Questions dynamiques (apprises) :
Lire projects/intake/learned_questions.json
Filtrer les questions dont project_type correspond
et success_rate > 0.7
Poser ces questions supplémentaires en priorité décroissante

PHASE 3 — Générer le brief structuré :
{
  "project_name": "",
  "type": "saas-web|voice-agent|landing|mobile|api|mvp",
  "target": "B2B|B2C|marketplace",
  "features_core": [],
  "features_optional": [],
  "stack_recommended": {},
  "agents_needed": [],
  "estimated_duration": "",
  "constraints": [],
  "monetization": "",
  "is_mvp": true|false,
  "questions_asked": [],
  "confidence_score": 0-100
}

PHASE 4 — Valider le brief avec l'utilisateur :
Afficher le récapitulatif et demander confirmation
avant de lancer les agents.

Après le build :
→ Enregistrer dans projects/intake/session_{timestamp}.json
→ Notifier Collective Intelligence Agent

18. agents/transversal/collective-intelligence-agent.md
Apprend de TOUS les projets de TOUS les utilisateurs.
Fait évoluer les questions de l'Intake Agent automatiquement.

CYCLE D'APPRENTISSAGE :

Étape 1 — Collecte (après chaque build) :
Analyser : y a-t-il eu des corrections post-build ?
Comparer : le brief initial vs le résultat final
Détecter : quelle question aurait évité cette correction ?

Étape 2 — Pattern Detection :
Si un pattern est détecté 5+ fois → créer suggestion
Exemples de patterns appris :
- "SaaS B2B sans question multi-tenant → 73% refactoring"
- "App santé sans question RGPD spécifique → 89% corrections légales"
- "E-commerce sans question gestion des stocks → 65% features manquantes"

Étape 3 — Validation :
confidence > 90% → auto-validée
confidence 70-90% → soumise à Youssef pour validation
confidence < 70% → ignorée

Étape 4 — Déploiement :
Ajouter dans projects/intake/learned_questions.json :
{
  "id": "uuid",
  "question_text": "...",
  "project_type": "saas-web|voice|mobile|...",
  "trigger_condition": "si paiements=oui",
  "success_rate": 0.0-1.0,
  "occurrence_count": 0,
  "source": "learned",
  "confidence": 0.0-1.0,
  "validated": true|false,
  "created_at": "datetime",
  "last_updated": "datetime"
}

Étape 5 — Mesure :
Après 10 nouvelles utilisations de la question :
Si corrections_évitées > 70% → confirmer
Si corrections_évitées < 30% → supprimer

Notifications :
Email → youssef.amrouche@outlook.fr
"Agentic OS a appris : nouvelle question ajoutée
 pour les projets [type] — confidence [X]%"

Versioning automatique :
Quand 5+ nouvelles questions validées →
créer MASTER-PROMPT-V5.1.md, V5.2.md...
Sauvegarder dans projects/versions/

19. agents/transversal/truth-agent.md
SOURCE DE VÉRITÉ — 40 points — BLOQUE si < 35/40

BLOC A — Déploiement (10 pts) :
A1. "build": "next build --webpack" dans package.json
A2. NEXT_PUBLIC_* dans .env.production uniquement
A3. Ordre : D1 → Worker API → Frontend
A4. database_id sans placeholder
A5. Vars sensibles via wrangler secret put uniquement
A6. Secrets sur le bon Worker
A7. OpenNext installé
A8. Worker API et Frontend = 2 projets séparés
A9. Pas de fallback localhost dans api-client.ts
A10. Build réussi avant déclaration de succès

BLOC B — Sécurité (15 pts) :
B1. JWT_SECRET 64 chars hex minimum
B2. Rate limiting 5 req/min/IP sur /api/auth/*
B3. CORS liste blanche stricte
B4. Vérification HMAC webhooks Stripe
B5. JWT httpOnly cookies (jamais localStorage)
B6. Download tokens usage unique + expiration 24h
B7. Pas de secrets dans le code source
B8. .gitignore complet
B9. DELETE /api/auth/me (RGPD)
B10. Headers sécurité présents
B11. SQL .bind() partout
B12. Pas de données sensibles dans console.log
B13. Validation inputs côté API
B14. Erreurs sans stack trace en prod
B15. HTTPS uniquement

BLOC C — Code qualité (10 pts) :
C1. TypeScript strict — 0 erreurs tsc --noEmit
C2. Commentaires en français
C3. Jamais grep -P
C4. sed -i '' sur macOS
C5. Jamais backticks dans vanilla JS
C6. Smoke tests passants
C7. MEMORY.md mis à jour
C8. Pas de TODO/FIXME
C9. Variables env documentées
C10. Pas de dépendances interdites

BLOC D — Stack (5 pts) :
D1. Next.js 15 App Router
D2. Hono routeur (jamais Express)
D3. D1 SQLite Cloudflare
D4. Web Crypto API pour JWT
D5. Fetch natif (jamais axios)

FORMAT RAPPORT :
╔══════════════════════════════════════════╗
║  TRUTH AGENT — VALIDATION               ║
╚══════════════════════════════════════════╝
BLOC A : X/10 | B : X/15 | C : X/10 | D : X/5
SCORE  : X/40
❌ [point échoué] — [commande exacte pour corriger]
✅ AUTORISÉ (>= 35) ou ❌ BLOQUÉ (< 35)

20. agents/transversal/feedback-agent.md
Collecte les feedbacks utilisateurs après chaque build.
Alimente la base d'apprentissage collective.

Déclencheur : 30 minutes après la fin d'un build
Message envoyé à l'utilisateur :
"Ton app vient d'être construite.
 Comment tu évalues le résultat ?
 ⭐⭐⭐⭐⭐ (1 à 5 étoiles)
 + Commentaire libre (optionnel)"

Ce qui est enregistré :
{
  "project_id": "",
  "build_session_id": "",
  "rating": 1-5,
  "comment": "",
  "features_missing": [],
  "features_correct": [],
  "would_recommend": true|false,
  "created_at": "datetime"
}

Transmission au Collective Intelligence Agent :
Si rating < 3 → analyser les features manquantes
                → détecter question Intake manquante
Si rating >= 4 → confirmer les patterns utilisés
                → renforcer leur score de confiance

21. agents/transversal/evolution-agent.md
Gère le versioning automatique du système.
Crée MASTER-PROMPT-V5.1.md quand 5+ améliorations validées.
Notifie Youssef avec le changelog détaillé.
Permet le rollback vers une version précédente.

Format changelog :
# MASTER-PROMPT-V5.1 — Changelog
Date : {date}
Nouvelles questions Intake : {N}
Nouvelles contraintes : {N}
Agents améliorés : {liste}
Taux de succès global : {X}%
Amélioration vs V5.0 : +{X}%

22. agents/transversal/observer-agent.md
Surveille les conflits de fichiers entre agents.
Log chaque action dans projects/logs/session_{timestamp}.json

23. agents/transversal/memory-agent.md
Met à jour MEMORY.md après chaque mission.
Bugs résolus → "résolu". Nouvelles décisions → ajoutées.

24. agents/transversal/reviewer-agent.md
Valide avant merge. TypeScript, tests, secrets, contraintes.

25. agents/transversal/rollback-agent.md
Annule si régression. Compare score Truth Agent avant/après.

26. agents/sales-orchestrator.md
Agent commercial full autonome 24h/24.
6 produits, 7 canaux, scoring 0-280 pts.
Rapport quotidien 8h → youssef.amrouche@outlook.fr + #sales.

━━━━━━━━━━━━━━━━━━━━
AGENT 4 — TOUTES LES MISSIONS (25 fichiers)
━━━━━━━━━━━━━━━━━━━━
Périmètre : missions/

Format chaque mission :
# Mission — [Nom]
## Déclencheur
## Prérequis
## Agents impliqués
## Étapes détaillées
## Contraintes absolues
## Critères de succès
## Rapport final attendu

1. missions/universal-app-builder.md
MASTER PROMPT pour créer n'importe quelle app.

PHASE -2 : Intake Agent conduit l'interview utilisateur
           Génère le brief structuré
           Score de confiance du brief affiché

PHASE -1 : Truth Agent valide le plan

PHASE 0  : CEO Agent analyse le brief
           Pose max 2 questions complémentaires si besoin
           Affiche plan d'exécution avant de lancer

PHASE 1  : Préparation (structure, D1, MEMORY.md, registry)
           Auto-patch database_id après création D1

PHASE 2  : 8 agents parallèles :
           Schema D1 → Backend Hono → Frontend Next.js
           Sécurité → Emails Resend → Stripe → Legal → Deploy

PHASE 2.5: Truth Agent valide (score >= 35/40)

PHASE 3  : Déploiement ordre strict
           D1 schema → Worker API → Frontend

PHASE 4  : Tests flux complet (register→login→action)
           Smoke tests sur tous les endpoints

PHASE 5  : MAJ MEMORY.md + registry + notification
           Feedback Agent déclenché 30min après

Tables D1 obligatoires :
users (id, email, password_hash, display_name, role, is_active, created_at)
sessions (id, user_id, token_hash, expires_at, created_at)
+ index sur email et token_hash

Tables conditionnelles :
subscriptions + orders si Stripe
organizations + org_members si multi-tenant B2B

2. missions/render-operational.md
3. missions/security-audit.md
4. missions/new-saas-app.md
5. missions/voice-agent-setup.md
6. missions/marketing-launch.md
7. missions/bug-fix.md
8. missions/performance-audit.md
9. missions/sales-launch.md
10. missions/landing-page.md
11. missions/stripe-setup.md
12. missions/rgpd-compliance.md
13. missions/onboarding-user.md
14. missions/test-coverage.md
15. missions/database-migration.md
16. missions/monitoring-setup.md
17. missions/mobile-app.md
18. missions/product-roadmap.md
19. missions/mvp-validation.md
20. missions/competitor-analysis.md
21. missions/fundraising-deck.md
22. missions/product-hunt.md
23. missions/press-kit.md
24. missions/email-sequences.md
25. missions/intake-improvement.md (NOUVEAU)
Mission déclenchée quand rating moyen < 3.5 sur 10 derniers builds.
Analyse les feedbacks, identifie les patterns manquants,
soumet les nouvelles questions à Youssef pour validation.

━━━━━━━━━━━━━━━━━━━━
AGENT 5 — DASHBOARD NEXT.JS
━━━━━━━━━━━━━━━━━━━━
Périmètre : dashboard/

Design system :
Fond #0A0A0A / Cartes #1A1A1A / Sidebar #0F0F0F
Accent #FFFFFF / Bordures #2A2A2A / Police Inter

Couleurs agents :
CEO #7C3AED / CTO #2563EB / Frontend #16A34A
Security #DC2626 / Deploy #EA580C
Succès #22C55E / Erreur #EF4444

Pages à créer (12 pages) :

1. dashboard/src/app/page.tsx
Sidebar + grille ProjectCards + metriques globales

REGLE R37 — 3 SECTIONS OBLIGATOIRES dans la sidebar et la grille :

SECTION "BROUILLONS" (status: draft) :
- Projets crees mais sans code encore
- Badge gris "Brouillon"
- Bouton "Continuer la creation" → reprend le chat Intake Agent
- Bouton "Supprimer"
- Pas de missions disponibles sur un brouillon

SECTION "EN COURS" (status: in_progress ou paused) :
- Badge bleu pulse "En cours" ou amber "En pause"
- Si paused : afficher le contexte de la derniere interruption
  et le nom du dernier agent qui travaillait
- Bouton "Reprendre la mission" si paused
- Indicateur de progression % + timestamp derniere activite

SECTION "PROJETS" (status: development, production, archived) :
- Filtres par status
- Badge vert "Production", amber "Development", gris "Archive"
- JAMAIS supprimer un projet → toujours archiver
- Projets archives visibles en lecture seule

La sidebar a exactement 3 groupes avec ces labels :
BROUILLONS / EN COURS / PROJETS

2. dashboard/src/app/projects/new/page.tsx
NOUVEAU DESIGN — Conversation Intake Agent
Au lieu d'un wizard statique, une interface de chat
où l'Intake Agent pose les questions une par une.
- Bulles de conversation (agent à gauche, user à droite)
- Questions fixes d'abord, questions apprises ensuite
- Brief récapitulatif affiché avant confirmation
- Bouton "Lancer les agents" pill blanc
- Score de confiance du brief (barre de progression)
- Mode "Démo" pour les nouveaux utilisateurs :
  bouton "Voir une démo en 5 minutes" qui lance
  un projet exemple pré-configuré

3. dashboard/src/app/projects/[id]/page.tsx
Terminal agents + MissionSelector (25 missions)

4. dashboard/src/app/sales/page.tsx
Pipeline Kanban 5 colonnes

5. dashboard/src/app/sales/report/page.tsx
Rapport quotidien interactif

6. dashboard/src/app/landing-builder/page.tsx
Wizard 6 étapes (template, couleurs, sections, contenu, preview, génération)

7. dashboard/src/app/settings/page.tsx
Clés API + profil + notifications

8. dashboard/src/app/analytics/page.tsx
Métriques globales + graphique activité SVG

9. dashboard/src/app/templates/page.tsx
Bibliothèque templates réutilisables

10. dashboard/src/app/scheduler/page.tsx
Missions planifiées récurrentes

11. dashboard/src/app/evolution/page.tsx (NOUVEAU)
Tableau de bord de l'auto-apprentissage :
- Questions apprises ce mois (liste)
- Taux de succès des builds par semaine (graphique SVG)
- Feedbacks récents (étoiles + commentaires)
- Nouvelles contraintes ajoutées automatiquement
- Versions du système (V5.0, V5.1, V5.2...)
  avec changelog et bouton rollback
- Section "Valider les suggestions" :
  questions en attente de validation par Youssef
  boutons Accepter / Rejeter par question

12. dashboard/src/app/demo/page.tsx (NOUVEAU)
Mode démo pour nouveaux utilisateurs :
- Simulation d'une mission complète en temps réel
- Terminal animé avec logs pré-enregistrés
- Résultat : une mini-app déployée en 5 minutes
- CTA : "Créer mon vrai projet maintenant"

Composants :
- AgentTerminal.tsx (logs colorés + typewriter)
- MissionSelector.tsx (25 missions)
- ProjectCard.tsx
- Sidebar.tsx (12 liens)
- StatusBadge.tsx
- IntakeChat.tsx (NOUVEAU — conversation Intake Agent)
- FeedbackWidget.tsx (NOUVEAU — notation post-build)
- EvolutionTimeline.tsx (NOUVEAU — historique apprentissage)

━━━━━━━━━━━━━━━━━━━━
AGENT 6 — API WORKER CLOUDFLARE
━━━━━━━━━━━━━━━━━━━━
Périmètre : api/

1. api/wrangler.toml :
name = "agentic-os-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"
[vars]
CORS_ORIGIN = "https://app.1agentic.io"
APP_URL = "https://app.1agentic.io"
APP_NAME = "Agentic OS"
ENVIRONMENT = "production"
[triggers]
crons = ["0 8 * * *","0 9 * * *","0 14 * * *","0 18 * * *","0 2 * * 1"]
# 0 2 * * 1 = lundi 2h : analyse collective hebdomadaire
# Secrets via wrangler secret put :
# JWT_SECRET, ANTHROPIC_API_KEY, RESEND_API_KEY

2. 20 routes API :
routes/missions.ts — SSE streaming
routes/projects.ts — CRUD projets
routes/memory.ts — MEMORY.md R/W
routes/sales-pipeline.ts — Prospects + deals
routes/email-sequences.ts — Séquences emails
routes/lead-scorer.ts — Scoring 10 critères
routes/daily-report.ts — Rapport quotidien
routes/beta-signup.ts — Inscriptions bêta
routes/landing-preview.ts — Preview LP live
routes/legal.ts — Génération docs légaux
routes/analytics-global.ts — Stats globales
routes/scheduler.ts — Missions planifiées
routes/templates.ts — Templates réutilisables

routes/intake.ts (NOUVEAU)
POST /api/intake/start — Démarrer une session Intake
Body : { user_description: string }
→ Charger les questions fixes
→ Charger les questions apprises (learned_questions.json)
→ Retourner la première question
GET /api/intake/questions?project_type= — Questions pour un type
POST /api/intake/answer — Envoyer une réponse
Body : { session_id, question_id, answer }
→ Retourner la prochaine question
POST /api/intake/complete — Finaliser et générer le brief
→ Retourner le brief structuré avec confidence_score

routes/feedback.ts (NOUVEAU)
POST /api/feedback — Enregistrer un feedback post-build
Body : { project_id, rating, comment, features_missing }
GET /api/feedback/stats — Stats globales des feedbacks
→ rating_moyen, top_features_manquantes, tendances

routes/evolution.ts (NOUVEAU)
GET /api/evolution/questions — Questions apprises
POST /api/evolution/validate — Valider/rejeter une question suggérée
Body : { question_id, validated: true|false }
GET /api/evolution/versions — Historique des versions
GET /api/evolution/changelog/:version — Changelog d'une version

routes/collective.ts (NOUVEAU)
POST /api/collective/telemetry — Télémétrie anonymisée
Body : {
  user_hash, event_type, project_type, mission_type,
  truth_agent_score, error_pattern, agents_used,
  duration_minutes, success, agentic_os_version
}
GET /api/collective/patterns — Patterns détectés
GET /api/collective/stats — Stats globales

3. Libs API :
lib/claude-runner.ts — Appel Claude Opus SSE
lib/skill-injector.ts — 55+ mappings skills
lib/notifier.ts — Resend + Slack
lib/email-sales-templates.ts — 30 templates
lib/intake-processor.ts (NOUVEAU)
  Traite les réponses Intake et génère le brief
  Calcule le confidence_score
  Sélectionne les agents appropriés
lib/collective-learner.ts (NOUVEAU)
  Analyse les patterns après chaque build
  Détecte les questions manquantes
  Calcule les scores de confiance
  Valide ou suggère les nouvelles questions

4. DB schemas :
api/src/db/schema.sql — Tables core (users, sessions)
api/src/db/sales-schema.sql — Tables sales + beta + scheduler
api/src/db/intake-schema.sql (NOUVEAU) :

CREATE TABLE IF NOT EXISTS intake_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_hash TEXT NOT NULL,
  project_type TEXT,
  brief_json TEXT,
  confidence_score INTEGER DEFAULT 0,
  questions_asked INTEGER DEFAULT 0,
  build_triggered INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS intake_learned_questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_text TEXT NOT NULL,
  project_type TEXT,
  trigger_condition TEXT,
  success_rate REAL DEFAULT 0,
  occurrence_count INTEGER DEFAULT 0,
  source TEXT DEFAULT 'learned',
  confidence REAL DEFAULT 0,
  validated INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS build_feedbacks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  project_id TEXT NOT NULL,
  session_id TEXT,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  features_missing TEXT,
  features_correct TEXT,
  would_recommend INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_versions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  version TEXT NOT NULL UNIQUE,
  changelog TEXT,
  new_questions INTEGER DEFAULT 0,
  new_constraints INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  published_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collective_patterns (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  pattern_key TEXT NOT NULL UNIQUE,
  description TEXT,
  project_type TEXT,
  occurrence_count INTEGER DEFAULT 1,
  impact_score REAL DEFAULT 0,
  question_suggested TEXT,
  status TEXT DEFAULT 'candidate',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_intake_user ON intake_sessions(user_hash);
CREATE INDEX IF NOT EXISTS idx_questions_type ON intake_learned_questions(project_type, validated);
CREATE INDEX IF NOT EXISTS idx_feedbacks_rating ON build_feedbacks(rating, created_at);
CREATE INDEX IF NOT EXISTS idx_patterns_status ON collective_patterns(status, impact_score DESC);

5. Crons :
api/src/crons/sales-cron.ts — 8h/9h/14h/18h
api/src/crons/learning-cron.ts (NOUVEAU)
Lundi 2h du matin :
→ Analyser tous les builds de la semaine
→ Comparer briefs Intake vs corrections post-build
→ Détecter nouveaux patterns
→ Créer suggestions de questions
→ Si confidence > 90% → auto-valider
→ Si confidence 70-90% → notifier Youssef
→ Générer rapport hebdomadaire d'apprentissage
→ Email → youssef.amrouche@outlook.fr

━━━━━━━━━━━━━━━━━━━━
AGENT 7 — LANDING PAGE AGENTIC OS
━━━━━━━━━━━━━━━━━━━━
Périmètre : landing/

1. landing/copy.json — contenu centralisé JSON
Sections : meta, hero, problem, solution,
how_it_works, auto_learning, intake_demo,
projects, pricing, founder, faq, cta_final

Section intake_demo (NOUVELLE) :
"headline": "L'IA qui pose les bonnes questions avant de construire",
"description": "Avant de coder une seule ligne, Agentic OS comprend
exactement ce dont tu as besoin. Notre Intake Agent te pose les bonnes
questions pour générer un brief parfait.",
"demo_steps": [
  "Tu décris ton idée en français",
  "L'Intake Agent pose 7 questions ciblées",
  "Un brief structuré est généré automatiquement",
  "Les agents construisent exactement ce que tu veux"
]

Pricing 3 plans :
Starter : 149€/mois (3 projets, agents de base)
Builder : 299€/mois (illimité, 26 agents) — populaire
Agency : 499€/mois (multi-clients, white-label)

2. landing/index.html — HTML vanilla complet
13 sections dont intake_demo
JAMAIS de template literals dans le JS
Responsive mobile-first
Formulaire beta → POST /api/beta-signup

3. landing/templates/ :
modern.html / minimal.html / bold.html / gradient.html
Variables CSS :root pour toutes les couleurs
Placeholders {{VARIABLE}} pour tout le contenu

━━━━━━━━━━━━━━━━━━━━
AGENT 8 — CLI INTELLIGENT
━━━━━━━━━━━━━━━━━━━━
Périmètre : cli.js

JAMAIS de template literals → concatenation classique.

Commandes :
node cli.js --project 1store-io --mission "rendre opérationnel"
node cli.js --new "description en langage naturel"
node cli.js --status
node cli.js --memory 1store
node cli.js --list
node cli.js --sales "lancer prospection"
node cli.js --feedback 1store-io 5 "parfait"
node cli.js --evolution — voir l'historique d'apprentissage
node cli.js --demo — lancer le mode démo

Workflow --new (avec Intake Agent) :
1. Parser la description initiale
2. Charger les questions Intake (fixes + apprises)
3. Poser les questions une par une dans le terminal
4. Afficher le brief structuré avec confidence_score
5. Demander confirmation avant de lancer
6. Truth Agent valide le plan
7. Lancer Claude Code --dangerously-skip-permissions
8. Stream résultats avec couleurs ANSI
9. Truth Agent valide le résultat (40 points)
10. Mettre à jour MEMORY.md
11. Envoyer rapport email + Slack
12. Déclencher Feedback Agent 30min après

━━━━━━━━━━━━━━━━━━━━
AGENT 9 — FICHIERS D'APPRENTISSAGE INITIAUX
━━━━━━━━━━━━━━━━━━━━
Périmètre : projects/intake/

Crée ces fichiers qui constituent la base
de connaissances initiale du système :

1. projects/intake/learned_questions.json
Base initiale avec les questions apprises
manuellement depuis 2 mois de développement :
[
  {
    "id": "q001",
    "question_text": "Plusieurs organisations/équipes utiliseront l'app indépendamment ?",
    "project_type": "saas-web-app",
    "trigger_condition": "target=B2B",
    "success_rate": 0.73,
    "occurrence_count": 0,
    "source": "manual",
    "confidence": 0.95,
    "validated": true,
    "rationale": "73% des SaaS B2B nécessitent multi-tenant post-build",
    "created_at": "2026-03-30"
  },
  {
    "id": "q002",
    "question_text": "L'app traite des données de santé (patients, ordonnances, dossiers médicaux) ?",
    "project_type": "saas-web-app",
    "trigger_condition": "secteur=sante",
    "success_rate": 0.89,
    "occurrence_count": 0,
    "source": "manual",
    "confidence": 0.98,
    "validated": true,
    "rationale": "89% des apps santé nécessitent RGPD renforcé et HDS",
    "created_at": "2026-03-30"
  },
  {
    "id": "q003",
    "question_text": "Les utilisateurs doivent pouvoir inviter des collaborateurs ?",
    "project_type": "saas-web-app",
    "trigger_condition": "target=B2B",
    "success_rate": 0.68,
    "occurrence_count": 0,
    "source": "manual",
    "confidence": 0.85,
    "validated": true,
    "rationale": "68% des SaaS B2B ajoutent la gestion d'équipe post-build",
    "created_at": "2026-03-30"
  },
  {
    "id": "q004",
    "question_text": "Tu as besoin d'un système de notifications (email, SMS, push) ?",
    "project_type": "saas-web-app",
    "trigger_condition": "toujours",
    "success_rate": 0.71,
    "occurrence_count": 0,
    "source": "manual",
    "confidence": 0.90,
    "validated": true,
    "rationale": "71% des apps ajoutent les notifications après le premier build",
    "created_at": "2026-03-30"
  },
  {
    "id": "q005",
    "question_text": "Les agents doivent gérer des appels entrants ou sortants ?",
    "project_type": "voice-agent",
    "trigger_condition": "type=voice-agent",
    "success_rate": 0.95,
    "occurrence_count": 0,
    "source": "manual",
    "confidence": 0.99,
    "validated": true,
    "rationale": "Détermine si Twilio entrant ou sortant — architecture différente",
    "created_at": "2026-03-30"
  },
  {
    "id": "q006",
    "question_text": "Tu veux un tableau de bord pour suivre les appels et les performances ?",
    "project_type": "voice-agent",
    "trigger_condition": "type=voice-agent",
    "success_rate": 0.82,
    "occurrence_count": 0,
    "source": "manual",
    "confidence": 0.92,
    "validated": true,
    "rationale": "82% des projets voice-agent ajoutent un dashboard analytics après",
    "created_at": "2026-03-30"
  },
  {
    "id": "q007",
    "question_text": "L'app doit fonctionner hors-ligne ou nécessite une connexion permanente ?",
    "project_type": "mobile",
    "trigger_condition": "type=mobile",
    "success_rate": 0.78,
    "occurrence_count": 0,
    "source": "manual",
    "confidence": 0.88,
    "validated": true,
    "rationale": "78% des apps mobiles nécessitent du offline-first non anticipé",
    "created_at": "2026-03-30"
  }
]

2. projects/intake/sessions/.gitkeep
3. projects/intake/patterns/.gitkeep

━━━━━━━━━━━━━━━━━━━━
AGENT 10 — MISE À JOUR MASTER ORCHESTRATOR
━━━━━━━━━━━━━━━━━━━━
Périmètre : MASTER_ORCHESTRATOR.md
             projects/memory/agentic-os.md

Après que tous les autres agents ont terminé,
met à jour MASTER_ORCHESTRATOR.md avec :

1. Hiérarchie des 26 agents (vs 22 avant)
2. Nouveaux agents : intake-agent, collective-intelligence-agent,
   feedback-agent, evolution-agent
3. Nouveau workflow de mission :
   PHASE -2 : Intake Agent (comprend le besoin)
   PHASE -1 : Truth Agent (valide le plan)
   PHASE 0  : CEO Agent analyse et planifie
   ...
   PHASE 5  : Feedback Agent (30min après)
   PHASE 6  : Collective Intelligence (analyse hebdo)
4. Nouvelles routes API : intake, feedback, evolution, collective
5. Nouvelles tables D1 : intake_sessions, learned_questions,
   build_feedbacks, system_versions, collective_patterns
6. Cycle d'auto-apprentissage documenté

Mettre à jour projects/memory/agentic-os.md :
- Version : 5.0
- Date : 30 mars 2026
- Nouveautés : Intake Agent, Collective Intelligence,
  Feedback Loop, Evolution Agent, Mode Démo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
APRÈS LES 10 AGENTS — FINALISATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Monter toutes les routes dans api/src/index.ts :
import { intakeRoutes } from './routes/intake'
import { feedbackRoutes } from './routes/feedback'
import { evolutionRoutes } from './routes/evolution'
import { collectiveRoutes } from './routes/collective'
app.route('/api/intake', intakeRoutes)
app.route('/api/feedback', feedbackRoutes)
app.route('/api/evolution', evolutionRoutes)
app.route('/api/collective', collectiveRoutes)
(+ toutes les routes existantes)

2. Appliquer tous les schemas D1 :
cd api
npx wrangler d1 execute agentic-os-db --remote \
  --file=src/db/schema.sql
npx wrangler d1 execute agentic-os-db --remote \
  --file=src/db/sales-schema.sql
npx wrangler d1 execute agentic-os-db --remote \
  --file=src/db/intake-schema.sql

3. Vérifier TypeScript :
cd api && npx tsc --noEmit
cd ../dashboard && npx tsc --noEmit

4. Installer dépendances dashboard :
cd dashboard && npm install

5. Tester CLI :
node cli.js --list
node cli.js --status
node cli.js --evolution
node cli.js --demo

6. Truth Agent — validation finale sur Agentic OS

7. Rapport final :
╔══════════════════════════════════════════════════════╗
║  AGENTIC OS v5.0 — CONSTRUCTION TERMINÉE            ║
╚══════════════════════════════════════════════════════╝
Fichiers créés    : {N}
Agents définis    : 26 (+4 vs v4.0)
Missions          : 25 (+1 vs v4.0)
Pages dashboard   : 12 (+2 vs v4.0)
Routes API        : 20 (+4 vs v4.0)
Tables D1         : 15 (+5 vs v4.0)
Questions Intake  : 7 questions initiales
TypeScript        : 0 erreurs

NOUVEAUTÉS v5.0 :
├── Intake Agent (comprend le besoin avant de builder)
├── Questions évolutives (apprises de chaque projet)
├── Feedback Loop (note chaque build 1-5 étoiles)
├── Collective Intelligence (apprend de tous les users)
├── Evolution Agent (versioning automatique)
├── Mode Démo (onboarding nouveaux utilisateurs)
└── Page /evolution (tableau de bord apprentissage)

POUR DÉMARRER :
cd ~/Downloads/agentic-os/dashboard && npm run dev
→ Ouvrir http://localhost:3000
→ Cliquer "+ Nouveau projet" pour tester l'Intake Agent
→ Cliquer "Démo" pour voir le mode démo

SECRETS À CONFIGURER :
cd ~/Downloads/agentic-os/api
npx wrangler secret put JWT_SECRET
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put RESEND_API_KEY

CONTRAINTES ABSOLUES :
- TypeScript strict, jamais de any
- Commentaires en français uniquement
- Jamais grep -P → grep -E ou python3
- sed -i '' sur macOS
- Jamais de backticks dans vanilla JS
- Jamais Turbopack → next build --webpack
- Variables sensibles via wrangler secret put uniquement
- CORS liste blanche stricte, jamais origin '*'
- Rate limiting 5 req/min/IP sur routes auth
- Ordre déploiement : D1 → Worker API → Frontend
- Truth Agent valide AVANT et APRÈS chaque déploiement
- Intake Agent consulte AVANT chaque nouveau projet
- R36 : Backup Agent TOUJOURS premier sur projet existant
- R37 : 6 statuts : draft/in_progress/paused/development/production/archived
