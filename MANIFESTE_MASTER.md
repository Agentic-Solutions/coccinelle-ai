# 📖 MANIFESTE MASTER - COCCINELLE.AI

**Version** : v3.8.0  
**Progression** : 97%  
**Dernière session** : 8 novembre 2025

---

## 🎯 VUE D'ENSEMBLE

Coccinelle.AI - Plateforme SaaS de gestion client automatisée via IA vocale (Sara).
Backend Cloudflare Workers + Frontend Next.js 15.

---

## 🏗️ ARCHITECTURE BACKEND

### Structure actuelle
```
src/
├── index.js (117 lignes) - Entry point modulaire
├── config/cors.js
├── utils/ (logger.js, response.js)
└── modules/
    ├── auth/ (529 lignes) - Routes, helpers, service
    ├── knowledge/ (833 lignes) - RAG, embeddings, search
    ├── prospects/ (69 lignes)
    ├── agents/ (35 lignes)
    ├── appointments/ (68 lignes)
    └── vapi/ (158 lignes)
```

### ⚠️ Fichiers racine NON intégrés (2,046 lignes)
```
onboarding-routes.js     861 lignes - Onboarding 5 étapes
knowledge-manual-routes.js 320 lignes - FAQ + Snippets
rag-routes.js            266 lignes - RAG avancé
rdv-page.js              250 lignes - Générateur page RDV
text-processing.js       134 lignes - Processing avancé
crawler-functions.js      92 lignes - Crawler BFS
vapi-logger.js           123 lignes - Logger structuré
```

---

## 📊 HISTORIQUE

### Session 23 (8 Nov 2025 PM) - 97%
**Modularisation backend**
- Architecture modulaire : 6 modules créés
- index.js : 1,230 → 117 lignes (-90%)
- Routes onboarding/KB ajoutées (temporaire)
- Scripts coc créés (handoff, snapshot)
- Commits : 53f6714, c4c9b0d, 5fa61a4

**Découverte** : 2,046 lignes code métier restent à la racine

---

## 🔧 STACK TECHNIQUE

- **Backend** : Cloudflare Workers
- **DB** : D1 (SQLite) - 29 tables
- **Vectorize** : OpenAI embeddings (text-embedding-3-small)
- **Frontend** : Next.js 15 + React 18
- **VAPI** : +33939035761
- **API** : https://coccinelle-api.youssef-amrouche.workers.dev

---

## 📂 STRUCTURE FRONTEND
```
coccinelle-saas/app/
├── signup/, login/, onboarding/
└── dashboard/
    ├── knowledge/
    ├── prospects/
    ├── analytics/
    ├── appels/
    └── rdv/
```

---

**Dernière mise à jour** : 8 novembre 2025, 21:20
