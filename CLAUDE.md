# CLAUDE.md — Coccinelle.ai
# Dernière mise à jour : 7 juillet 2026
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
- WhatsApp + OAuth email Outlook/Yahoo non fonctionnels à 100 %.
- Clés Meta à régénérer (exposées sur GitHub public par le passé).
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
│       ├── products/  appointments/  knowledge/  prospects/  teams/
│       ├── tasks/                  # CRUD tâches + create-task VoixIA + skills
│       ├── permissions/            # RBAC (10 permissions)
│       ├── voixia/                 # resolve-phone, log-call, tools, orchestrator
│       ├── omnicanal/              # orchestrator.js + routes.js (5 scénarios)
│       ├── proactive/              # notifications proactives SMS/appel
│       ├── omnichannel/  email/  oauth/  channels/  twilio/  retell/
│       └── public/                 # booking.js + routes.js (réservation publique)
└── coccinelle-saas/                # Frontend Next.js
    ├── app/
    │   ├── page.tsx                # Landing (essai 14j, 60 min + 20 SMS)
    │   ├── login/  signup/  onboarding/  demo/
    │   ├── secteurs/               # LP SEO (syndic, notaire, medecin, avocat, +6)
    │   ├── fondateurs/             # Waitlist (2 places/secteur)
    │   └── dashboard/
    │       ├── page.tsx            # Home + KPIs (API réelle)
    │       ├── agents/             # configuration / scripts / nodes / test
    │       ├── knowledge/          # base + faq / products / docs
    │       ├── channels/           # email / sms / whatsapp / numbers / voicemail / ivr / queues
    │       ├── analytics/          # calls / messages / transcripts / performance / export
    │       ├── appointments/  crm/  customers/  rdv/  tasks/  teams/
    │       ├── proactive/  billing/  settings/  availability/
    │       └── (redirections legacy : voixia, sara, prospects, products → nouvelles routes)
    ├── components/DashboardSidebar.tsx   # Sidebar Fonio (6 groupes accordéon)
    ├── lib/voices.ts               # SOURCE UNIQUE des voix (20 voix FR)
    ├── lib/prompts.ts              # SOURCE UNIQUE prompts sectoriels (13 secteurs)
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
| 📱 WhatsApp | ✅ Meta API | ✅ Webhook | 🟡 95 % |
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

- **Compte démo Maze** : `demo.maze@coccinelle.ai` / `DemoMaze2026!`
  - Tenant : `tenant_ZGVtby5tYXplQGNvY2NpbmVsbGUuYWk` — Company : **Syndic Horizon** (secteur syndic)
  - Entrée : https://coccinelle.ai/demo (auto-login + redirect /dashboard)
  - Données : 3 membres, 6 skills, 5 tâches, 5 appels, 4 prospects, 11 KB FAQ syndic, 3 RDV,
    3 services, dispos Lun–Ven 9h–18h.
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

```
Appel entrant Twilio/SIP → agent Python LiveKit (51.15.130.204)
  → tenant.py appelle GET /api/v1/voixia/resolve-phone?phone=%2B33... (le + encodé %2B)
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

### Prompts sectoriels

```
Sélection secteur → getSectorPrompt(secteur) depuis lib/prompts.ts (JAMAIS de PROMPT_TEMPLATES local)
  → system_prompt riche (identité + style + déroulement + OUTIL SILENCIEUX + MOTS INTERDITS)
  → frontend remplace {ASSISTANT_NAME} et {COMPANY_NAME} AVANT envoi (0 variable {} en DB)
```

### Onboarding (8 étapes, API-first, 0 localStorage utilisateur)

```
Secteur → Entreprise → Vérif tél (SMS 6 chiffres) → Connaissances → Produits → Canaux → Assistant → Résumé
  → POST /api/v1/onboarding/step   → GET /api/v1/onboarding/state (depuis DB)
  → onboarding_sessions.current_step (JAMAIS localStorage sauf auth_token + session_id)
  → tenants.onboarding_completed = 0/1
