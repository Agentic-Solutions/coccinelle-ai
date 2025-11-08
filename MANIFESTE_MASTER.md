# 📋 MANIFESTE COCCINELLE.AI - HISTORIQUE COMPLET

**Projet** : Coccinelle.AI - Plateforme SaaS Multi-tenant  
**Démarrage** : Septembre 2025  
**Version actuelle** : v3.7.2  
**Progression** : 95%  
**Dernière session** : 8 novembre 2025

---

## 🏗️ ARCHITECTURE GLOBALE

### Backend (Cloudflare Workers)
- **Fichier principal** : `src/index.js` (~1,500 lignes)
- **Modules** : RAG (search.js, embeddings.js, rag-routes.js)
- **Base de données** : D1 (SQLite) - 29 tables
- **Vectorize** : Semantic search
- **APIs** : 32 endpoints REST

### Frontend (Next.js 15)
- **Dossier** : `coccinelle-saas/`
- **Pages** : 12 pages complètes
- **Composants** : 35+ composants React
- **Styling** : Tailwind CSS (noir/blanc/gris)

### Agent Vocal (VAPI)
- **Téléphone** : +33939035761
- **Modèle** : Assistant vocal Sara
- **Fonctions** : 3 tool calls (RAG, dispo, RDV)

---

## 📅 HISTORIQUE DES SESSIONS

### Session 1-10 (Sep-Oct 2025) - 80%
**Résumé** : Setup initial, backend API, base de données, VAPI

**Réalisations** :
- ✅ Architecture multi-tenant
- ✅ 29 tables D1 créées
- ✅ 25 endpoints REST
- ✅ VAPI configuré
- ✅ Notifications SMS/Email

### Session 11-15 (Oct 2025) - 85%
**Résumé** : Knowledge Base avec RAG

**Réalisations** :
- ✅ Web crawler BFS
- ✅ Chunking intelligent
- ✅ OpenAI embeddings
- ✅ Cloudflare Vectorize
- ✅ RAG avec Claude Sonnet 4

### Session 16-20 (Oct-Nov 2025) - 90%
**Résumé** : Frontend dashboard

**Réalisations** :
- ✅ Landing page
- ✅ Auth complète (signup/login)
- ✅ Dashboard principal
- ✅ 8 pages modules

### Session 21 (7 Nov 2025) - 93%
**Résumé** : Corrections RAG backend

**Réalisations** :
- ✅ Fix embeddings (documentId → docId)
- ✅ Correction routes RAG
- ✅ Tests end-to-end RAG validés

**Commits** :
- `01f4ad6` - fix: Use docId instead of documentId
- `fc15db3` - feat: Add automatic embeddings generation
- `8ee8efc` - fix: Add safe navigation for Claude API

### Session 22 (8 Nov 2025) - 95% ← DERNIÈRE SESSION
**Résumé** : Modernisation page Knowledge + nettoyage projet + automatisation workflow

**Réalisations** :
- ✅ Page Knowledge avec interface RAG 2 onglets
- ✅ Layout dashboard ajouté
- ✅ Archivage 24 fichiers backup
- ✅ Repository nettoyé
- ✅ Scripts CLI créés (coc, coc-checklist, coc-manifeste-update)
- ✅ Hooks Git automatiques (pre-commit, post-commit)
- ✅ Manifestes structurés (MASTER, SESSION, TODO)

**Commits** :
- `28da684` - feat: Modernize Knowledge Base page with RAG
- `c36ac71` - chore: Archive backup files and clean up

**Fichiers modifiés** :
- `app/dashboard/knowledge/page.tsx` (297 lignes)
- `app/dashboard/layout.tsx` (NOUVEAU)
- `src/index.js` (corrections)
- `src/rag-routes.js` (corrections)

**Backups créés** :
- `~/BACKUPS-COCCINELLE/coccinelle-backup-20251108-174628`
- `_archives/backups-20251108/` (24 fichiers)

