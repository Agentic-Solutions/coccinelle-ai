# 📋 MANIFESTE TODO v3.7.3 - CE QUI RESTE À FAIRE

**Version** : v3.7.3  
**Date** : 13 novembre 2025  
**Progression** : 97% → 100% (v1.0)  
**Temps restant** : ~24 heures

---

## 🎯 RÉSUMÉ EXÉCUTIF

**3% restants = 24h de travail**

```
PRIORITÉ 1 - Critique (5h)     ⚡ À FAIRE MAINTENANT
PRIORITÉ 2 - Important (10h)   🔥 Cette semaine
PRIORITÉ 3 - Nice to have (9h) 💡 Avant lancement
```

---

## ⚡ PRIORITÉ 1 - CRITIQUE (5h)

### 1. Page Settings (2h)
**Fichier** : `coccinelle-saas/app/dashboard/settings/page.tsx`  
**Status** : 🟡 30% complété

**État actuel** :
- ✅ Structure avec 4 onglets
- ✅ Onglet Sécurité complet
- ❌ Onglet Profil (à créer)
- ❌ Onglet Clés API (à créer)
- ❌ Onglet Notifications (à créer)

#### Composant 1 : ProfileForm.tsx (45min)

**Fichier** : `coccinelle-saas/src/components/settings/ProfileForm.tsx`

**Fonctionnalités** :
- Formulaire 5 champs (firstName, lastName, email, phone, company)
- Fetch GET /api/v1/auth/me au chargement
- Update PUT /api/v1/auth/profile à la soumission
- Email en lecture seule (disabled)
- Gestion loading et erreurs
- Messages success/error

**Code squelette** :
```typescript
'use client';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ProfileForm() {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    company: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setProfile(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // PUT /api/v1/auth/profile
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Formulaire complet */}
    </form>
  );
}
```

#### Composant 2 : APIKeysForm.tsx (45min)

**Fichier** : `coccinelle-saas/src/components/settings/APIKeysForm.tsx`

**Fonctionnalités** :
- Liste des clés existantes (GET /api/v1/api-keys)
- Bouton "Générer nouvelle clé" (POST /api/v1/api-keys)
- Bouton "Révoquer" par clé (DELETE /api/v1/api-keys/:id)
- Modal pour afficher nouvelle clé générée (une seule fois)
- Copie dans presse-papier

**Endpoints backend utilisés** :
```
GET    /api/v1/api-keys
POST   /api/v1/api-keys          { name: "Production API" }
DELETE /api/v1/api-keys/:id
```

#### Composant 3 : NotificationsSettings.tsx (30min)

**Fichier** : `coccinelle-saas/src/components/settings/NotificationsSettings.tsx`

**Fonctionnalités** :
- Toggles pour email (nouveau prospect, RDV, appel manqué)
- Toggles pour SMS (nouveau prospect, RDV, appel manqué)
- Toggle webhook activé + input URL
- Sauvegarde PUT /api/v1/settings/notifications

**Tests** :
- [ ] Profil charge données correctement
- [ ] Modification profil fonctionne
- [ ] Génération clé API fonctionne
- [ ] Révocation clé API fonctionne
- [ ] Notifications se sauvegardent

---

### 2. Page Analytics finalisation (1h)
**Fichier** : `coccinelle-saas/app/dashboard/analytics/page.tsx`  
**Status** : 🟡 80% complété

**État actuel** :
- ✅ KPIs temps réel (4 cards)
- ✅ Graphique LineChart évolution appels
- ❌ Graphique "Taux conversion prospects → RDV"
- ❌ Graphique "Évolution mensuelle appels"
- ❌ Filtres par période
- ❌ Export PDF

#### À ajouter :

**1. Graphique Conversion (20min)**
```typescript
// Recharts LineChart
<LineChart data={conversionData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="conversion" stroke="#10b981" />
</LineChart>

// Data format
const conversionData = [
  { date: '2025-11-01', conversion: 45 },
  { date: '2025-11-02', conversion: 52 },
  // ...
];
```

