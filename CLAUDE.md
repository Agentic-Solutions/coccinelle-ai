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
12. TTS _nettoyer_pour_tts() : 48+ remplacements en 12 categories — temporel (24h/24, 7j/7), monetaire (euros/mois), pourcent, connecteurs (&, +), abreviations (min, max, rdv, tel), sigles (PME, SLA, CRM, SMS), sigles fiscaux (HT→hors taxes, TTC→toutes taxes comprises, TVA→T V A, regex \b), ordinaux (1er, 2eme), ponctuation, markdown, espaces, troncature 300 chars
13. Documents KB ecrits en langage vocal pur : phrases courtes max 15 mots, pas de symboles, pas d'abreviations, pas de sigles, pas de markdown. Reecrits le 05/04/2026

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
- Connecte a GET /api/v1/calls/stats + GET /api/v1/calls?limit=5 (donnees reelles)
- Metriques : total appels, entrants, duree moyenne, taux de reponse
- Appels recents : 5 derniers appels avec avatars initiales
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
  ├─ Messagerie vocale /channels/voicemail
  └─ Notifications proactives /proactive
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
│   │   ├── proactive/              # Communication proactive (SMS/appels sortants)
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
    │       ├── proactive/           # ✅ Notifications proactives (SMS/appel)
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
| ~~Agent dit "je consulte"~~ | ~~system_prompt sans instruction silencieuse~~ **CORRIGE 07/04** — prompt reecrit Fati + OUTIL SILENCIEUX | ✅ Corrige |
| ~~Appels non comptabilises~~ | ~~dashboard mock, pas de log-call~~ **CORRIGE 07/04** — POST /voixia/log-call + dashboard connecte API | ✅ Corrige |
| ~~Config non prise en compte~~ | ~~resolve-phone verifie : 0 cache, lecture DB directe~~ **CORRIGE 07/04** | ✅ Corrige |
| ~~log-call HTTP 400~~ | ~~caller_phone vide car attributs SIP vides~~ **CORRIGE 12/04** — fallback participant.identity (sip_+33... → +33...) | ✅ Corrige |
| ~~transcript=0 chars~~ | ~~agent.chat_ctx vide apres disconnect~~ **CORRIGE 12/04** — _extract_transcript essaie session.chat_ctx en priorite | ✅ Corrige |
| ~~Analytics/calls vide~~ | ~~page lisait /api/v1/analytics/sara (omni_conversations vide)~~ **CORRIGE 12/04** — reecrit avec /api/v1/calls/stats + /api/v1/calls | ✅ Corrige |
| ~~generateId sans prefix~~ | ~~generateId() sans argument → call_id=undefined_xxx~~ **CORRIGE 12/04** — generateId('call') et generateId('cs') | ✅ Corrige |
| ~~HT lu HT vocalement~~ | ~~_nettoyer_pour_tts() sans remplacement HT/TTC/TVA~~ **CORRIGE 12/04** — regex \bHT\b→hors taxes, \bTTC\b→toutes taxes comprises, \bTVA\b→T V A | ✅ Corrige |
| ~~Agent dit devis personnalise~~ | ~~KB doc_002 contenait "sur devis"~~ **CORRIGE 12/04** — KB reecrit "sur mesure" + system_prompt MOTS INTERDITS | ✅ Corrige |
| ~~Proactive trigger 401~~ | ~~Frontend envoyait X-VoixIA-Key + X-VoixIA-Tenant vide~~ **CORRIGE 12/04** — frontend utilise authHeaders() (JWT), requireVoixIAAuth supporte deja JWT | ✅ Corrige |
| ~~Dedup phone mismatch~~ | ~~findOrCreateProspect faisait match exact phone=? → +33 et 0 non reconcilies~~ **CORRIGE 12/04** — phoneVariants() genere toutes variantes FR, recherche IN (...) | ✅ Corrige |
| ~~prospect_id null calls~~ | ~~log-call ignorait le resultat de findOrCreateProspect~~ **CORRIGE 12/04** — UPDATE calls SET prospect_id apres dedup | ✅ Corrige |
| ~~Transcript temps reel~~ | ~~chat_ctx vide apres disconnect → transcript=0~~ **CORRIGE 24/04** — event conversation_item_added capture Client/Assistant en temps reel, fallback _extract_transcript | ✅ Corrige |
| ~~undefined_ call IDs~~ | ~~1 call avec prefix undefined_ en DB~~ **CORRIGE 24/04** — INSERT new + UPDATE FKs + DELETE old (FK constraint imposait cette approche) | ✅ Corrige |
| ~~Page transcripts placeholder~~ | ~~lisait /analytics/sara, affichait placeholder~~ **CORRIGE 24/04** — reecrite avec GET /calls/transcripts, bulles Client/Assistant, responsive | ✅ Corrige |
| ~~SEO manquant~~ | ~~Pas de sitemap.xml ni robots.txt~~ **CORRIGE 24/04** — public/sitemap.xml (3 URLs) + public/robots.txt | ✅ Corrige |
| ~~BUG #006 — Pas d'indicateur abo~~ | ~~Aucune indication d'abonnement dans l'UI~~ **CORRIGE 25/04** — Badge sidebar (plan + jours trial + pastille statut) + banniere dashboard (trial/expire/actif) + lien /billing | ✅ Corrige |
| ~~BUG #007 — Double checkout~~ | ~~Re-clic "essai gratuit" relancait checkout~~ **CORRIGE 25/04** — Guard backend : si abo actif → redirect Customer Portal (409 sinon) | ✅ Corrige |
| ~~BUG #008 — 3DS inutile~~ | ~~SMS 3D Secure bloquait le paiement~~ **CORRIGE 25/04** — payment_method_types=card + request_three_d_secure=automatic | ✅ Corrige |
| **Double-booking RDV** | **agent_id=null vs agent_coccinelle_001 dans bookedTimes** | **🔴 Haute** |
| Outlook OAuth | Secrets Azure non configurés | 🟡 Moyenne |
| Yahoo OAuth | Client ID incorrect | 🟡 Moyenne |
| Gmail OAuth | Bug #2 corrigé V34, test inbox jamais fait | 🟡 Moyenne |

