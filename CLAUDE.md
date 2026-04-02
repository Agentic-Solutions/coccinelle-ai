# 🐞 COCCINELLE.AI - Instructions Projet pour Claude Code

## QUI EST LE DÉVELOPPEUR

**Youssef Amrouche** - Fondateur d'Agentic Solutions SASU
- Expert métier (25+ ans en relation client/call center)
- Valide chaque étape avant de passer à la suivante

## LE PROJET

**Coccinelle.ai** = Premier CRM français avec IA vocale native pour TPE/PME.
- Agent vocal IA "Sara" qui répond au téléphone 24/7
- CRM omnicanal (téléphone, SMS, WhatsApp, email)
- Prise de RDV automatique, qualification prospects
- Base de connaissances RAG (crawl site → FAQ auto)
- Multi-tenant avec RBAC (10 permissions configurables)

## SOURCE UNIQUE DE VÉRITÉ (règle absolue depuis 30/03/2026)

| Donnée | Source unique | Colonne |
|--------|-------------|---------|
| Nom entreprise | `tenants.name` | `tenants.company_name` ignoré |
| Secteur métier | `tenants.sector` | `voixia_configs.secteur` ignoré, `tenants.industry` ignoré |
| Prénom agent | Extrait du `system_prompt` | "Tu es **Fati**, assistant vocal de..." |
| Prompt actif | `ai_prompt_versions.is_active=1` | 1 seul par tenant |
| Config LLM/voix | `voixia_configs` | llm_provider, llm_model, voice_id |
| Liste des voix | `lib/voices.ts` | VOICE_OPTIONS (source unique, 20 voix FR France) |
| Prompts sectoriels | `lib/prompts.ts` | SECTOR_PROMPTS (13 secteurs, nodes, quick_scenarios) |
| Templates DB | `ai_sector_templates` | Migration 0055, peuplé depuis lib/prompts.ts |

**Flux voice_id (corrigé 30/03/2026) :**
```
Dashboard sélection voix → handleSavePrompt() envoie voice_id
  → POST /ai/prompts (crée prompt) → POST /ai/prompts/activate/:id (body: voice_id, llm_*)
  → voixia_configs.voice_id mis à jour
  → resolve-phone retourne voice_id
  → Agent Python utilise voice_id pour ElevenLabs TTS
```

**Règles :**
- `resolve-phone` lit `t.name AS company_name, t.sector` depuis tenants (JOIN)
- `/me` retourne `tenant.sector` (pas industry)
- Signup écrit `body.industry` → `tenants.sector`
- Profile écrit `industry` → `tenants.sector` via COALESCE
- Frontend remplace `{ASSISTANT_NAME}` et `{COMPANY_NAME}` AVANT envoi à l'API
- VoixIA greeting = texte littéral via `session.say()` (pas `generate_reply`)
- Activate endpoint accepte body optionnel `{ voice_id, llm_provider, llm_model }` pour mettre à jour voixia_configs
- `POST /api/v1/ai/voice-preview` = preview audio ElevenLabs (requiert `ELEVENLABS_API_KEY` en secret Workers)
- `lib/voices.ts` = source unique des voix disponibles (importé par `voixia/page.tsx`)
- `lib/prompts.ts` = source unique des prompts sectoriels (13 secteurs, nodes vocaux, quick_scenarios)
- JAMAIS de `PROMPT_TEMPLATES` local dans les composants — toujours `getSectorPrompt()` depuis `lib/prompts.ts`
- Voix disponibles (20 voix françaises de France, vérifié 31/03/2026) :
  - Filtres ElevenLabs : `language=fr`, `use_cases=conversational`, `accent=standard`
  - **Féminines (10)** : Jeanne (pro), Jade (support), Audia (amicale), Anna (douce), Laura (conversationnelle), Lucie (service client), Isabelle (mature), Sarah (conversationnelle), Victoria (jeune), Léa (éducative)
  - **Masculines (10)** : Nicolas (pro), Benjamin (chaleureux), Laurent (rassurant), Marco (agent IA), Vincent (décontracté), Julien (réaliste), Antoine (expressif), Clément (calme), Greg (parisien), Steve (doux)
  - Pour rafraîchir : consulter `https://elevenlabs.io/app/voice-library?required_languages=fr&use_cases=conversational&accent=standard`

