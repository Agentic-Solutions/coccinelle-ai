# MANIFESTE COCCINELLE.AI v1.13.0 - COMPLET

**Version** : 1.13.0  
**Dernière mise à jour** : 9 octobre 2025  
**Statut** : 🔄 EN DÉVELOPPEMENT - Knowledge Base v2.0 (Phase 1 terminée)

---

## 📋 TABLE DES MATIÈRES

1. [Contexte du Projet](#contexte)
2. [Architecture Globale](#architecture)
3. [Ce qui Fonctionne](#deploye)
4. [Nouveautés v1.13.0](#nouveautes)
5. [Base de Données (20 Tables)](#database)
6. [Endpoints API](#endpoints)
7. [Configuration Vapi](#vapi-config)
8. [Knowledge Base v2.0](#knowledge-base)
9. [Configuration Technique](#configuration)
10. [Changelog](#changelog)
11. [Roadmap](#roadmap)
12. [Pour Continuer](#nouveau-chat)

---

## 🎯 CONTEXTE DU PROJET {#contexte}

**Coccinelle.ai** : Plateforme SaaS multi-tenant avec RAG System pour gestion d'appels téléphoniques et de rendez-vous avec agents vocaux IA.

### Objectif
Permettre à des organisations (salons de coiffure, cabinets médicaux, agences immobilières, etc.) de gérer automatiquement leurs prises de rendez-vous via des assistants vocaux intelligents avec base de connaissance personnalisée.

### Architecture Globale {#architecture}
```
Dashboard Next.js (localhost:3001)
         ↓
API Cloudflare Workers (coccinelle-api.youssef-amrouche.workers.dev)
         ↓
D1 Database (20 tables) ← Nouveau : +8 tables KB
         ↓
Cloudflare Vectorize (Embeddings)
         ↓
OpenAI Embeddings API
         ↓
Vapi.ai Assistant (Sara +33939035761)
         ↓
Twilio SMS + Resend Email
```

---

## ✅ CE QUI FONCTIONNE (v1.13.0) {#deploye}

### 1. API REST Production
- **URL** : `https://coccinelle-api.youssef-amrouche.workers.dev`
- **Version Backend** : 1.13.0
- **Lignes de code** : 1389 lignes
- **API Key Test** : `sk_test_demo123456789`
- **État** : ✅ Opérationnel

### 2. Base de Données D1
- **Database ID** : `f4d7ff42-fc12-4c16-9c19-ada63c023827`
- **Tables** : 20 tables (12 initiales + 8 KB v2.0)
- **Données** : 
  - 35 appels test
  - 20 créneaux agents
  - 5 services test (salon de coiffure)
  - 3 FAQ test
  - 2 snippets test

### 3. Assistant Vocal Sara v2.0 (Vapi.ai)
- **Type** : Assistant (pas Workflow)
- **Assistant ID** : `40ccfe18-e4c7-4e5b-99d5-2f2654001335`
- **Numéro** : `+33939035761` (nouveau numéro Vapi gratuit)
- **Model** : GPT-4o-mini
- **Voice** : Cartesia Sonic Multilingual (français optimisé)
- **Transcriber** : Deepgram Nova 2 (français)
- **Custom Tools** : 3 tools
  - `checkAvailability` (4d61c432-d44f-4049-8a62-6f9695a2f1ac)
  - `createAppointment` (f0311622-be86-464d-802f-a672275de80b)
  - `searchKnowledge` (17205310-6108-4833-82b7-76e00944d713)
- **État** : ✅ Opérationnel (mais latence élevée à optimiser)
- **Prompt** : v2.0 optimisé pour prononciation

### 4. Dashboard Analytics
- **URL Local** : `http://localhost:3001`
- **Version** : 1.9.0
- **Stack** : Next.js 15 + TypeScript + Tailwind + Recharts + XLSX
- **Fonctionnalités** :
  - Dashboard avec 3 graphiques
  - Liste appels avec pagination (20/page)
  - Page détail appel avec transcription
  - Export Excel opérationnel

### 5. Notifications
- **SMS (Twilio)** : ✅ Opérationnel (+33939035761)
- **Email (Resend)** : ✅ Opérationnel
- **Fuseau horaire** : Europe/Paris (correct)

### 6. GitHub
- **Repository** : https://github.com/Agentic-Solutions/coccinelle-ai
- **Visibilité** : Private
- **Dernière sauvegarde** : v1.13.0 (à faire)

---

## 🆕 NOUVEAUTÉS v1.13.0 {#nouveautes}

### Knowledge Base v2.0 - Phase 1 TERMINÉE ✅

#### Nouvelles Tables Créées (8 tables)
1. **services** - Catalogue des prestations
2. **agent_services** - Compétences des agents
3. **knowledge_documents** - Documents crawlés
4. **knowledge_chunks** - Chunks pour RAG
5. **crawl_jobs** - Suivi des crawls web
6. **knowledge_faq** - FAQ structurée
7. **knowledge_snippets** - Fragments réutilisables
8. **knowledge_search_logs** - Analytics recherche

#### Scripts Créés
- **Schema SQL** : `database/schema-knowledge-v2-fixed.sql`
- **Seed Data** : `database/seed-knowledge-v2-fixed.sql`
- **Scripts Python** :
  - `create_assistant_vapi.py` - Création assistant Sara v2.0
  - `update_assistant_vapi.py` - Mise à jour paramètres assistant
  - `create_workflow_vapi.py` - Tentative workflow (abandonné)

#### Environnement Python
- **venv** : Environnement virtuel créé
- **Dépendances** : `requests`, `python-dotenv`
- **Fichier .env** : Créé avec clés API (gitignored)

#### Données de Test Insérées
**Services (Salon de coiffure)** :
- Coupe Homme : 30 min, 25€
- Coupe Femme : 60 min, 45€
- Coloration Complète : 120 min, 85€
- Mèches : 150 min, 95€
- Brushing : 30 min, 20€

**FAQ** :
- "Utilisez-vous des produits bio ?" → Oui, produits professionnels bio
- "Quelle est votre politique d'annulation ?" → 24h avant sans frais
- "Combien de temps dure une coloration ?" → 2 heures

**Snippets** :
- greeting_standard : "Bonjour et bienvenue chez Salon Marie !"
- horaires_ouverture : "Nous sommes ouverts du lundi au samedi de 9h à 19h."

---

## 🗄️ BASE DE DONNÉES (20 TABLES) {#database}

### Tables Initiales (12 tables)
1. **tenants** - Clients multi-tenant
2. **agents** - Intervenants/Agents
3. **agent_availability** - Disponibilités agents
4. **prospects** - Prospects/Leads
5. **appointments** - Rendez-vous
6. **vapi_call_logs** - Logs appels Vapi
7. **transcriptions** - Transcriptions appels
8. **sms_logs** - Logs SMS
9. **email_logs** - Logs emails
10. **api_keys** - Clés API
11. **api_usage** - Usage API
12. **audit_logs** - Logs d'audit

### Nouvelles Tables KB v2.0 (8 tables)
13. **services** - Prestations/Services
14. **agent_services** - Relation Many-to-Many agents ↔ services
15. **knowledge_documents** - Documents sources (web, PDF)
16. **knowledge_chunks** - Chunks texte pour RAG (512 tokens)
17. **crawl_jobs** - Jobs de crawling web
18. **knowledge_faq** - FAQ structurée
19. **knowledge_snippets** - Fragments texte réutilisables
20. **knowledge_search_logs** - Analytics recherches KB

### Schéma Détaillé Tables KB

#### Table `services`
```sql
CREATE TABLE services (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,              -- "Coupe homme", "Coloration"
  description TEXT,
  duration_minutes INTEGER NOT NULL, -- 15, 60, 90
  price REAL,
  currency TEXT DEFAULT 'EUR',
  category TEXT,                    -- "coiffure", "coloration"
  preparation_time INTEGER DEFAULT 0, -- Temps préparation (min)
  cleanup_time INTEGER DEFAULT 5,   -- Temps nettoyage (min)
  max_advance_booking_days INTEGER DEFAULT 90,
  min_advance_booking_hours INTEGER DEFAULT 2,
  is_active INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  metadata TEXT,                    -- JSON
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

#### Table `knowledge_documents`
```sql
CREATE TABLE knowledge_documents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source_type TEXT NOT NULL,       -- 'webpage', 'pdf', 'manual'
  source_url TEXT,                 -- URL crawlée
  title TEXT NOT NULL,
  content TEXT,                    -- Texte brut extrait
  content_hash TEXT,               -- Pour déduplication
  word_count INTEGER DEFAULT 0,
  chunk_count INTEGER DEFAULT 0,
  metadata TEXT,                   -- JSON {url, title, h1, h2}
  status TEXT DEFAULT 'pending',   -- 'pending', 'completed', 'failed'
  error_message TEXT,
  crawled_at DATETIME,
  indexed_at DATETIME,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

#### Table `knowledge_chunks`
```sql
CREATE TABLE knowledge_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,    -- Position dans document
  content TEXT NOT NULL,           -- Chunk texte (512 tokens)
  token_count INTEGER DEFAULT 0,
  vector_id TEXT,                  -- ID dans Vectorize
  embedding_model TEXT DEFAULT 'text-embedding-3-small',
  metadata TEXT,                   -- JSON {section, heading}
  created_at DATETIME,
  FOREIGN KEY (document_id) REFERENCES knowledge_documents(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(document_id, chunk_index)
);
```

---

## 🔌 ENDPOINTS API {#endpoints}

### Endpoints Existants (v1.12.8)
- `GET /` - Health check
- `POST /webhooks/vapi/function-call` - Webhook Vapi
- `GET /api/v1/appointments` - Liste RDV
- `POST /api/v1/appointments` - Créer RDV
- `GET /api/v1/prospects` - Liste prospects
- `GET /api/v1/calls` - Liste appels
- `GET /api/v1/calls/:id` - Détail appel

### Nouveaux Endpoints KB v2.0 (À DÉVELOPPER)

#### Services
- `GET /api/v1/services` - Liste services
- `POST /api/v1/services` - Créer service
- `GET /api/v1/services/:id` - Détail service
- `PATCH /api/v1/services/:id` - Modifier service
- `DELETE /api/v1/services/:id` - Supprimer service

#### Agent Services
- `GET /api/v1/agents/:id/services` - Services d'un agent
- `POST /api/v1/agents/:id/services` - Assigner service à agent
- `DELETE /api/v1/agents/:id/services/:serviceId` - Retirer service

#### Knowledge Base
- `POST /api/v1/knowledge/crawl` - Démarrer crawl site web
- `GET /api/v1/knowledge/crawl/:jobId` - Status crawl
- `GET /api/v1/knowledge/documents` - Liste documents
- `POST /api/v1/knowledge/documents` - Upload document manuel
- `GET /api/v1/knowledge/faq` - Liste FAQ
- `POST /api/v1/knowledge/faq` - Créer FAQ
- `POST /api/v1/knowledge/search` - Rechercher dans KB (RAG)

#### Disponibilités Intelligentes
- `GET /api/v1/availability/by-service?serviceId=xxx&date=2025-10-09`
  - Retourne : agents compétents + créneaux adaptés à la durée du service

---

## 🤖 CONFIGURATION VAPI {#vapi-config}

### Assistant Sara v2.0

#### Informations
- **Type** : Assistant (API-based, pas Workflow)
- **ID** : `40ccfe18-e4c7-4e5b-99d5-2f2654001335`
- **Dashboard** : https://dashboard.vapi.ai/assistants/40ccfe18-e4c7-4e5b-99d5-2f2654001335
- **Numéro** : `+33939035761` (Vapi free number)

#### Configuration Technique
```json
{
  "name": "Sara RDV v2.0 - Assistant",
  "firstMessage": "Bonjour ! Je suis Sara, votre assistante. Je vais vous aider à prendre un rendez-vous. Laissez-moi vérifier mes disponibilités.",
  "transcriber": {
    "provider": "deepgram",
    "model": "nova-2",
    "language": "fr"
  },
  "model": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "maxTokens": 200,
    "tools": [...]
  },
  "voice": {
    "provider": "cartesia",
    "voiceId": "a167e0f3-df7e-4d52-a9c3-f949145efdab",
    "model": "sonic-multilingual"
  },
  "silenceTimeoutSeconds": 10.0,
  "responseDelaySeconds": 0.5,
  "maxDurationSeconds": 600
}
```

#### Prompt Système v2.0
```
Tu es Sara, une assistante virtuelle professionnelle et réactive.

## RÈGLES CRITIQUES
- Réponds RAPIDEMENT, en 1-2 phrases courtes maximum
- Une seule action à la fois

## FLOW
1. ACCUEIL: "Bonjour, je suis Sara. Un instant."
   → Appelle checkAvailability avec date du jour

2. PROPOSITION: "J'ai 9 heures, 10 heures, 14 heures. Lequel ?"
   → Attends réponse

3. COLLECTE: "Prénom ?", "Nom ?", "Téléphone chiffre par chiffre ?", "Email avec AROBASE et POINT ?"

4. CONFIRMATION: Appelle createAppointment
   "RDV confirmé. SMS envoyé. Au revoir !"

## PRONONCIATION
- "9 heures" jamais "9h"
- "AROBASE" pas "at", "POINT" pas "dot"

Phrases ultra-courtes. Pas de répétition.
```

#### Tools Configurés

**1. checkAvailability**
- **Function ID** : `4d61c432-d44f-4049-8a62-6f9695a2f1ac`
- **Description** : Vérifie créneaux disponibles pour une date
- **Paramètres** : `date` (YYYY-MM-DD)
- **Server URL** : https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/vapi/function-call

**2. createAppointment**
- **Function ID** : `f0311622-be86-464d-802f-a672275de80b`
- **Description** : Crée un rendez-vous
- **Paramètres** : `firstName`, `lastName`, `phone`, `email`, `datetime`
- **Server URL** : https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/vapi/function-call

**3. searchKnowledge**
- **Function ID** : `17205310-6108-4833-82b7-76e00944d713`
- **Description** : Recherche dans base de connaissance (RAG)
- **Paramètres** : `query`, `category` (optionnel)
- **Server URL** : https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/vapi/function-call
- **État** : ⚠️ Pas encore implémenté (Phase 2)

### Tests Assistant Sara v2.0

#### Test #1 (9 oct 2025, 9h40)
**Résultat** : ⚠️ Problèmes identifiés
- ✅ Sara répond et se présente
- ✅ checkAvailability fonctionne
- ✅ Prononciation "9 heures" correcte (pas "9h")
- ❌ Latence 40 secondes avant appel tool
- ❌ checkAvailability appelé 2 fois
- ❌ Call ended due to silence après réponse user

**Actions correctives** :
- Script `update_assistant_vapi.py` créé (paramètres optimisés)
- ⏳ À exécuter pour valider corrections

---

## 📚 KNOWLEDGE BASE v2.0 - DÉTAILS {#knowledge-base}

### Architecture RAG Complète

```
┌─────────────────────────────────────┐
│     CLIENT ONBOARDING               │
│  "Mon site : salon-marie.fr"        │
└───────────────┬─────────────────────┘
                │
                ↓
┌─────────────────────────────────────┐
│     WEB CRAWLER                     │
│  - Crawl toutes pages               │
│  - Extract texte propre             │
│  - Détecter structure               │
└───────────────┬─────────────────────┘
                │
                ↓
┌─────────────────────────────────────┐
│  TEXT PROCESSING                    │
│  - Clean HTML                       │
│  - Split chunks (512 tokens)       │
│  - Déduplication                    │
└───────────────┬─────────────────────┘
                │
                ↓
┌─────────────────────────────────────┐
│  EMBEDDINGS GENERATION              │
│  OpenAI text-embedding-3-small      │
│  - 1536 dimensions                  │
│  - $0.02 / 1M tokens                │
└───────────────┬─────────────────────┘
                │
                ↓
┌─────────────────────────────────────┐
│  VECTOR DATABASE                    │
│  Cloudflare Vectorize               │
│  - Index HNSW                       │
│  - Namespace par tenant             │
└───────────────┬─────────────────────┘
                │
                ↓
┌─────────────────────────────────────┐
│  VAPI ASSISTANT + RAG               │
│  Question → searchKnowledge tool    │
│           → Vector search           │
│           → Contexte pertinent      │
│           → Réponse GPT             │
└─────────────────────────────────────┘
```

### État d'Avancement KB v2.0

#### ✅ PHASE 1 : Database & Schema (TERMINÉE)
- [x] Tables créées (services, agent_services, knowledge_documents, knowledge_chunks, crawl_jobs, knowledge_faq, knowledge_snippets, knowledge_search_logs)
- [x] Schéma SQL appliqué (local + production)
- [x] Seed data créé (services salon, FAQ, snippets)
- [x] Données test insérées

#### ⏳ PHASE 2 : Web Crawler (2h - À FAIRE)
- [ ] Endpoint POST /api/v1/knowledge/crawl
- [ ] HTMLRewriter pour parsing
- [ ] Queue system pour crawl asynchrone
- [ ] Rate limiting & politesse
- [ ] Filtres include/exclude patterns

#### ⏳ PHASE 3 : Text Processing (1h - À FAIRE)
- [ ] Chunking intelligent (overlap)
- [ ] Déduplication (hash)
- [ ] Token counting
- [ ] Metadata extraction

#### ⏳ PHASE 4 : Embeddings & Vectorize (1h30 - À FAIRE)
- [ ] Config Cloudflare Vectorize
- [ ] OpenAI embeddings integration
- [ ] Batch processing
- [ ] Error handling

#### ⏳ PHASE 5 : Search & RAG (1h - À FAIRE)
- [ ] Implémentation searchKnowledge tool
- [ ] Vector search
- [ ] Reranking
- [ ] Context formatting

#### ⏳ PHASE 6 : Dashboard Admin (2h - À FAIRE)
- [ ] Interface crawl site web
- [ ] Visualisation documents
- [ ] Gestion KB (delete, recrawl)
- [ ] Statistiques

### Estimation Totale : 8 heures restantes

---

## ⚙️ CONFIGURATION TECHNIQUE {#configuration}

### Cloudflare Workers
```toml
# wrangler.toml
name = "coccinelle-api"
main = "src/index.js"
compatibility_date = "2024-01-01"

[[d1_databases]]
binding = "DB"
database_name = "coccinelle-db"
database_id = "f4d7ff42-fc12-4c16-9c19-ada63c023827"

[[vectorize]]
binding = "VECTORIZE"
index_name = "coccinelle-knowledge"

[vars]
ENVIRONMENT = "production"
```

### Variables d'Environnement
```bash
# .env (gitignored)
VAPI_API_KEY=a19a84fe-09c9-42ce-9263-04d35a37a2b5
VAPI_TOOL_CHECK_AVAILABILITY=4d61c432-d44f-4049-8a62-6f9695a2f1ac
VAPI_TOOL_CREATE_APPOINTMENT=f0311622-be86-464d-802f-a672275de80b
VAPI_TOOL_SEARCH_KNOWLEDGE=17205310-6108-4833-82b7-76e00944d713
OPENAI_API_KEY=[À CONFIGURER]
```

### Python Environment
```bash
cd ~/match-immo-mcp/coccinelle-ai
python3 -m venv venv
source venv/bin/activate
pip install requests python-dotenv
```

### Scripts Python Disponibles
- `create_assistant_vapi.py` - Création assistant Vapi
- `update_assistant_vapi.py` - Mise à jour assistant
- `create_workflow_vapi.py` - Création workflow (obsolète)

---

## 📈 CHANGELOG {#changelog}

### v1.13.0 (9 octobre 2025)
**Knowledge Base v2.0 - Phase 1 TERMINÉE**
- Ajout 8 nouvelles tables KB (services, agent_services, knowledge_documents, knowledge_chunks, crawl_jobs, knowledge_faq, knowledge_snippets, knowledge_search_logs)
- Création schéma SQL `schema-knowledge-v2-fixed.sql`
- Création seed data `seed-knowledge-v2-fixed.sql`
- Insertion données test (services salon, FAQ, snippets)
- Assistant Vapi Sara v2.0 créé (ID: 40ccfe18-e4c7-4e5b-99d5-2f2654001335)
- Nouveau numéro Vapi : +33939035761
- Environnement Python (venv) configuré
- Scripts Python créés (create_assistant, update_assistant)
- Prompt Sara v2.0 optimisé pour prononciation
- Tests Sara : prononciation OK, latence à optimiser
- Base passe de 12 à 20 tables

### v1.12.8 (8 octobre 2025)
**Bug Fixes & Optimisations**
- Fix bug createAppointment (table prospects)
- Workflow Vapi créé (mais tools non connectés)
- Prononciation Sara catastrophique identifiée
- 20 créneaux configurés en base
- Tests partiels effectués

### v1.12.5 (7 octobre 2025)
**Optimisation Coûts Vapi**
- Model changé : GPT 4o Mini Cluster (390ms)
- Transcriber : Deepgram Nova 2 Phonecall
- Économie : ~70% sur coûts appels
- Coût par appel : $0.24-0.30

### v1.12.2 (6 octobre 2025)
**Logging Vapi Résolu**
- Fix structure webhook Vapi
- Logging opérationnel
- SMS/Email confirmations OK

### v1.9.0 (5 octobre 2025)
**Dashboard Analytics Complet**
- Pagination 20 appels/page
- Page détail appel
- Export Excel
- 3 graphiques stats

---

## 🎯 ROADMAP {#roadmap}

### PRIORITÉS IMMÉDIATES (Semaine 1)

#### 1. Optimiser Assistant Sara v2.0 (2h) 🔴 URGENT
- [ ] Exécuter `update_assistant_vapi.py` (latence réduite)
- [ ] Tester avec appel réel
- [ ] Valider corrections latence
- [ ] Documenter résultats

#### 2. PHASE 2 : Web Crawler (2h) 🔴 PRIORITAIRE
- [ ] Développer endpoint POST /api/v1/knowledge/crawl
- [ ] Implémenter HTMLRewriter (parsing HTML)
- [ ] Queue system pour crawl asynchrone
- [ ] Rate limiting (500ms entre pages)
- [ ] Filtres include/exclude patterns
- [ ] Tester sur site exemple

#### 3. PHASE 3 : Text Processing (1h)
- [ ] Chunking intelligent (512 tokens, overlap 50)
- [ ] Déduplication par hash
- [ ] Token counting
- [ ] Metadata extraction (title, h1, h2)

#### 4. PHASE 4 : Embeddings & Vectorize (1h30)
- [ ] Configurer Cloudflare Vectorize
- [ ] Intégration OpenAI embeddings
- [ ] Batch processing
- [ ] Error handling

#### 5. PHASE 5 : Search & RAG (1h)
- [ ] Implémenter searchKnowledge tool
- [ ] Vector search (Vectorize)
- [ ] Reranking (score > 0.7)
- [ ] Context formatting pour GPT

### MOYEN TERME (Semaine 2-3)

#### 6. PHASE 6 : Dashboard Admin KB (2h)
- [ ] Interface upload documents
- [ ] Interface crawl site web
- [ ] Visualisation documents/chunks
- [ ] Gestion FAQ manuelle
- [ ] Statistiques KB

#### 7. Multi-agents & Services (3h)
- [ ] Système de routing intelligent
- [ ] Disponibilités par service
- [ ] Agents multiples (Sara, Paul, Marie)
- [ ] Templates métier (coiffeur, médecin)

#### 8. Onboarding Client (2h)
- [ ] Wizard d'onboarding
- [ ] Configuration organisation
- [ ] Ajout intervenants
- [ ] Catalogue services
- [ ] Upload documents/KB

### LONG TERME (Mois 1-2)

#### 9. Intégrations Externes
- [ ] Google Calendar sync
- [ ] CRM (HubSpot, Salesforce)
- [ ] Paiement Stripe
- [ ] Zapier/Make webhooks

#### 10. Analytics Avancés
- [ ] Dashboard temps réel
- [ ] Graphiques conversion
- [ ] Heatmaps créneaux
- [ ] Export rapports Excel

#### 11. Optimisations & Scale
- [ ] CDN pour assets
- [ ] Cache Redis
- [ ] Monitoring (Sentry)
- [ ] Tests E2E (Playwright)

---

## 🔄 POUR CONTINUER {#nouveau-chat}

### Fichiers Importants

**Backend** :
- `src/index.js` : 1389 lignes (v1.13.0)
- `database/schema-knowledge-v2-fixed.sql` : Schéma KB v2.0
- `database/seed-knowledge-v2-fixed.sql` : Seed data KB

**Scripts Python** :
- `create_assistant_vapi.py` : Créer assistant Vapi
- `update_assistant_vapi.py` : Mettre à jour assistant
- `.env` : Variables d'environnement (gitignored)

**Frontend** :
- Dashboard : `coccinelle-dashboard-new/`

### Commandes Essentielles

```bash
# Activer environnement Python
cd ~/match-immo-mcp/coccinelle-ai
source venv/bin/activate

# Vérifier état
wc -l src/index.js # Doit afficher 1389
git status

# Logs temps réel
npx wrangler tail --format pretty

# Database
npx wrangler d1 execute coccinelle-db --local --command="SELECT COUNT(*) FROM knowledge_documents"

# Déploiement (VPN DÉSACTIVÉ)
npx wrangler deploy

# Dashboard
cd coccinelle-dashboard-new
npm run dev # http://localhost:3001
```

### Ressources

- **API Prod** : https://coccinelle-api.youssef-amrouche.workers.dev
- **Dashboard Local** : http://localhost:3001
- **Sara** : +33939035761
- **GitHub** : https://github.com/Agentic-Solutions/coccinelle-ai
- **Vapi Dashboard** : https://dashboard.vapi.ai
- **Cloudflare Dashboard** : https://dash.cloudflare.com
- **Assistant Sara** : https://dashboard.vapi.ai/assistants/40ccfe18-e4c7-4e5b-99d5-2f2654001335

### Contexte pour Nouveau Chat

```
Je continue le développement de Coccinelle.ai v1.13.0.

Voici le manifeste complet : [COLLER LE MANIFESTE]

ÉTAT ACTUEL :
- Knowledge Base v2.0 Phase 1 TERMINÉE (8 tables créées, seed data OK)
- Assistant Sara v2.0 créé mais latence élevée
- Prochaine étape : PHASE 2 Web Crawler (2h)

Je veux : [INDIQUE CE QUE TU VEUX DÉVELOPPER]
```

---

## ⚠️ NOTES CRITIQUES

1. **Code Backend** : 1389 lignes (v1.13.0) - Vérifier avec `wc -l src/index.js`
2. **VPN DÉSACTIVÉ** obligatoire pour `wrangler deploy`
3. **Python venv** : Toujours activer avant scripts (`source venv/bin/activate`)
4. **Base de données** : 20 tables (12 initiales + 8 KB v2.0)
5. **Assistant Sara** : Latence élevée (40s) - Script correction prêt
6. **Prononciation Sara** : OK pour "heures" mais problème "silence timeout"
7. **Budget Vapi** : ~$9.50 restant sur $10
8. **Tokens conversation** : Surveiller pour mises à jour manifeste

---

## 🔒 RÈGLES MÉTHODOLOGIE

1. **Code via CAT** : TOUJOURS fichier complet (JAMAIS partiel)
2. **Sauvegardes** : Local + Git avant CHAQUE modification
3. **Vérifications** : `wc -l` avant/après chaque edit
4. **VPN** : Désactivé pour déploiement Cloudflare
5. **Tokens** : Indiquer nombre restant à chaque réponse
6. **Manifeste** : Mettre à jour après changement majeur
7. **Tests** : Valider AVANT de passer au suivant
8. **Git** : Commit descriptif après chaque module

---

**FIN DU MANIFESTE v1.13.0**

💡 **RAPPEL** : Copie CE MANIFESTE COMPLET dans un nouveau chat pour continuer le développement avec le contexte complet !

🚀 **PROCHAINE ÉTAPE** : PHASE 2 - Web Crawler (2h) pour compléter le RAG System
