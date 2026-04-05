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

## SOURCE UNIQUE DE VÉRITÉ (règle absolue depuis 30/03/2026, renforcé 02/04/2026)

| Donnée | Source unique | Colonne |
|--------|-------------|---------|
| Nom entreprise | `tenants.name` | `tenants.company_name` ignoré |
| Secteur métier | `tenants.sector` | `voixia_configs.secteur` ignoré, `tenants.industry` ignoré |
| Prénom agent | Extrait du `system_prompt` | "Tu es **Fati**, assistant vocal de..." |
| Prompt actif | `ai_prompt_versions.is_active=1` | 1 seul par tenant |
| Config LLM/voix | `voixia_configs` | llm_provider, llm_model, voice_id, transfer_number, transfer_enabled |
| Liste des voix | `lib/voices.ts` | VOICE_OPTIONS (source unique, 20 voix FR France) |
| Prompts sectoriels | `lib/prompts.ts` | SECTOR_PROMPTS (13 secteurs, nodes, quick_scenarios) |
| Templates DB | `ai_sector_templates` | Migration 0055, peuplé depuis lib/prompts.ts |
| Tél personnel | `users.phone` | Vérifié via `users.phone_verified` |
| Tél pro (Twilio) | `tenants.phone` | Numéro Twilio/renvoi d'appel |
| Onboarding état | `tenants.onboarding_completed` | 0/1, DB uniquement |
| Onboarding session | `onboarding_sessions` | current_step, status — JAMAIS localStorage |

**Flux voice_id (corrigé 30/03/2026) :**
```
Dashboard sélection voix → handleSavePrompt() envoie voice_id
  → POST /ai/prompts (crée prompt) → POST /ai/prompts/activate/:id (body: voice_id, llm_*)
  → voixia_configs.voice_id mis à jour
  → resolve-phone retourne voice_id
  → Agent Python utilise voice_id pour ElevenLabs TTS
```

**Flux onboarding (refonte 02/04/2026) :**
```
8 étapes : Secteur → Entreprise → Vérification tél → Connaissances → Produits → Canaux → Assistant → Résumé
  → POST /api/v1/onboarding/step (step=sector|business|knowledge|products|channels|assistant|complete)
  → GET /api/v1/onboarding/state (retourne tenant + user + session depuis DB)
  → POST /api/v1/onboarding/send-verification (SMS code 6 chiffres via Twilio)
  → POST /api/v1/onboarding/verify-phone (vérifie code, users.phone_verified=1)
  → JAMAIS de localStorage pour données utilisateur (uniquement auth_token + session_id)
  → Dashboard pages pré-remplies depuis /api/v1/auth/me (pas localStorage)
```

**Colonnes users ajoutées (migration 02/04/2026) :**
- `users.phone` TEXT — numéro personnel E.164
- `users.phone_verified` INTEGER DEFAULT 0
- `users.phone_verification_code` TEXT — code 6 chiffres temporaire
- `users.phone_verification_expires` TEXT — expiration ISO 8601

**Règles :**
- `resolve-phone` lit `t.name AS company_name, t.sector` depuis tenants (JOIN)
- `/me` retourne `tenant.sector` (pas industry), `user.phone`, `user.phone_verified`, `tenant.onboarding_completed`
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
6. Le `system_prompt` DOIT contenir : "appelle TOUJOURS search_knowledge avant de répondre à toute question sur les services ou tarifs" — sans cette instruction l'agent ne call pas le tool
7. JAMAIS de documents crawlés d'un autre site dans la KB — vérifier source_type avant démo
8. Tools vocaux : JAMAIS de prefixe technique dans le retour ("Reponse trouvee", "Resultats trouves", etc.) — le retour est lu a voix haute par le TTS
9. Retour tool vocal : max 300 chars, phrases naturelles, pas de markdown, pas de symboles (euros pas EUR, etc.), coupe a la derniere phrase complete
10. Recherche KB textuelle : TOUJOURS splitter la question en mots significatifs et chercher avec OR (LIKE '%mot1%' OR LIKE '%mot2%'). JAMAIS de LIKE '%phrase entière%' car les mots ne sont pas adjacents dans le contenu
11. system_prompt DOIT contenir : "ne dis JAMAIS je consulte, je verifie, un instant, je recherche" — sinon le LLM annonce sa demarche avant de donner la reponse
12. TTS normalisation dans _nettoyer_pour_tts() : 24/7 → "24 heures sur 24, 7 jours sur 7", 24h/24 → "24 heures sur 24", 7j/7 → "7 jours sur 7", / → "sur", % → "pourcent", & → "et"

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
**Vérifié 04/04/2026 :** `POST /api/v1/voixia/knowledge` retourne `answer` (priorité source_type='text', tronqué 500 chars) + `found` + `results`. Même logique que GET /tools/knowledge.

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