**Flux prompts sectoriels (corrigé 31/03/2026) :**
```
Sélection secteur dans VoixIA → getSectorPrompt(secteur) → lib/prompts.ts
  → system_prompt riche (identité + style + déroulement) → textarea
  → handleSavePrompt() → POST /ai/prompts → POST /ai/prompts/activate/:id
  → ai_prompt_versions.system_prompt = prompt enrichi
```

**Flux séquences omnicanal (corrigé 31/03/2026) :**
```
Sélection secteur dans Séquences → getSectorPrompt(secteur).nodes → lib/prompts.ts
  → nodes vocaux (accueil, qualification, prise_rdv, fin) depuis lib/prompts.ts
  → SMS/Email depuis SECTOR_CONTENT local (spécifique séquence)
  → Canvas visuel avec 10 nodes : call→condition→call→call→sms→email→end + branche NON
```

**Simulation IA (ajouté 31/03/2026) :**
```
Bouton "Simuler" → modale chat → quick_scenarios depuis getSectorPrompt().quick_scenarios
  → POST /api/v1/ai/simulate (body: system_prompt, messages, llm_provider)
  → Backend appelle Anthropic Claude ou Mistral → reply affiché dans la modale
```

## RÈGLES ABSOLUES VOIXIA

1. `session.say(texte_littéral)` — `generate_reply()` INTERDIT
2. Greeting = phrase courte littérale : "Bonjour, {COMPANY_NAME} !"
3. Le "+" dans les numéros → encodé "%2B" dans les URLs
4. UN SEUL prompt `is_active=1` par tenant
5. `system_prompt` sauvegardé en DB ne contient JAMAIS de variables `{}`

## FICHIERS PYTHON VOIXIA (NE PAS CASSER)

| Fichier | Rôle | Règle absolue |
|---------|------|---------------|
| tenant.py | Résolution tenant | phone encodé %2B dans URL |
| main.py | Orchestration appel | session.say() jamais generate_reply() |
| pipeline.py | Agent LLM + tools | system_prompt depuis resolve-phone |
| tools.py | Tools LiveKit | 7 tools connectés aux modules Coccinelle |
| llm_factory.py | Factory LLM | provider + model dynamiques |
| prompts.py | Greetings | Textes LITTÉRAUX courts |

## TOOLS VOIXIA (connectés aux modules Coccinelle)

| Tool | Endpoint principal | Alias /tools/ | Module |
|------|-------------------|---------------|--------|
| check_availability | GET /api/v1/voixia/appointments/availability | GET /tools/availability | Rendez-vous |
| book_appointment | POST /api/v1/voixia/appointments | POST /tools/book-appointment | Rendez-vous |
| search_knowledge | POST /api/v1/voixia/knowledge | GET /tools/knowledge | Base de connaissances |
| search_products | GET /api/v1/voixia/products | GET /tools/products | Produits |
| create_prospect | POST /api/v1/voixia/prospects | POST /tools/prospect | Prospects/CRM |
| send_sms | POST /api/v1/voixia/sms | POST /tools/sms | Canaux/SMS |
| transfer_to_human | POST /api/v1/voixia/transfer | POST /tools/transfer | Équipes |

**Note :** Les deux schémas de paths fonctionnent. L'agent Python utilise les paths principaux.
**Vérifié 01/04/2026 :** `check_availability` retourne des créneaux RÉELS depuis `availability_slots` + `appointments`.

## PALETTE DE NODES (éditeur de séquences)

11 types de nodes disponibles, organisés en 4 catégories :

| Catégorie | Types | Description |
|-----------|-------|-------------|
| CONVERSATION | call, sms, email | Canaux de communication |
| LOGIQUE | condition, delay | Branchement et temporisation |
| ACTIONS | rdv, knowledge, products, prospect, transfer | Appel automatique aux outils VoixIA |
| FIN | end | Terminaison de séquence |