## FEATURES INCOMPLÈTES

| Feature | Actuel | Cible | Ce qui manque |
|---------|--------|-------|---------------|
| ~~Tools VoixIA~~ | ~~0%~~ 100% | 100% | ✅ 7/7 tools connectés + aliases /tools/* (01/04/2026) |
| ~~Script demo~~ | ~~0%~~ 100% | 100% | ✅ DEMO_NUBBO_20AVRIL.md — 15 min, 6 sections, plans B (12/04/2026) |
| ~~Données démo~~ | ~~0%~~ 100% | 100% | ✅ 15 prospects + 25 appels + 8 RDV + logs insérés (11/04/2026) |
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

## COMMUNICATION PROACTIVE (cree 07/04/2026)

| Element | Detail |
|---------|--------|
| Tables DB | `proactive_templates`, `proactive_logs`, `proactive_settings` |
| Module backend | `src/modules/proactive/routes.js` |
| Endpoint trigger | `POST /api/v1/proactive/trigger` (auth X-VoixIA-Key) |
| Canal actuel | SMS Twilio (Phase 1), appel sortant (Phase 2) |
| Templates | 6 templates (garage x2, notaire x2, veterinaire, comptable) |
| Dashboard | `/dashboard/proactive` (4 sections : config, envoi, templates, historique) |
| Sidebar | sous Communication, icone Bell |
| Phase 2 | Appels vocaux sortants via LiveKit SIP outbound |

**Routes :**
```
POST /api/v1/proactive/trigger    → declenchement notification (auth X-VoixIA-Key)
GET  /api/v1/proactive/logs       → historique 50 derniers (auth JWT)
GET  /api/v1/proactive/templates  → templates actifs du tenant (auth JWT)
GET  /api/v1/proactive/settings   → config du tenant (auth JWT)
PUT  /api/v1/proactive/settings   → modifier config (auth JWT)
```

**Tables D1 :**
- `proactive_templates` : id, tenant_id, sector, trigger_type, message_sms, message_vocal, is_active
- `proactive_logs` : id, tenant_id, client_phone, client_name, trigger_type, sector, channel, status, message_sent, result, sent_at
- `proactive_settings` : tenant_id (PK), is_active, hours_start, hours_end, preferred_channel

**Templates inseres (tenant test) :**
1. garage / pret → "Bonjour {client_name}, votre vehicule est pret..."
2. garage / revision → "Bonjour {client_name}, votre revision annuelle approche..."
3. notaire / signature → "Bonjour {client_name}, votre acte est pret..."
4. notaire / relance → "Bonjour {client_name}, nous attendons vos documents..."
5. veterinaire / rappel_vaccin → "Bonjour {client_name}, le rappel de vaccination..."
6. comptable / echeance → "Bonjour {client_name}, echeance fiscale..."

**Phase 2 — Appels vocaux sortants :**
- LiveKit SIP outbound : l'agent Python initie l'appel
- Delivre le message vocal (template message_vocal)
- Propose transfert vers un humain si besoin
- Log dans proactive_logs avec channel='voice'

**Appel depuis logiciel metier :**
```bash
curl -X POST "https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/proactive/trigger" \
  -H "X-VoixIA-Key: CLE_API" \
  -H "X-VoixIA-Tenant: TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"client_phone":"+33612345678","client_name":"Marie Martin","trigger_type":"pret","sector":"garage"}'
```

## ENDPOINT LOG-CALL (cree 07/04/2026)

| Element | Detail |
|---------|--------|
| Endpoint | `POST /api/v1/voixia/log-call` (auth X-VoixIA-Key) |
| Tables alimentees | `calls`, `ai_interaction_logs`, `call_summaries` |
| Dedup | `findOrCreateProspect()` appele automatiquement + prospect_id lie au call (12/04) |
| Dashboard | `app/dashboard/page.tsx` connecte a GET /api/v1/calls/stats + GET /api/v1/calls?limit=5 |

**Body attendu :**
```json
{
  "caller_phone": "+33612345678",
  "duration_seconds": 180,
  "status": "completed",
  "direction": "inbound",
  "transcript": "...",
  "summary": "Le client a demande les tarifs..."
}
```

**Connexion agent Python VoixIA (FAIT 11/04/2026) :**
- `pipeline.py` : fonction `log_call_to_api()` (httpx POST, timeout 5s, silencieux)
- `main.py` : `ctx.add_shutdown_callback(_on_shutdown)` appele en fin de session
- Extrait : caller_phone (participant.identity sip_+33... → +33...), duration (perf_counter), transcript (session.chat_ctx prioritaire)
- Summary = 200 premiers chars du transcript

## ETAT AU 26 AVRIL 2026

### SPRINT 26/04/2026 — CORRECTIONS AUDIT (Score 66→79/100)

**10 agents lances en parallele, 9 bugs corriges, 3 ameliorations SEO deployees.**

| # | Bug/Fix | Status | Detail |
|---|---------|--------|--------|
| B4 | VAPI routes sans auth | CORRIGE | Import+routing commentes dans index.js → 404 |
| #010 | resolve-phone latence | OPTIMISE | 3 queries → 1 JOIN, audit fire-and-forget. Latence D1 ~2s incompressible (US East) |
| #011 | knowledge latence | OPTIMISE | Recherches paralleles Promise.allSettled, audit fire-and-forget |
| #012 | Meta prix 49→79 | CORRIGE | layout.tsx description + OG description |
| #014 | Auth POST 500 body vide | CORRIGE | try/catch sur request.json() dans 4 handlers |
| #015 | 13 catch vides | CORRIGE | 21 blocs catch avec console.error dans analytics + calls |
| #016 | voixia_configs nouveau tenant | CORRIGE | UPDATE → INSERT...ON CONFLICT (UPSERT) |
| #017 | company_name onboarding | CORRIGE | data.company_name \|\| data.name accepte les 2 |
| #018 | agent_name non persiste | CORRIGE | INSERT...ON CONFLICT omni_agent_configs + fix saveAssistantConfig |
| SEO | og:image + canonical + sitemap | CORRIGE | og:image, twitter card, canonical, sitemap 8 URLs, JSON-LD Schema.org |
| Cleanup | Dead code + backups | CORRIGE | 11 .backup supprimes, retell+vapi demontes, routes-unified supprime |

**Deploiements :** Backend v304bd3bc + Frontend f2d2d5ab
**Migration 0056** (index perf) : A APPLIQUER quand D1 API accessible

**Smoke tests :**
| Test | Attendu | Resultat |
|------|---------|----------|
| T1 VAPI sans auth | 404 | 404 PASS |
| T2 Auth body vide | 400 | 400 PASS |
| T3 Meta "79" | present | PASS |
| T4 Sitemap legal | 5 pages | PASS |
| T5 resolve-phone | <1.5s | ~2.2s (D1 US East, incompressible) |
| T7 VoixIA running | active | 2+ jours PASS |
| SEO canonical | present | PASS |
| SEO og:image | present | PASS |
| SEO JSON-LD | present | PASS |

### AUDIT TOTAL PLATEFORME (26/04/2026) — Score initial 66/100

| # | Dimension | Avant | Apres | Problemes restants |
|---|-----------|:-----:|:-----:|---------------------|
| 1 | Backend Routes | 7 | **9** | Auth routes robustes, VAPI deactivee, catch fixes |
| 2 | Database | 7 | **7** | 3 orphelins, migration 0056 en attente |
| 3 | VoixIA Agent | 9 | **9** | Stable 2+ jours |
| 4 | Frontend | 5 | **7** | Build redeploy OK, prix corrects. 8 pages mockData restent |
| 5 | Canaux | 9 | **9** | 6/6 operationnels |
| 6 | Securite | 7 | **9** | VAPI deactivee, isolation OK, 0 secrets exposes |
| 7 | Performance | 5 | **7** | Queries optimisees, backups supprimes. Latence D1 ~2s (infra) |
| 8 | Onboarding | 7 | **8** | voixia_configs UPSERT, company_name, agent_name. localStorage #013 reste |
| 9 | Billing Stripe | 4 | **4** | Checkout toujours casse (3 Price IDs Stripe a configurer par Youssef) |
| 10 | SEO/Accessibilite | 5 | **8** | og:image, canonical, JSON-LD, sitemap. ARIA minimal reste |

**SCORE APRES CORRECTIONS : 79/100** (etait 66/100)

**PRET COMMERCIALISATION : PRESQUE — 2 bloqueurs restants**

**Bloqueurs restants :**
1. Configurer STRIPE_PRICE_ESSENTIEL, STRIPE_PRICE_PRO, STRIPE_PRICE_BUSINESS en secrets Workers (action Youssef)
2. Synchroniser billing_plans DB avec vrais prix (essentiel=7900, pro=19900) (action Youssef)

**Bugs restants non bloquants :**
- BUG #013 : localStorage onboarding_session_id (mineur, fonctionne mais viole convention)
- Latence D1 ~2s : limitation infrastructure Cloudflare (US East), resolvable avec D1 Smart Placement ou KV cache
- 8 pages dashboard mockData (CustomerDetail, ProspectDetail, etc.)
- ARIA minimal sur landing page
- og-image.png a creer et deployer dans public/ (1200x630px)

**Ameliorations futures :**
- Dual architecture billing a unifier
- Invoice PDF non implemente (501)
- Skip navigation accessibilite
- Appliquer migration 0056 (index perf) quand D1 API accessible

### AUDIT PARCOURS CLIENT COMPLET (25/04/2026)

| # | Etape | Status | Detail |
|---|-------|--------|--------|
| 1 | Configuration (resolve-phone) | PASS | 9/9 checks. Prompt Fati/ia_voix, voice_id cgSgspJ2msm6clMCkdW9, search_knowledge present |
| 2 | Base de connaissances | PASS | 4 docs OK, found=true tarifs, found=false meteo. Answer 500 chars backend, TTS 300 Python |
| 3 | Agenda et RDV | FAIL | BUG double-booking : agent_id=null (VoixIA) vs agent_coccinelle_001 (slots) empeche detection conflit |
| 4 | SMS | PASS | SMS envoye (SID SM2bcc...), send_sms tool OK, pas de phone hardcode |
| 5 | Email | PASS | From header correct, Resend configure. Display name inconsistant (mineur) |
| 6 | Orchestrateur omnicanal | PASS | 3 regles executees (SMS Twilio + prospect CRM). create_prospect exact match (mineur) |
| 7 | Log-call et dashboard | PASS | call_id=call_moefy..., prospect deduplique, interaction_count=16 |
| 8 | TTS et qualite vocale | PASS | 48+ remplacements, troncature 540→296 chars, VoixIA running 23h+ |

**Score : 7/8 etapes validees.**

**BUG #009 — Double-booking RDV — A CORRIGER**
- Fichier : `src/modules/voixia/routes.js` L145-156 et L290-295
- Cause : handleCreateAppointment stocke agent_id=null (aucun commercial_agents actif). handleCheckAvailability compare bookedTimes avec cle agent_id:HH:MM. null:09:00 != agent_coccinelle_001:09:00
- Impact : 2 prospects peuvent reserver le meme creneau
- Fix : ignorer agent_id dans la comparaison quand le RDV a agent_id=null

**Issues mineures detectees :**
- orchestrator.js L213 : create_prospect exact phone match au lieu de phoneVariants()
- channels/routes.js L915/981 : display name Email From inconsistant
- availability_slots : agent_name=null (commercial_agents sans nom)

### SPRINT 25/04/2026 — PRICING + AUDIT
1. **Pricing mis a jour** — Essentiel 79 euros, Pro 199 euros, Business sur mesure. 9 fichiers modifies (landing, CGV, mentions legales, billing, sidebar, dashboard, calculator, upgrade, backend)
2. **Audit 8 etapes** — 7/8 PASS, 1 BUG double-booking RDV

### SPRINT 24/04/2026 — 3 FIXES DEPLOYES
1. **Transcript temps reel** — main.py : event `conversation_item_added` capture Client/Assistant en temps reel, fallback `_extract_transcript`. 28 appels avec transcript en DB.
2. **undefined_ call IDs** — 0 restant. Fix : INSERT new row + UPDATE FKs (call_summaries) + DELETE old row.
3. **SEO** — `public/sitemap.xml` (3 URLs) + `public/robots.txt` (Disallow /dashboard/, /api/, /onboarding/).
4. **Route GET /api/v1/calls/transcripts** — Cree dans `src/modules/calls/routes.js`, retourne appels avec transcript non vide.
5. **Page transcripts reecrite** — Split panel (liste + detail), bulles de conversation Client/Assistant, responsive mobile.
6. **7 demo transcripts inseres** — call_demo_13 a call_demo_20 avec conversations realistes.

### CE QUI FONCTIONNE
- VoixIA active (running) sur Scaleway 51.15.130.204
- resolve-phone → Fati / Agentic Solutions / ia_voix (prompt silencieux KB)
- Tenant reconnu : tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy
- search_knowledge appele et retourne les bonnes infos
- KB : 4 documents Agentic Solutions en langage vocal pur
- POST /api/v1/voixia/knowledge accepte question ET query
- Recherche SQL word-split (LIKE par mot, pas phrase entiere)
- _nettoyer_pour_tts() : 48+ remplacements (HT/TTC/TVA ajoutes 12/04), 18/18 tests
- SMS rappel humain fonctionne
- Prospect cree en CRM
- Sidebar style Fonio deployee
- Orchestrateur omnicanal 5 scenarios deploye
- Email 6 routes operationnelles
- Onboarding source unique de verite
- Port 8081 zombie → ExecStartPre fuser -k dans systemd
- EnvironmentFile=/opt/voixia/.env dans voixia.service
- system_prompt Fati : OUTIL SILENCIEUX (plus de "je consulte")
- POST /api/v1/voixia/log-call → appels logges dans ai_interaction_logs
- Agent Python connecte a log-call via ctx.add_shutdown_callback (11/04)
- _extract_caller_phone : fallback participant.identity (sip_+33... → +33...) (12/04)
- _extract_transcript : session.chat_ctx prioritaire sur agent.chat_ctx (12/04)
- generateId('call') et generateId('cs') dans log-call (12/04)
- analytics/calls : reecrit avec /api/v1/calls/stats + /api/v1/calls (12/04)
- resolve-phone : 0 cache, lecture DB directe a chaque appel
- Communication proactive : 3 tables D1 + 5 routes API + dashboard
- Templates proactifs : 6 (garage x2, notaire x2, veterinaire, comptable)
- Page /dashboard/proactive deployee (4 sections)
- Sidebar : "Notifications proactives" sous COMMUNICATION
- Dashboard connecte aux vraies donnees (GET /calls/stats + /calls)
- Donnees demo Nubbo : 19 prospects, 26 appels, 10 RDV, 21 logs, 21 summaries (11/04)
- Dedup prospect phoneVariants : +33xxx ↔ 0xxx ↔ 0033xxx reconcilies (12/04)
- log-call lie prospect_id au call automatiquement (12/04)
- Page proactive : auth JWT (plus de cle API exposee cote navigateur) (12/04)

### BUGS RESTANTS (post-audit 26/04/2026)
- ~~BUG #010 : resolve-phone 2.2s latence (voix temps reel)~~ **OPTIMISE 26/04** — 3 queries sequentielles → 1 mega JOIN + audits fire-and-forget
- ~~BUG #011 : knowledge search 2.4s latence (voix temps reel)~~ **OPTIMISE 26/04** — 3 fallbacks sequentiels → Promise.allSettled parallele + audit fire-and-forget
- ~~BUG #012 : Meta description prix 49 EUR~~ **CORRIGE 26/04** — 79 dans layout.tsx
- BUG #013 : localStorage onboarding_session_id (mineur, convention)
- ~~BUG #014 : Auth POST 500 sur body vide~~ **CORRIGE 26/04** — try/catch request.json() 4 handlers
- ~~BUG #015 : 13 catch vides analytics/routes.js~~ **CORRIGE 26/04** — 21 blocs avec console.error
- ~~BUG #016 : Onboarding voixia_configs~~ **CORRIGE 26/04** — UPSERT INSERT...ON CONFLICT
- ~~BUG #017 : Onboarding company_name~~ **CORRIGE 26/04** — data.company_name || data.name
- ~~BUG #018 : Onboarding agent_name~~ **CORRIGE 26/04** — INSERT...ON CONFLICT omni_agent_configs
- BLOQUEUR : Checkout Stripe (3 Price IDs a configurer par Youssef)
- BLOQUEUR : Plans DB a synchroniser (essentiel=7900, pro=19900)
- ~~BLOQUEUR : Build frontend stale~~ **CORRIGE 26/04** — Redeploy f2d2d5ab prix 79/199
- ~~BLOQUEUR : VAPI routes sans auth~~ **CORRIGE 26/04** — VAPI+Retell demontes index.js

### BUGS RESOLUS 26/04/2026
**BUG #010 — resolve-phone latence 2.2s — OPTIMISE 26/04**
- Cause : 3 requetes SQL sequentielles (mapping + audit + config) + 2 audits bloquants dans auth + handler
- Fix 1 : Fusionne mapping + tenants + voixia_configs + ai_prompt_versions en 1 seul SELECT avec JOINs
- Fix 2 : Audit logs en fire-and-forget (logAudit().catch(() => {})) dans auth.js et handler
- Fix 3 : Migration 0056 — 4 index (phone_mappings composite, sector_templates, knowledge_docs composite, faq)
- Resultat : 2 DB reads sequentielles (auth SELECT + mega JOIN) au lieu de 5
- Migration 0056 : A EXECUTER quand D1 API disponible

**BUG #011 — knowledge search latence 2.4s — OPTIMISE 26/04**
- Cause : 3 fallbacks sequentiels (chunks → documents → FAQ) + audit bloquant + embedding sequentiel
- Fix 1 : _searchKnowledgeText() lance les 3 requetes en parallele via Promise.allSettled
- Fix 2 : Recherche textuelle lancee en parallele de la recherche vectorielle (pas apres)
- Fix 3 : Audit log en fire-and-forget
- Fix 4 : GET /tools/knowledge reutilise _searchKnowledgeText (code DRY + meme optimisation)
- Resultat : 1 round-trip DB (3 queries paralleles) au lieu de 3 round-trips sequentiels

### BUGS RESOLUS 25/04/2026
**BUG #006 — Aucune indication d'abonnement dans l'UI — CORRIGE 25/04**
- Cause : frontend ne lisait pas /billing/subscription, pas de badge sidebar ni banniere dashboard
- Fix 1 : DashboardSidebar.tsx — badge abonnement entre "Nouvel appel" et nav (plan + jours trial + pastille vert/jaune/rouge)
- Fix 2 : dashboard/page.tsx — banniere contextuelle (trial countdown, trial expire, past_due/canceled, actif)
- Fix 3 : badge sidebar lien vers /dashboard/billing

**BUG #007 — Double checkout possible — CORRIGE 25/04**
- Cause : create-checkout-session ne verifiait pas si un abo actif existait deja
- Fix : guard dans billing/routes.js — si sub.status=active + stripe_subscription_id → redirect Customer Portal (ou 409)
- Frontend billing/page.tsx gere le 409

**BUG #008 — 3D Secure SMS bloquant — CORRIGE 25/04**
- Cause : checkout session sans payment_method_types explicite, 3DS demande systematiquement
- Fix : ajout payment_method_types[0]=card + payment_method_options[card][request_three_d_secure]=automatic
- Resultat : 3DS uniquement quand requis par l'emetteur (carte test 4242 = pas de 3DS)

### BUGS RESOLUS 12/04/2026
**log-call HTTP 400 — caller=None transcript=0 — CORRIGE 12/04**
- Cause 1 : _extract_caller_phone() ne lisait pas participant.identity (sip_+33760762153)
- Cause 2 : _extract_transcript() lisait agent.chat_ctx (vide apres disconnect) au lieu de session.chat_ctx
- Cause 3 : generateId() sans prefix → call_id = "undefined_xxx"
- Fix 1 : ajout fallback identity[4:] dans _extract_caller_phone (priorite 3)
- Fix 2 : _extract_transcript(agent, session) essaie session.chat_ctx en priorite
- Fix 3 : generateId('call') et generateId('cs') dans voixia/routes.js
- Teste : curl POST log-call → HTTP 200, call_id = "call_mnv1apum85yjzqfsuus"

**Page analytics/calls vide — CORRIGE 12/04**
- Cause : page lisait /api/v1/analytics/sara qui requete omni_conversations (table vide)
- Fix : reecrit avec /api/v1/calls/stats (KPIs) + /api/v1/calls (liste avec from_number, duration, prospect_name)

**"HT" lu comme "HT" au lieu de "hors taxes" — CORRIGE 12/04**
- Cause : _nettoyer_pour_tts() n'avait pas de remplacement pour HT, TTC, TVA
- Fix : ajout re.sub(r'\bHT\b', 'hors taxes'), \bTTC\b, \bTVA\b dans knowledge.py section 6b
- \b evite de toucher HTTP/HTTPS

**"devis personnalise" invente par le LLM — CORRIGE 12/04**
- Cause : KB doc_demo_agentic_002 contenait "Le Pack Enterprise est sur devis"
- Fix 1 : KB reecrite "Le Pack Enterprise est sur mesure. Contactez-nous pour une offre adaptee"
- Fix 2 : system_prompt id=21 amende avec section MOTS INTERDITS (devis, HT, TTC, sur devis)
- Index cree : idx_knowledge_tenant(tenant_id, source_type) sur knowledge_documents

**Dedup phone +33 vs 0 — prospect invisible — CORRIGE 12/04**
- Cause 1 : findOrCreateProspect faisait `WHERE phone = ?` (match exact) → +33760762153 ne trouvait pas 0760762153
- Cause 2 : log-call ignorait le resultat de findOrCreateProspect → calls.prospect_id restait null
- Cause 3 : 2 prospects dupliques pour le meme numero (+33760762153 et 0760762153)
- Fix 1 : phoneVariants() dans dedup.js genere toutes variantes FR (+33xxx, 0xxx, 0033xxx), recherche IN (...)
- Fix 2 : log-call capture { prospect } et UPDATE calls SET prospect_id = prospect.id
- Fix 3 : DB nettoyee — doublon supprime, 4 appels lies au prospect unique
- Teste : prospect_1773865673637_0j093clup, phone +33760762153, interaction_count: 9

**Page proactive "Header X-VoixIA-Tenant manquant" — CORRIGE 12/04**
- Cause : frontend sendTest() envoyait X-VoixIA-Key + X-VoixIA-Tenant: localStorage.getItem('tenant_id') → null (pas en localStorage depuis refonte onboarding)
- requireVoixIAAuth voyait X-VoixIA-Key → prenait methode 1 (API key) → echouait sur tenant vide → n'atteignait jamais methode 2 (JWT)
- Fix : frontend utilise authHeaders() (JWT Bearer) → requireVoixIAAuth prend methode 2 → extrait tenant_id du JWT
- Plus de cle API exposee cote navigateur (securite)
- Auth VoixIA machine-to-machine toujours fonctionnelle (teste curl OK)

### BUGS RESOLUS 07/04/2026
**system_prompt "je vais consulter" — CORRIGE 07/04**
- Cause : system_prompt id=21 etait "Julien/generaliste" sans instruction silencieuse
- Fix : reecrit en "Fati/ia_voix" avec section "OUTIL SILENCIEUX — REGLE ABSOLUE" + INTERDIT de dire je consulte/je recherche/un instant/je verifie
- Verifie via resolve-phone : retourne bien le nouveau prompt

**Appels non logges — CORRIGE 07/04**
- Cause : dashboard/page.tsx utilisait des donnees mock hardcodees, 0 API call
- Cause : aucun endpoint log-call pour l'agent Python VoixIA
- Fix 1 : cree POST /api/v1/voixia/log-call (insere dans calls + ai_interaction_logs + call_summaries + dedup prospect)
- Fix 2 : reecrit dashboard/page.tsx pour lire GET /api/v1/calls/stats + GET /api/v1/calls?limit=5
- Agent Python doit appeler POST /voixia/log-call a la fin de chaque session

**resolve-phone avec cache — CORRIGE 07/04**
- Diagnostic : resolve-phone n'a AUCUN cache, lit la DB a chaque appel
- Verifie : changement voice_id/llm_model/system_prompt immediatement visible via resolve-phone
- Supprime, lecture DB directe

### BUGS RESOLUS 04-05/04/2026
**Prefixe vocal "Reponse trouvee" — CORRIGE 04/04**
- `tools/knowledge.py` retournait `f"Reponse trouvee : {answer}"` → agent lisait le prefixe a voix haute
- Fix : retourne directement le contenu via `_nettoyer_pour_tts(answer)`

**Format TTS trop long — CORRIGE 04/04**
- Answer 389 chars, mal formate pour synthese vocale
- Fix : `_nettoyer_pour_tts()` tronque a 300 chars, coupe a la derniere phrase complete, supprime markdown, remplace symboles

**KB found=False appel — CORRIGE 05/04**
- Recherche KB LIKE '%phrase entiere%' ne matchait pas les phrases naturelles du LLM
- Fix : split question en mots significatifs + recherche OR sur chaque mot (3 niveaux : chunks, documents, FAQ)

**KB documents reecrits en langage vocal pur — FAIT 05/04**
- 4 documents Agentic Solutions reecrits : phrases courtes max 15 mots, pas de symboles, pas d'abreviations

### ACTIONS PRIORITAIRES AVANT NUBBO 20 AVRIL
1. ~~Connecter agent Python → POST /voixia/log-call~~ **FAIT 11/04** — shutdown callback dans main.py
2. Appels vocaux sortants Phase 2 (LiveKit SIP outbound)
3. ~~Donnees demo realistes~~ **FAIT 11/04** — 15 prospects + 25 appels + 8 RDV + 20 logs + 20 summaries
4. ~~Script demo 15 min~~ **FAIT 12/04** — DEMO_NUBBO_20AVRIL.md (6 sections + slides + plans B + Q&A)
5. ~~Test vocal E2E + fix bugs~~ **FAIT 12/04** — 7 bugs corriges (caller extraction, transcript, generateId, analytics page, HT/TTC, devis, index KB)

### REGLES TTS ABSOLUES (ajoutees 06/04/2026)
- `_nettoyer_pour_tts()` dans `/opt/voixia/agent/tools/knowledge.py`
- 45+ remplacements en 11 categories (temporel, monetaire, pourcent, connecteurs, abreviations, sigles, ordinaux, ponctuation, markdown, espaces, troncature)
- Tests unitaires : 15/15
- KB documents ecrits en langage vocal pur (pas de symboles)
- LLM NE DIT JAMAIS de prefixe technique
- Recherche SQL : word-split par mot (pas phrase entiere)

### SOURCE UNIQUE DE VERITE (verifie 07/04/2026)
- `tenants.name` = "Agentic solutions"
- `tenants.sector` = "ia_voix"
- `voixia_configs.secteur` = "ia_voix"
- `ai_prompt_versions` id=21, secteur=ia_voix, is_active=1
- Prompt actif : "Tu es Fati, assistante vocale IA d Agentic Solutions..." + section OUTIL SILENCIEUX
- KB : 4 documents Agentic Solutions (source_type=text, langage vocal pur)
- KB : 0 documents Nestenn (supprimes 02/04)

### FICHIERS CRITIQUES PYTHON VOIXIA (serveur 51.15.130.204)
| Fichier | Role | Etat |
|---------|------|------|
| `/opt/voixia/agent/tools/knowledge.py` | Tool search_knowledge + _nettoyer_pour_tts | OK — word-split, TTS 300 chars, 15/15 tests |
| `/opt/voixia/agent/pipeline.py` | Agent LLM + 8 @function_tool | OK — tools passes a AgentSession |
| `/opt/voixia/agent/main.py` | Entrypoint + greeting + session | OK |
| `/opt/voixia/agent/tenant.py` | resolve-phone client | OK |
| `/opt/voixia/agent/llm_factory.py` | Factory LLM (lk_openai.LLM) | OK — Claude + Mistral |
| `/opt/voixia/agent/config.py` | Config providers | OK — mistral + claude |
| `/opt/voixia/agent/prompts.py` | Greetings + prompts fallback | OK |
| `/opt/voixia/agent/tools/transfer.py` | Transfer humain + callback | OK |
| `/opt/voixia/.env` | Variables d'env | OK (EnvironmentFile dans systemd) |

### COMMANDES ESSENTIELLES (mise a jour 06/04/2026)
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

### COMMANDES DIAGNOSTIC BUGS (ajoutees 06/04/2026)
```bash
# Bug 1 — Voir system_prompt actif
wrangler d1 execute coccinelle-db --remote --command "
SELECT SUBSTR(system_prompt, 1, 500) as prompt
FROM ai_prompt_versions
WHERE tenant_id = 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy'
AND is_active = 1;"

# Bug 2 — Verifier logs appels
wrangler d1 execute coccinelle-db --remote --command "
SELECT COUNT(*) as total FROM ai_interaction_logs
WHERE tenant_id = 'tenant_eW91c3NlZi5hbXJvdWNoZUBvdXRsb29rLmZy';"
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

- Frontend : https://coccinelle.ai (custom domain, also accessible via https://coccinelle-saas.pages.dev)
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