```
> ⚠️ **Funnel cassé** : 8/145 complétions, 0 depuis 25 jours. Priorité #1 (voir État § b).

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
| Prompts secteurs | `lib/prompts.ts` (SECTOR_PROMPTS) | PROMPT_TEMPLATES local |
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
| `ai_sector_templates` | Templates sectoriels (peuplé depuis lib/prompts.ts) |
| `calls` / `call_summaries` / `ai_interaction_logs` | Appels + résumés + logs |
| `appointments` / `availability_slots` | RDV (INDEX UNIQUE partiel anti double-booking, migr. 0066) |
| `knowledge_documents` / `knowledge_chunks` | KB (recherche lit `content`, fallback documents) |
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
2. Greeting = phrase courte littérale : « Bonjour, {COMPANY_NAME} ! ».
3. Le « + » des numéros → encodé `%2B` dans les URLs.
4. UN SEUL `is_active=1` par tenant ; `system_prompt` en DB sans variable `{}`.
5. `system_prompt` DOIT contenir : « appelle TOUJOURS search_knowledge avant de répondre
   à toute question sur les services ou tarifs » (sinon l'agent ne call pas le tool).
6. `system_prompt` DOIT contenir « ne dis JAMAIS je consulte, je vérifie, un instant,
   je recherche » (OUTIL SILENCIEUX) + une liste de MOTS INTERDITS (ex : « sur devis »).

### Tools vocaux & TTS
7. Retour tool vocal : JAMAIS de préfixe technique (« Réponse trouvée », etc.) — c'est lu à voix haute.
8. Retour tool : max **300 chars**, phrases naturelles, pas de markdown, pas de symboles,
   coupe à la dernière phrase complète.
9. `_nettoyer_pour_tts()` : 48+ remplacements en 12 catégories (temporel, monétaire, %,
   connecteurs, abréviations, sigles, sigles fiscaux HT→hors taxes / TTC→toutes taxes comprises
   / TVA→T V A regex `\b`, ordinaux, ponctuation, markdown, espaces, troncature).
10. Documents KB en langage vocal pur : phrases ≤ 15 mots, pas de symboles/sigles/markdown.

### Recherche KB
11. TOUJOURS splitter la question en mots significatifs, chercher avec OR
    (`LIKE '%mot1%' OR LIKE '%mot2%'`). JAMAIS `LIKE '%phrase entière%'`.
12. JAMAIS de documents crawlés d'un autre site dans la KB (vérifier `source_type` avant démo).

### UI / produit
13. Emoji 🐞 BANNI de l'interface — utiliser `CoccinelleIcon`.
14. « Sara »/« Fati » BANNIS dans les pages publiques — utiliser « Assistant » ou le nom dynamique.
15. Termes techniques BANNIS dans l'UI : RAG → « Recherche intelligente », Crawl → « Importer
    depuis un site », Knowledge Base → « Base de connaissances », embedding/vector/chunks → cachés.
16. Palette dashboard : blanc/noir/gris (exceptions vert/rouge pour variations).

### Général
17. Vérifier le `DEFAULT` d'une colonne avant de conclure qu'un champ manquant casse quelque chose.
18. Toujours cibler `coccinelle-db-eu` (jamais l'ancienne `coccinelle-db`).
19. LightRAG : toujours vérifier le workspace (`coccinelle` ≠ `1compta`).

---

## j) BUGS CONNUS + SOLUTIONS

### Ouverts / à traiter (par priorité)

| Priorité | Bug | Détail |
|----------|-----|--------|
| 🔴 Critique | **Funnel onboarding** | 8/145 complétions, 0 depuis 25 jours — instrumenter + simplifier |
| 🟠 Haute | Régénérer clés Meta | `META_APP_SECRET`, `META_WHATSAPP_ACCESS_TOKEN` exposées (GitHub public) |
| 🟡 Moyenne | Outlook OAuth | Secrets Azure non configurés |
| 🟡 Moyenne | Yahoo OAuth | Client ID incorrect |
| 🟡 Moyenne | Gmail OAuth | Bug corrigé, test inbox jamais fait |
| 🟡 Moyenne | Stripe prix | `STRIPE_PRICE_*` en secrets + sync `billing_plans` DB |
| 🟢 Mineure | BUG #013 | localStorage `onboarding_session_id` |
| 🟢 Mineure | CORS hygiénique | passer `request` aux helpers dans `twilio/routes.js` (ne gêne que les URLs preview) |
| 🟡 Moyenne | Dette `tenants.phone` | 5 tenants partagent `+33760762153`, formats mixtes `0760…`/`+3376…` — non utilisé par resolve-phone (secondaire) mais à assainir |

### Résolus majeurs (référence rapide)

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
- [ ] Régénérer les clés Meta exposées (`META_APP_SECRET`, `META_WHATSAPP_ACCESS_TOKEN`).

### 🟠 P1 — Frictions UX Maze restantes
- [ ] Ranger « Agent IA » dans **Configuration** (les 5 testeurs l'y cherchaient).
- [ ] Clarifier les libellés KB ↔ Disponibilités ↔ Prompt (confusion testeurs).
- [ ] Déployer le feedback UI sur clics échoués (code prêt : tasks, agents/config, teams, services).
- [ ] Vérifier les transcripts d'appel réel (appel test au `+33939035760`).

### 🟡 P2 — Finalisation produit
- [ ] Billing : `STRIPE_PRICE_ESSENTIEL/PRO/BUSINESS` en secrets + sync `billing_plans`.
- [ ] Settings : profil, notifications, préférences, sécurité (30 % → 100 %).
- [ ] WhatsApp V2 complet ; OAuth Outlook/Yahoo.
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
7. **`business_website` est de facto obligatoire** (échec 22215 s'il manque) alors que notre garde ne
   l'exige pas : le champ est marqué « facultatif » au portail mais Twilio refusera l'Evaluation.
   ⚠️ Trap connu pour les TPE sans site — décision produit en attente (cf. § j 17/07).
8. **Address créée AVANT les documents** : son SID (`address_sids`) est requis par le groupe adresse.

## RÈGLES GLOBALES AGENTIC OS

Lis également `MASTER-PROMPT-V5.md` à la racine (symlink → `~/Projects/infra/agentic-os/`).
37 règles techniques absolues valables tous projets. En cas de conflit, **ce CLAUDE.md a priorité**.
