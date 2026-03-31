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
    │   └── dashboard/              # 24 pages dashboard
    │       ├── page.tsx            # Home + KPIs
    │       ├── analytics/          # 80% → à compléter
    │       ├── appointments/       # ✅ OK
    │       ├── appels/             # ✅ OK
    │       ├── products/           # ✅ OK
    │       ├── prospects/          # 70% → à compléter
    │       ├── crm/                # ✅ OK
    │       ├── customers/          # ✅ OK
    │       ├── conversations/      # ✅ OK
    │       ├── inbox/              # ✅ OK
    │       ├── knowledge/          # ✅ OK
    │       ├── channels/           # ✅ OK
    │       │   ├── email/          # Config email (5 onglets)
    │       │   ├── sms/
    │       │   ├── whatsapp/
    │       │   └── phone/
    │       ├── configuration/      # ✅ OK
    │       ├── billing/            # 70% → à compléter
    │       ├── settings/           # 30% → à compléter
    │       ├── teams/              # ✅ OK
    │       ├── sara/               # ✅ OK
    │       ├── sara-analytics/     # ✅ OK
    │       └── integrations/       # ✅ OK
    └── components/
```

## BUGS CONNUS À CORRIGER

| Bug | Détail | Priorité |
|-----|--------|----------|
| Retell téléphone | Agent vocal Sara ne fonctionne pas | 🔴 Haute |
| Outlook OAuth | Secrets Azure non configurés | 🟡 Moyenne |
| Yahoo OAuth | Client ID incorrect | 🟡 Moyenne |
| Gmail OAuth | Bug #2 corrigé V34, test inbox jamais fait | 🟡 Moyenne |

## FEATURES INCOMPLÈTES

| Page | Actuel | Cible | Ce qui manque |
|------|--------|-------|---------------|
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
| 📞 Téléphone | ⚠️ Bug Retell | ✅ Webhook | 🔴 90% |
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

## COMMANDES DE DÉPLOIEMENT (NE PAS EXÉCUTER SANS OK)

```bash
# Backend
npx wrangler deploy

# Frontend
cd coccinelle-saas
npm run pages:build && npx wrangler pages deploy .vercel/output/static --project-name=coccinelle-saas

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