**2. Graphique Mensuel (20min)**
```typescript
// Recharts BarChart
<BarChart data={monthlyData}>
  <XAxis dataKey="month" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="appels" fill="#3b82f6" />
</BarChart>
```

**3. Filtres période (15min)**
```typescript
const [period, setPeriod] = useState('30j');

<div className="flex gap-2">
  <button onClick={() => setPeriod('7j')}>7 jours</button>
  <button onClick={() => setPeriod('30j')}>30 jours</button>
  <button onClick={() => setPeriod('90j')}>90 jours</button>
  <button onClick={() => setPeriod('custom')}>Personnalisé</button>
</div>
```

**4. Export PDF (5min)**
```typescript
import { jsPDF } from 'jspdf';

const exportPDF = () => {
  const doc = new jsPDF();
  doc.text('Analytics Coccinelle.AI', 10, 10);
  // Ajouter stats
  doc.save('analytics.pdf');
};

<button onClick={exportPDF}>Exporter PDF</button>
```

**Tests** :
- [ ] Graphique conversion s'affiche
- [ ] Graphique mensuel s'affiche
- [ ] Filtres changent les données
- [ ] Export PDF fonctionne

---

### 3. Page Prospects finalisation (2h)
**Fichier** : `coccinelle-saas/app/dashboard/prospects/page.tsx`  
**Status** : 🟡 70% complété

**État actuel** :
- ✅ Liste avec pagination
- ✅ Création prospect basique
- ❌ Filtres avancés
- ❌ Export CSV/Excel
- ❌ Modal création/édition complet
- ❌ Notes et commentaires
- ❌ Historique interactions

#### À ajouter :

**1. Filtres avancés (30min)**
```typescript
const [filters, setFilters] = useState({
  status: 'all', // all, new, contacted, qualified, lost
  agent: 'all',  // all, agent_001, agent_002
  dateFrom: '',
  dateTo: '',
  score: 'all'   // all, hot, warm, cold
});

<div className="filters">
  <select onChange={(e) => setFilters({...filters, status: e.target.value})}>
    <option value="all">Tous les statuts</option>
    <option value="new">Nouveau</option>
    <option value="contacted">Contacté</option>
    <option value="qualified">Qualifié</option>
    <option value="lost">Perdu</option>
  </select>
  
  <select onChange={(e) => setFilters({...filters, agent: e.target.value})}>
    <option value="all">Tous les agents</option>
    {/* Map agents */}
  </select>
  
  <input type="date" onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} />
  <input type="date" onChange={(e) => setFilters({...filters, dateTo: e.target.value})} />
</div>
```

**2. Export CSV/Excel (20min)**
```typescript
import * as XLSX from 'xlsx';

const exportExcel = () => {
  const ws = XLSX.utils.json_to_sheet(prospects);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Prospects');
  XLSX.writeFile(wb, `prospects_${Date.now()}.xlsx`);
};

<button onClick={exportExcel}>Exporter Excel</button>
```

**3. Modal création/édition (40min)**
```typescript
const [modalOpen, setModalOpen] = useState(false);
const [editingProspect, setEditingProspect] = useState(null);

const ProspectModal = ({ prospect, onClose, onSave }) => (
  <div className="modal">
    <form onSubmit={handleSave}>
      <input name="firstName" defaultValue={prospect?.firstName} />
      <input name="lastName" defaultValue={prospect?.lastName} />
      <input name="email" defaultValue={prospect?.email} />
      <input name="phone" defaultValue={prospect?.phone} />
      <select name="status" defaultValue={prospect?.status}>
        <option value="new">Nouveau</option>
        <option value="contacted">Contacté</option>
        <option value="qualified">Qualifié</option>
        <option value="lost">Perdu</option>
      </select>
      <textarea name="notes" defaultValue={prospect?.notes} />
      <button type="submit">Enregistrer</button>
    </form>
  </div>
);
```

**4. Section Notes (20min)**
```typescript
// Sur page détail prospect
<div className="notes-section">
  <h3>Notes</h3>
  <textarea 
    value={notes} 
    onChange={(e) => setNotes(e.target.value)}
    placeholder="Ajouter une note..."
  />
  <button onClick={saveNote}>Sauvegarder note</button>
  
  <div className="notes-history">
    {prospect.notes?.map(note => (
      <div key={note.id}>
        <p>{note.content}</p>
        <span>{new Date(note.created_at).toLocaleDateString()}</span>
      </div>
    ))}
  </div>
</div>
```