## SITEMAP DÉFINITIF (refonte Fonio 02/04/2026, MàJ sitemap 02/04/2026)

Composant sidebar : `components/DashboardSidebar.tsx`
**Style Fonio — sidebar classique, 6 groupes avec accordéons :**
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
Communication
  ├─ Numéros /channels/numbers
  ├─ Agents IA /agents/configuration
  ├─ SMS /channels/sms
  ├─ WhatsApp /channels/whatsapp
  ├─ Email /channels/email
  └─ Messagerie vocale /channels/voicemail
Intelligence
  ├─ Base de connaissances /knowledge
  ├─ FAQ /knowledge/faq
  └─ Produits & Services /knowledge/products
Agenda
  ├─ Rendez-vous /appointments
  └─ Disponibilités /availability
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
- `/dashboard/channels/numbers` — Gestion des numéros de téléphone
- `/dashboard/channels/voicemail` — Messagerie vocale (prochainement)
- `/dashboard/channels/ivr` — IVR / SVI (prochainement)
- `/dashboard/channels/queues` — Files d'attente (prochainement)

**Config Agent** `app/dashboard/agents/configuration/page.tsx` :
- 4 onglets : Identité / Voix / Comportement / Avancé
- Identité : prénom agent, entreprise, secteur, description
- Voix : sélecteur ElevenLabs avec preview audio, filtre genre
- Comportement : tonalité (pro/amical/formel), transfert humain, prompt système, historique
- Avancé : modèle LLM, numéro de téléphone, type agent, statistiques