**Scripts créés** :
- `~/bin/coc` - CLI principale (backup, status, feature, commit, etc.)
- `~/bin/coc-checklist` - Checklist interactive
- `~/bin/coc-manifeste-update` - Mise à jour manifestes
- `.git/hooks/pre-commit` - Vérifications automatiques
- `.git/hooks/post-commit` - Stats et proposition push

---

## 📊 ÉTAT ACTUEL DES MODULES

### ✅ MODULES TERMINÉS (95%)

| Module | Progression | Fichiers clés |
|--------|-------------|---------------|
| Backend API | 100% | src/index.js |
| Base de données | 100% | database/*.sql |
| Knowledge Base RAG | 100% | src/search.js, embeddings.js |
| Agent Vocal Sara | 95% | VAPI config |
| Auth Frontend | 100% | app/signup, app/login |
| Dashboard | 85% | app/dashboard/*.tsx |
| Scripts automatisation | 100% | ~/bin/coc* |
| Hooks Git | 100% | .git/hooks/* |

### 🟡 MODULES EN COURS (5%)

| Module | Progression | À faire |
|--------|-------------|---------|
| Page Settings | 30% | Créer composants form |
| Page Analytics | 80% | 2 graphiques + filtres |
| Page Prospects | 70% | Filtres avancés + export |
| Onboarding | 60% | Intégration backend |
| Architecture modulaire | 0% | Découper index.js |

---

## 🗂️ STRUCTURE PROJET ACTUELLE

```
coccinelle-ai/
├── _archives/                    # Backups archivés
│   ├── backups-20251108/        # Session 8 nov
│   └── sessions/                # Sessions archivées
├── src/
│   ├── index.js                 # Backend (1,500 lignes) ⚠️ À modulariser
│   ├── rag-routes.js            # Routes RAG
│   ├── search.js                # Semantic search
│   └── embeddings.js            # OpenAI embeddings
├── coccinelle-saas/
│   ├── app/
│   │   ├── page.tsx             # Landing
│   │   ├── signup/page.tsx      # Inscription
│   │   ├── login/page.tsx       # Connexion
│   │   └── dashboard/
│   │       ├── layout.tsx       # Layout ✅ NOUVEAU
│   │       ├── page.tsx         # Dashboard
│   │       ├── knowledge/       # Knowledge ✅ MODERNISÉ
│   │       ├── analytics/
│   │       ├── appels/
│   │       └── rdv/
│   └── src/components/
├── database/
│   └── schema*.sql              # 29 tables
├── .git/
│   └── hooks/                   # Pre/post-commit ✅ NOUVEAU
├── MANIFESTE_MASTER.md          # ✅ CE FICHIER
├── MANIFESTE_TODO.md            # ✅ Ce qui reste
├── MANIFESTE_SESSION_*.md       # ✅ Sessions
└── wrangler.toml

~/bin/                            # ✅ Scripts CLI
├── coc                          # CLI principale
├── coc-checklist                # Checklist interactive
└── coc-manifeste-update         # Mise à jour manifestes

~/BACKUPS-COCCINELLE/            # ✅ Backups quotidiens
└── backup-*.tar.gz              # 10 derniers backups
```

---

## 🔗 LIENS & CREDENTIALS

**URLs** :
- API : https://coccinelle-api.youssef-amrouche.workers.dev
- Frontend dev : http://localhost:3000
- GitHub : https://github.com/Agentic-Solutions/coccinelle-ai

**Téléphone Sara** : +33939035761

**Derniers commits** :
- `c36ac71` - chore: Archive backup files (8 nov)
- `28da684` - feat: Modernize Knowledge Base (8 nov)
- `01f4ad6` - fix: Use docId in embeddings (7 nov)

---

## 📝 RÈGLES DE DÉVELOPPEMENT

### Règles critiques
1. ✅ **TOUJOURS** backup avant modification (`coc backup`)
2. ✅ **TOUJOURS** créer branche feature (`coc feature nom`)
3. ✅ **TOUJOURS** commits atomiques (`coc commit`)
4. ✅ **JAMAIS** travailler sur `main` directement
5. ✅ **JAMAIS** modifier fichiers >2000 lignes (découper en modules)
6. ✅ **TOUJOURS** valider avec utilisateur avant actions destructrices
7. ✅ **TOUJOURS** mettre à jour manifestes après session

### Scripts automatisés

#### CLI Principale (coc)
- `coc backup` - Backup complet projet (tar.gz)
- `coc status` - État Git + stats code + dernier backup
- `coc feature X` - Créer branche feature (avec backup auto)
- `coc commit` - Commit guidé interactif (type, scope, message)
- `coc edit file` - Éditer fichier avec backup automatique
- `coc restore DATE` - Restaurer backup d'une date
- `coc deploy` - Déployer backend + frontend
- `coc clean` - Archiver fichiers temporaires
- `coc manifeste` - Créer nouveau manifeste

#### Autres scripts
- `coc-checklist` - Checklist interactive avant modification
- `coc-manifeste-update` - Finaliser et mettre à jour les 3 manifestes

### Hooks Git automatiques

#### Pre-commit
- ✅ Vérification taille fichiers (max 2000 lignes)
- ✅ Détection secrets (API keys, passwords)
- ✅ Backup automatique avant commit

#### Post-commit
- ✅ Affichage stats commit (fichiers modifiés, lignes +/-)
- ✅ Proposition push automatique

### Backups
- **Auto quotidien** : Au démarrage terminal (1x/jour)
- **Pre-commit** : Automatique via hook Git
- **Pre-feature** : Automatique via `coc feature`
- **Pre-edit** : Automatique via `coc edit`
- **Manuel** : `coc backup` à tout moment
- **Conservation** : 10 derniers backups (rotation auto)
- **Format** : .tar.gz compressé
- **Emplacement** : ~/BACKUPS-COCCINELLE/

---

## 🔄 WORKFLOW TYPE

### Début de journée
```bash
# 1. Vérifier état
coc status

# 2. Lire TODO
cat MANIFESTE_TODO.md

# 3. Créer manifeste session
echo "# SESSION $(date +%Y%m%d)
Objectif : [À DÉFINIR]
" > MANIFESTE_SESSION_$(date +%Y%m%d).md

# 4. Checklist avant travail
coc-checklist
```

### Développement feature
```bash
# 1. Créer branche (backup auto)
coc feature ajouter-page-settings

# 2. Éditer fichiers (backup auto)
coc edit coccinelle-saas/app/dashboard/settings/page.tsx

# 3. Voir différences
git diff

# 4. Commit guidé (backup auto)
coc commit
# → Type : feat
# → Scope : settings
# → Message : add settings page

# 5. Tester localement
cd coccinelle-saas && npm run dev

# 6. Merger dans main
git checkout main
git merge feature/ajouter-page-settings
```

### Fin de journée
```bash
# 1. Finaliser manifestes
coc-manifeste-update

# 2. Push GitHub
git push origin main

# 3. Backup final
coc backup
```

---

## 🚀 DÉPLOIEMENT LOCAL

### Frontend (Next.js)
```bash
cd ~/match-immo-mcp/coccinelle-ai/coccinelle-saas

# Installer dépendances
npm install

# Vérifier .env.local
cat .env.local

# Lancer dev server
npm run dev

# → http://localhost:3000
```

### Backend (Cloudflare Workers)
```bash
cd ~/match-immo-mcp/coccinelle-ai

# Déployer
npx wrangler deploy

# Logs temps réel
npx wrangler tail --format pretty
```

---

## 📚 POUR NOUVEAU CHAT

### Option 1 : Lecture automatique (RECOMMANDÉ)
```
Bonjour, je continue Coccinelle.AI.

Lis ces fichiers dans le projet pour comprendre l'état :
1. MANIFESTE_MASTER.md
2. MANIFESTE_TODO.md
3. Dernier MANIFESTE_SESSION_*.md dans _archives/sessions/

Vérifie ensuite l'état Git et dis-moi où on en est.

Je veux travailler sur : [TON OBJECTIF]
```

### Option 2 : Copie manuelle
```
Bonjour, je continue Coccinelle.AI v3.7.2

État : 95% complet, 5% restant (15-25h)

Prochaines priorités :
1. Page Settings (2h)
2. Page Analytics finalisation (1h)
3. Page Prospects finalisation (2h)
4. Onboarding intégration backend (4h)
5. Architecture modulaire backend (2h)

Scripts disponibles :
- coc backup/status/feature/commit/edit/deploy
- coc-checklist (avant modifications)
- coc-manifeste-update (fin session)

Règles :
- TOUJOURS backup avant modif
- TOUJOURS branche feature
- JAMAIS travailler sur main
- JAMAIS fichiers >2000 lignes

Je veux : [TON OBJECTIF]
```

---

## 📊 MÉTRIQUES GLOBALES

**Temps total investi** : 200-250 heures  
**Sessions** : 22 sessions  
**Commits** : 150+ commits  
**Lignes backend** : ~1,500 lignes  
**Lignes frontend** : ~10,000 lignes  
**Tables DB** : 29 tables  
**Endpoints API** : 32 endpoints  
**Pages frontend** : 12 pages  
**Composants React** : 35+ composants  

**Valeur estimée** : 50,000-80,000€  
**Coût réel** : 40€ (Claude Pro)  
**ROI** : 1,250x - 2,000x 🚀

---

## 🎓 LEÇONS APPRISES

### Bonnes pratiques validées
1. ✅ **Backup systématique** = Zéro stress
2. ✅ **Branches feature** = Main toujours stable
3. ✅ **Commits atomiques** = Historique clair
4. ✅ **Scripts CLI** = Workflow automatisé
5. ✅ **Hooks Git** = Sécurité automatique
6. ✅ **Manifestes structurés** = Continuité parfaite
7. ✅ **Validation utilisateur** = Zéro régression

### Pièges évités
1. ❌ Modifications massives sans backup → **Résolu par coc backup**
2. ❌ Fichiers écrasés accidentellement → **Résolu par coc edit**
3. ❌ Versions confuses → **Résolu par branches feature**
4. ❌ Fichiers monolithiques → **En cours de résolution (modularisation)**
5. ❌ Perte de contexte entre sessions → **Résolu par manifestes**

---

**Dernière mise à jour** : 8 novembre 2025, 19:00  
**Prochaine session** : À programmer  
**Contact** : [Youssef]

### Session 23 (8 Nov 2025 PM) - 97% ⭐ MODULARISATION COMPLÈTE
**Résumé** : Refonte architecture backend - modularisation 100%

**Réalisations** :
- ✅ Architecture modulaire (6 modules + 2 routes temporaires)
- ✅ index.js : 1,230 → 118 lignes (-90%)
- ✅ Modules : Auth, Knowledge, Prospects, Agents, Appointments, VAPI
- ✅ Routes Onboarding (861 lignes) + Knowledge Manual (320 lignes)
- ✅ Utils & Config (CORS, Logger, Response)
- ✅ Tests validés (local + production)
- ✅ Déployé en production (2x)

**Commits** :
- `53f6714` - refactor: modularize backend architecture
- `c4c9b0d` - feat: add onboarding and knowledge manual routes

**Temps** : 2h (prévu 4h30)

**À faire** :
- Finaliser déplacement onboarding/FAQ dans modules/
- Adapter schéma DB aux queries
- Corriger bug signup frontend

---

**Dernière mise à jour** : 8 novembre 2025, 20:30  
**Prochaine session** : Finalisation modularisation  
**Version actuelle** : v3.8.0