**5. Historique interactions (10min)**
```typescript
// Fetch GET /api/v1/prospects/:id/history
<div className="history">
  <h3>Historique</h3>
  <ul>
    {history.map(event => (
      <li key={event.id}>
        <span className="icon">{event.type === 'call' ? '📞' : '📧'}</span>
        <span>{event.description}</span>
        <span>{new Date(event.created_at).toLocaleDateString()}</span>
      </li>
    ))}
  </ul>
</div>
```

**Tests** :
- [ ] Filtres fonctionnent tous
- [ ] Export Excel génère fichier correct
- [ ] Modal création fonctionne
- [ ] Modal édition fonctionne
- [ ] Notes se sauvegardent
- [ ] Historique s'affiche

---

## 🔥 PRIORITÉ 2 - IMPORTANT (10h)

### 1. Onboarding intégration backend (4h)
**Fichier** : `coccinelle-saas/app/onboarding/page.tsx`  
**Status** : 🟡 60% complété (frontend seul)

**Problème actuel** : Onboarding frontend n'appelle pas le backend

#### Workflow à implémenter :

**Étape 1 : Appel `/start` au début (30min)**
```typescript
// Au mount du composant
useEffect(() => {
  const startOnboarding = async () => {
    const res = await fetch(`${API_URL}/api/v1/onboarding/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userId: user.id,
        tenantId: tenant.id 
      })
    });
    const data = await res.json();
    setSessionId(data.sessionId); // Stocker dans state
  };
  startOnboarding();
}, []);
```

**Étape 2 : PUT `/step` à chaque étape (1h)**
```typescript
// À chaque changement d'étape
const saveStep = async (stepData) => {
  await fetch(`${API_URL}/api/v1/onboarding/${sessionId}/step`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: currentStep,
      data: stepData
    })
  });
};

// Modifier dans chaque composant step
// LastInfosStep.tsx → Sauvegarder address, phone, team
// ScheduleStep.tsx → Sauvegarder schedule, duration
```

**Étape 3 : Auto-génération agent (45min)**
```typescript
// Après étape "Horaires"
const generateAgent = async () => {
  const res = await fetch(
    `${API_URL}/api/v1/onboarding/${sessionId}/agents/auto-generate`,
    { method: 'POST' }
  );
  const data = await res.json();
  setGeneratedAgent(data.agent);
};

// Appeler automatiquement après ScheduleStep
```

**Étape 4 : Config VAPI (45min)**
```typescript
// Créer nouveau composant VapiStep.tsx
const configureVapi = async () => {
  await fetch(
    `${API_URL}/api/v1/onboarding/${sessionId}/vapi/auto-configure`,
    {
      method: 'POST',
      body: JSON.stringify({ voiceType: selectedVoice })
    }
  );
};

// Choix voix (homme/femme)
// Aperçu audio (optionnel)
// Auto-configure après choix
```

**Étape 5 : Initialisation KB (45min)**
```typescript
// Modifier KnowledgeBaseStep.tsx
const initKB = async () => {
  await fetch(
    `${API_URL}/api/v1/onboarding/${sessionId}/kb/initialize`,
    {
      method: 'POST',
      body: JSON.stringify({ 
        documents: uploadedDocs,
        urls: urlsToCrawl
      })
    }
  );
};