**Contacts** `app/dashboard/crm/prospects/page.tsx` :
- Renommé "Prospects" → "Contacts" dans toute l'interface
- source: 'sara' → 'assistant' dans les données mock et dropdown

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
    │   ├── onboarding/             # Onboarding 8 étapes (API-first, 0 localStorage)
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
| ~~Email~~ | ~~Resend non configuré~~ **CORRIGÉ 02/04** — 6 routes /api/v1/email/*, page 4 sections | ✅ Corrigé |
| ~~KB search~~ | ~~cherchait dans knowledge_chunks (0 chunks)~~ **CORRIGÉ 02/04** — fallback knowledge_documents + fix kd.url→kd.source_url + priorité source_type='text' avant 'crawl' + answer tronquée 500 chars | ✅ Corrigé |
| ~~Transfer humain~~ | ~~pas de logique callback~~ **CORRIGÉ 02/04** — transfer_enabled=0 → propose rappel + create_prospect + SMS. Config Agent onglet Comportement : toggle ON → champ numéro visible, toggle OFF → agent propose rappel | ✅ Corrigé |
| ~~Port 8081 zombie~~ | ~~process Python bloque le port au restart~~ **CORRIGÉ 02/04** — ExecStartPre fuser -k dans systemd | ✅ Corrigé |
| ~~Données démo KB~~ | ~~Pas de KB pour demo~~ **CORRIGÉ 02/04** — 4 docs insérés (présentation, tarifs, horaires, FAQ) | ✅ Corrigé |
| ~~Prompt ecommerce~~ | ~~system_prompt actif = Léa/boutique en ligne (ecommerce)~~ **CORRIGÉ 02/04** — Fati/Agentic Solutions agents IA (ia_voix) | ✅ Corrigé |
| ~~KB polluée Nestenn~~ | ~~6 docs crawlés Nestenn immobilier parasitaient la KB~~ **CORRIGÉ 02/04** — supprimés, seuls 4 docs Agentic Solutions restent | ✅ Corrigé |
| ~~Prefixe vocal KB~~ | ~~`tools/knowledge.py` retourne "Reponse trouvee : ..."~~ **CORRIGE 04/04** — prefixe supprime, retourne contenu direct + nettoyage TTS (_nettoyer_pour_tts) | ✅ Corrige |
| ~~Format answer TTS~~ | ~~contenu trop long/mal formate pour TTS~~ **CORRIGE 04/04** — tronque a 300 chars, coupe a la derniere phrase, supprime markdown, symboles remplaces | ✅ Corrige |
| ~~KB found=False appel~~ | ~~Recherche KB LIKE '%phrase entiere%' ne matchait pas les phrases naturelles du LLM~~ **CORRIGE 05/04** — split question en mots significatifs + recherche OR sur chaque mot (3 niveaux : chunks, documents, FAQ) | ✅ Corrige |
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

## SYSTÈME EMAIL DÉFINITIF (corrigé 02/04/2026)

| Élément | Détail |
|---------|--------|
| Provider envoi | Resend |
| Clé API | `RESEND_API_KEY` (secret Workers ✅) |
| From | `env.RESEND_FROM_EMAIL` = `"Sara <sara@coccinelle.ai>"` |
| Routes backend | `/api/v1/email/*` (PAS `/api/v1/channels/email/*`) |
| Module backend | `src/modules/email/routes.js` |
| sendResendEmail | `src/modules/channels/routes.js:883` (channels) + `src/modules/voixia/orchestrator.js:508` (post-appel) |
| Tables | `channel_configurations` (config), `channel_messages_log` (logs), `email_processed` (OAuth) |

**Routes email :**
```
GET  /api/v1/email/status    → statut connexion OAuth
GET  /api/v1/email/config    → config expéditeur Resend (from_name, from_email, reply_to, signature)
PUT  /api/v1/email/config    → sauvegarder config
POST /api/v1/email/test      → envoyer email de test via Resend
POST /api/v1/email/send      → envoyer email (OAuth provider)
GET  /api/v1/email/logs      → 20 derniers emails envoyés
GET  /api/v1/email/inbox     → inbox OAuth
GET  /api/v1/email/stats     → stats emails traités
POST /api/v1/email/auto-reply → réponse auto Sara
POST /api/v1/email/mark-read  → marquer lu
```

**Page frontend :** `app/dashboard/channels/email/page.tsx` — 4 sections :
1. Statut canal (badge actif/inactif, toggle, statut Resend)
2. Configuration expéditeur (nom, email, reply-to, signature → PUT /email/config)
3. Test d'envoi (input + bouton → POST /email/test)
4. Historique (tableau 20 derniers → GET /email/logs)

## ORCHESTRATEUR OMNICANAL (cree 02/04/2026)

| Element | Detail |
|---------|--------|
| Fichier backend | `src/modules/omnicanal/orchestrator.js` |
| Routes API | `src/modules/omnicanal/routes.js` |
| Fonctions export | `handleOmniEvent`, `onCallEnded`, `onSmsReceived`, `onWhatsAppReceived` |
| Tables DB | `omni_rules`, `omni_rule_executions` |
| Routes | `/api/v1/omnicanal/*` |

**5 scenarios pre-configures :**
1. Appel → SMS confirmation (delay 30s)
2. Appel → Email recapitulatif (delay 60s)
3. SMS recu → Reponse IA (Claude Haiku)
4. WhatsApp recu → Creer prospect CRM
5. Appel → Creer prospect CRM

**Routes :**
```
GET    /api/v1/omnicanal/rules        → lister les regles du tenant (auth JWT)
POST   /api/v1/omnicanal/rules        → creer une regle (auth JWT)
PUT    /api/v1/omnicanal/rules/:id    → modifier (activer/desactiver/editer) (auth JWT)
DELETE /api/v1/omnicanal/rules/:id    → supprimer (auth JWT)
GET    /api/v1/omnicanal/executions   → 50 derniers logs (auth JWT)
POST   /api/v1/omnicanal/test         → simuler un evenement (auth JWT)
POST   /api/v1/omnicanal/event        → evenement externe (auth VoixIA : X-VoixIA-Key + X-VoixIA-Tenant)
```

**Page frontend :** `app/dashboard/agents/nodes/page.tsx` — 3 onglets :
1. Regles automatiques (5 scenarios + liste regles + creation)
2. Editeur de sequences (SequenceEditor existant)
3. Historique des executions

**Webhooks connectes (02/04/2026) :**
| Webhook | Fichier | Fonction declenchee |
|---------|---------|---------------------|
| Twilio SMS | `src/modules/twilio/routes.js` (handleIncomingSMS) | `onSmsReceived()` |
| Meta WhatsApp | `src/modules/omnichannel/webhooks/meta-whatsapp.js` (handleMetaWhatsAppWebhook) | `onWhatsAppReceived()` |
| VoixIA fin d'appel | `POST /api/v1/omnicanal/event` (auth X-VoixIA-Key) | `handleOmniEvent()` |

**Test verifie :** POST /api/v1/omnicanal/event avec auth VoixIA → 3 regles executees (SMS Twilio envoye, prospect CRM cree)

**Connexion agent Python VoixIA :**
```python
# Dans pipeline.py ou main.py, apres session.disconnect() :
import httpx
httpx.post("https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/omnicanal/event",
  headers={"X-VoixIA-Key": VOIXIA_API_KEY, "X-VoixIA-Tenant": tenant_id},
  json={"event_type": "call_ended", "channel": "voice",
        "contact": {"phone": caller_phone, "name": caller_name},
        "data": {"duration": call_duration, "summary": call_summary}})
```

## ÉTAT AU 4 AVRIL 2026

### CE QUI FONCTIONNE
- VoixIA active (running) sur Scaleway 51.15.130.204
- resolve-phone retourne Fati / Agentic Solutions / ia_voix
- Tenant reconnu : tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy
- search_knowledge appele pendant les appels (confirme dans les logs 04/04)
- POST /api/v1/voixia/knowledge retourne answer (priorite text, tronque 500 chars)
- SMS rappel humain fonctionne
- Prospect cree en CRM
- Sidebar style Fonio deployee
- Orchestrateur omnicanal 5 scenarios deploye
- Email 6 routes operationnelles
- Onboarding source unique de verite
- Port 8081 zombie corrige — ExecStartPre fuser -k dans systemd

### BUGS RESTANTS
Aucun bug critique restant au 04/04/2026.

### BUGS RESOLUS 04/04/2026
**BUG 1 — Prefixe vocal "Reponse trouvee" — CORRIGE**
- `tools/knowledge.py` retournait `f"Reponse trouvee : {answer}"` → agent lisait le prefixe a voix haute
- Fix : retourne directement le contenu via `_nettoyer_pour_tts(answer)`

**BUG 2 — Format TTS trop long — CORRIGE**
- Answer 389 chars, mal formate pour synthese vocale
- Fix : `_nettoyer_pour_tts()` tronque a 300 chars, coupe a la derniere phrase complete, supprime markdown, remplace symboles
- Messages d'erreur aussi en langage naturel (pas de codes HTTP, pas de traces)

### ACTIONS PRIORITAIRES AVANT NUBBO 10 AVRIL
1. ~~Fix tools/knowledge.py~~ — FAIT 04/04
2. ~~Verifier contenu answer~~ — FAIT 04/04 (Agentic Solutions, 300 chars, pas Nestenn)
3. Test vocal E2E complet (appeler le +33939035760)
4. Donnees demo realistes (prospects, appels, RDV)
5. Script demo 15 min

### SOURCE UNIQUE DE VERITE (verifie 04/04/2026)
- `tenants.name` = "Agentic solutions"
- `tenants.sector` = "ia_voix" (corrige 04/04)
- `voixia_configs.secteur` = "ia_voix" (corrige 04/04)
- `ai_prompt_versions` id=10, secteur=ia_voix, is_active=1
- Prompt actif : "Tu es Fati, assistante vocale IA d Agentic Solutions..."
- KB : 4 documents Agentic Solutions (source_type=text)
- KB : 0 documents Nestenn (supprimes 02/04)

### FICHIERS CRITIQUES PYTHON VOIXIA (serveur 51.15.130.204)
| Fichier | Role | Etat |
|---------|------|------|
| `/opt/voixia/agent/tools/knowledge.py` | Tool search_knowledge | OK — prefixe supprime, TTS 300 chars max |
| `/opt/voixia/agent/pipeline.py` | Agent LLM + 8 @function_tool | OK — tools passes a AgentSession |
| `/opt/voixia/agent/main.py` | Entrypoint + greeting + session | OK |
| `/opt/voixia/agent/tenant.py` | resolve-phone client | OK |
| `/opt/voixia/agent/llm_factory.py` | Factory LLM (lk_openai.LLM) | OK — Claude + Mistral |
| `/opt/voixia/agent/config.py` | Config providers | OK — mistral + claude |
| `/opt/voixia/agent/prompts.py` | Greetings + prompts fallback | OK |
| `/opt/voixia/agent/tools/transfer.py` | Transfer humain + callback | OK |
| `/opt/voixia/.env` | Variables d'env | OK (pas dans agent/.env) |

### COMMANDES ESSENTIELLES (mise a jour 04/04/2026)
```bash
# Logs en direct
ssh root@51.15.130.204 "journalctl -u voixia -f --no-pager"

# Restart VoixIA
ssh root@51.15.130.204 "systemctl restart voixia"

# Test KB POST (appele par agent Python)
curl -s -X POST \
  "https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/voixia/knowledge" \
  -H "X-VoixIA-Key: 813f882e34f8b033e398e9a3c0ed38070e98a88e50eeee485ac0e8e06de11cc9" \
  -H "X-VoixIA-Tenant: tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy" \
  -H "Content-Type: application/json" \
  -d '{"question":"tarifs"}'

# Deploiement complet
cd ~/Projects/saas/coccinelle-ai && npx wrangler deploy
ssh root@51.15.130.204 "systemctl restart voixia"
cd coccinelle-saas && npm run build && npx wrangler pages deploy out --project-name coccinelle-saas --commit-dirty=true
```

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
