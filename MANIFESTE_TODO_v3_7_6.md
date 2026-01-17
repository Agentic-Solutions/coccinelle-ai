# 📋 MANIFESTE TODO v3.7.6 - SESSION 07 JANVIER 2026

**Version** : v3.7.6
**Date** : 07 janvier 2026
**Session précédente** : 09 décembre 2025
**Progression globale** : 99.5% → **98%** (régression due à problèmes E2E)

---

## 🎯 RÉSUMÉ SESSION 07 JANVIER 2026

### 🔴 PROBLÈME MAJEUR DÉCOUVERT - Tests E2E échouent (7/7 failed)

**Contexte** : Tentative de correction des 3 tests E2E qui échouaient sur les fonctionnalités Products.

**Problème identifié** :
- Les 7 tests E2E du fichier `tests/e2e/03-products-crud.spec.ts` échouent TOUS
- Tous échouent au même point : l'inscription utilisateur (signup) ne se termine pas
- L'utilisateur reste bloqué sur la page `/signup` avec le message "Erreur lors de l'inscription"
- Les tests ne peuvent pas accéder à la page `/dashboard/products` car le signup échoue

**Cause racine identifiée** :
🚨 **La table `product_categories` n'existe PAS dans le schéma de base de données**

**Fichiers vérifiés** :
- ❌ `database/schema-unified.sql` - Ne contient PAS `product_categories`
- ❌ Aucun fichier de migration ne crée cette table
- ✅ Le code dans `src/modules/auth/routes.js:60` tente d'insérer dans `product_categories` lors du signup
- ✅ Structure attendue identifiée (12 colonnes) :
  ```sql
  id, tenant_id, key, name, description, icon, color,
  is_system, fields, display_order, created_at, updated_at
  ```