// Intégrer appel API
// Afficher progression crawling
```

**Étape 6 : Complétion (15min)**
```typescript
// À la fin
const completeOnboarding = async () => {
  await fetch(
    `${API_URL}/api/v1/onboarding/${sessionId}/complete`,
    { method: 'POST' }
  );
  router.push('/dashboard');
};
```

**Tests end-to-end** :
- [ ] Signup → Onboarding → Dashboard complet
- [ ] Agent créé dans DB
- [ ] VAPI configuré
- [ ] KB initialisée
- [ ] Sara répond au téléphone
- [ ] Redirection vers dashboard

---

### 2. Corriger 3 bugs SQL backend (2h)

**Bug 1 : embeddings.js ligne 59** (30min)

**Fichier** : `src/modules/knowledge/embeddings.js`

**Problème** :
```javascript
// ❌ ERREUR
await env.DB.prepare(`
  INSERT INTO embeddings (documentId, chunk_index, embedding)
  VALUES (?, ?, ?)
`).bind(documentId, i, embedding).run();
```

**Solution** :
```javascript
// ✅ CORRECTION
await env.DB.prepare(`
  INSERT INTO embeddings (doc_id, chunk_index, embedding)
  VALUES (?, ?, ?)
`).bind(docId, i, embedding).run();
```

**Action** :
1. Vérifier schéma DB : `PRAGMA table_info(embeddings)`
2. Remplacer toutes occurrences de `documentId` par `doc_id`
3. Tester : upload document → vérifier embeddings créés

---

**Bug 2 : search.js ligne 44** (30min)

**Fichier** : `src/modules/knowledge/search.js`

**Problème** :
```javascript
// ❌ ERREUR
const results = await env.DB.prepare(`
  SELECT * FROM documents WHERE documentId = ?
`).bind(documentId).all();
```

**Solution** :
```javascript
// ✅ CORRECTION
const results = await env.DB.prepare(`
  SELECT * FROM documents WHERE doc_id = ?
`).bind(docId).all();
```

**Action** :
1. Remplacer `documentId` par `doc_id` dans toutes les queries
2. Tester : search → vérifier résultats retournés

---

**Bug 3 : manual.js import** (30min)

**Fichier** : `src/modules/knowledge/manual.js`

**Problème** :
```javascript
// ❌ ERREUR
import { processDocument } from './embeddings';
// Mais embeddings.js n'exporte pas processDocument
```

**Solution** :
```javascript
// ✅ CORRECTION
import { generateEmbeddings } from './embeddings';
```

**Action** :
1. Vérifier exports dans embeddings.js
2. Corriger import dans manual.js
3. Tester : ajout manuel Q&A → vérifier fonctionnement

---

**Validation finale** (30min)

**Tests end-to-end RAG** :
```bash
# 1. Upload document
curl -X POST $API_URL/api/v1/knowledge/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# 2. Vérifier embeddings créés
npx wrangler d1 execute coccinelle-db --remote \
  --command="SELECT COUNT(*) FROM embeddings"

# 3. Tester search
curl "$API_URL/api/v1/knowledge/search?q=test&tenantId=tenant_demo_001"

# 4. Tester RAG
curl -X POST $API_URL/api/v1/knowledge/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Test question", "tenantId": "tenant_demo_001"}'
```

---

### 3. Optimisations Sara (2h)

**Objectif** : Améliorer précision épellation email + nom

#### Amélioration 1 : Épellation email (1h)

**Problème actuel** :
- Sara ne laisse pas assez de temps entre lettres
- Transcription incorrecte ("You Set dot amrouch" pour "youssef.amrouche")

**Solution VAPI** :
1. Augmenter "End of Speech Sensitivity" (si disponible)
2. Ajouter dans le system prompt :
```
Lors de l'épellation d'un email :
- Répète chaque lettre épelée par l'utilisateur
- Attends 2 secondes entre chaque lettre
- Confirme l'email complet à la fin
- Exemple : "Vous avez dit Y-O-U-S-S-E-F point A-M-R-O-U-C-H-E arobase outlook point fr, c'est correct ?"
```

**Tests** :
- [ ] Épeller 5 emails différents
- [ ] Vérifier transcription correcte à chaque fois
- [ ] Documenter nouveau score

#### Amélioration 2 : Nom complet (30min)

**Problème actuel** :
- Sara ne demande pas prénom ET nom séparément

**Solution** :
```
Modifier prompt Sara :
- Demande d'abord : "Quel est votre prénom ?"
- Puis : "Et votre nom de famille ?"
- Confirme : "Très bien, [Prénom] [Nom], c'est noté !"
```

**Tests** :
- [ ] Tester 3 appels complets
- [ ] Vérifier prénom/nom bien séparés dans DB

#### Tests complets Sara (30min)

**Scénarios à tester** :
1. Appel standard (recherche + dispo + RDV)
2. Appel avec correction téléphone
3. Appel avec épellation email complexe
4. Appel sans email (SMS seulement)
5. Appel avec plusieurs changements de date

**Documenter** :
- Scores (Compréhension, Réactivité, Exactitude, UX)
- Points positifs
- Points d'amélioration
- Mettre à jour MANIFESTE

---

### 4. Déploiement production frontend (2h)

**Objectif** : Frontend accessible publiquement

#### Option A : Vercel (Recommandé) (1h)

```bash
cd ~/match-immo-mcp/coccinelle-ai/coccinelle-saas

