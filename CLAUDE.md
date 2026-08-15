# CLAUDE.md — Coccinelle.ai
# Dernière mise à jour : 13 août 2026
# (remplace intégralement la version du 22 mai 2026 ; backup : CLAUDE.md.backup-20260702)

> Ce fichier est la source de vérité opérationnelle du projet.
> Lis-le en premier, puis `MASTER-PROMPT-V5.md` à la racine (37 règles Agentic OS).
> En cas de conflit, **ce CLAUDE.md a priorité**.

---

## a) VISION PRODUIT

**Coccinelle.ai** = Premier CRM français avec IA vocale native pour TPE/PME.

- Agent vocal IA (« l'Assistant », prénom dynamique par tenant) qui répond au téléphone 24/7.
- CRM omnicanal : téléphone, SMS, WhatsApp, email — conversations unifiées.
- Prise de RDV automatique, qualification prospects, création de tâches, affectation équipe.
- Base de connaissances (import site → FAQ → recherche intelligente pour l'agent vocal).
- Multi-tenant avec RBAC (10 permissions configurables).
- Souveraineté : LLM et RAG hébergés en Europe (Mistral souverain + LightRAG sur Hetzner Allemagne).

**Développeur** : Youssef Amrouche — Fondateur d'Agentic Solutions SASU. Expert métier
25+ ans en relation client / call center. Valide chaque étape avant la suivante.

**Objectif produit** : optimiser et rendre 100 % opérationnel l'existant. Ne pas recréer,
ne pas repartir de zéro. Corriger les bugs, compléter les features, optimiser (D1, latence,
bundle), nettoyer le code, améliorer l'UX (mobile-first : les clients sont au téléphone).

> **Projet séparé — Cortex.eu** : SASU dédiée, hors de ce dépôt. Ne rien mélanger avec
> Coccinelle. Si une tâche concerne Cortex, elle ne se fait PAS ici.

---

## b) ÉTAT AU 2 JUILLET 2026 (résumé exécutif)

**Où on en est :**

- ✅ **Produit fonctionnel de bout en bout** : agent vocal + CRM + RDV + KB + omnicanal + proactif.
- ✅ **Landing en production** avec **essai gratuit 14 jours** (offre : **60 min d'appels + 20 SMS**).
- ✅ **Test utilisateur Maze passé fin mai** (5 testeurs, panel FR) : **NPS 6,8/10**, 4 frictions
  sur 5 corrigées (B14–B19). Reste : ranger « Agent IA » dans Configuration, clarifier libellés.
- ✅ **LightRAG Coccinelle déployé** sur Hetzner (souverain, Mistral, workspace `coccinelle`
  isolé de `1compta`). Voir section (h).
- ✅ **Audit sécurité complet** (Sprint 7) : secrets migrés vers wrangler secrets, historique
  Git réécrit, 180 routes auditées (0 orpheline).
- 📊 **Trafic** : 342 visiteurs uniques sur 7 jours (au 10 juin).

**🔴 PROBLÈME #1 — FUNNEL ONBOARDING CASSÉ (priorité absolue) :**
- **145 inscrits**, **8 seulement** terminent l'onboarding, **0 completion depuis 25 jours**.
- Taux de complétion ≈ 5,5 %. C'est LE blocage business avant tout effort marketing.
- Action : instrumenter chaque étape de l'onboarding, identifier l'étape d'abandon,
  simplifier le parcours. (Voir TODO section l.)

**Points d'attention connus (non bloquants) :**
- **WhatsApp V1 n'a jamais servi en production** (9 messages, tous smoke tests du 28/01/2026, 0 client
  réel). Décision 19/07/2026 : **full redo « V2 » via Twilio BSP**. Analyse + plan complets dans
  **`WHATSAPP_V2_PLAN.md`** (racine). ⚠️ Le webhook Meta V1 comporte une faille active — voir § j.
- Clés Meta à régénérer (exposées sur GitHub public par le passé).
- OAuth email Outlook/Yahoo non fonctionnels à 100 %.
- Billing/Settings à finaliser (Stripe prix + secrets).

---

## c) ARCHITECTURE TECHNIQUE COMPLÈTE

### Stack

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS (build **webpack**, pas turbopack) |
| Backend API | Cloudflare Workers (JavaScript) |
| Database | Cloudflare D1 (SQLite) — **`coccinelle-db-eu`** |
| Vector DB | Cloudflare Vectorize (legacy) + **LightRAG souverain** (voir h) |
| Storage | Cloudflare R2 |
| Auth | JWT (30 jours) + refresh token + bcrypt |
| Téléphonie | Twilio (SIP) + agent Python LiveKit (VoixIA) |
| Voix IA (TTS) | ElevenLabs (20 voix FR) |
| LLM agent vocal | Mistral (souverain) / Claude — dynamique par tenant |
| Email | Resend (envoi) + Gmail/Outlook/Yahoo OAuth (réception) |
| WhatsApp | Meta Cloud API |
| SMS | Twilio |
| RAG souverain | LightRAG (Hetzner, Mistral) |

### Deux serveurs distincts (ne pas confondre)

| Serveur | IP | Rôle | Accès |
|---------|-----|------|-------|
| **VoixIA** (Scaleway) | `51.15.130.204` | Agent Python LiveKit (voix) | `ssh root@51.15.130.204` |
| **LightRAG** (Hetzner CPX32, Nuremberg) | `188.245.221.62` | RAG souverain, Mistral | `ssh lightrag` (alias) |

### Structure du dépôt

Chemin local : **`~/Projects/saas/coccinelle-ai`** (⚠️ ancien chemin `~/match-immo-mcp/` obsolète).

```
coccinelle-ai/
├── CLAUDE.md                       # CE FICHIER
├── MASTER-PROMPT-V5.md             # → symlink vers ~/Projects/infra/agentic-os/
├── wrangler.toml                   # Config Cloudflare (INTERDIT de modifier sans OK)
├── .credentials.md                 # Secrets (gitignored)
├── migrations/                     # Migrations D1 (0001..0066+)
├── src/                            # Backend Workers
│   ├── index.js                    # Point d'entrée + routing
│   ├── config/cors.js              # CORS (inclut PATCH depuis B16)
│   └── modules/
│       ├── auth/                   # JWT (signup, /register alias, refresh)
│       ├── assistant/              # GET/PUT /assistant/config — page « Mon Assistant » (CX-2)
│       ├── knowledge/              # + versions.js (historique, corbeille) + suggestions.js (chips)
│       ├── products/  appointments/  prospects/  teams/
│       ├── tasks/                  # CRUD tâches + create-task VoixIA + skills
│       ├── permissions/            # RBAC (10 permissions)
│       ├── voixia/                 # resolve-phone, log-call, tools, orchestrator
│       ├── omnicanal/              # orchestrator.js + routes.js (5 scénarios)
│       ├── proactive/              # notifications proactives SMS/appel
│       ├── omnichannel/  email/  oauth/  channels/  twilio/  retell/
│       ├── shared/                 # sector-prompts.js (SOURCE UNIQUE prompts), horaires-slots, prestations
│       └── public/                 # booking.js + routes.js (réservation publique)
└── coccinelle-saas/                # Frontend Next.js
    ├── app/
    │   ├── page.tsx                # Landing (essai 14j, 60 min + 20 SMS)
    │   ├── login/  signup/  onboarding/  demo/
    │   ├── secteurs/               # LP SEO (syndic, notaire, medecin, avocat, +6)
    │   ├── fondateurs/             # Waitlist (2 places/secteur)
    │   └── dashboard/
    │       ├── page.tsx            # Home + KPIs (API réelle)
    │       ├── assistant/          # « Mon Assistant » — mode Simple (CX-2)
    │       ├── savoir/             # « Ce que sait votre assistant » — mode Simple (CX-2)
    │       ├── agents/             # configuration / scripts / nodes / test (mode Avancé)
    │       ├── knowledge/          # base + faq / products / docs
    │       ├── channels/           # email / sms / whatsapp / numbers / voicemail / ivr / queues
    │       ├── analytics/          # calls / messages / transcripts / performance / export
    │       ├── appointments/  crm/  customers/  rdv/  tasks/  teams/
    │       ├── proactive/  billing/  settings/  availability/
    │       └── (redirections legacy : voixia, sara, prospects, products → nouvelles routes)
    ├── components/DashboardSidebar.tsx   # Sidebar Fonio (6 groupes accordéon)
    ├── lib/voices.ts               # SOURCE UNIQUE des voix (20 voix FR)
    ├── lib/prompts.ts              # nodes + quick_scenarios UI (PLUS la source des prompts)
    └── src/components/SequenceEditor.tsx # Éditeur séquences (11 types de nodes)
```

### URLs production

- Frontend : **https://coccinelle.ai** (custom domain ; alias `coccinelle-saas.pages.dev`)
- Backend API : **https://coccinelle-api.youssef-amrouche.workers.dev**
- LightRAG : **https://lightrag.coccinelle.ai**

### Canaux de communication

| Canal | Envoi | Réception | Statut |
|-------|-------|-----------|--------|
| 📞 Téléphone | ✅ VoixIA (LiveKit) | ✅ Webhook | 🟡 95 % |
| 💬 SMS | ✅ Twilio | ✅ Webhook | ✅ 100 % |
| 📱 WhatsApp | ⛔ gelé | ⛔ gelé | 🔴 **0 % réel — full redo V2** (voir `WHATSAPP_V2_PLAN.md`) |
| 📧 Gmail | ✅ Gmail API | ✅ Cloudflare | 🟡 95 % |
| 📧 Outlook | ✅ Backend | ❌ | 🔴 60 % |
| 📧 Yahoo | ✅ Backend | ❌ | 🔴 60 % |

**Email (Resend) :** provider envoi = Resend, `RESEND_API_KEY` (secret Workers),
`RESEND_FROM_EMAIL`, routes `/api/v1/email/*` (PAS `/channels/email/*`),
module `src/modules/email/routes.js`. Page `channels/email/page.tsx` (4 sections).

---

## d) CREDENTIALS & IDs

> **Tous les secrets, mots de passe, clés API et numéros vivent dans `.credentials.md`
> (racine du projet, gitignored). Ne JAMAIS committer de secret dans un fichier tracké.**
> Le dépôt GitHub `Agentic-Solutions/coccinelle-ai` est **PUBLIC** avec push-protection.

### IDs Cloudflare (non secrets)

| Élément | Valeur |
|---------|--------|
| **D1 production** (`coccinelle-db-eu`) | `befc34ae-9a65-4aba-998d-ea1d5a88b359` |
| ~~D1 ancien~~ (`coccinelle-db`) | `f4d7ff42-fc12-4c16-9c19-ada63c023827` — **NE PAS UTILISER** |
| Account ID | `9c27dcacc982caff25e46d0756c87837` |
| Binding wrangler.toml | `coccinelle-db-eu` |

### Comptes de test

- **Compte démo Maze** : `demo.maze@coccinelle.ai` / `<mot de passe — voir .credentials.md>`
  - Tenant : `tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk` — Company : **Syndic Horizon** (secteur syndic)
  - Entrée : https://coccinelle.ai/demo (auto-login + redirect /dashboard)
  - Données : 3 membres, 6 skills, 5 tâches, 5 appels, 4 prospects, 11 KB FAQ syndic, 3 RDV,
    3 services, dispos Lun–Ven 9h–18h.
- **Compte de recette vocale** : `garage.toulouse@test.com` — Tenant
  `tenant_Z2FyYWdlLnRvdWxvdXNlQHRlc3QuY29t`, Company **Garage Toulouse** (secteur automobile).
  Recréé le 11/08 après la purge (⚠️ **nouvel identifiant** : l'ancien
  `tenant_dGVzdC5nYXJhZ2VAdGVzdC5mcg` — `test.garage@test.fr` — n'existe plus, et les 6 appels
  historiques qui le référencent restent orphelins). **Seul compte dont `users.phone_verified=1`
  sur `+33760762153`** : c'est donc lui, et lui seul, que le numéro d'essai `+33939035761`
  résout via la branche `caller`. KB : 2 documents (adresse + un CSV de 29 prestations).
- Autres comptes de test + numéros Twilio : voir `.credentials.md`.

### Secrets & clés (emplacement)

- Workers : `wrangler secret put` (RESEND_API_KEY, ELEVENLABS_API_KEY, TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN, JWT_SECRET, Meta secrets, etc.).
- VoixIA Python : `/opt/voixia/.env` (EnvironmentFile systemd).
- LightRAG : `/opt/lightrag-coccinelle/.env`.
- `TWILIO_PHONE_NUMBER` = `+33939035760` (en vars, non secret).

### Fichiers/configs INTERDITS à modifier sans OK de Youssef

- `wrangler.toml`
- `.env`, `.env.local`, `.credentials.md`
- Migrations existantes dans `/migrations/`
- Configs agent Retell (Agent ID : `agent_0c566a48e70125020d07aed643`)

---

## e) FLUX FONCTIONNEL VoixIA

### Résolution d'appel

> **Numéro d'essai `+33939035761` (QW8, 17/07/26)** : un inscrit n'a pas de numéro provisionné
> (bundle Regulation FR requis). Il appelle le numéro d'essai partagé et `resolve-phone` identifie
> son tenant via le param `caller` (son propre numéro, `users.phone_verified=1` — seule condition).
> Départage : tenant le plus récent (`users.phone` n'est pas unique). Var `TRIAL_PHONE_NUMBER`
> (wrangler.toml + `lib/config.ts` — garder alignés). Ne JAMAIS recycler `+33939035760` (ligne
> réelle Coccinelle.ai) en numéro d'essai.

```
Appel entrant Twilio/SIP → agent Python LiveKit (51.15.130.204)
  → tenant.py appelle GET /api/v1/voixia/resolve-phone?phone=%2B33...&caller=%2B33... (+ encodé %2B)
  → réponse : company_name (tenants.name), sector (tenants.sector),
              system_prompt (ai_prompt_versions.is_active=1), voice_id, llm_provider, llm_model
  → main.py : greeting LITTÉRAL via session.say() (JAMAIS generate_reply())
  → pipeline.py : AgentSession + 8 @function_tool + LLM dynamique (llm_factory.py)
  → fin d'appel : shutdown callback → POST /api/v1/voixia/log-call (calls + logs + summary)
                  + POST /api/v1/omnicanal/event (déclenche règles omnicanal)
```

### Configuration voix / prompt (dashboard → agent)

```
Dashboard config agent → handleSavePrompt() envoie voice_id + llm_*
  → POST /ai/prompts (crée version) → POST /ai/prompts/activate/:id (body: voice_id, llm_provider, llm_model)
  → ai_prompt_versions.is_active=1 (UN SEUL par tenant) + voixia_configs mis à jour
  → resolve-phone relit la DB à chaque appel (0 cache)
```

### Prompts sectoriels — SOURCE UNIQUE `src/modules/shared/sector-prompts.js` (07/08/2026)

```
Le prompt est GÉNÉRÉ CÔTÉ BACKEND, jamais lu dans ai_sector_templates ni reçu du front :
  buildSectorPrompt({secteur, agentName, companyName}) → texte final, 0 variable {}
  buildSectorTemplate(secteur) → version générique {ASSISTANT_NAME}/{COMPANY_NAME} (table D1)
  normalizeSector(x) → 14 clés canoniques + alias (restauration→restaurant, services→artisan,
                       commerce→ecommerce, garage→automobile, notaire/avocat→juridique…)
  isPromptCompliant(t) → un prompt fourni de l'extérieur n'est gardé que s'il est conforme
```
> **7 chemins backend** appellent ce générateur : signup (`auth/routes.js`), onboarding étape
> assistant, revendeur (`reseller/routes.js`), `agents/auto-generate`, les **deux** branches de
> `resolve-phone`, orchestrateur omnicanal. Un 8ᵉ point (`GET /ai/templates`) lit la table D1,
> qui n'est plus qu'un **dérivé** régénéré par `scripts/backfill_ai_sector_templates.sql`.
>
> ⚠️ **`coccinelle-saas/lib/prompts.ts` n'est PLUS la source des prompts** (elle n'a jamais eu les
> règles vocales). Elle reste la source des `nodes` et `quick_scenarios` du SequenceEditor et du
> picker dashboard. Le `system_prompt` qu'elle expose est envoyé par l'onboarding puis **ignoré et
> régénéré** par le backend. Son alignement = Lot B (non fait).
>
> **14 secteurs** : les 13 historiques + `syndic` (ajouté le 07/08 — le tenant démo Maze est en
> `sector='syndic'` et il n'existait dans aucune source).

### Onboarding (4 étapes, API-first, 0 localStorage utilisateur)

```
Entreprise (nom, secteur, horaires, tél + vérif SMS) → Agent (nom, voix)
  → Connaissances (adresse, services, tarifs, Q&A — bouton « Passer ») → Terminé
  → POST /api/v1/onboarding/step   → GET /api/v1/onboarding/state (depuis DB)
  → onboarding_sessions.current_step (JAMAIS localStorage sauf auth_token + session_id)
  → tenants.onboarding_completed = 0/1
```
> ⚠️ **4 étapes, PAS 8** — simplifié le 9/05/2026 (commit `82d83ea`). `TOTAL_STEPS = 4` dans
> `coccinelle-saas/app/onboarding/page.tsx`. Les étapes Produits/Canaux/Secteur n'existent plus.
> Le backend garde des `case` morts (`sector`, `verification`, `channels`) — inoffensifs.
>
> **Instrumentation (17/07/26, migr. 0082)** : `onboarding_events` (append-only) mesure
> entered/saved/skipped/error par étape. ⚠️ Ne pas confondre avec `onboarding_analytics`
> (table morte, jamais écrite, schéma figé sur l'ère 6 étapes).
>
> **Le 5,5 % (8/145) est un cumul historique** incluant les 25 j de panne (500 + crash JS,
> corrigés le 3/07). Le taux réel post-fix n'est pas encore mesuré : ne pas amputer le parcours
> sur la foi de ce chiffre — c'est à ça que sert `onboarding_events`.

### Tools VoixIA (7 + create_task = 8)

| Tool | Endpoint principal | Module |
|------|-------------------|--------|
| check_availability | GET /api/v1/voixia/appointments/availability | Rendez-vous |
| book_appointment | POST /api/v1/voixia/appointments | Rendez-vous |
| search_knowledge | POST /api/v1/voixia/knowledge | Base de connaissances |
| search_products | GET /api/v1/voixia/products | Produits |
| create_prospect | POST /api/v1/voixia/prospects | CRM |
| send_sms | POST /api/v1/voixia/sms | SMS |
| transfer_to_human | POST /api/v1/voixia/transfer | Équipes |
| create_task | POST /api/v1/voixia/create-task | Tâches (KB-first, affectation par skill) |

Alias `/tools/*` disponibles (availability, book-appointment, knowledge, products, prospect, sms, transfer).

---

## f) TABLES D1 CRITIQUES + RÈGLE PROMPT ACTIF

### Source unique de vérité (règle absolue)

| Donnée | Source unique | Ne jamais utiliser |
|--------|---------------|--------------------|
| Nom entreprise | `tenants.name` | `tenants.company_name` |
| Secteur métier | `tenants.sector` | `voixia_configs.secteur`, `tenants.industry` |
| Prénom agent | Regex sur `system_prompt` | `users.first_name` |
| **Prompt actif** | **`ai_prompt_versions.is_active=1` (1 SEUL par tenant)** | — |
| Config LLM/voix | `voixia_configs` (llm_provider, llm_model, voice_id, transfer_*) | — |
| Liste voix | `lib/voices.ts` (VOICE_OPTIONS) | — |
| **Prompts secteurs** | **`src/modules/shared/sector-prompts.js`** (backend, 14 secteurs) | `lib/prompts.ts`, `ai_sector_templates`, `voixia-portal/lib/sectors.ts` |
| Nodes / scénarios UI | `lib/prompts.ts` (SECTOR_PROMPTS) | PROMPT_TEMPLATES local |
| Tél personnel | `users.phone` (vérifié `users.phone_verified`) | — |
| Tél pro Twilio | `tenants.phone` | — |
| Onboarding | `tenants.onboarding_completed` + `onboarding_sessions` | localStorage |

**Règle prompt actif :** exactement UN `ai_prompt_versions.is_active=1` par tenant.
`ai_prompt_versions.id` = INTEGER PRIMARY KEY autoincrement (utiliser `meta.last_row_id`).
Le `system_prompt` en DB ne contient JAMAIS de variable `{}`.

### Tables critiques

| Table | Rôle |
|-------|------|
| `tenants` / `users` | Multi-tenant + auth (users.phone, phone_verified, phone_verification_*) |
| `ai_prompt_versions` | Versions de prompt, `is_active=1` = actif |
| `voixia_configs` | Config LLM/voix/transfert par tenant |
| `ai_sector_templates` | Templates sectoriels — **DÉRIVÉ**, plus une source (14 lignes, backfill 07/08 depuis `shared/sector-prompts.js`). Ne sert qu'à `GET /ai/templates` et au réglage LLM/voix par secteur |
| `calls` / `call_summaries` / `ai_interaction_logs` | Appels + résumés + logs |
| `appointments` / `availability_slots` | RDV (INDEX UNIQUE partiel anti double-booking, migr. 0066) |
| `knowledge_documents` / `knowledge_chunks` | KB (recherche lit `content`, fallback documents). `deleted_at` = corbeille 30 j ; `chunks.metadata.ligne` = index de la ligne source (CX-2) |
| `knowledge_document_versions` | Historique des modifications KB (migr. 0084). On versionne le **document**, jamais la fiche |
| `tasks` / `task_types` | Tâches (task_types globaux `tenant_id='global'` + tenant-specific) |
| `member_skills` | Compétences membres unifiées RDV+Tâches (priorité 1 affectation) |
| `assignment_rules` | Règles d'affectation (legacy, priorité 2) |
| `proactive_templates` / `proactive_logs` / `proactive_settings` | Communication proactive |
| `omni_rules` / `omni_rule_executions` | Automatisation omnicanal (5 scénarios) |
| `waitlist` | Inscriptions Fondateurs (2 places/secteur) |

**Faits d'architecture (appris) :**
- `availability_slots.agent_id` → FK vers `agents(id)`, PAS `commercial_agents`.
- `omni_phone_mappings` : colonne `channel_type` (pas `channel`).
- Signup route `/api/v1/auth/signup` (alias `/register` ajouté B4).
- `is_active` a `DEFAULT 1` → un INSERT sans ce champ met 1 automatiquement (ne pas conclure trop vite à un bug).

**Migrations récentes :** 0062 tasks/task_types, 0063 demo tasks, 0064 member_skills,
0065 demo skills, 0066 INDEX UNIQUE partiel appointments (anti double-booking).

---

## g) FICHIERS AGENTS PYTHON (VoixIA — serveur 51.15.130.204)

⚠️ **NE PAS CASSER.** Règles absolues par fichier :

| Fichier | Rôle | Règle |
|---------|------|-------|
| `/opt/voixia/agent/tenant.py` | Client resolve-phone | phone encodé `%2B` dans l'URL |
| `/opt/voixia/agent/main.py` | Entrypoint + greeting + session | `session.say()` JAMAIS `generate_reply()` ; shutdown callback → log-call |
| `/opt/voixia/agent/pipeline.py` | Agent LLM + 8 @function_tool | system_prompt depuis resolve-phone ; `log_call_to_api()` (httpx, timeout 5s) |
| `/opt/voixia/agent/tools/knowledge.py` | search_knowledge + `_nettoyer_pour_tts()` | word-split OR ; TTS 300 chars ; 15/15 tests |
| `/opt/voixia/agent/tools/transfer.py` | Transfer humain + callback | transfer_enabled=0 → propose rappel + create_prospect + SMS |
| `/opt/voixia/agent/llm_factory.py` | Factory LLM (lk_openai.LLM) | provider + model dynamiques (Mistral + Claude) |
| `/opt/voixia/agent/config.py` | Config providers | mistral + claude |
| `/opt/voixia/agent/prompts.py` | Greetings + fallback | textes LITTÉRAUX courts |
| `/opt/voixia/.env` | Variables d'env | EnvironmentFile systemd |

**Extraction fin d'appel :** caller_phone via `participant.identity` (`sip_+33...` → `+33...`),
duration via `perf_counter`, transcript via événement `conversation_item_added` en temps réel
(fallback `session.chat_ctx`), summary = 200 premiers chars.

---

## h) LIGHTRAG COCCINELLE (RAG SOUVERAIN — nouveau)

**Service de RAG souverain hébergé en Europe, isolé par workspace.**

| Élément | Valeur |
|---------|--------|
| Serveur | Hetzner **CPX32**, datacenter **Nuremberg** (Allemagne) |
| IP | `188.245.221.62` |
| URL | **https://lightrag.coccinelle.ai** |
| Accès SSH | `ssh lightrag` (alias configuré) |
| Répertoire | `/opt/lightrag-coccinelle/` |
| Config/secrets | `/opt/lightrag-coccinelle/.env` |
| LLM | **Mistral souverain** (pas d'appel hors UE) |
| Workspace | `coccinelle` — **isolé** du workspace `1compta` (multi-produit sur le même serveur) |

**Pourquoi :** souveraineté des données (RGPD, argument commercial FR), indexation graphe +
vecteurs de la base de connaissances, alternative/complément à Cloudflare Vectorize.

**Isolation critique :** le workspace `coccinelle` NE DOIT JAMAIS partager d'index avec
`1compta`. Toujours vérifier le workspace ciblé avant toute opération d'ingestion/query.
Vérifié le 08/08/2026 : isolation **saine** — deux conteneurs (`coccinelle-lightrag`,
`1compta-lightrag`) et deux volumes Docker distincts.

> 🔴 **LightRAG est COUPÉ du chemin vocal depuis le 08/08/2026** (`LIGHTRAG_ENABLED === 'true'`,
> absent = coupé). Il n'est **pas multi-tenant** : aucune ingestion par tenant n'existe, l'index
> ne contient que la doc commerciale de Coccinelle.ai, et la requête ne portait ni `tenant_id`
> ni workspace — tous les clients recevaient le même index. **Ne pas réactiver sans (a) ingestion
> par tenant et (b) filtre par tenant.** La recherche vocale repose aujourd'hui sur D1
> (LIKE word-split OR + extraction du passage pertinent). Voir § j et [[lightrag-non-multitenant]].

**Commandes :**
```bash
ssh lightrag                              # connexion (alias)
ssh lightrag "docker ps"                  # état des conteneurs LightRAG
ssh lightrag "cat /opt/lightrag-coccinelle/.env"   # config (secrets — prudence)
```

---

## i) RÈGLES ABSOLUES (apprises douloureusement)

### VoixIA / agent vocal
1. `session.say(texte_littéral)` — `generate_reply()` INTERDIT.
2. Greeting = phrase courte littérale, nom d'abord : « {Préfixe secteur} {NOM}, bonjour ! Comment
   puis-je vous aider ? » (ex. « Garage Dupont, bonjour ! »). Construit par
   `format_company_for_greeting()` dans `prompts.py` (préfixe métier par secteur + garde
   anti-double-préfixe + fallback « Entreprise {nom} »). Voir [[greeting-sector-prefix]].
3. Le « + » des numéros → encodé `%2B` dans les URLs.
4. UN SEUL `is_active=1` par tenant ; `system_prompt` en DB sans variable `{}`.
5. `system_prompt` DOIT contenir : « appelle TOUJOURS search_knowledge avant de répondre
   à toute question sur les services ou tarifs » (sinon l'agent ne call pas le tool).
6. `system_prompt` DOIT contenir « ne dis JAMAIS je consulte, je vérifie, un instant,
   je recherche » (OUTIL SILENCIEUX) + une liste de MOTS INTERDITS (ex : « sur devis »).
6bis. **Ne JAMAIS écrire un `system_prompt` sans passer par `buildSectorPrompt()`**
   (`src/modules/shared/sector-prompts.js`). Les règles 4, 5 et 6 ne se vérifient pas à la
   relecture : elles se garantissent par le générateur. Un prompt venu de l'extérieur
   (frontend, portail revendeur) se teste avec `isPromptCompliant()` et se **régénère** s'il
   échoue — ne jamais le stocker tel quel. Tout prompt qui SORT vers un LLM passe par
   `applyPromptVariables()` (les prompts historiques portent encore des `{}`).
   Leçon du 07/08/2026 : 3 sources divergentes = 0/13 templates conformes en prod pendant
   des mois, sur 100 % des nouveaux inscrits. Voir [[sector-prompts-source-unique]].
6ter. **L'ORDRE et les EXEMPLES d'un prompt pèsent plus que ses règles.** Trois invariants,
   payés par une régression en prod le 08/08 (plus aucun appel d'outil) :
   - la **dernière** instruction avant CLÔTURE doit être celle qu'on veut voir exécutée —
     c'est `TOOL_ORDER_BLOCK` (appeler l'outil), jamais l'échappatoire ;
   - **tout exemple verbatim est un script que le modèle rejouera** : ne jamais donner
     l'exemple du chemin d'échec sans donner d'abord celui du chemin nominal ;
   - une consigne de repli s'énonce **conditionnée** (« SEULEMENT si l'outil a été appelé et
     n'a rien renvoyé »), jamais comme une règle générale — et si elle promet une action
     (rappel), elle doit imposer l'outil qui la réalise (`create_task`).

### Tools vocaux & TTS
7. Retour tool vocal : JAMAIS de préfixe technique (« Réponse trouvée », etc.) — c'est lu à voix haute.
8. Retour tool : max **300 chars**, phrases naturelles, pas de markdown, pas de symboles,
   coupe à la dernière phrase complète.
9. `_nettoyer_pour_tts()` : 48+ remplacements en 12 catégories (temporel, monétaire, %,
   connecteurs, abréviations, sigles, sigles fiscaux HT→hors taxes / TTC→toutes taxes comprises
   / TVA→T V A regex `\b`, ordinaux, ponctuation, markdown, espaces, troncature).
10. Documents KB en langage vocal pur : phrases ≤ 15 mots, pas de symboles/sigles/markdown.

### SMS sortants
10quater. **Un SMS se compte en unités GSM-7, jamais en caractères.** Un seul caractère hors
    table (`ô`, `ç` minuscule, apostrophe courbe `’`) bascule le message entier en UCS-2 :
    la capacité passe de 160 à **70** par segment. Passer par
    `compterSms()` / `compacterPourGsm7()` (`shared/sms-format.js`) avant de conclure qu'un
    message « tient ». `€` compte double mais reste plus court que « EUR ».
10quinquies. **`appointments.scheduled_at` est une date-heure NAÏVE et déjà LOCALE.** Ne jamais
    la passer à `new Date()` puis la reformater avec un `timeZone` : cela ajoute deux heures en
    été. Lire les composantes du texte telles quelles.
10bis. **La règle « ce SMS mérite-t-il le lien de réservation ? » vit dans UN SEUL fichier** :
    `src/modules/shared/sms-booking-link.js` (table `TYPES_SMS`). Un module d'envoi n'écrit
    jamais cette décision lui-même — il passe un `type`. Ajouter un type au tableau, jamais un
    `if` dans un module d'envoi. Un type inconnu n'ajoute pas de lien (on ne devine pas).
10ter. **Ne jamais fabriquer une URL publique à partir d'un slug absent** : mieux vaut un SMS
    sans lien qu'un lien vers « Entreprise introuvable ». L'enrichissement ne bloque jamais
    l'envoi : si la base est indisponible, le message part tel quel.

### Recherche KB
11. TOUJOURS splitter la question en mots significatifs, chercher avec OR
    (`LIKE '%mot1%' OR LIKE '%mot2%'`). JAMAIS `LIKE '%phrase entière%'`.
11bis. **Ne jamais retirer les chiffres des mots recherchés.** `[^a-z\s]` transformait
    « R1234yf » en « r yf », donc en rien : le seul mot qui distingue deux prestations
    disparaissait avant la requête. Toute référence technique est concernée.
11ter. **Un montant n'est JAMAIS séparé de son libellé.** Sur une KB tabulaire, l'unité de
    recherche est la **fiche** (une ligne = un libellé + son prix, indivisible), jamais une
    fenêtre de caractères — une fenêtre coupe entre la prestation et son tarif. La
    normalisation se fait **à l'ingestion** (`shared/kb-fiches.js`), pour tous les formats
    d'import : le client n'a rien à changer à son fichier. Corollaire : deux fiches proches à
    prix différents ne se départagent pas au score — l'agent demande laquelle.
11quater. **Une fiche est une PROJECTION, pas la donnée.** `indexerFiches()` supprime et
    reconstruit **toutes** les fiches d'un document depuis `knowledge_documents.content` à
    chaque écriture. Corriger un `knowledge_chunks` en base, c'est donc corriger un cache :
    la valeur revient à la première ré-ingestion — un ré-import du site, une modification du
    document — sans que personne ne comprenne pourquoi le prix a changé tout seul.
    ⇒ Une correction de fiche **réécrit la ligne du document parent**
    (`reecrireLigneFiche()` / `supprimerLigneFiche()` dans `shared/kb-fiches.js`), puis
    réindexe. Corollaire : chaque fiche porte `metadata.ligne`, son index dans le contenu
    **brut** — `chunk_index` est le rang de la fiche, pas celui de la ligne (les lignes vides,
    les séparateurs Markdown et les lignes hors format dominant sont écartés en route). Une
    fiche sans `ligne` (indexée avant le 12/08/2026) est lisible mais **refuse** la correction
    en ligne, par un 409 explicite plutôt qu'une écriture au hasard. Le backfill se génère par
    `scripts/generer_reingestion_fiches.mjs`. Voir [[kb-fiches-tabulaires]].
12. JAMAIS de documents crawlés d'un autre site dans la KB (vérifier `source_type` avant démo).

### UI / produit
13. Emoji 🐞 BANNI de l'interface — utiliser `CoccinelleIcon`.
14. « Sara »/« Fati » BANNIS dans les pages publiques — utiliser « Assistant » ou le nom dynamique.
15. Termes techniques BANNIS dans l'UI : RAG → « Recherche intelligente », Crawl → « Importer
    depuis un site », Knowledge Base → « Base de connaissances », embedding/vector/chunks → cachés.
16. Palette dashboard : blanc/noir/gris (exceptions vert/rouge pour variations).

### Frontend (export statique)
16bis. **`redirect()` de `next/navigation` est INTERDIT dans une page.** Le site est exporté en
   statique (`next.config.js` : `output: 'export'`, `trailingSlash: true`) : `redirect()` n'y redirige
   pas, il génère une **page d'erreur** (`<html id="__next_error__">`). Utiliser un
   `<meta httpEquiv="refresh" content="0; url=/cible/" />` **+ un lien visible** de repli (fonctionne
   sans JS et sans dépendre de la priorité assets statiques vs `public/_redirects` sur Cloudflare
   Pages). ⚠️ Piège vécu le 19/07/2026 : la redirection `settings/channels/whatsapp` du Lot 0 a été
   **déployée cassée** faute de build de vérification. Voir [[nextjs-static-export-redirect]].
16ter. **Toujours vérifier le HTML généré**, pas seulement le succès du build : `grep __next_error__`
   sur `out/**/index.html`. Un build vert n'implique pas une page fonctionnelle.

### Général
17. Vérifier le `DEFAULT` d'une colonne avant de conclure qu'un champ manquant casse quelque chose.
18. Toujours cibler `coccinelle-db-eu` (jamais l'ancienne `coccinelle-db`).
19. LightRAG : toujours vérifier le workspace (`coccinelle` ≠ `1compta`).
20. **`voixia/agent/` doit rester identique md5 pour md5 à `/opt/voixia/agent/`.** Le serveur fait
   foi ; le dépôt en est le miroir, pas la source. Le vérifier (`find … -name '*.py' | xargs md5`
   des deux côtés) **avant** de raisonner sur ce code : entre mars et août 2026, six fichiers du
   dépôt décrivaient une architecture LiveKit 0.x qui n'a jamais tourné, et trois fichiers réels
   — dont `llm_factory.py` et `tools/tasks.py` — n'y figuraient pas du tout. Lire le dépôt pour
   comprendre la prod menait alors droit à un faux diagnostic. Ne jamais versionner de `.pyc`.
20bis. 🔴 **`rsync --delete` vers `/opt/voixia/` est INTERDIT. Déployer l'agent par `scp`,
   fichier par fichier.** Payé par une **panne totale de l'agent vocal d'environ 10 minutes**
   le 15/08/2026.

   `rsync -av --delete voixia/agent/ root@51.15.130.204:/opt/voixia/agent/` a supprimé
   **`/opt/voixia/agent/venv/`**, qui n'est pas dans le dépôt. `--delete` efface tout ce que
   la cible contient et que la source n'a pas ; le venv vit précisément **dans** le répertoire
   synchronisé. Or `voixia.service` lance `ExecStart=/opt/voixia/agent/venv/bin/python main.py` :
   l'interpréteur disparu, systemd a bouclé en **203/EXEC**, `Restart=on-failure` toutes les 10 s.

   La leçon n'est pas « rsync est dangereux », c'est : **la règle 20 dit que le serveur fait foi,
   donc on ne calque jamais le dépôt sur le serveur par une opération destructive.** Le miroir
   md5 porte sur les `.py`, pas sur l'arborescence : `/opt/voixia/agent/` contient légitimement
   des choses que le dépôt n'a pas — le venv, et `/opt/voixia/` porte en plus `.env`,
   `livekit.yaml`, `sip/`, `VoixIA/`, `rollback-*`. **Regarder la cible avant d'écrire dedans.**

   ```bash
   # ── Déploiement de l'agent : les fichiers, et RIEN d'autre ──
   cd ~/Projects/saas/coccinelle-ai/voixia/agent
   scp *.py root@51.15.130.204:/opt/voixia/agent/
   scp tools/*.py root@51.15.130.204:/opt/voixia/agent/tools/
   ssh root@51.15.130.204 "systemctl restart voixia && sleep 5 && systemctl is-active voixia"

   # ── Contrôle : le miroir md5 de la règle 20 ──
   # ⚠️ EXCLURE `venv/` : il vit DANS /opt/voixia/agent/ et pèse ~8 500 fichiers .py
   # de bibliothèques. Sans l'exclusion, le diff est illisible — constaté le 15/08.
   find . -name '*.py' -not -path '*/__pycache__/*' -not -path './venv/*' | sort | xargs md5 -r
   ssh root@51.15.130.204 "cd /opt/voixia/agent && find . -name '*.py' -not -path '*/__pycache__/*' -not -path './venv/*' | sort | xargs md5sum"
   ```

   ```bash
   # ── Reconstruction du venv, si un jour il disparaît encore ──
   ssh root@51.15.130.204
   cd /opt/voixia/agent
   python3 -m venv venv
   ./venv/bin/pip install --upgrade pip
   ./venv/bin/pip install -r requirements.txt
   systemctl restart voixia && systemctl is-active voixia
   # L'agent doit ensuite apparaître comme worker enregistré dans les logs :
   journalctl -u voixia -n 30 --no-pager | grep -i "registered worker"
   ```

   ⚠️ **EFFET DE BORD À SURVEILLER — dérive de versions du 15/08/2026.** La reconstruction a
   réinstallé les bibliothèques **plus récentes** que celles d'origine. **Si un comportement
   change à l'oral (latence, coupures, qualité TTS, appels d'outils), c'est la PREMIÈRE piste
   à examiner, avant le prompt et avant la KB.** État après reconstruction :
   `livekit-agents 1.4.6`, les 6 plugins `1.4.6`, `livekit-plugins-anthropic 1.4.6`,
   `transformers 4.57.1`, `numpy 2.5.2`, `openai 3.1.0`, `httpx 0.28.1`.

   **Le mécanisme exact de la dérive**, parce qu'il conditionne le correctif : `requirements.txt`
   contraint bien ses 4 lignes en `~=` (`livekit-agents~=1.4.6` autorise 1.4.x, pas 1.5), mais
   **aucune dépendance transitive n'y figure** — `transformers`, `numpy`, `openai`, `httpx2` se
   sont installées au dernier compatible. Un `~=` sur quatre paquets ne fige pas un
   environnement. ⇒ **À faire : `./venv/bin/pip freeze > requirements.lock.txt` sur le serveur,
   versionné dans le dépôt**, et reconstruire depuis le lock. Sans lui, chaque reconstruction
   produit un agent différent, et une régression vocale devient inexplicable.

21. **Un outil VoixIA ne lit JAMAIS le tenant dans l'environnement** : `get_tenant_id()` /
   `get_api_key()` de `tools/context.py`, alimentés par `set_call_context()` au début de l'appel.
   `VOIXIA_TENANT_ID` du `.env` est un secours, pas une source (voir § j, 11/08/2026).

---

## j) BUGS CONNUS + SOLUTIONS

### Ouverts / à traiter (par priorité)

| Priorité | Bug | Détail |
|----------|-----|--------|
| 🔴 Critique | **Funnel onboarding** | 8/145 complétions, 0 depuis 25 jours — instrumenter + simplifier |
| ✅ Clos | ~~Clé API VoixIA exposée — rotation TERMINÉE le 15/08/2026~~ | **Contrôle final : `401` sur l'ancienne clé, `200` sur la nouvelle**, et `wrangler secret list` ne montre plus que `VOIXIA_API_KEY` — `VOIXIA_API_KEY_ROTATION` est supprimé, la fenêtre est fermée. La clé publiée reste lisible dans **23 commits accessibles** (mesuré, 20/03→16/05) mais **n'ouvre plus rien** : c'est exactement ce que la rotation garantit, et pourquoi elle est le seul remède réel à une fuite d'historique. ⚠️ Elle vivait dans **TROIS** fichiers, pas seulement la doc : `CLAUDE.md`, `dashboard/proactive/page.tsx` et `dashboard/voixia/page.tsx` — donc **en clair dans le bundle JavaScript** servi aux visiteurs de ces pages à l'époque. Une clé dans un composant front n'est pas « exposée par le dépôt », elle est publiée par le produit. Sauvegarde serveur `/opt/voixia/.env.avant-rotation` purgée (elle portait encore l'ancienne). Procédure réutilisable en § r.1 |
| ✅ Clos | ~~Régénérer clés Meta~~ | **Vérifié le 11/08** : `META_WHATSAPP_ACCESS_TOKEN` expiré le 28/01 (Graph API code 190), `META_APP_SECRET` invalidé par la réinitialisation du 19/07 (« Invalid OAuth access token signature »), `META_WEBHOOK_VERIFY_TOKEN` bien tourné (la valeur publique renvoie 403 sur le handshake). `WHATSAPP_ACCESS_TOKEN` **n'a jamais été dans le dépôt**. Les 3 valeurs Meta restent lisibles dans `wrangler.toml` à 3 commits publics (01/03→09/05) mais n'ouvrent plus rien |
| 🟠 Haute | Dérive de schéma `omni_phone_mappings` | Les colonnes `channel_type`, `meta_phone_number_id`, `meta_waba_id`, `meta_access_token`, `display_name` **existent en prod mais aucune migration ne les crée** (appliquées hors-bande) → un rebuild depuis `migrations/` ≠ prod. À régulariser (Lot 3). `meta_access_token` est stocké **en clair** ; `channel_configurations.config_encrypted` contient un simple `JSON.stringify` malgré son nom |
| 🟠 Haute | **Webhook SMS entrant : tenant en dur** | `omnichannel/webhooks/sms.js:49` crée toute nouvelle conversation avec `'tenant_mihmuebzieaxehi7qv'` **écrit en dur** — un tenant purgé le 10/08, donc inexistant. Même antipattern que la faille WhatsApp (fallback « premier tenant actif »). À résoudre par `omni_phone_mappings` sur le numéro appelé, comme `resolve-phone`. En attendant, le lien de réservation est omis sur ce chemin plutôt que fabriqué au hasard |
| 🟡 Moyenne | Outlook OAuth | Secrets Azure non configurés |
| 🟡 Moyenne | Yahoo OAuth | Client ID incorrect |
| 🟡 Moyenne | Gmail OAuth | Bug corrigé, test inbox jamais fait |
| 🟡 Moyenne | Stripe prix | `STRIPE_PRICE_*` en secrets + sync `billing_plans` DB |
| 🟢 Mineure | BUG #013 | localStorage `onboarding_session_id` |
| 🟢 Mineure | CORS hygiénique | passer `request` aux helpers dans `twilio/routes.js` (ne gêne que les URLs preview) |
| 🟡 Moyenne | Dette `tenants.phone` | 5 tenants partagent `+33760762153`, formats mixtes `0760…`/`+3376…` — non utilisé par resolve-phone (secondaire) mais à assainir |

### Résolus majeurs (référence rapide)

- **Le greeting ne disait pas le prénom de l'assistant (13/08/2026)**. `main.py` extrayait
  le prénom du `system_prompt` et le passait à `get_greeting(assistant_name=…)` — paramètre
  **documenté et ignoré** par la phrase retournée, qui restait « {société}, bonjour ! Comment
  puis-je vous aider ? ». La page « Mon Assistant » montrait donc au client un accueil que son
  assistant ne prononçait pas. **Trouvé par la recette, pas par la lecture** : le prompt était
  correct, la chaîne page → API → prompt → agent l'était aussi, seule la phrase littérale du
  greeting ne l'était pas. Fix : la phrase utilise le paramètre déjà transmis, avec **repli sur
  la formulation historique** si le prénom manque. Accents obligatoires (la chaîne part au TTS).
  Le `1. ACCUEIL — Accueille au nom de {société}` du prompt sectoriel reste **inchangé** : le
  risque de double présentation existe sur le papier, l'appel réel ne l'a pas produit, et une
  retouche de prompt avait fait disparaître tout appel d'outil le 08/08.

- **SMS — un devis en deux morceaux, et deux bugs d'heure (11/08/2026)**. Le devis partait en
  **deux SMS**. La cause n'est pas la longueur mais l'**encodage** : Twilio code en GSM-7
  (160 caractères par segment) tant que *tous* les caractères appartiennent à l'alphabet
  GSM 03.38 ; **un seul** caractère hors table bascule le message en UCS-2 et la capacité tombe
  à **70**. Le piège est contre-intuitif en français : « é è à ù ì ò » **sont** dans la table,
  « ô â ê î û ë ï » **non**, et « ç » **minuscule** non plus — le mot « français » correctement
  accentué fait exploser le compte. « € » y est, mais dans la table d'**extension** : il compte
  double, et reste malgré tout plus court que « EUR ».
  **Fix** : `shared/sms-format.js` (compteur exact + translitération **ciblée** — on ne touche
  qu'aux caractères hors table, dégrader « Réservez » en « Reservez » serait gratuit), ajustement
  à un segment par troncature **sur les séparateurs d'énumération** (jamais au milieu d'une
  prestation : un montant sans libellé est ce que tout le reste du produit s'interdit), route
  courte `/b/{slug}`, et règle de composition dans les 7 prompts actifs.
  Mesures : devis d'origine **252 unités = 2 segments** ; gabarit compact **139 = 1 segment**.
  **Deux bugs que seule la recette réelle pouvait montrer** : « Votre RDV chez **undefined** »
  (le `SELECT` ne ramenait que `tenants.id`) et une **heure décalée de deux heures** —
  `appointments.scheduled_at` est une date-heure **naïve et déjà locale**, la relire avec
  `new Date()` la traite comme de l'UTC. Un RDV de 14h30 était confirmé pour 16h30, un RDV de
  16h rappelé pour 18h. Le défaut vivait dans **deux fichiers** : corriger `public/booking.js`
  n'a pas suffi, `cron/reminders.js` refaisait la même conversion. Voir [[sms-encodage-gsm7]].

- **Réservation publique — la confirmation n'était pas en panne, elle n'existait pas (11/08/2026)**.
  La page promet « vous recevrez une confirmation par SMS ou par e-mail » ; la route insérait le
  rendez-vous puis répondait, **sans le moindre appel Twilio ni Resend**. Les colonnes
  `confirmation_sent` / `confirmation_channel` existaient pourtant en base : la fonction avait été
  prévue, jamais écrite. `shared/sms-envoi.js` envoie **et** rattache le message à la conversation
  du contact, pour qu'il apparaisse dans sa fiche. Au passage, `customer_name`, `customer_phone`
  et `booking_source` restaient `NULL` sur les rendez-vous pris en ligne — désormais remplis.

- **Rappel J-1 — trois manques (11/08/2026)**. Le cron `0 17 * * *` existait et tournait.
  Manquaient : l'exception **« réservé il y a moins de 24 h »** (`julianday(scheduled_at) -
  julianday(created_at) >= 1`), le lien de modification, le message court, et la trace dans
  l'historique de conversation. « Répondez CONFIRMER ou ANNULER » a été retiré : **rien ne
  traitait ces réponses**, la promesse était vide.


- **Page de réservation publique cassée pour TOUS les tenants (11/08/2026)**. Découvert en
  vérifiant le prérequis des liens SMS. `coccinelle.ai/booking/{slug}` affichait
  **« Page introuvable — Entreprise introuvable »**, quel que soit le tenant, depuis toujours.
  **Cause** : `BookingClient.tsx` lisait `useParams()`. En export statique, seul `/booking/_` est
  prérendu et Cloudflare Pages sert cette page pour toutes les URL `/booking/*` : `useParams()`
  renvoie donc **`_`**, le slug de BUILD, jamais celui de l'URL visitée. La page appelait
  `/api/v1/public/booking/_` → « Entreprise introuvable ». Le HTML servi contient littéralement
  `"_"` comme paramètre. **Fix** : lire `window.location.pathname` (repli sur `useParams()`) —
  c'est la règle 16bis, et exactement la famille de B15. **Le backend, lui, fonctionnait
  parfaitement** (créneaux servis correctement) : seul le front n'atteignait jamais le bon slug.
  ⚠️ Un build vert ne prouve rien ici : il fallait charger la page dans un vrai navigateur.

- **Lien de réservation dans les SMS — décision centralisée (11/08/2026)**. Le lien n'existait
  que dans le devis, alors qu'une douzaine de chemins envoient des SMS. Un SMS où la prise de
  rendez-vous a du sens **sans** le lien pour la prendre, c'est un client perdu à la dernière
  marche : il a le tarif, il est d'accord, et il doit rappeler. `shared/sms-booking-link.js`
  porte la table `TYPES_SMS` (14 types) et l'enrichissement ; 8 chemins d'envoi lui passent un
  type. **Exception retournée à l'analyse** : le SMS d'**annulation** de RDV dit déjà
  « contactez-nous pour reprogrammer » — c'est l'endroit même où le lien évite un appel, il
  reçoit donc le lien. Restent sans lien : confirmation et rappel de RDV, code de vérification,
  notifications internes à l'équipe. Voir [[sms-lien-reservation]].

- **KB tabulaire — le prix de la ligne voisine (11/08/2026)**. « Montage équilibrage » facturé
  **15 €** annoncé **25 €**. Trois étages empilés, tous mesurés : (1) le classement des passages
  récompensait la **densité** de mots, donc « pneu » (10 occurrences) écrasait « équilibrage »
  (1 occurrence) qui portait la réponse ; (2) la fenêtre de 500 caractères commençait **30
  caractères après** la bonne ligne ; (3) le plafond TTS de 300 caractères supprimait le second
  passage — le seul à contenir les 15 €. **Le LLM n'a jamais vu la réponse** : il a cité verbatim
  un chiffre voisin, exactement comme le prompt le lui demande. L'ancrage verbatim n'était pas en
  cause ; le défaut était dans ce qu'on lui donnait à lire.
  **Fix — changement d'unité, pas rafistolage de la fenêtre** : à l'**ingestion**, un document
  tabulaire engendre **une fiche par ligne** dans `knowledge_chunks`
  (`src/modules/shared/kb-fiches.js` + `kb-ingest.js`). Une fiche est indivisible, donc un prix ne
  peut plus être servi sans son libellé. Détection de structure (CSV, point-virgule, tabulation,
  Markdown), découpage respectant les guillemets, colonnes identifiées par en-tête **ou** par
  contenu, classement pondéré par la **rareté** (IDF) et pénalité des concepts non demandés.
  **Seuil d'ambiguïté** : deux fiches proches à prix différents ne se départagent pas, l'agent
  demande laquelle (règle **2bis** du prompt). **Garde-fou anti-prose** : un paragraphe dont chaque
  phrase porte une virgule présente 100 % de régularité en deux colonnes — deux critères
  (cellules courtes, et ≥ 3 colonnes ou une colonne de montants) l'écartent, et les 30 documents
  rédigés des autres tenants restent servis par le chemin prose, inchangé.
  **Découverte au passage** : les mots recherchés étaient filtrés par `[^a-z\s]`, donc **« R1234yf »
  devenait « r yf » puis disparaissait** — le seul mot distinguant 129 € de 79 €. Toute référence
  technique était invisible (5W30, millésime, référence pièce). Voir [[kb-fiches-tabulaires]].

- **Outils VoixIA — 4 outils sur 8 travaillaient sur le mauvais tenant (11/08/2026)**.
  Chaque module d'outil construisait son client HTTP avec
  `os.environ.get("VOIXIA_TENANT_ID")` — une valeur **figée dans `/opt/voixia/.env`**, la même
  pour tout le serveur, et pointant sur **« Agentic solutions »**. Le tenant résolu par
  `resolve-phone` n'était donc utilisé que pour le prompt et la voix : tous les appels d'outils
  partaient chez un tiers. Conséquences réelles : `search_knowledge` lisait la KB d'une autre
  entreprise (c'est la cause des tarifs « inventés » du 08/08), `check_availability` annonçait
  **les créneaux d'un autre garage**, `book_appointment` y **posait** le rendez-vous,
  `create_prospect` y créait la fiche, `search_products` y lisait le catalogue.
  **Fix en deux temps** : `tools/context.py` (`ContextVar` posé par `set_call_context()` dans
  `main.py`, juste après `resolve_tenant`, **avant** la construction des outils ; le `.env` ne
  sert plus que de secours) — appliqué le 10/08 à `knowledge`, `messaging`, `transfer`, puis le
  **11/08 à `crm`, `appointments`, `products`**, seuls restants. `create_task` était déjà correct
  (`pipeline.py` lui passe `self._tenant_info`). **Invariant : tout nouveau module d'outil doit
  lire `get_tenant_id()` / `get_api_key()`, jamais l'environnement.**
  Le trou de 10 mois tenait à ce que le serveur n'avait qu'**un seul** tenant utile ; il ne
  devient visible qu'à partir du deuxième client.

- **KB — LightRAG court-circuitait la base de connaissances du client (08/08/2026)**.
  Symptôme : l'agent appelait bien `search_knowledge` (prompt conforme) mais répondait à côté,
  inventait des fourchettes de prix et un faux numéro dans un devis envoyé au client.
  **Cause** : `handleSearchKnowledge` interrogeait LightRAG **en premier**, sans `tenant_id` ni
  workspace (`LIGHTRAG_WORKSPACE` de wrangler.toml n'était jamais lu par le code), et renvoyait
  sa réponse dès 10 caractères — « je n'ai pas assez d'informations » compris, avec `found:true`.
  Or **rien n'ingère jamais la KB d'un tenant dans LightRAG** : l'index ne contenait que la doc
  commerciale de Coccinelle.ai. Un garage recevait « Tarif Essentiel 79 euros par mois » sur une
  question de vidange. Flag **fail-open** (absent = actif). Isolation vis-à-vis de `1compta`
  **vérifiée saine** (conteneurs et volumes Docker distincts) : la fuite était inter-tenants
  Coccinelle + éditeur→client.
  **Fix** : LightRAG **coupé par défaut** (`LIGHTRAG_ENABLED === 'true'`, réactivable
  explicitement seulement) et rétrogradé en **complément** jamais en court-circuit ; détection des
  non-réponses ; markdown et section « References » retirés (lus à voix haute sinon) ;
  `_extractRelevantPassage()` remplace `substring(0,500)` qui renvoyait le **début du document**
  quelle que soit la question ; `_answerFromTenantContact()` expose téléphone / adresse / email
  qui vivent dans `tenants` et non dans la KB — l'agent n'avait aucune source pour le numéro.
  ⚠️ **Ne pas réactiver LightRAG sans (a) une ingestion par tenant et (b) un filtre par tenant** :
  la fuite reviendrait telle quelle. Voir [[lightrag-non-multitenant]].

- **Prompt — la porte de sortie a tué l'appel d'outil, puis a été réparée (08/08/2026)**.
  Le bloc anti-invention ajouté le matin même occupait la **dernière place** avant CLÔTURE et se
  terminait par le **seul exemple prêt à prononcer** de tout le prompt (« Je vous fais rappeler par
  un conseiller »). Résultat : plus **aucun** appel de `search_knowledge` dans les logs, l'agent
  partait directement sur le rappel même quand la réponse était en base. Causalité isolée (Python
  inchangé, API correcte au curl, seul delta = ce bloc). **Fix** : `TOOL_ORDER_BLOCK` séquencé —
  appel de l'outil en 1, exemple du chemin **nominal** avant celui de l'échec, porte de sortie
  conditionnée deux fois et assortie d'un `create_task` obligatoire (un rappel promis sans
  `create_task` n'existe pas), section ZÉRO INVENTION (ni invention **ni approximation**).
  Réparé en base par `REPLACE` sur chaînes exactes relevées en base, garde-fou anti-écrasement :
  2 prompts personnalisés et 1 orphelin volontairement épargnés. Voir [[prompt-ordre-outils]].

- **Templates sectoriels dégradés — E2E validé 07/08/2026** (chantier `chantier-templates-kb`).
  **Constat** : 3 sources divergeaient (`lib/prompts.ts`, `ai_sector_templates`,
  `voixia-portal/lib/sectors.ts`) et les DEUX que le backend utilisait — signup puis étape
  « assistant » de l'onboarding — n'avaient **ni l'instruction `search_knowledge` (i.5) ni les
  règles vocales (i.6)** : contrôle prod = **0/13 conformes** ⇒ 100 % des nouveaux inscrits
  recevaient un agent répondant **de mémoire** sur les tarifs, sur le tunnel P0. Corriger une
  seule source ne suffisait pas : le signup écrit un prompt, l'étape agent l'écrase, un
  utilisateur qui saute l'étape garde celui du signup.
  **Fix** : générateur unique `src/modules/shared/sector-prompts.js` (JS pur, côté Worker —
  le prompt est généré là où il est écrit en base), fusion du déroulé métier de `lib/prompts.ts`
  et du bloc de règles vocales de `buildStarterPrompt()`. **14 secteurs** (+ `syndic`) + table
  d'alias (`restauration`/`services`/`commerce`/`garage`/`notaire`… retombaient silencieusement
  sur `generaliste`). 7 chemins recâblés. **Fuite corrigée au passage** : `resolve-phone`
  (2 branches) et l'orchestrateur renvoyaient le template BRUT — `{COMPANY_NAME}` partait au LLM
  et était lu à voix haute. Backfill D1 par `scripts/backfill_ai_sector_templates.sql`
  (14/14, aucun tenant touché). **Validé E2E 07/08** : V1/V2/V4/V7 sur comptes dédiés (supprimés
  depuis) + **appel réel au numéro d'essai — `search_knowledge` bien appelé dans les logs, greeting
  fluide**. **Reste** : Lot B (aligner `lib/prompts.ts`, brancher le picker
  dashboard sur `/ai/templates`, aligner le portail) + `tenants.sector` du portail non normalisé
  (prompt correct via alias, mais préfixe de greeting Python neutre).

- **B14** Architecture 404 : `fix-spa-404.sh` postbuild copie placeholder en 404.html (5 routes dynamiques).
- **B15** Fiches détail « introuvable » : `window.location.pathname` au lieu de `useParams()` (4 Detail clients).
- **B16** Boutons PATCH silencieux : PATCH ajouté dans `src/config/cors.js` (débloque tous les PATCH).
- **B17** Création RDV échouait : frontend combine date+time en `scheduled_at` ISO avant POST.
- **B18** Appel non découvrable : bouton « Transcription » + deep-link `?call_id=` vers Transcripts.
- **B19** SMS ad hoc impossible : modale SMS sur fiches Contact/Client + section channels/sms.
- **B20** Résolution tenant par numéro APPELÉ (7/07/26) : `tenant.py:extract_sip_to_number()`
  lisait `sip.phoneNumber` (appelant) → tenant résolu sur le numéro de l'appelant. Fix : lire
  `sip.trunkPhoneNumber` (numéro appelé) en 1er ; `sip.phoneNumber` reste le `caller_phone`.
  + `prompts.py:get_prompt()` dégrade sur `generaliste` au lieu de `raise` (un secteur sans
  system_prompt DB ne crashe plus le job). + resolve-phone filtre `channel_type='voice'`.
  + omni_phone_mappings : `+33939035760`→Coccinelle.ai (voice), faux mapping `+33760762153` désactivé.
- **BUG #009** Double-booking : re-check atomique avant INSERT + statut pending + INDEX UNIQUE (0066).
- **BUG #014** Chevauchement RDV : overlap SQL `datetime()` normalisé (T→espace), 6 locations, 7/7 tests.
- **B1–B5** E2E : voixia_config auto au signup, FK availability_slots, task_types globaux,
  alias /register, sector dans resolve-phone.
- KB : préfixe vocal supprimé, TTS 300 chars, word-split OR, HT/TTC/TVA, dedup phone.
- **Conformité — motif de rejet Twilio (15/07/26)** : `refreshBundleStatus()` ne stockait que
  `bundle_status` → sur rejet Twilio post-soumission, `rejection_reason` restait NULL (email + portail
  sans motif). Fix (`compliance/routes.js`) : nouvelle `fetchBundleRejectionReason()` lit le motif
  exact en cascade (`failure_reason` du bundle → pièces jointes rejetées `SupportingDocuments RD…` /
  `EndUser IT…` via ItemAssignments → fallback dernière Evaluation), **préfixe par la pièce** (`docLabel`)
  + **tronque 300 car.**, écrit `bundle_status` + `rejection_reason` en une passe (NULL nettoyé sinon,
  motif de soumission préservé si rien de récupérable). `refreshBundleStatus` retourne `{status,
  rejection_reason}` (2 appelants adaptés) ; endpoint `bundle-status` renvoie le motif. Portail
  (`voixia-portal` `ComplianceForm.tsx`) : bloc « Refusé + Motif : … » mis à jour au clic « Actualiser ».
  Email `notify.js` inchangé (lisait déjà `rejection_reason`). Aucune migration (colonne existe, 0076).
  À valider au 1er vrai rejet (format des `failure_reason` Twilio).
- **Conformité — bundle FR accepté par Twilio (17/07/26)** : le bundle était rejeté (« Authorized
  Representative », « Excerpt … showing French address »). Diagnostic par log temporaire des
  `regulation.requirements` FR (impossible en local : le token us1 `TWILIO_AUTH_TOKEN` est un secret
  Workers, seul le Worker déployé peut lire l'API). **3 hypothèses fausses corrigées** — voir les
  invariants Regulation FR en § o. Fix (`compliance/routes.js`) : End-User `business` unique portant
  société + représentant ; End-User `individual` supprimé (+ désassignation auto de l'orphelin des
  dossiers antérieurs via ItemAssignments) ; `extractDocGroups()`/`pickDocForGroup()` remplacent
  `extractAcceptedDocTypes()`/`matchDocType()` (l'aplatissement des groupes perdait l'exigence
  « registre montrant le nom du représentant ») → **1 SupportingDocument par groupe** ; CIN non poussée
  (aucun type FR) ; **attributs repoussés à chaque build** (`POST EndUsers/{sid}`, `POST
  SupportingDocuments/{sid}`) → un dossier rejeté puis corrigé ne rejoue plus d'anciennes valeurs
  (supprime le besoin de reset manuel des SID). Migration **0081** (`business_website`,
  `twilio_document_sids` JSON). Portail : champ Site web. **Validé E2E 17/07** : Evaluation
  `compliant` → bundle soumis → `pending-review`, badge « En revue ». Reste : approbation Twilio finale.
- **Onboarding QW2/QW3 + magic moment QW8 — E2E validé 18/07/26** : lot anti-abandon onboarding.
  **QW2** : `case 'products'` mort retiré (`onboarding/routes.js`). **QW3** : instrumentation par
  étape — table `onboarding_events` (migr. **0082**, append-only entered/saved/skipped/error),
  écrite non-bloquante par `/onboarding/step` (saved/error) + beacon `/onboarding/event`
  (entered/skipped). ⚠️ Ne pas confondre avec `onboarding_analytics` (morte). **QW8 (magic moment)** :
  un inscrit en essai appelle le **numéro d'essai partagé `+33939035761`** et son propre agent
  décroche, identifié par son numéro vérifié (param `caller` de resolve-phone, seule condition
  `phone_verified=1`, départage `created_at DESC`). A nécessité de réparer 4 couches (voir mémoire
  [[trial-number-magic-moment]]) : (1) **routage Twilio** — 3 couches trunk `VoixIA-EU` + liste
  blanche LiveKit `ST_t32snCUn7y2f` + **`voice_region=ie1`** (couche oubliée → « pas disponible »,
  zéro log ; endpoints régionaux `*.dublin.ie1.twilio.com` + `TWILIO_IE1_AUTH_TOKEN`, voir § o) ;
  (2) **timeout `resolve_tenant`** — httpx 5s affamé par l'event loop pendant le setup média →
  retry 2× + `httpx.Timeout(15, connect=5)` (`voixia/agent/tenant.py`) ; (3) **greeting coupé** au
  décrochage — `await asyncio.sleep(0.8)` (`GREETING_MEDIA_WARMUP_S`) entre `session.start()` et
  `session.say()` (`main.py`), média SIP sortant pas encore stabilisé ; (4) **greeting préfixe
  secteur inversé** — `« Garage Dupont, bonjour ! Comment puis-je vous aider ? »` via
  `format_company_for_greeting()` (`prompts.py`), garde anti-double-préfixe, fallback neutre
  « Entreprise {nom} ». Fichiers Python de l'agent versionnés dans `voixia/agent/` (étaient périmés
  mars). **Résolution VoixIA `resolve-phone` : branche `caller` = numéro d'essai uniquement**
  (`isTrialNumber`), le lookup nominal reste prioritaire.

**SQL overlap normalisé (anti-chevauchement) :**
```sql
datetime(scheduled_at) < datetime(?, '+' || ? || ' minutes')
AND datetime(scheduled_at, '+' || COALESCE(duration_minutes, 60) || ' minutes') > datetime(?)
```
Règle durée : `body.duration_minutes > service.duration_minutes > DEFAULT 60`.

---

## k) COMMANDES ESSENTIELLES

### Déploiement (NE PAS EXÉCUTER SANS OK — ordre obligatoire)

```bash
# 1) Backend
cd ~/Projects/saas/coccinelle-ai && nvm use 22 && npx wrangler@latest deploy

# 2) Agent VoixIA (si Python modifié)
ssh root@51.15.130.204 "systemctl restart voixia"

# 3) Frontend
cd coccinelle-saas && npm run build && npx wrangler pages deploy out --project-name coccinelle-saas --commit-dirty=true
```

> Wrangler v4 global + Node 20 = « fetch failed » intermittent. **Fix : Node 22 + wrangler@latest.**
> Pages deploy peut nécessiter des retries (réseau transitoire).

### VoixIA — logs & smoke tests

```bash
# Logs en direct
ssh root@51.15.130.204 "journalctl -u voixia -f --no-pager"

# resolve-phone (remplacer $VOIXIA_API_KEY, $TENANT_ID depuis .credentials.md)
curl -s "https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/voixia/resolve-phone?phone=%2B33760762153" \
  -H "X-VoixIA-Key: $VOIXIA_API_KEY" -H "X-VoixIA-Tenant: $TENANT_ID"

# KB search
curl -s -X POST "https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/voixia/knowledge" \
  -H "X-VoixIA-Key: $VOIXIA_API_KEY" -H "X-VoixIA-Tenant: $TENANT_ID" \
  -H "Content-Type: application/json" -d '{"question":"tarifs"}'
```

### LightRAG

```bash
ssh lightrag                       # connexion (alias)
ssh lightrag "docker ps"           # état des conteneurs
```

### Diagnostic D1 (⚠️ toujours `coccinelle-db-eu`)

```bash
# system_prompt actif d'un tenant
npx wrangler d1 execute coccinelle-db-eu --remote --command "
SELECT SUBSTR(system_prompt,1,500) AS prompt FROM ai_prompt_versions
WHERE tenant_id='TENANT_ID' AND is_active=1;"

# Migration
npx wrangler d1 execute coccinelle-db-eu --remote --file=migrations/XXXX_nom.sql
```

---

## l) TODO PRIORISÉS

> ⚠️ L'ancienne cible « lancement 1er avril 2026 » est **obsolète**. Priorité = débloquer le funnel.

### 🔴 P0 — Débloquer le business
- [ ] **Instrumenter l'onboarding** : mesurer l'abandon par étape (8/145, 0 depuis 25 j).
- [ ] Simplifier le parcours onboarding (identifier l'étape tueuse, réduire la friction).
- [x] ~~**WhatsApp Lot 0 — sécurisation**~~ : **fait et déployé le 19/07/2026** (kill switch 4 surfaces,
      purge D1, front neutralisé). Détail en § p) point 11.
- [x] ~~**Révoquer les secrets Meta/WhatsApp**~~ : **fait le 19/07/2026** (app secret réinitialisé
      0 h de grâce + tokens utilisateur système « Coccinelle API » révoqués). Risque GitHub public clos.
- [ ] **WhatsApp Lot 2 — débloquer la soumission Meta** (voir § p) point 14). Les 2 URL légales sont
      livrées ; restent **icône 1024×1024** et **catégorie de l'app** (console Meta, action Youssef).
      Puis vérification métier SASU + App Review Tech Provider → **4 à 8 semaines d'attente**, c'est
      le chemin critique du projet WhatsApp.
- [ ] **WhatsApp Lot 2 — prérequis Meta** : vérification métier SASU + App Review Tech Provider
      (8 h de Youssef, déclenche **4–8 semaines d'attente** ⇒ à lancer dès que l'app Meta est
      accessible). Ne détourne pas l'effort du funnel — c'est de l'attente, pas du dev.

### 🟠 P1 — Frictions UX Maze restantes
- [x] ~~**Chunking KB mort — décision à prendre**~~ : **tranché le 11/08**. `knowledge_chunks`
      n'est plus une table morte : elle porte désormais les **fiches** (une ligne de tableau =
      une fiche), écrites par `shared/kb-ingest.js` aux 6 points d'ingestion. Le découpage en
      chunks de longueur fixe, lui, reste abandonné — c'est la **structure** du document qui
      décide du découpage, pas un nombre de caractères.
      ⚠️ Reste à supprimer : `src/modules/knowledge/processor.js` est toujours du code mort qui
      **ne compile pas** (`chunkText` déclaré deux fois, lignes 7 et 68 → `SyntaxError` jamais
      remontée puisque le fichier n'est jamais importé). La voie Vectorize reste inerte.
- [x] ~~Resynchroniser les fichiers Python de l'agent~~ : **fait le 11/08** — les 16 fichiers de
      `voixia/agent/` sont désormais identiques md5 pour md5 à `/opt/voixia/agent/`. Six étaient
      restés à mars (API LiveKit 0.x) et trois manquaient, dont `llm_factory.py` et `tools/tasks.py`.
- [x] ~~Nettoyer les prompts orphelins~~ : **fait le 10/08** par la purge (voir § q).
- [x] ~~Plafond TTS de 300 caractères~~ : **porté à 600 le 11/08**, coupe sur une fin de phrase
      donc sur une fiche entière (`_MAX_CHARS_TTS`, `tools/knowledge.py`). C'est lui qui
      supprimait la réponse « 15 euros » au profit des lignes voisines.
- [ ] **Le chemin prose garde la faiblesse corrigée sur le tabulaire** : son classement reste
      positionnel, sans pondération par la rareté. Constaté le 11/08 sur Syndic Horizon —
      « quand a lieu l'assemblée générale » renvoie un passage sur les charges. Non régressif
      (ce chemin n'a pas été touché), mais la même pondération IDF y est applicable.
- [ ] **Étendre les fiches aux autres unités** : `knowledge_faq` (0 ligne aujourd'hui) et les
      produits/services du dashboard sont déjà structurés — ils gagneraient à alimenter le même
      niveau fiche plutôt que de rester des sources parallèles.
- [ ] Ranger « Agent IA » dans **Configuration** (les 5 testeurs l'y cherchaient).
- [ ] Clarifier les libellés KB ↔ Disponibilités ↔ Prompt (confusion testeurs).
- [ ] Déployer le feedback UI sur clics échoués (code prêt : tasks, agents/config, teams, services).
- [ ] Vérifier les transcripts d'appel réel (appel test au `+33939035760`).

### 🟡 P2 — Finalisation produit
- [ ] Billing : `STRIPE_PRICE_ESSENTIEL/PRO/BUSINESS` en secrets + sync `billing_plans`.
- [ ] Settings : profil, notifications, préférences, sécurité (30 % → 100 %).
- [ ] **WhatsApp V2 — lots 1 et 3 à 11** (≈ 116 h après les lots 0 et 2). Plan détaillé, estimations
      et dépendances : **`WHATSAPP_V2_PLAN.md`**. OAuth Outlook/Yahoo.
- [ ] Analytics : graphiques avancés, filtres, export.
- [ ] Hook unifié `useTenant()`.

### 🟢 P3 — Croissance / infra
- [ ] Refaire un test Maze (mesurer delta NPS après B14–B19).
- [ ] SEO + Google Ads par secteur ; campagne Dripify P1 (notaires, syndics, avocats, médecins).
- [ ] LP secteurs Priorité 2 ; Telnyx backup Twilio ; audit suppression ancienne DB US East.

---

## m) INSTRUCTIONS POUR AGENTS CLAUDE CODE

### Méthode Agentic OS
- **1 seul orchestrateur** par projet (jamais 2 terminaux simultanés sur le même repo).
- Structure : ORCHESTRATEUR → Agent 1..N → Validation → Documentation.
- Chaque agent valide avant de passer la main. Si un test échoue → STOP, corriger, retester.
- **Mettre à jour ce CLAUDE.md après chaque mission.**

### Bootstrap
1. Lire ce CLAUDE.md (priorité absolue).
2. Lire `MASTER-PROMPT-V5.md` (37 règles techniques Agentic OS + contexte fondateur).

### Ordre de déploiement obligatoire
Backend (`wrangler deploy`) → VoixIA (`systemctl restart voixia`) → Frontend (build + pages deploy).

### Garde-fous
- Ne JAMAIS committer de secret (repo public + push-protection). Secrets → `.credentials.md`.
- Ne pas toucher aux fichiers interdits (§ d) sans OK explicite de Youssef.
- Toujours `coccinelle-db-eu` (jamais `coccinelle-db`).
- Vérifier le workspace LightRAG (`coccinelle` ≠ `1compta`) avant ingestion/query.
- Youssef valide chaque étape : proposer, montrer le résultat, attendre le OK.

---

## n) HISTORIQUE COMPACT DES SPRINTS

- **Chantier CX-2 (12–13/08/2026)** — « Mon Assistant » et « Ce que sait votre assistant »,
  déployées et recettées en conditions réelles (correction d'un tarif confirmée à l'oral par
  appel, prénom modifié entendu au décrochage). Détail et invariants en § s. Trois défauts que
  seule la recette pouvait montrer : le **greeting ne disait pas le prénom** alors que le
  paramètre lui était déjà transmis ; le **dimanche était immodifiable** par la nouvelle route ;
  et une **version de prompt était créée à chaque sauvegarde** pour un texte identique. La
  migration 0084 ne suffisait pas non plus : les fiches déjà en base n'ayant pas d'index de
  ligne, la correction aurait répondu 409 sur tout l'existant — d'où un backfill (29 fiches,
  soit 100 % des fiches de la base, toutes chez Garage Toulouse).

- **Clôture KB & multi-tenant (10–11/08/2026)** — Purge de 150 tenants jetables (§ q), puis
  déploiement du mini-lot KB : ancrage verbatim des montants dans les 7 prompts actifs (dont un
  régénéré par la source unique), accents pliés côté SQL, seuil de pertinence et extraction de
  jusqu'à deux passages par document. Surtout : découverte que **4 outils sur 8 travaillaient
  encore sur un tenant figé du `.env`** — `check_availability` annonçait les créneaux d'une autre
  entreprise. Ancrage complété, dépôt Python resynchronisé sur la production (16 fichiers,
  md5 identiques). Détail en § j et § q.

- **Chantier KB & LightRAG (08/08/2026)** — LightRAG coupé fail-safe (il court-circuitait la KB de
  chaque client avec la doc commerciale de l'éditeur), extraction du passage pertinent à la place
  d'un `substring(0,500)`, coordonnées du tenant exposées à l'agent, et bloc `TOOL_ORDER_BLOCK`
  (ordre d'appel des outils + zéro invention + rappel réel via `create_task`) après une régression
  du même jour où le prompt avait fait disparaître tout appel d'outil. Recette validée par appel
  réel : 79 € restitués depuis la KB, porte de sortie fonctionnelle. Détail en § j.

- **Chantier templates & KB — Lot A (07/08/2026)** — Consolidation des prompts sectoriels en une
  source unique backend (`shared/sector-prompts.js`, 14 secteurs + alias), 7 chemins d'écriture
  recâblés, backfill des 14 templates D1, fuite de variables `{}` vers le LLM fermée.
  E2E validé sur comptes dédiés (V1/V2/V4/V7), `tsc` = 142, inventaire des routes 270/270.
  Détail en § j. Lot B (frontend + portail) volontairement repoussé.

- **Sprint WhatsApp V2 — lots 0 et 1 (19/07/2026)** — Analyse : V1 n'a jamais servi (9 messages de
  test, 0 client réel). Décision full redo via **Twilio BSP**, pricing acté (Coccinelle 49 €/mois
  forfait, VoixIA conso 0,10/0,04 €). **Lot 0** : faille webhook fermée (aucune vérif de signature +
  fallback tenant arbitraire), secrets Meta révoqués, purge D1. **Lot 1** : −2 330 lignes, 7 fichiers
  supprimés dont l'OAuth V1 qui stockait `meta_access_token` en clair. **Page RGPD** de suppression
  des données livrée (prérequis App Review). Plan complet : `WHATSAPP_V2_PLAN.md`.

- **Sprint 8 (18–22/05)** — Test Maze (NPS 6,8) + 6 frictions corrigées (B14–B19) + KB syndic (11 docs).
- **Sprint 7 (16/05)** — Audit sécurité (secrets → wrangler, historique réécrit, 180 routes) + 5 bugs E2E (B1–B5).
- **Sprint 6 (14/05)** — Module tasks + create_task VoixIA + member_skills + 4 LP secteurs + fondateurs.
- **Sprints 4–5 (09–14/05)** — JWT 30j + refresh, analytics insights, settings backend, 6 LP SEO, cleanup mock.
- **Avril (04–26/04)** — Double-booking (#009/#014), latence resolve-phone/knowledge, log-call, transcripts
  temps réel, TTS (préfixe, 300 chars, word-split, HT/TTC), dedup phone, indicateur abo, checkout guard, SEO.
- **Fin mars–début avril** — Refonte sidebar Fonio, onboarding API-first, source unique de vérité,
  7 tools VoixIA, prompts sectoriels (lib/prompts.ts), voix (lib/voices.ts), orchestrateur omnicanal, proactif.
- **Post-sprints (juin–juillet)** — LightRAG Coccinelle déployé (Hetzner/Mistral souverain), landing prod
  (essai 14 j : 60 min + 20 SMS), 342 visiteurs/7j, diagnostic funnel onboarding (8/145).

---

## o) INVARIANTS REGULATION TWILIO FR (conformité — appris à la dure)

> Relevés le 17/07/2026 sur la Regulation FR `IsoCountry=FR&NumberType=local&EndUserType=business`
> (log des `requirements` depuis le Worker déployé). **Ne pas ré-inférer ces règles : les vérifier.**
> Le token us1 (`TWILIO_AUTH_TOKEN`) étant un secret Workers, l'API n'est PAS interrogeable en local
> (401) — seul le Worker déployé peut lire les `requirements`, d'où la méthode par log temporaire.

1. **Un seul End-User, de type `business`.** Il porte société ET représentant légal :
   `business_name`, `business_registration_number`, `business_website`, `first_name`, `last_name`,
   `email`. Il n'existe **PAS** d'End-User représentant séparé.
2. **`Type` de l'API End-Users n'accepte QUE `individual` | `business`.** Les noms de requirement
   (`business_information`, `authorized_representative_1`…) ne sont pas des Types valides.
3. **N'envoyer QUE les champs listés dans `fields`.** Tout extra → « Attribute(s) not mapped to
   object » (ex. `job_position`, `business_title`, `business_registration_identifier`).
4. **`supporting_document` est un tableau de GROUPES d'exigences**, pas une liste plate. En FR, deux
   groupes acceptent le **même type** `commercial_registrar_excerpt` avec des `fields` différents :
   `{business_name, business_registration_number}` et `{address_sids}` → **le même Kbis doit être
   poussé DEUX fois**, en deux SupportingDocuments. Aplatir les groupes = exigence perdue.
5. **La CIN n'a aucun type de document dans la Regulation FR.** Conservée en R2 (KYC interne + notre
   exigence produit), jamais poussée à Twilio (sinon WARN « Document type not found »).
6. **Les valeurs du document doivent matcher EXACTEMENT celles du End-User** (`business_name`,
   `business_registration_number`) — sinon échec 22217. D'où les variables partagées dans le code.
7. **`business_website` est obligatoire** (échec 22215 s'il manque). Décision produit du 17/07 : exigé
   par notre garde (`/:id/bundle`) + `canSubmit`, **avant** l'appel Twilio → message explicite plutôt
   qu'un motif de rejet opaque. TPE sans site : on suggère une page pro publique (fiche Google, réseau
   social). Le champ reste `NULL`-able en base (0081) : seule la soumission l'exige.
8. **Address créée AVANT les documents** : son SID (`address_sids`) est requis par le groupe adresse.

## p) WHATSAPP V2 — DÉCISIONS ACTÉES (19/07/2026)

> Analyse complète, plan de chantier en 12 lots (≈ 127 h) et estimations : **`WHATSAPP_V2_PLAN.md`**
> (racine). Cette section ne garde que les invariants à ne pas ré-inférer.

**Constat fondateur : WhatsApp V1 n'a jamais servi.** 9 messages en prod, tous du 28/01/2026, tous
des smoke tests ; 0 ligne dans `channel_messages_log` ; 2 `channel_configurations` de tenants de test.
**Rien à migrer, aucun utilisateur à casser** ⇒ le full redo est gratuit côté données. Le vrai travail
est de **supprimer avant d'écrire** : 5 chemins d'envoi concurrents, 2 fournisseurs (Meta *et* Twilio,
les deux avec des secrets vivants : `META_WHATSAPP_ACCESS_TOKEN` **et** `WHATSAPP_ACCESS_TOKEN`),
1 363 lignes de code mort frontend, 2 pages dashboard contradictoires.

1. **Fournisseur = Twilio BSP (Tech Provider Program)**, pas Meta Cloud API direct. Le prix n'est PAS
   le motif (≈ 50 $/mois pour 10k messages, du bruit). Les motifs :
   (a) en Meta direct, **chaque tenant devrait saisir son propre moyen de paiement Meta** — suicidaire
   sur un tunnel à 8/145 ; (b) **Meta ne délivre pas d'OTP sur un numéro rattaché à un IVR** et tous
   nos numéros pointent vers l'agent LiveKit — Twilio auto-vérifie par SMS ; (c) réutilise le bundle
   réglementaire FR Twilio déjà approuvé (17/07) au lieu d'ouvrir un 2ᵉ front de conformité.
2. **Un numéro peut cumuler voix + SMS + WhatsApp** — Meta est formel, l'enregistrement WhatsApp ne
   casse ni la voix ni le SMS. **`+33939035761` cumule numéro d'essai voix (QW8) et sender WhatsApp.**
   ⚠️ **Règle : n'enregistrer QUE des numéros Twilio SMS-capables** (l'OTP vocal est impossible, IVR).
3. **Modèle de prix Meta = par message depuis le 01/07/2025.** Le modèle « par conversation 24 h » est
   déprécié — ne pas raisonner dessus.
4. **Tarifs Meta France (rate cards CSV/PDF officiels, en vigueur 01/07/2026) :** marketing
   **0,0712 €**, utility **0,0248 €**, authentication 0,0248 €, **service GRATUIT** (depuis 01/11/2024).
   ⚠️ France marketing est passé de ~0,1186 € à 0,0712 € au **01/01/2026** (−40 %) : toute grille
   antérieure est périmée, et beaucoup de concurrents publient encore l'ancienne.
5. **Nos deux grilles actées (19/07/2026) — § 5 de `WHATSAPP_V2_PLAN.md` :**
   - **Coccinelle (TPE) — forfait :** extension **49 €/mois** (vs 79 € Fonio), **500 conversations
     incluses**, **1 numéro**, **réponses service (IA réactive) ILLIMITÉES**, **+19 €/mois** par
     numéro supplémentaire. **Exige un abonnement Coccinelle actif.**
   - **VoixIA (revendeurs) — conso pure :** marketing **0,10 €** (marge ≈ 24 %) · utility **0,04 €**
     (marge ≈ 27 %) · service **gratuit** · **+15 €/mois** par sender WhatsApp.
   - Les deux grilles sont **alignées** (500 marketing incluses ≈ 0,098 €/msg) : pas d'arbitrage
     possible entre les offres. À préserver si les prix bougent.
   - **Fenêtre de service GRATUITE = promesse produit**, pas une optimisation (« vous ne payez que ce
     que vous initiez, jamais les réponses à vos clients »). ⇒ Le Lot 6 (routage « utility dans
     fenêtre ouverte = gratuit ») **reste sur le chemin critique** : pas de « réactif seul » sans lui.
     Le Lot 8 doit gérer **deux modèles de facturation distincts** (forfait vs conso) + un compteur
     de conversations incluses.
6. **Marge Twilio : 0,005 $/message ENTRANT ET SORTANT** (Meta ne facture pas l'entrant) + 0,001 $ par
   échec. Notre produit étant réactif, c'est ≈ 100 % du coût marginal réel.
   ⚠️ **Piège n° 1 — « service illimité » n'est PAS gratuit pour nous.** À 49 €/mois, 5 000 messages
   de service coûtent ≈ 21,5 € de Twilio (44 % du prix), 10 000 ≈ 43 € (88 %), 20 000 = perte. Une
   TPE normale n'ira pas là, mais **un seul tenant atypique** (standard très sollicité, boucle
   d'automatisation) mange la marge et rien ne l'en empêche. → **Clause d'usage raisonnable à fixer
   AVANT la mise en vente** (≈ 3 000 msg service/mois) + compteur instrumenté au Lot 8. « Illimité »
   reste l'argument ; le garde-fou est contractuel, non affiché.
   ⚠️ **Piège n° 2 — « conversation » n'est plus une unité Meta** (facturation par message depuis le
   01/07/2025). Les « 500 conversations incluses » ne correspondent à **aucun compteur plateforme** :
   à définir et implémenter nous-mêmes. Recommandation : **500 messages template facturables/mois**
   (marketing + utility), service jamais décompté. **Le mix marketing/utility détermine entièrement
   la marge du forfait** (500 marketing = 35,60 € de coût, soit 73 % des 49 € ; 500 utility =
   12,40 €, soit 25 %) — à surveiller dès les premiers tenants.
7. **Limites d'envoi par portefeuille Meta, plus par numéro** (changement du 07/10/2025) :
   250 → 2 000 → 10 000 → 100 000 → illimité, montée en < 6 h. L'état « Flagged » a été supprimé.
   Chaque tenant possède son propre portefeuille via Embedded Signup ⇒ **chaque tenant démarre à
   250 msg/24 h** et monte indépendamment, et **aucune remise de volume n'est mutualisable**.
8. **Construire Embedded Signup v4** — la **v2 est supprimée le 15/10/2026**.
9. **Plafond de 2 numéros par nouveau portefeuille Meta** (20 après vérification métier).
10. **Résidence des données EU : non vérifiée, ne bloque pas** (décision 19/07). ⚠️ Tension à arbitrer
    avant le Lot 10 : WhatsApp fait transiter chaque message par Meta, ce qui frotte avec le
    positionnement « LLM et RAG hébergés en Europe ».
11. **Lot 0 DÉPLOYÉ le 19/07/2026 (backend + frontend) — WhatsApp est GELÉ en production.** Kill switch
    `src/modules/shared/whatsapp-killswitch.js` : **flag `WHATSAPP_ENABLED` absent = coupé**, donc
    aucune modification de `wrangler.toml` n'a été nécessaire. 4 surfaces renvoient 404 (et non 403,
    pour ne pas confirmer la route) : webhook Meta (`index.js:394`), webhook Twilio
    (`omnichannel/index.js:277`), routes canal `/api/v1/channels/whatsapp*` (barrière unique en tête
    de `channels/routes.js`), et **l'orchestrateur VoixIA** (`voixia/orchestrator.js`, `case
    'whatsapp'`) — ce 4e chemin d'envoi avait été oublié au cadrage. Purge : 3 `omni_phone_mappings`
    + 2 `channel_configurations` (snapshot pris avant) ; **les 9 `omni_messages` sont conservés**
    comme référence du comportement V1. Front : `settings/channels/whatsapp` redirige vers la page
    « Bientôt disponible », `comingSoon: true` sur l'entrée canal, et l'étape Canaux de l'onboarding
    désactive WhatsApp + filtre défensivement `channelsData` (sinon 404 avalé en `console.warn`
    dans le tunnel P0).
    ⚠️ **Ne PAS mettre `OMNICHANNEL_ENABLED=false` pour couper WhatsApp** : ce flag gouverne aussi
    d'autres webhooks et casserait le magic moment QW8.
    ✅ **Révocation Meta FAITE le 19/07/2026** : app secret réinitialisé (**0 h de grâce**), tokens de
    l'utilisateur système « Coccinelle API » révoqués. **Le risque lié à l'exposition GitHub publique
    est clos.** Aucun impact fonctionnel : `META_APP_SECRET` n'était lu que par `whatsapp-oauth.js`
    (supprimé au Lot 1) et les surfaces WhatsApp déployées étaient déjà en 404.
12. **Critères d'acceptation NON NÉGOCIABLES du Lot 5** (la vérification de signature n'a
    volontairement PAS été rétro-ajoutée à V1, code condamné par le Lot 1) :
    - vérification **HMAC-SHA256 `X-Hub-Signature-256`** sur le **corps brut**, avant tout `JSON.parse` ;
    - **suppression** du fallback tenant : un `phone_number_id` inconnu doit être **rejeté**, jamais
      deviné (`SELECT id FROM tenants WHERE status='active' LIMIT 1` ⇒ à ne jamais réintroduire) ;
    - `META_WEBHOOK_VERIFY_TOKEN` sans valeur littérale de repli dans le code.
13. **Lot 1 (démolition V1) — DÉPLOYÉ le 19/07/2026** (backend + frontend, recette OK : 401 sur les
    3 routes omnichannel restaurées, page RGPD en ligne). 13 fichiers, **+17 / −2 330**. Supprimés :
    les 2 webhooks (`meta-whatsapp.js`, `whatsapp.js`), **`controllers/whatsapp-oauth.js`** (non prévu
    au cadrage — l'Embedded Signup V1 qui écrivait `meta_access_token` **en clair**), le kill switch
    du Lot 0, et les 3 modules morts frontend (`whatsappService/Client.ts`, `whatsappTemplates.ts`).
    Excisions dans `index.js`, `omnichannel/index.js`, `channels/routes.js`, `voixia/orchestrator.js`,
    `public/routes.js`. **Conservés volontairement** : `onWhatsAppReceived` (rebranché au Lot 7),
    `trackWhatsApp` (Lot 8), matrice `channel-switcher`, tables D1, et `whatsapp` dans `listChannels`
    (sinon l'entrée « Bientôt disponible » disparaît du dashboard).
    ⚠️ **Leçon de méthode :** supprimer un bloc par bornes textuelles a emporté 4 routes NON-WhatsApp
    (`email/send`, `inbox/conversations`, `conversations`, alias `agent-config`) coincées entre le bloc
    OAuth et `phone-mappings`. Rattrapé par un **diff d'inventaire des routes avant/après** — contrôle
    à refaire systématiquement sur tout lot de suppression touchant un routeur partagé.
14. **Prérequis de soumission Meta — statut app : « Non publiée » (Development).** État au 19/07/2026 :
    - ✅ **URL politique de confidentialité** : `https://coccinelle.ai/legal/politique-confidentialite`
      (⚠️ **la canonique**, pas `/confidentialite` qui est une page orpheline désormais redirigée).
    - ✅ **URL de suppression des données** : `https://coccinelle.ai/legal/suppression-donnees`
      (créée et déployée le 19/07 — 2 parcours : responsable de traitement pour nos clients,
      sous-traitant art. 28 + relais 72 h ouvrées pour les clients finaux).
    - ⬜ **Icône 1024×1024** — action Youssef, console Meta.
    - ⬜ **Catégorie de l'app** — action Youssef, console Meta.
    Ces 2 derniers éléments bloquent le démarrage réel du Lot 2 (vérification métier + App Review).
15. ❌ **Ne PAS planifier sur** l'affirmation tierce très relayée « nouveau cadre d'identifiants DMA
    obligatoire avant juin 2026 » : contredite par l'absence de toute mention dans l'annonce Meta et
    le changelog développeur.

## q) PURGE DES TENANTS (10/08/2026) — ce qui reste, et ce qu'on a appris

**157 tenants → 7.** 150 comptes jetables (inscriptions de test, essais abandonnés, comptes de
recette) supprimés en une transaction, après validation ligne à ligne d'un inventaire complet.
4 736 lignes effacées dans 46 tables, base passée de 6,7 à 3,6 Mo.

**Les 7 conservés** : Coccinelle.ai, AMROUCHE, Agentic solutions, Syndic Horizon (démo Maze),
Léa et Léo (tenants enfants du portail revendeur VoixIA), et **Garage Toulouse** (recréé le 11/08,
nouvel identifiant — voir § d).

**Ce qui a réellement bloqué** (deux échecs en prod avant d'y arriver) : ce n'était **pas** l'ordre
de suppression. Dix lignes `availability_slots` appartenant à **Agentic solutions** (conservé)
pointaient vers `agent_coccinelle_001`, un agent de **test13** (condamné). `agent_id` étant
`NOT NULL`, aucune suppression ne pouvait passer. Correctif : une **ÉTAPE 0** qui repointe ces
10 lignes vers l'agent du tenant conservé, sans perte.

**Méthode qui a fini par marcher** — à reprendre pour toute purge :
1. **Le schéma réel de la prod**, pas une reconstitution depuis `migrations/` (les deux divergent).
2. **Tester les 34 arcs de clés étrangères un par un** contre la vraie donnée. Un rejeu à blanc
   sur des tables vides, ou avec `PRAGMA foreign_keys=OFF`, est **structurellement incapable** de
   trouver ce genre de blocage — il valide la syntaxe, pas la réalité.
3. Chercher les **références croisées entre un tenant conservé et un tenant condamné** : c'est là
   que ça casse, pas dans l'ordre topologique.
4. Backup **vérifié** (compter les tables et les INSERT, s'assurer que les tenants conservés y sont)
   avant d'exécuter. `backup_avant_purge_20260810.sql`, 4,0 Mo, 109 tables.
5. D1 **refuse `BEGIN TRANSACTION`** (erreur 7500) mais exécute un `--file` de façon **atomique** :
   c'est le fichier entier qui fait la transaction.

**Conséquences à connaître** : 6 appels historiques référencent l'ancien Garage Toulouse et
restent orphelins ; les `task_types` globaux (`tenant_id='global'`, 11 lignes) ont été préservés ;
plus aucun `users.phone_verified=1` sur `+33760762153` **hormis** le nouveau Garage Toulouse, ce
qui rend la résolution du numéro d'essai déterministe.

## r) ROTATION DES SECRETS — PROCÉDURE (11/08/2026)

**Ce qu'un `git rm` ne fait PAS.** Retirer un secret d'un fichier ne le retire pas de
l'historique : il reste lisible sur GitHub à chaque commit qui l'a porté, dans les forks, dans
les clones, et dans les caches d'indexation. **La rotation est le seul remède réel** ; la purge
de l'arbre n'est que de l'hygiène. Corollaire vécu : l'audit du 16/05 a retiré la clé VoixIA de
`CLAUDE.md` et l'a crue traitée — elle était encore valide et publique le 11/08, trois mois plus
tard.

### r.1 — `VOIXIA_API_KEY` (✅ ROTATION TERMINÉE le 15/08/2026)

**État final, vérifié** : `401` sur l'ancienne clé, `200` sur la nouvelle, et `wrangler secret
list` ne montre plus que `VOIXIA_API_KEY`. La fenêtre `VOIXIA_API_KEY_ROTATION` est fermée. La
clé publiée n'ouvre plus rien — **la procédure ci-dessous reste valable pour la prochaine
rotation**, quelle que soit la clé.

**Où elle vivait** — inventaire du 11/08 CORRIGÉ le 15/08, il était incomplet sur deux points :

| Endroit | Mesure du 15/08 |
|---|---|
| Secret Worker | remplacé, ancien secret supprimé |
| `/opt/voixia/.env` ligne 32 | porte la nouvelle depuis le 11/08 (vérifié par empreinte) |
| `/opt/voixia/.env.avant-rotation` | portait encore l'ANCIENNE — **purgé le 15/08** |
| Historique Git | **23 commits accessibles** (et non 20), du 20/03 au 16/05 |
| Fichiers porteurs | **TROIS**, et non la seule doc : `CLAUDE.md`, `dashboard/proactive/page.tsx`, `dashboard/voixia/page.tsx` |
| `.credentials.md` | local, gitignored — à jour |

⚠️ **La leçon la plus coûteuse de cet inventaire** : la clé était codée en dur dans **deux pages
du dashboard**, donc compilée dans le bundle JavaScript et servie à **tout visiteur** de ces pages.
Une clé dans un composant front n'est pas « exposée par le dépôt » — elle est **publiée par le
produit**, à chaque chargement, y compris à des gens qui n'ont jamais vu le dépôt. Chercher une
clé fuitée uniquement dans la doc et la config, c'est en manquer la pire occurrence.

⚠️ **Ce qu'une rotation NE fait pas** : elle ne retire pas la clé de l'historique. Les 23 commits
la portent toujours et la porteront toujours — dans les forks, les clones, les caches
d'indexation. Elle la rend **inoffensive**, et c'est le seul remède atteignable ; la purge de
l'arbre n'est que de l'hygiène. Corollaire vécu : l'audit du 16/05 a retiré la clé de `CLAUDE.md`
et l'a crue traitée — elle était encore valide et publique **trois mois** plus tard.

⚠️ **La clé vit à DEUX endroits actifs** : le Worker la lit dans ses secrets, l'agent Python
dans `/opt/voixia/.env` (`resolve_tenant` ne transmet pas de clé par appel, les outils retombent
donc sur celle de l'environnement). `requireVoixIAAuth` n'acceptant **qu'une seule valeur**,
les tourner l'une après l'autre coupe tous les appels entrants pendant l'intervalle.

**Fenêtre de rotation** (livrée le 11/08) : `VOIXIA_API_KEY_ROTATION` est un second secret
**temporaire** accepté en plus du principal. Il rend la bascule sans coupure et réversible à
chaque étape. **Le supprimer sitôt la bascule vérifiée** — le laisser en place, c'est garder
deux clés valides, exactement ce que la rotation cherche à supprimer. Tant qu'il existe, chaque
appel authentifié écrit un `WARN` « Fenêtre de rotation OUVERTE » dans les logs.

```bash
cd ~/Projects/saas/coccinelle-ai && nvm use 22
# Les clés vivent dans .credentials.md — jamais copiées-collées à l'écran.
NOUVELLE=$(sed -n '/ROTATION VOIXIA_API_KEY/,$p' .credentials.md | grep -oE '\b[0-9a-f]{64}\b' | head -1)
ANCIENNE=$(grep -oE '\b[0-9a-f]{64}\b' .credentials.md | head -1)
# ⚠️ GARDE-FOU : une variable vide produit un 401 TROMPEUR qui fait croire la
# rotation terminée. C'est exactement l'erreur commise le 12/08.
[ ${#NOUVELLE} -eq 64 ] && [ ${#ANCIENNE} -eq 64 ] || { echo "STOP : extraction invalide"; return 2>/dev/null || exit 1; }

# 1. Le Worker accepte la nouvelle EN PLUS de l'ancienne
echo -n "$NOUVELLE" | ./node_modules/.bin/wrangler secret put VOIXIA_API_KEY_ROTATION

# 2. L'agent bascule — les deux clés étant acceptées, aucune coupure
ssh root@51.15.130.204 "cp /opt/voixia/.env /opt/voixia/.env.avant-rotation && \
  sed -i 's|^VOIXIA_API_KEY=.*|VOIXIA_API_KEY='$NOUVELLE'|' /opt/voixia/.env && systemctl restart voixia"

# 3. Appel réel au +33939035761 — le seul test qui vaut

# 4. La nouvelle devient principale. NE PAS supprimer la fenêtre avant d'avoir
#    vérifié cette écriture : sinon le Worker retombe sur l'ancienne clé pendant
#    que l'agent tourne sur la nouvelle, et TOUT tombe en 401.
echo -n "$NOUVELLE" | ./node_modules/.bin/wrangler secret put VOIXIA_API_KEY
./node_modules/.bin/wrangler secret list | grep VOIXIA   # les deux doivent être là

# 5. Fermeture de la fenêtre — c'est ICI que l'ancienne meurt
./node_modules/.bin/wrangler secret delete VOIXIA_API_KEY_ROTATION

# 6. CONTRÔLE FINAL — le seul critère de réussite
API="https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/voixia/resolve-phone?phone=%2B33939035760"
T="tenant_eS5hbXJvdWNoZUBjb2NjaW5lbGxlLmFp"
echo -n "ancienne (doit être 401) : "; curl -s -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0" "$API" -H "X-VoixIA-Key: $ANCIENNE" -H "X-VoixIA-Tenant: $T"
echo -n "nouvelle (doit être 200) : "; curl -s -o /dev/null -w "%{http_code}\n" -A "Mozilla/5.0" "$API" -H "X-VoixIA-Key: $NOUVELLE" -H "X-VoixIA-Tenant: $T"
```

> **Défaut de conception — c'est désormais LE point ouvert sur ce sujet** : une clé **unique et
> globale**, avec le tenant
> choisi par un en-tête que l'appelant fournit (`src/modules/voixia/auth.js`). La rotation ferme
> la fuite mais pas le modèle : quiconque détient la clé peut agir sur **n'importe quel**
> tenant en changeant un en-tête. À noter au passage : le portail revendeur expose une clé **par
> tenant** (`tenants.api_key`, page `/settings/api-key`) que `requireVoixIAAuth` **n'accepte
> pas** — vérifié le 11/08, elle renvoie 401. La page promet donc aux revendeurs une
> authentification qui n'existe pas ; c'est aussi la brique qui manque pour supprimer la clé
> globale.

### r.2 — Secrets Meta (✅ déjà tournés, procédure conservée)

Vérifié le 11/08 : les trois valeurs publiques sont mortes. Si une rotation redevient nécessaire :

1. **App Secret** — developers.facebook.com → l'app → *Paramètres* → *Général* → *Clé secrète* →
   **Réinitialiser** (choisir **0 h de grâce** : au-delà, l'ancienne reste valide pendant le délai).
2. **Token utilisateur système** — *Business Settings* → *Utilisateurs* → *Utilisateurs système* →
   « Coccinelle API » → **Révoquer** les jetons existants, puis *Générer un nouveau token*
   (permissions `whatsapp_business_messaging`, `whatsapp_business_management`).
3. **Verify token** — valeur libre, à choisir soi-même (`openssl rand -hex 16`), puis la reporter
   **des deux côtés** : console Meta (*WhatsApp → Configuration → Webhook*) **et** secret Worker.
   Le handshake échoue en 403 tant que les deux ne coïncident pas — c'est le comportement voulu.

```bash
npx wrangler@latest secret put META_APP_SECRET
npx wrangler@latest secret put META_WHATSAPP_ACCESS_TOKEN
npx wrangler@latest secret put META_WEBHOOK_VERIFY_TOKEN
npx wrangler@latest secret list          # contrôle
```

### r.3 — Comptes de test

`CoccinelleTest123` était publié dans 5 fichiers suivis (purgés le 11/08). À changer via l'UI ;
sa valeur ne revient pas dans le dépôt — elle vit dans `.credentials.md`.
Le mot de passe du compte démo Maze reste **public par conception** : `app/demo/page.tsx` fait un
auto-login et l'expédie de toute façon dans le bundle JavaScript. Ce compte ne doit donc contenir
que de la donnée de démonstration — c'est le cas.

## s) CHANTIER CX-2 (13/08/2026) — deux pages qui montrent ce que l'assistant dit

**En production sur coccinelle.ai.** Deux pages remplacent, en mode Simple, la configuration
éclatée. Elles reposent sur un principe unique : **on ne configure pas un assistant dans un
formulaire, on corrige ce qu'il dit.**

| Page | Route | Ce qu'elle fait |
|---|---|---|
| Mon Assistant | `/dashboard/assistant` | 3 conversations témoins, 5 valeurs surlignées ouvrant chacune le panneau qui la règle |
| Ce que sait votre assistant | `/dashboard/savoir` | fil de test sur la **vraie** route de l'agent, correction en ligne, historique, corbeille |

Sidebar mode Simple : `Mon assistant` → `/dashboard/assistant`, ajout de `Sa connaissance`.
**Aucune entrée retirée** (6 → 7), **aucune redirection** — les anciennes URL répondent 200
(le mode Simple masque, il ne bloque pas ; et `redirect()` casse en export statique).
`ADVANCED_NAV` inchangé. La checklist de démarrage pointe désormais sur ces deux pages.

### Invariants à ne pas ré-inférer

1. **Une fiche est une projection** — voir règle **11quater** (§ i). C'est l'invariant central
   du chantier : une correction s'écrit dans la **ligne du document**, jamais dans le chunk.
2. **`/voixia/knowledge` renvoie `source`** (`document_id`, `chunk_id`, `libelle`, `prix`,
   `ligne`, `modifiable`, `label`). Sans elle, le dashboard ne peut ni afficher la provenance,
   ni corriger, ni supprimer. Ajout **additif** : l'agent Python lit `answer`/`found` et ignore
   le reste. `source: null` quand la réponse est ambiguë (deux fiches), vient de LightRAG, ou
   des coordonnées du tenant — on ne fait pas corriger la mauvaise ligne.
3. **`GET`/`PUT /api/v1/assistant/config`** est le SEUL chemin d'écriture de la page 1. Il
   touche `tenants`, `voixia_configs` **et** le prompt actif en un aller-retour : quatre
   écritures enchaînées depuis le front pourraient réussir à moitié et laisser un prénom changé
   avec un prompt inchangé. Le prompt est **toujours régénéré** par `buildSectorPrompt()`
   (règle 6bis) mais **versionné seulement si le texte diffère** — le gabarit sectoriel ne porte
   pas `{HORAIRES}`, donc changer les horaires produisait un prompt identique et une version
   vide à chaque clic.
4. **Le dimanche n'est pas affiché** (la maquette montre lun–sam). Sa valeur est **reportée**
   telle quelle… *sauf si l'appelant l'envoie explicitement*. Reporter systématiquement rendait
   ce jour immodifiable par cette route, sans erreur ni trace.
5. **Les chips ne suggèrent que ce qui a une réponse** : elles sont bâties sur les libellés des
   fiches réelles et les coordonnées du tenant, jamais sur une liste écrite d'avance. Le secteur
   ne fait que tourner la phrase. Rotation par `?exclure=`, panachage par famille — un tri
   alphabétique servait cinq « Prix … » d'affilée et ne montrait jamais les horaires.
6. **Pas d'appel sortant.** La maquette annonce « votre assistant vous appelle » ; cette brique
   n'existe pas. Le bandeau reprend le mécanisme réel : l'appelant compose le numéro d'essai et
   `resolve-phone` le reconnaît à son numéro vérifié.

### Recette locale sur données réelles

`wrangler dev --remote` **ne partage pas le `JWT_SECRET`** de production : tout ce qui passe par
`requireAuth` y répond 401 avec un jeton pourtant valide. Et `lib/config.ts` bascule sur l'API
locale dès que le hostname vaut `localhost`. Le relais versionné règle les deux :

```bash
cd coccinelle-saas && npm run build
node design/cx2/serveur-recette.mjs      # puis http://localhost:3000/_session
```

⚠️ Les maquettes de `design/cx2/` sont des pages « bundled » : leur contenu vit dans un
`<script type="__bundler/template">`, pas dans le HTML lisible. Utiliser
`design/cx2/extraire-maquette.cjs` — le rendu du fichier brut ne fait pas foi.

### Migration 0084 (additive, appliquée le 12/08)

`knowledge_documents.deleted_at`, table `knowledge_document_versions` (+ index UNIQUE
`(document_id, version)` : deux écritures concurrentes calculeraient le même `max+1`),
`voixia_configs.after_hours_behavior` / `after_hours_message`. Revue AVANT/APRÈS :
`design/cx2/revue-0084.sh`.

---

## RÈGLES GLOBALES AGENTIC OS

Lis également `MASTER-PROMPT-V5.md` à la racine (symlink → `~/Projects/infra/agentic-os/`).
37 règles techniques absolues valables tous projets. En cas de conflit, **ce CLAUDE.md a priorité**.