**Ce qui a été fait durant cette session** :
1. ✅ Identifié que l'API URL était incorrecte dans `.env.local` (8787 → 8788)
2. ✅ Découvert que la table `product_categories` n'existe nulle part dans le schéma
3. ✅ Analysé le code pour identifier la structure complète de la table
4. ✅ Supprimé le cache Wrangler `.wrangler/state/v3/d1` (à la demande de l'utilisateur)
5. ⏸️ Session interrompue avant de créer la table

**Repository Git** :
- URL : https://github.com/Agentic-Solutions/coccinelle-ai.git
- Organisation : Agentic-Solutions
- Visibilité : Non déterminée (probablement privé)

---

## 🔴 ACTION CRITIQUE IMMÉDIATE REQUISE

### Créer la table product_categories manquante

**Fichier à créer** : `database/migrations/005_product_categories.sql`

```sql
-- Migration 005: Create product_categories table
-- Date: 2026-01-07
-- Description: Table manquante causant l'échec du signup et des tests E2E

CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_system INTEGER DEFAULT 0,
  fields TEXT DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_product_categories_tenant
  ON product_categories(tenant_id);

CREATE INDEX IF NOT EXISTS idx_product_categories_key
  ON product_categories(tenant_id, key);
```

**Commandes à exécuter** :

```bash
# 1. Arrêter tous les processus
killall -9 node wrangler

# 2. Supprimer le cache DB local (déjà fait)
# rm -rf /Users/amrouche.7/match-immo-mcp/coccinelle-ai/.wrangler/state/v3/d1

# 3. Créer la migration
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai
cat > database/migrations/005_product_categories.sql << 'EOF'
[coller le SQL ci-dessus]
EOF

# 4. Appliquer les schémas dans l'ordre
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai

# Ordre d'application CRITIQUE :
# 1. Omnichannel schema (dépendances FK)
wrangler d1 execute coccinelle-db --local --file=src/modules/omnichannel/db/schema.sql

# 2. Schema principal
wrangler d1 execute coccinelle-db --local --file=database/schema-unified.sql

# 3. Migration product_categories
wrangler d1 execute coccinelle-db --local --file=database/migrations/005_product_categories.sql

# 5. Démarrer le backend
npm run dev

# 6. Dans un autre terminal, démarrer le frontend
cd coccinelle-saas
npm run dev

# 7. Tester le signup manuellement
# Ouvrir http://localhost:3000/signup
# Créer un compte de test

# 8. Lancer les tests E2E
npx playwright test tests/e2e/03-products-crud.spec.ts --reporter=list
```

---

## 📊 DÉTAILS DES TESTS E2E QUI ÉCHOUENT

**Fichier** : `tests/e2e/03-products-crud.spec.ts`

**Tests qui échouent** (7/7) :
1. ✘ BUG CHECK: Products page must be accessible
2. ✘ BUG CHECK: Must display "Create Product" or "Add Product" button
3. ✘ BUG CHECK: Create product form must have required fields
4. ✘ BUG CHECK: Creating a product must add it to the list
5. ✘ BUG CHECK: Empty product form must show validation errors
6. ✘ BUG CHECK: Edit product must update the product
7. ✘ BUG CHECK: Delete product must remove it from list

**Erreur commune** :
```
TimeoutError: page.waitForURL: Timeout 10000ms exceeded.
waiting for navigation until "load"

at tests/e2e/03-products-crud.spec.ts:16:16
await page.waitForURL(/\/onboarding|\/dashboard/, { timeout: 10000 });
```

**Point de blocage** :
- Ligne 16 du test : attend la redirection après signup
- Le signup retourne une erreur 500
- Le message "Erreur lors de l'inscription" s'affiche
- L'utilisateur reste sur `/signup` au lieu d'être redirigé vers `/onboarding` ou `/dashboard`

**Screenshots disponibles** :
- `test-results/03-products-crud-Products--f9991-cts-page-must-be-accessible-chromium/test-failed-1.png`
- Montre la page de signup avec l'erreur "Erreur(s) dans le formulaire : Erreur lors de l'inscription"

---

## 🔍 ANALYSE TECHNIQUE - Pourquoi le signup échoue

**Flow du signup** :
1. Frontend envoie `POST /api/v1/auth/signup` avec `{name, email, password}`
2. Backend (`src/modules/auth/routes.js:51`) :
   - Crée le tenant
   - **Tente de créer les catégories par défaut** (ligne 54-61)
   - Crée l'utilisateur
   - Crée la session JWT
3. **ÉCHEC à l'étape 2** : `INSERT INTO product_categories` échoue car la table n'existe pas
4. Transaction rollback → 500 error
5. Frontend affiche "Erreur lors de l'inscription"

**Code concerné** : `src/modules/auth/routes.js:54-61`

```javascript
const defaultCategories = [
  { id: `cat_${tenantId}_real_estate`, key: 'real_estate', name: 'Immobilier', ... },
  { id: `cat_${tenantId}_retail`, key: 'retail', name: 'Commerce', ... },
  { id: `cat_${tenantId}_food`, key: 'food', name: 'Restauration', ... },
  { id: `cat_${tenantId}_services`, key: 'services', name: 'Services', ... }
];

const catStatements = defaultCategories.map(cat =>
  env.DB.prepare(`INSERT INTO product_categories (
    id, tenant_id, key, name, description, icon, color,
    is_system, fields, display_order, created_at, updated_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`)
  .bind(cat.id, tenantId, cat.key, cat.name, cat.description,
        cat.icon, cat.color, cat.fields, cat.display_order, now, now)
);

await env.DB.batch(catStatements); // ❌ ÉCHEC ICI
```

---

## 📁 FICHIERS CLÉS IDENTIFIÉS

### Backend (Workers API)
```
/Users/amrouche.7/match-immo-mcp/coccinelle-ai/
├── src/modules/auth/routes.js           # Signup qui crée product_categories
├── src/modules/products/                # Module products
│   ├── categories-routes.js             # API CRUD categories
│   └── categories-init.js               # Init categories
├── src/modules/omnichannel/db/schema.sql # Schema omnichannel (à appliquer EN PREMIER)
├── database/
│   ├── schema-unified.sql               # Schema principal (INCOMPLET)
│   └── migrations/                      # Dossier migrations
│       └── 005_product_categories.sql   # ⏳ À CRÉER
└── .wrangler/state/v3/d1/               # Cache DB local (SUPPRIMÉ)
```

### Frontend (Next.js)
```
/Users/amrouche.7/match-immo-mcp/coccinelle-ai/coccinelle-saas/
├── .env.local                           # Config API (✅ corrigée : port 8788)
├── app/signup/page.tsx                  # Page signup qui échoue
├── app/dashboard/products/              # Pages products (pas atteintes)
└── tests/e2e/03-products-crud.spec.ts   # Tests E2E qui échouent
```

---

## 🏗️ ARCHITECTURE - Multi-tenant avec Products

### Tables créées lors du signup

**Ordre de création** (dans `src/modules/auth/routes.js`) :
1. ✅ `tenants` - Création du tenant
2. ❌ `product_categories` - **ÉCHEC ICI** (table n'existe pas)
3. ⏸️ `users` - Jamais créé car rollback
4. ⏸️ `sessions` - Jamais créé car rollback

### Isolation multi-tenant

Chaque tenant a ses propres catégories :
```sql
-- Tenant A (agence immobilière)
INSERT INTO product_categories VALUES
  ('cat_tenant_a_real_estate', 'tenant_a', 'real_estate', 'Immobilier', ...)

-- Tenant B (boutique e-commerce)
INSERT INTO product_categories VALUES
  ('cat_tenant_b_retail', 'tenant_b', 'retail', 'Commerce', ...)
```

Les catégories système (`is_system = 1`) sont créées automatiquement à chaque signup.

---

## 📊 ÉTAT D'AVANCEMENT GLOBAL

```
PROGRESSION : 98% ██████████████████████
                   ⚠️  Régression due à E2E

MODULE                          STATUS      %    CHANGEMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Backend API (43 endpoints)   Opérationnel 100%  Stable
❌ Base de données (37 tables)  CASSÉE       80%   -20% product_categories manquante
✅ Knowledge Base RAG           Opérationnel 100%  Stable
❌ Products Database            CASSÉ        0%    Signup impossible
✅ Agent vocal Sara             Opérationnel 100%  Stable
✅ Twilio ConversationRelay     Opérationnel 90%   Stable
✅ Frontend Dashboard           Opérationnel 92%   Stable
❌ Auth & Multi-tenant          CASSÉ        50%   Signup échoue
✅ Canaux de Communication      Opérationnel 70%   Stable
⏳ Products Management UI      À créer      0%    Bloqué par signup
⏳ Products Import              À créer      0%    Bloqué par signup
⏳ CRM Integrations            À créer      0%    Stable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
❌ Tests E2E                    CASSÉS       0/16  7 tests échouent
```

---

## 🚨 TÂCHES BLOQUANTES (PRIORITÉ ABSOLUE)

### 1. Créer la table product_categories (30 min)
- [ ] Créer `database/migrations/005_product_categories.sql`
- [ ] Appliquer omnichannel schema
- [ ] Appliquer schema principal
- [ ] Appliquer migration 005
- [ ] Vérifier que la table existe avec `wrangler d1 execute ... --command="SELECT * FROM sqlite_master WHERE type='table' AND name='product_categories'"`

### 2. Vérifier que le signup fonctionne (10 min)
- [ ] Démarrer backend + frontend
- [ ] Aller sur http://localhost:3000/signup
- [ ] Créer un compte de test
- [ ] Vérifier la redirection vers `/onboarding` ou `/dashboard`
- [ ] Vérifier dans la DB que les catégories ont été créées

### 3. Corriger les tests E2E (1h)
- [ ] Relancer `npx playwright test tests/e2e/03-products-crud.spec.ts`
- [ ] Vérifier que les 7 tests passent maintenant
- [ ] Si échec, analyser les nouveaux logs d'erreur

### 4. Mettre à jour schema-unified.sql (10 min)
- [ ] Ajouter la définition de `product_categories` dans `database/schema-unified.sql`
- [ ] Éviter que ce problème se reproduise

---

## 🔴 CE QUI RESTE À FAIRE (GLOBAL)

### Backend - URGENT
- [ ] ❌ Créer table `product_categories`
- [ ] ❌ Corriger le signup
- [x] Table products universelle
- [x] Tool search_products
- [ ] API CRUD products
- [ ] Import CSV
- [ ] Webhook entrant

### Frontend - BLOQUÉ
- [ ] Page gestion produits (bloquée par signup)
- [ ] Formulaire dynamique par secteur
- [ ] Import CSV UI
- [ ] Aperçu produits

### Tests - CASSÉS
- [ ] ❌ Corriger 7 tests E2E products
- [ ] Test search_products en conversation vocale
- [ ] Test import CSV (1000+ lignes)
- [ ] Test multi-secteur (immobilier + e-commerce)

---

## ⚡ QUICK START PROCHAINE SESSION

```bash
# 1. Naviguer vers le projet
cd ~/match-immo-mcp/coccinelle-ai

# 2. Lire ce manifeste
cat MANIFESTE_TODO_v3_7_6.md

# 3. Créer la migration product_categories
cat > database/migrations/005_product_categories.sql << 'EOF'
CREATE TABLE IF NOT EXISTS product_categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_system INTEGER DEFAULT 0,
  fields TEXT DEFAULT '[]',
  display_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant ON product_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_key ON product_categories(tenant_id, key);
EOF

# 4. Appliquer les schémas
wrangler d1 execute coccinelle-db --local --file=src/modules/omnichannel/db/schema.sql
wrangler d1 execute coccinelle-db --local --file=database/schema-unified.sql
wrangler d1 execute coccinelle-db --local --file=database/migrations/005_product_categories.sql

# 5. Vérifier que la table existe
wrangler d1 execute coccinelle-db --local --command="PRAGMA table_info(product_categories)"

# 6. Démarrer les serveurs
npm run dev &
cd coccinelle-saas && npm run dev &

# 7. Tester le signup
open http://localhost:3000/signup

# 8. Lancer les tests E2E
npx playwright test tests/e2e/03-products-crud.spec.ts --reporter=list
```

---

## 📝 NOTES DE LA SESSION

### Modifications effectuées
1. ✅ Lecture de `.env.local` - Confirmé port 8788
2. ✅ Analyse des tests E2E - 7/7 échouent au signup
3. ✅ Lecture des erreurs - "Erreur lors de l'inscription"
4. ✅ Recherche de la table `product_categories` - INTROUVABLE
5. ✅ Analyse du code signup - Identifié ligne 60 auth/routes.js
6. ✅ Extraction de la structure complète de la table
7. ✅ Suppression du cache Wrangler (à la demande)
8. ⏸️ Session interrompue avant création de la table

### Fichiers lus
- `coccinelle-saas/.env.local`
- `test-results/*/error-context.md` (2 fichiers)
- `test-results/*/test-failed-1.png` (2 screenshots)
- `MANIFESTE_TODO_v3_7_5.md`
- `src/modules/auth/routes.js` (lignes 50-150)

### Fichiers modifiés
- ❌ AUCUN (session interrompue avant modifications)

### Commandes exécutées
- `git remote -v` - Identifié le repo GitHub
- `killall -9 node wrangler` - Arrêt des processus
- `rm -rf .wrangler/state/v3/d1` - Suppression du cache
- `npx playwright test tests/e2e/03-products-crud.spec.ts` - Tests E2E (tous échouent)
- `grep` - Recherche de la table dans le code

---

## 🎯 OBJECTIF v1.0 (REVU)

**Date cible** : Mi-janvier 2026 (retardée d'une semaine)

**Critères de lancement** :
- [x] Backend 100% opérationnel
- [ ] ❌ Système Products universel (cassé par table manquante)
- [x] Sara recherche produits (KB + DB)
- [ ] ❌ Tests E2E passent (7/16 échouent)
- [ ] Frontend gestion produits (bloqué)
- [ ] Import CSV fonctionnel
- [ ] 1 client pilote avec produits réels testés

**Blocage actuel** : La table `product_categories` manquante empêche tout signup et donc toute utilisation de l'application.

---

**Fin du manifeste v3.7.6**

_Mis à jour par Claude Code (Sonnet 4.5) - 07 janvier 2026_
_Session interrompue avant modifications - Aucun changement de code effectué_