# 1. Install Vercel CLI
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel deploy --prod

# 4. Configurer variables env
vercel env add NEXT_PUBLIC_API_URL production
# Valeur : https://coccinelle-api.youssef-amrouche.workers.dev

# 5. Configurer domaine custom (optionnel)
vercel domains add coccinelle.ai
```

#### Option B : Cloudflare Pages (1h)

```bash
cd ~/match-immo-mcp/coccinelle-ai/coccinelle-saas

# 1. Build
npm run build

# 2. Deploy
npx wrangler pages deploy out

# 3. Configurer domaine
# Via Cloudflare Dashboard
```

**Tests déploiement** :
- [ ] Landing page accessible
- [ ] Signup fonctionne
- [ ] Login fonctionne
- [ ] Dashboard s'affiche
- [ ] API calls réussissent
- [ ] HTTPS actif

---

## 💡 PRIORITÉ 3 - NICE TO HAVE (9h)

### 1. Tests E2E Playwright (2h)

**Setup** :
```bash
cd ~/match-immo-mcp/coccinelle-ai/coccinelle-saas
npm install -D @playwright/test
npx playwright install
```

**Tests à créer** :

**test/auth.spec.ts** (30min)
```typescript
test('signup → login → dashboard', async ({ page }) => {
  // 1. Signup
  await page.goto('/signup');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'Test123456');
  await page.click('button[type=submit]');
  await page.waitForURL('/onboarding');
  
  // 2. Skip onboarding (pour test rapide)
  // 3. Login
  // 4. Vérifier dashboard
});
```

**test/prospects.spec.ts** (30min)
```typescript
test('CRUD prospects', async ({ page }) => {
  // Login
  // Créer prospect
  // Modifier prospect
  // Supprimer prospect
});
```

**test/appointments.spec.ts** (30min)
**test/knowledge.spec.ts** (30min)

---

### 2. Monitoring & Observabilité (2h)

#### Setup Sentry (1h)

**Backend** :
```bash
cd ~/match-immo-mcp/coccinelle-ai
npm install @sentry/node
```

```javascript
// src/index.js
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: 'production'
});

export default {
  async fetch(request, env, ctx) {
    try {
      // Code normal
    } catch (error) {
      Sentry.captureException(error);
      throw error;
    }
  }
};
```

**Frontend** :
```bash
cd coccinelle-saas
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

#### Uptime Monitoring (1h)

**Options** :
- UptimeRobot (gratuit)
- Pingdom
- StatusCake

**Endpoints à monitorer** :
- https://coccinelle-api.youssef-amrouche.workers.dev/health
- https://coccinelle.ai (frontend)

**Alertes** :
- Email si down > 2 minutes
- Slack notification

---

### 3. Rate Limiting (1h)

**Fichier** : `src/middleware/rateLimit.js`

```javascript
const rateLimit = new Map();

export async function checkRateLimit(request) {
  const ip = request.headers.get('CF-Connecting-IP');
  const key = `${ip}:${Date.now() / 60000 | 0}`;
  
  const count = rateLimit.get(key) || 0;
  
  if (count > 100) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  rateLimit.set(key, count + 1);
  return null;
}
```

**Intégrer dans index.js** :
```javascript
const rateLimitError = await checkRateLimit(request);
if (rateLimitError) return rateLimitError;
```