Chaque node `call` a un champ `script` (texte exact que l'agent vocal prononcera).
Chaque node action affiche l'outil connecté (ex: `check_availability + book_appointment`).
Source : `src/components/SequenceEditor.tsx` → `NODE_PALETTE` + `NODE_TYPES`.
Accessible via : `/dashboard/agents/nodes` (importe `SequenceEditor` depuis `@/components/SequenceEditor`).

## SITEMAP DÉFINITIF (refonte Fonio 02/04/2026)

Composant sidebar : `components/DashboardSidebar.tsx`
**Style Fonio — sidebar classique, 5 groupes avec accordéons :**
- w-[260px] collapsible → w-[68px], transition 300ms
- bg-white, border-r border-gray-200
- Palette : blanc/noir/gris uniquement (brand-600 → gray-900)
- Item actif : bg-gray-100 text-gray-900 font-medium
- Icône active : text-gray-900, inactive : text-gray-400
- Labels groupes : cliquables, accordéon ChevronDown/ChevronRight
- Groupe auto-ouvert si route active dedans, fermés sinon
- Bouton "Nouvel appel" : bg-gray-900 text-white
- Logo : CoccinelleIcon 18px blanc sur fond gray-900 rounded-lg
- Bas : Paramètres + Déconnexion
- Mobile : overlay + sidebar 260px

**Règles UI (corrigé 02/04/2026) :**
- Emoji 🐞 BANNI de toute l'interface — utiliser CoccinelleIcon partout
- "Sara" BANNI — utiliser "Assistant" ou nom dynamique depuis le prompt
- Termes techniques BANNIS dans l'UI : RAG, Crawl, crawler, embedding, vector, chunks
  - RAG → "Recherche intelligente" ou "Tester la recherche"
  - Crawl → "Importer depuis un site"
  - Auto-Builder → "Construction automatique"
  - Knowledge Base → "Base de connaissances"

**Page Paramètres** `app/dashboard/settings/page.tsx` :
- 3 colonnes style Fonio : Organisation / Facturation / Technique
- Cartes : Général, Équipe, Abonnement, Intégrations, Webhooks
- Section "Paramètres généraux" : fuseau horaire, langue
- Zone dangereuse : suppression compte avec double confirmation
- Palette : blanc/noir/gris uniquement

**Topbar** dans `app/dashboard/layout.tsx` :
- h-14, border-b, bg-white
- Recherche (input gray-50) + NotificationBell + avatar

**Dashboard** `app/dashboard/page.tsx` :
- Métriques mock Nubbo : 47 appels, 28 entrants, 3m42s durée, 94% taux
- Appels récents mock : 5 appels avec avatars initiales
- Palette : blanc/noir/gris + exceptions vert/rouge pour variations

```
Principal
  ├─ Dashboard /dashboard
  ├─ Appels /analytics/calls
  └─ Contacts /crm/prospects
Téléphonie
  ├─ Numéros /channels/phone
  ├─ Agents IA /agents/configuration
  ├─ SMS /channels/sms
  ├─ WhatsApp /channels/whatsapp
  ├─ Email /channels/email
  ├─ Messagerie vocale /channels/voicemail
  └─ Rendez-vous /appointments
Connaissances
  ├─ Base de connaissances /knowledge
  ├─ FAQ /knowledge/faq
  └─ Produits & Services /knowledge/products
Configuration
  ├─ Scripts /agents/scripts
  ├─ Séquences /agents/nodes
  ├─ IVR / SVI /channels/ivr
  └─ Files d'attente /channels/queues
Rapports
  ├─ Analytics /analytics
  ├─ Transcripts /analytics/transcripts
  └─ Export /analytics/export
───────────────────────────────────
Paramètres /settings
Déconnexion
```

**Pages placeholder (02/04/2026) :**
- `/dashboard/channels/voicemail` — Messagerie vocale (prochainement)
- `/dashboard/channels/ivr` — IVR / SVI (prochainement)
- `/dashboard/channels/queues` — Files d'attente (prochainement)

**Redirections actives :**
- `/dashboard/voixia` → `/dashboard/agents/configuration`
- `/dashboard/voixia/sequence` → `/dashboard/agents/nodes`
- `/dashboard/sara` → `/dashboard/agents/configuration`
- `/dashboard/sara-analytics` → `/dashboard/analytics`
- `/dashboard/products` → `/dashboard/knowledge/products`
- `/dashboard/prospects` → `/dashboard/crm/prospects`

**R01 respecté :** build webpack (pas turbopack) depuis 02/04/2026

**Sauvegarde pré-refonte :** `dashboard_backup_20260331_180501` (racine projet, hors build)

## CREDENTIALS VOIXIA

- Numéro VoixIA : +33939035760
- Numéro test Youssef : +33760762153
- Tenant test : tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy
- VoixIA API Key : 813f882e34f8b033e398e9a3c0ed38070e98a88e50eeee485ac0e8e06de11cc9
- LiveKit API Key : devkey
- LiveKit Secret : voixia-secret-dev-key-2026-secure

## COMMANDES ESSENTIELLES VOIXIA

```bash
# Redémarrer l'agent
ssh root@51.15.130.204 "systemctl restart voixia"

# Voir les logs en direct
ssh root@51.15.130.204 "journalctl -u voixia -f"

# Smoke test resolve-phone
curl -s "https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/voixia/resolve-phone?phone=%2B33760762153" \
  -H "X-VoixIA-Key: 813f882e34f8b033e398e9a3c0ed38070e98a88e50eeee485ac0e8e06de11cc9" \
  -H "X-VoixIA-Tenant: tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy"
```

## OBJECTIF PRINCIPAL

**Optimiser et rendre 100% opérationnel l'existant.** Ne pas recréer, ne pas repartir de zéro. Améliorer ce qui existe :
- Corriger tous les bugs
- Compléter les features incomplètes
- Optimiser les performances (requêtes D1, latence API, bundle frontend)
- Nettoyer le code (dead code, imports inutiles, console.log oubliés)
- Améliorer la qualité (error handling, validation, edge cases)
- Améliorer l'UX (responsive, accessibilité, micro-interactions)

## STACK TECHNIQUE

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Backend | Cloudflare Workers (JavaScript) |
| Database | Cloudflare D1 (SQLite) |
| Vector DB | Cloudflare Vectorize |
| Storage | Cloudflare R2 |
| Auth | JWT + bcrypt |
| Téléphonie | Twilio + Retell.ai |
| Voix IA | ElevenLabs (custom "Sara") |
| LLM | GPT-4o-mini / Claude |
| Email | Gmail OAuth, Outlook OAuth, Yahoo OAuth |
| WhatsApp | Meta Cloud API |
| SMS | Twilio |

## STRUCTURE DU PROJET

```
coccinelle-ai/
├── CLAUDE.md                       # CE FICHIER
├── src/
│   ├── index.js                    # Point d'entrée Workers
│   ├── modules/
│   │   ├── auth/                   # Authentification JWT
│   │   ├── products/               # Produits/Services
│   │   ├── appointments/           # Rendez-vous
│   │   ├── knowledge/              # Base de connaissances RAG
│   │   ├── prospects/              # Prospects/CRM
│   │   ├── teams/                  # Équipes
│   │   ├── permissions/            # RBAC (10 permissions)
│   │   ├── omnichannel/            # Conversations unifiées
│   │   ├── email/                  # Service email
│   │   ├── oauth/                  # OAuth multi-provider
│   │   │   ├── routes.js
│   │   │   ├── google.js
│   │   │   ├── outlook.js
│   │   │   └── yahoo.js
│   │   ├── retell/                 # Agent vocal Sara
│   │   └── twilio/                 # SMS/Téléphone
│   └── utils/
│       └── cors.js
├── migrations/                     # Migrations D1
├── wrangler.toml                   # Config Cloudflare
└── coccinelle-saas/                # Frontend Next.js
    ├── app/
    │   ├── page.tsx                # Landing page
    │   ├── login/                  # Connexion
    │   ├── signup/                 # Inscription
    │   ├── onboarding/             # Onboarding 7 étapes
    │   └── dashboard/
    │       ├── page.tsx            # Home + KPIs
    │       ├── agents/             # ✅ Module Agents (remplace VoixIA)
    │       │   ├── page.tsx        # Liste agents
    │       │   ├── configuration/  # Config agent (voix, LLM, prompt)
    │       │   ├── scripts/        # Scripts d'appel par secteur
    │       │   ├── nodes/          # Éditeur séquences (ex voixia/sequence)
    │       │   └── test/           # Test vocal en direct
    │       ├── knowledge/          # ✅ Connaissances enrichi
    │       │   ├── page.tsx        # Base de connaissances + crawl
    │       │   ├── faq/            # FAQ pour agent vocal
    │       │   ├── products/       # Produits & Services
    │       │   └── docs/           # Upload documents
    │       ├── channels/           # ✅ Canaux
    │       │   ├── email/
    │       │   ├── sms/
    │       │   ├── whatsapp/
    │       │   └── phone/
    │       ├── analytics/          # ✅ Analytics (Ce que l'agent a ACCOMPLI)
    │       │   ├── page.tsx        # KPIs vue d'ensemble
    │       │   ├── calls/          # Métriques appels
    │       │   ├── messages/       # Métriques SMS/WhatsApp/Email
    │       │   ├── transcripts/    # Transcriptions complètes
    │       │   ├── performance/    # Score global, satisfaction
    │       │   └── export/         # Export CSV multi-type
    │       ├── appointments/       # ✅ Rendez-vous
    │       ├── crm/                # ✅ CRM/Prospects
    │       ├── customers/          # ✅ Clients
    │       ├── billing/            # 70% → à compléter
    │       ├── settings/           # 30% → à compléter
    │       ├── voixia/             # ⚡ Redirige → /agents/configuration
    │       │   └── sequence/       # ⚡ Redirige → /agents/nodes
    │       ├── sara/               # ⚡ Redirige → /agents/configuration
    │       ├── sara-analytics/     # ⚡ Redirige → /analytics
    │       ├── prospects/          # ⚡ Redirige → /crm/prospects
    │       └── products/           # ⚡ Redirige → /knowledge/products
    ├── components/
    │   └── DashboardSidebar.tsx    # Sidebar hiérarchique avec dividers
    └── src/components/
        └── SequenceEditor.tsx      # Éditeur séquences partagé
```

## BUGS CONNUS À CORRIGER

| Bug | Détail | Priorité |
|-----|--------|----------|
| ~~Tools VoixIA~~ | ~~check_availability retourne créneaux fictifs~~ **CORRIGÉ 01/04** — retourne créneaux réels | ✅ Corrigé |
| SMS end-to-end | Twilio configuré mais non testé avec l'agent vocal | 🟠 Moyenne |
| Email | Resend non configuré | 🟠 Moyenne |
| Données démo | Aucune donnée réaliste pour Nubbo 3 avril | 🟠 Moyenne |
| Outlook OAuth | Secrets Azure non configurés | 🟡 Moyenne |
| Yahoo OAuth | Client ID incorrect | 🟡 Moyenne |
| Gmail OAuth | Bug #2 corrigé V34, test inbox jamais fait | 🟡 Moyenne |

## FEATURES INCOMPLÈTES

| Feature | Actuel | Cible | Ce qui manque |
|---------|--------|-------|---------------|
| ~~Tools VoixIA~~ | ~~0%~~ 100% | 100% | ✅ 7/7 tools connectés + aliases /tools/* (01/04/2026) |
| Script démo | 0% | 100% | Script 15 min pour Nubbo |
| Données démo | 0% | 100% | Prospects, appels, RDV réalistes |
| Refresh token | 0% | 100% | JWT refresh endpoint |
| hook useTenant() | 0% | 100% | Hook unifié Phase 2 audit |
| Analytics | 80% | 100% | Graphiques avancés, export, filtres |
| Billing | 70% | 100% | Intégration Stripe, historique factures |
| Settings | 30% | 100% | Profil, notifications, préférences, sécurité |
| Prospects | 70% | 100% | Filtres, scoring, export, actions bulk |

## OPTIMISATIONS À FAIRE

### Backend
- Ajouter des index D1 sur les colonnes fréquemment requêtées
- Optimiser les requêtes N+1 (joins au lieu de requêtes multiples)
- Ajouter du rate limiting sur les endpoints publics
- Améliorer l'error handling (messages clairs, codes HTTP corrects)
- Ajouter de la validation des inputs (zod ou similaire)
- Nettoyer les console.log de debug
- Ajouter des try/catch cohérents partout

### Frontend
- Supprimer le dead code et imports inutiles
- Optimiser le bundle size (lazy loading, dynamic imports)
- Ajouter des états loading/error/empty cohérents sur toutes les pages
- Améliorer le responsive (mobile-first, les clients sont sur téléphone)
- Ajouter de la validation côté client sur tous les formulaires
- Cohérence du design system (couleurs, typo, espacement)

### Sécurité
- Sécuriser les endpoints prospects (marqués "À SÉCURISER" dans le PRD)
- Vérifier l'isolation des données par tenant
- Ajouter des audit logs manquants
- Vérifier les CORS en production

## CANAUX DE COMMUNICATION

| Canal | Envoi | Réception | Status |
|-------|-------|-----------|--------|
| 📞 Téléphone | ✅ VoixIA (LiveKit) | ✅ Webhook | 🟡 95% |
| 💬 SMS | ✅ Twilio | ✅ Webhook | ✅ 100% |
| 📱 WhatsApp | ✅ Meta API | ✅ Webhook | 🟡 95% |
| 📧 Gmail | ✅ Gmail API | ✅ Cloudflare | 🟡 95% |
| 📧 Outlook | ✅ Backend | ❌ | 🔴 60% |
| 📧 Yahoo | ✅ Backend | ❌ | 🔴 60% |

## FICHIERS INTERDITS À MODIFIER SANS OK DE YOUSSEF

- `wrangler.toml`
- `.env`, `.env.local`
- Migrations existantes dans `/migrations/`
- Configs agent Retell (Agent ID: agent_0c566a48e70125020d07aed643)

## MÉTHODE DE TRAVAIL — AGENTIC OS

### Principe orchestrateur
- 1 seul terminal Claude Code = 1 seul orchestrateur
- Jamais 2 terminaux sur le même projet simultanément
- Structure : ORCHESTRATEUR → Agent 1..N → Validation → Documentation
- Chaque agent valide avant de passer la main
- Si test échoue → STOP, corriger, retester
- Mettre à jour CLAUDE.md après chaque mission

### Bootstrap obligatoire
Claude Code lit automatiquement au démarrage :
1. CLAUDE.md (règles spécifiques Coccinelle — priorité absolue)
2. MASTER-PROMPT-V5.md (lien symbolique → ~/Projects/infra/agentic-os/)
   → 37 règles techniques universelles Agentic OS
   → Contexte fondateur Youssef / Agentic Solutions

### Ordre de déploiement obligatoire
1. Backend → wrangler deploy
2. Agent VoixIA → systemctl restart voixia (si Python modifié)
3. Frontend → npm run build && wrangler pages deploy

### Source unique de vérité

| Donnée | Source | Ne jamais utiliser |
|--------|--------|--------------------|
| company_name | tenants.name | tenants.company_name |
| secteur | tenants.sector | voixia_configs.secteur |
| prénom agent | system_prompt (regex) | users.first_name |
| prompt actif | ai_prompt_versions.is_active=1 | — |
| voix | voixia_configs.voice_id | — |
| liste voix | lib/voices.ts | — |
| prompts secteurs | lib/prompts.ts | PROMPT_TEMPLATES local |

## COMMANDES DE DÉPLOIEMENT (NE PAS EXÉCUTER SANS OK)

```bash
# Backend
npx wrangler deploy

# Frontend
cd coccinelle-saas
npm run build && npx wrangler pages deploy out --project-name coccinelle-saas --commit-dirty=true

# Migration D1
npx wrangler d1 execute coccinelle-db --remote --file=migrations/XXXX_nom.sql
```

## URLs PRODUCTION

- Frontend : https://coccinelle-saas.pages.dev
- Backend API : https://coccinelle-api.youssef-amrouche.workers.dev

## COMPTES DE TEST

| Compte | Email | Usage |
|--------|-------|-------|
| Admin prod | admin@coccinelle-prod.com | Test général |
| OAuth test | youssef.amrouche@outlook.fr | Test OAuth |

## NUMÉROS TWILIO

- FR : +33 9 39 03 57 60, +33 9 39 03 57 61
- US : +1 (336) 568-3422

---

## RÈGLES GLOBALES AGENTIC OS

Lis également MASTER-PROMPT-V5.md à la racine de ce projet.
Il contient les 37 règles techniques absolues qui s'appliquent à tous les projets.
En cas de conflit, ce CLAUDE.md (règles spécifiques Coccinelle) a priorité.
