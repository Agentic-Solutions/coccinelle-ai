# 📋 TODO - COCCINELLE.AI

**Mis à jour** : 8 novembre 2025

---

## 🔥 PRIORITÉ 1 - MIGRATION CODE MÉTIER (2-3h)

### Objectif
Déplacer les 2,046 lignes de code de src/ vers modules/

### Fichiers à migrer

**1. onboarding-routes.js → modules/onboarding/** (1h)
- 861 lignes - Onboarding 5 étapes complet
- Créer `src/modules/onboarding/routes.js`
- Corriger imports (./auth.js → ../auth/helpers.js)
- Mettre à jour src/index.js

**2. knowledge-manual-routes.js → modules/knowledge/** (30min)
- 320 lignes - FAQ + Snippets
- Créer `src/modules/knowledge/manual.js`
- Intégrer dans routing knowledge

**3. rag-routes.js → modules/knowledge/** (30min)
- 266 lignes - RAG avancé avec Claude
- Enrichir `src/modules/knowledge/routes.js`
- Fusionner avec routes existantes

**4. rdv-page.js → modules/appointments/** (20min)
- 250 lignes - Générateur HTML page RDV Calendly
- Créer `src/modules/appointments/page.js`

**5. text-processing.js → modules/knowledge/** (20min)
- 134 lignes - Processing avancé
- Enrichir `src/modules/knowledge/processor.js`

**6. crawler-functions.js → modules/knowledge/** (20min)
- 92 lignes - Crawler BFS avancé
- Enrichir `src/modules/knowledge/crawler.js`

**7. vapi-logger.js → modules/vapi/** (10min)
- 123 lignes - Logger structuré
- Créer `src/modules/vapi/logger.js`

---

## ⚙️ PRIORITÉ 2 - CORRECTIONS (1h)

**Bug signup frontend** (30min)
- Fichier : `coccinelle-saas/app/signup/page.tsx`
- Problème : Erreur fetch API
- Action : Corriger URL et gestion erreurs

**Schéma DB** (30min)
- Vérifier colonnes : prospects, agents, appointments, calls
- Corriger requêtes SQL si nécessaire
- Tester avec données réelles

---

## 🎨 PRIORITÉ 3 - DASHBOARD (3h)

1. **Page Settings** (1h)
   - Gestion profil utilisateur
   - Configuration VAPI
   - Gestion équipe

2. **Analytics finalisation** (1h)
   - Graphiques temps réel
   - Export CSV

3. **Prospects finalisation** (1h)
   - Filtres avancés
   - Bulk actions

---

## 🚀 PRIORITÉ 4 - DÉPLOIEMENT (2h)

1. Tests end-to-end (1h)
2. Déploiement frontend Vercel (30min)
3. Optimisations Sara (30min)

---

## 📊 PROGRESSION

- ✅ Backend modulaire : 100%
- 🟡 Migration code métier : 0%
- 🟡 Frontend dashboard : 80%
- ❌ Tests E2E : 0%
- ❌ Déploiement prod : 0%

**Total estimé restant** : 8-10h

---

**Prochaine session** : Migration code métier (Priorité 1)