**Limites** :
- 100 req/minute par IP
- 1000 req/heure par tenant
- Webhook : 10 req/minute

---

### 4. CI/CD GitHub Actions (2h)

**Fichier** : `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CF_API_TOKEN }}

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd coccinelle-saas && npm install
      - run: cd coccinelle-saas && npm run build
      - run: cd coccinelle-saas && vercel deploy --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

### 5. Documentation API (2h)

#### OpenAPI/Swagger (1h30)

**Fichier** : `docs/openapi.yaml`

```yaml
openapi: 3.0.0
info:
  title: Coccinelle.AI API
  version: 3.7.3

paths:
  /api/v1/auth/signup:
    post:
      summary: Create account
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                email:
                  type: string
                password:
                  type: string
      responses:
        '200':
          description: Success
```

#### Collection Postman (30min)

**Export depuis Postman** :
- Toutes les requêtes testées
- Variables d'environnement
- Tests automatiques

---

## ✅ CHECKLIST FINALE AVANT LANCEMENT

### Backend
- [ ] 3 bugs SQL corrigés
- [ ] Tous endpoints testés
- [ ] Rate limiting actif
- [ ] Monitoring Sentry configuré
- [ ] Backups automatiques D1

### Frontend
- [ ] Page Settings complète
- [ ] Page Analytics complète
- [ ] Page Prospects complète
- [ ] Onboarding intégré backend
- [ ] Déployé sur Vercel/Netlify
- [ ] HTTPS actif
- [ ] Variables env production

### Agent Vocal
- [ ] Sara optimisée (épellation, nom)
- [ ] 5 scénarios testés
- [ ] Scores documentés
- [ ] Téléphone +33939035761 actif

### Tests
- [ ] Tests E2E Playwright OK
- [ ] Tests manuels complets
- [ ] Performance acceptable
- [ ] Pas d'erreurs JS console

### Documentation
- [ ] MANIFESTE à jour
- [ ] TODO à jour
- [ ] README complet
- [ ] API docs (OpenAPI)
- [ ] Guide utilisateur

### Marketing
- [ ] Landing page optimisée
- [ ] Vidéo démo
- [ ] Case study
- [ ] SEO basique

---

## 📅 PLANNING RECOMMANDÉ

### Semaine 1 : Priorité 1 (5h)
```
Lundi    : Page Settings (2h)
Mardi    : Page Analytics (1h)
Mercredi : Page Prospects (2h)
```

### Semaine 2 : Priorité 2 (10h)
```
Jeudi    : Onboarding backend (4h)
Vendredi : Bugs SQL (2h) + Sara (2h)
Samedi   : Déploiement (2h)
```

### Semaine 3 : Priorité 3 (9h)
```
Lundi    : Tests E2E (2h)
Mardi    : Monitoring (2h) + Rate limit (1h)
Mercredi : CI/CD (2h)
Jeudi    : Documentation (2h)
```

### Semaine 4 : Beta Tests
```
Recruter 10-15 beta testeurs
Itérations rapides
Validation metrics
```

### Semaine 5 : Lancement 🚀

---

## 🎯 QUICK WINS (Gains rapides)

**Si tu as seulement 2h** :
1. Corriger 3 bugs SQL (1h)
2. Page Settings - ProfileForm (45min)
3. Deploy frontend Vercel (15min)

**Si tu as seulement 4h** :
1. Tout ci-dessus +
2. Page Settings complète (1h)
3. Page Analytics finalisation (1h)

**Si tu as seulement 8h** :
1. Tout ci-dessus +
2. Page Prospects finalisation (2h)
3. Onboarding intégration (2h)

---

## 📞 SUPPORT

**Questions** : Relis le MANIFESTE v3.7.3 complet  
**Bugs** : Check section "Problèmes Connus"  
**API** : https://coccinelle-api.youssef-amrouche.workers.dev

---

**FIN DU TODO v3.7.3**

**Prochaine version** : v1.0 (après complétion de tout ci-dessus)

**Temps total restant** : ~24 heures  
**Priorité absolue** : Priorité 1 (5h) pour avoir v1.0 fonctionnelle
