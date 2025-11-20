# Configuration de la base de données D1

## 📊 Informations de connexion

- **Database ID**: `f4d7ff42-fc12-4c16-9c19-ada63c023827`
- **Database Name**: `coccinelle-db`
- **Account**: youssef.amrouche@outlook.fr

## 🌐 Méthode 1 : Via le Dashboard Cloudflare (Recommandé)

1. **Accède au dashboard D1** :
   👉 https://dash.cloudflare.com/9c27dcacc982caff25e46d0756c87837/workers/d1

2. **Sélectionne la base de données** :
   - Clique sur `coccinelle-db`

3. **Ouvre la console SQL** :
   - Clique sur l'onglet "Console" en haut

4. **Exécute les migrations dans cet ordre** :

   ### Migration 1 : Schéma principal
   ```sql
   -- Copie tout le contenu de: ../database/schema-v1.sql
   -- Et exécute-le dans la console
   ```

   ### Migration 2 : Schéma Knowledge Base
   ```sql
   -- Copie tout le contenu de: ../database/schema-knowledge-v2-fixed.sql
   -- Et exécute-le dans la console
   ```

   ### Migration 3 : Données de test (Optionnel)
   ```sql
   -- Copie tout le contenu de: ../test-data.sql
   -- Et exécute-le dans la console
   ```

## 💻 Méthode 2 : Via Wrangler CLI

Si Cloudflare OAuth fonctionne à nouveau :

```bash
cd /Users/amrouche.7/match-immo-mcp/coccinelle-ai

# 1. Se connecter
npx wrangler login

# 2. Exécuter les migrations
npx wrangler d1 execute coccinelle-db --remote --file=database/schema-v1.sql
npx wrangler d1 execute coccinelle-db --remote --file=database/schema-knowledge-v2-fixed.sql
npx wrangler d1 execute coccinelle-db --remote --file=test-data.sql
```

## ✅ Vérification

Une fois les migrations exécutées, teste que tout fonctionne :

```bash
# Test signup
curl -X POST https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Test Company",
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123",
    "phone": "+33612345678",
    "sector": "technology"
  }'
```

## 📝 Tables créées

Après les migrations, tu auras ces tables :

### Tables principales (schema-v1.sql)
- `tenants` - Entreprises multi-tenant
- `users` - Utilisateurs
- `agents` - Agents commerciaux
- `availability_slots` - Disponibilités
- `prospects` - Prospects/Leads
- `appointments` - Rendez-vous
- `vapi_call_logs` - Logs d'appels VAPI

### Tables Knowledge Base (schema-knowledge-v2-fixed.sql)
- `services` - Services proposés
- `agent_services` - Services par agent
- `knowledge_documents` - Documents de la KB
- `knowledge_chunks` - Chunks vectorisés
- `crawl_jobs` - Jobs de crawling
- `knowledge_faq` - FAQ
- `knowledge_snippets` - Snippets réutilisables
- `knowledge_search_logs` - Logs de recherche

## 🔐 Configuration Next.js

Pour que ton app Next.js utilise la vraie DB au lieu de localStorage :

Vérifie que `.env.local` contient :
```bash
NEXT_PUBLIC_USE_REAL_API=true
NEXT_PUBLIC_API_URL=https://coccinelle-api.youssef-amrouche.workers.dev
```

Puis redémarre le serveur :
```bash
cd coccinelle-saas
npm run dev
```

## 🎯 Architecture finale

```
Next.js Frontend (localhost:3000)
    ↓ NEXT_PUBLIC_USE_REAL_API=true
    ↓
Cloudflare Workers API
(coccinelle-api.youssef-amrouche.workers.dev)
    ↓
Cloudflare D1 Database
(coccinelle-db: f4d7ff42-fc12-4c16-9c19-ada63c023827)
    ↓
Multi-tenant data ✅
```
