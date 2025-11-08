# 📋 MANIFESTE TODO - CE QUI RESTE À FAIRE

**Dernière mise à jour** : 8 novembre 2025, 19:00  
**Progression globale** : 95%  
**Temps estimé restant** : 15-25 heures (~2-3 jours)

---

## 🎯 PRIORITÉ 1 - CRITIQUE (5h) - PROCHAIN CHAT

### 1. Page Settings (2h)
**Fichier** : `coccinelle-saas/app/dashboard/settings/page.tsx`  
**Status** : 🔴 À créer

**Composants à créer** :
- [ ] `ProfileForm.tsx` - Modification profil (nom, email, photo)
- [ ] `APIKeysForm.tsx` - Gestion clés API (VAPI, OpenAI, Anthropic)
- [ ] `NotificationsSettings.tsx` - Préférences notifications
- [ ] `SecuritySettings.tsx` - Mot de passe, 2FA

**Endpoints backend utilisés** :
- GET `/api/v1/auth/me` - Profil actuel
- PUT `/api/v1/auth/profile` - Modifier profil
- POST `/api/v1/api-keys` - Générer clé API
- DELETE `/api/v1/api-keys/:id` - Révoquer clé API

**Tests à faire** :
- [ ] Modification nom/email fonctionne
- [ ] Upload photo profil fonctionne
- [ ] Génération API key fonctionne
- [ ] Révocation API key fonctionne
- [ ] Changement mot de passe fonctionne

---

### 2. Page Analytics - Finalisation (1h)
**Fichier** : `coccinelle-saas/app/dashboard/analytics/page.tsx`  
**Status** : 🟡 80% complété

**À ajouter** :
- [ ] Graphique "Taux conversion prospects → RDV" (Recharts LineChart)
- [ ] Graphique "Évolution mensuelle appels" (Recharts BarChart)
- [ ] Filtres par période (7j, 30j, 90j, custom)
- [ ] Bouton Export PDF (jsPDF)
- [ ] Comparaison période précédente (%)

**Endpoints backend à créer** :
- [ ] GET `/api/v1/analytics/conversion-rate?period=30d`
- [ ] GET `/api/v1/analytics/monthly-evolution?months=6`

**Tests à faire** :
- [ ] Graphiques s'affichent correctement
- [ ] Filtres fonctionnent
- [ ] Export PDF génère document correct
- [ ] Données temps réel

---

### 3. Page Prospects - Finalisation (2h)
**Fichier** : `coccinelle-saas/app/dashboard/prospects/page.tsx`  
**Status** : 🟡 70% complété

**À ajouter** :
- [ ] Filtres avancés (statut, agent assigné, date création, score)
- [ ] Modal création prospect (formulaire complet)
- [ ] Modal édition prospect (formulaire complet)
- [ ] Export CSV/Excel (xlsx)
- [ ] Section notes et commentaires
- [ ] Historique des interactions (appels, emails, RDV)
- [ ] Assignation agent
- [ ] Tags personnalisés

**Composants à créer** :
- [ ] `ProspectFilters.tsx` - Barre filtres avancés
- [ ] `ProspectModal.tsx` - Modal création/édition
- [ ] `ProspectNotes.tsx` - Notes et commentaires
- [ ] `ProspectHistory.tsx` - Historique interactions

**Tests à faire** :
- [ ] Création prospect fonctionne
- [ ] Édition prospect fonctionne
- [ ] Filtres fonctionnent (toutes combinaisons)
- [ ] Export Excel génère fichier correct
- [ ] Notes s'enregistrent
- [ ] Historique complet visible

---

## 🎯 PRIORITÉ 2 - IMPORTANT (10h) - SEMAINE PROCHAINE

### 4. Onboarding intégration backend (4h)
**Fichier** : `coccinelle-saas/app/onboarding/page.tsx`  
**Status** : 🟡 60% complété (frontend seul)

**Problème actuel** : Onboarding frontend n'appelle pas le backend

**À faire** :

#### Étape 1 : Appel `/start` au début
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

#### Étape 2 : PUT `/step` à chaque étape
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
```

#### Étape 3 : Auto-génération après horaires
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
```

#### Étape 4 : Config VAPI automatique
```typescript
// Après choix voix Sara
const configureVapi = async () => {
  await fetch(
    `${API_URL}/api/v1/onboarding/${sessionId}/vapi/auto-configure`,
    {
      method: 'POST',
      body: JSON.stringify({ voiceType: selectedVoice })
    }
  );
};
```

#### Étape 5 : Initialisation KB
```typescript
// Après ajout documents
const initKB = async () => {
  await fetch(
    `${API_URL}/api/v1/onboarding/${sessionId}/kb/initialize`,
    {
      method: 'POST',
      body: JSON.stringify({ documents: uploadedDocs })
    }
  );
};
```

#### Étape 6 : Complétion et redirection
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
- [ ] Workflow complet : Signup → Onboarding → Dashboard
- [ ] Agent créé automatiquement dans DB
- [ ] VAPI configuré avec bon assistant
- [ ] KB initialisée avec documents
- [ ] Téléphone Sara fonctionnel
- [ ] User peut appeler Sara immédiatement

**Temps estimé** : 4h

---

### 5. Architecture modulaire backend (4h)
**Fichier actuel** : `src/index.js` (1,500 lignes) ⚠️  
**Problème** : Fichier monolithique, difficile à maintenir

**Structure cible** :
```
src/
├── index.js (50 lignes - entry point seulement)
├── config/
│   ├── database.js       # Config D1
│   ├── cors.js           # CORS middleware
│   ├── jwt.js            # JWT utils
│   └── secrets.js        # Secrets management
├── middleware/
│   ├── auth.js           # JWT validation
│   ├── tenant.js         # Multi-tenant isolation
│   └── rateLimit.js      # Rate limiting
├── modules/
│   ├── auth/
│   │   ├── routes.js     # 5 routes auth
│   │   ├── controller.js # Logique métier
│   │   └── service.js    # Bcrypt, JWT
│   ├── prospects/
│   │   ├── routes.js     # 5 routes CRUD
│   │   ├── controller.js
│   │   └── service.js
│   ├── appointments/
│   │   ├── routes.js     # 5 routes CRUD
│   │   ├── controller.js
│   │   └── service.js
│   ├── knowledge/
│   │   ├── routes.js     # 8 routes KB
│   │   ├── crawler.js    # Web crawling
│   │   ├── processor.js  # Chunking
│   │   ├── embeddings.js # OpenAI
│   │   └── search.js     # RAG search
│   ├── vapi/
│   │   ├── webhooks.js   # 3 webhooks
│   │   ├── tools.js      # Tool calls
│   │   └── config.js     # VAPI config
│   ├── agents/
│   │   ├── routes.js
│   │   ├── controller.js
│   │   └── availability.js
│   └── notifications/
│       ├── sms.js        # Twilio
│       └── email.js      # Resend
└── utils/
    ├── logger.js         # Structured logging
    ├── errors.js         # Error handling
    └── validation.js     # Input validation
```

**Plan de migration** :

#### Phase 1 : Extraire module Auth (1h)
- [ ] Créer `src/modules/auth/routes.js`
- [ ] Créer `src/modules/auth/controller.js`
- [ ] Créer `src/modules/auth/service.js`
- [ ] Tester : 5 endpoints auth fonctionnent
- [ ] Commit : `refactor(auth): extract auth module`

#### Phase 2 : Extraire module Knowledge (1h)
- [ ] Créer `src/modules/knowledge/routes.js`
- [ ] Déplacer `src/search.js` → `src/modules/knowledge/search.js`
- [ ] Déplacer `src/embeddings.js` → `src/modules/knowledge/embeddings.js`
- [ ] Créer `crawler.js`, `processor.js`
- [ ] Tester : 8 endpoints KB fonctionnent
- [ ] Commit : `refactor(knowledge): extract KB module`

#### Phase 3 : Extraire module VAPI (1h)
- [ ] Créer `src/modules/vapi/webhooks.js`
- [ ] Créer `src/modules/vapi/tools.js`
- [ ] Tester : 3 webhooks fonctionnent
- [ ] Commit : `refactor(vapi): extract VAPI module`

#### Phase 4 : Extraire modules restants (1h)
- [ ] Module Prospects
- [ ] Module Appointments
- [ ] Module Agents
- [ ] Module Notifications
- [ ] Commit : `refactor: complete modular architecture`

**Tests après migration** :
- [ ] TOUS les endpoints fonctionnent (32/32)
- [ ] Aucune régression
- [ ] Performance identique ou meilleure
- [ ] Déploiement Cloudflare OK

**Avantages** :
- ✅ Code plus lisible (fichiers <300 lignes)
- ✅ Maintenance facilitée
- ✅ Tests unitaires possibles
- ✅ Collaboration facilitée
- ✅ Onboarding nouveaux devs plus rapide

---

### 6. Optimisations Sara (2h)
**Objectif** : Améliorer qualité vocale et comportement

**Tests scénarios** :
- [ ] Scénario 1 : Appel standard (présentation + RDV)
- [ ] Scénario 2 : Client pressé (être concise)
- [ ] Scénario 3 : Client curieux (répondre questions détaillées)
- [ ] Scénario 4 : Mauvaise connexion (répéter si nécessaire)
- [ ] Scénario 5 : Client confus (reformuler simplement)
- [ ] Scénario 6 : Client agressif (rester calme et professionnelle)
- [ ] Scénario 7 : Prise RDV urgente (même jour)
- [ ] Scénario 8 : Modification RDV existant
- [ ] Scénario 9 : Annulation RDV
- [ ] Scénario 10 : Questions hors sujet (recentrer conversation)
- [ ] Scénario 11 : Demande info non disponible (utiliser RAG)
- [ ] Scénario 12 : Client multilingue (rester français)
- [ ] Scénario 13 : Numéro incorrect (demander correction)
- [ ] Scénario 14 : Email invalide (demander correction)
- [ ] Scénario 15 : Fin conversation naturelle

**Corrections prononciation** :
- [ ] Mots-clés immobiliers (m², T2, T3, etc.)
- [ ] Noms de quartiers
- [ ] Horaires (14h → quatorze heures)
- [ ] Prix (250 000€ → deux cent cinquante mille euros)

**Ajustements comportement** :
- [ ] Ton plus naturel et chaleureux
- [ ] Débit de parole optimal (ni trop rapide, ni trop lent)
- [ ] Pauses naturelles
- [ ] Gestion interruptions
- [ ] Reformulation si incompréhension

---

## 🎯 PRIORITÉ 3 - DÉPLOIEMENT PRODUCTION (4h)

### 7. Frontend Vercel (2h)
**Objectif** : Déployer coccinelle-saas en production

**Étapes** :
- [ ] Build Next.js optimisé (`npm run build`)
- [ ] Créer compte Vercel
- [ ] Connecter repo GitHub
- [ ] Configurer variables d'environnement production
  ```
  NEXT_PUBLIC_API_URL=https://coccinelle-api.youssef-amrouche.workers.dev
  NEXT_PUBLIC_API_KEY=[API_KEY_PRODUCTION]
  ```
- [ ] Configurer custom domain (coccinelle.ai ou subdomain)
- [ ] Activer HTTPS/SSL automatique
- [ ] Configurer redirections (www → non-www)
- [ ] Tester déploiement

**Tests production** :
- [ ] Landing page accessible
- [ ] Signup fonctionne
- [ ] Login fonctionne
- [ ] Dashboard accessible après login
- [ ] Toutes les pages chargent
- [ ] API backend répond correctement
- [ ] HTTPS activé
- [ ] Temps de chargement <2s

---

### 8. Monitoring & Alertes (2h)
**Objectif** : Surveiller production et détecter erreurs

**Sentry (1h)** :
- [ ] Créer compte Sentry
- [ ] Installer SDK backend (Cloudflare Workers)
  ```bash
  npm install @sentry/cloudflare
  ```
- [ ] Installer SDK frontend (Next.js)
  ```bash
  npm install @sentry/nextjs
  ```
- [ ] Configurer Sentry DSN
- [ ] Tester capture erreurs
- [ ] Configurer alertes email

**Uptime monitoring (30min)** :
- [ ] Configurer UptimeRobot ou équivalent
- [ ] Monitorer API backend (ping toutes les 5min)
- [ ] Monitorer frontend (ping toutes les 5min)
- [ ] Alertes si down >2min

**Dashboard métriques (30min)** :
- [ ] Configurer Cloudflare Analytics
- [ ] Suivre : Requests/min, Latency, Errors
- [ ] Alertes si erreurs >5%

---

## 🎯 PRIORITÉ 4 - TESTS & VALIDATION (5h)

### 9. Tests utilisateurs pilotes (3h)
**Objectif** : Valider avec vrais utilisateurs

**Recrutement** :
- [ ] Contacter 5 agences immobilières locales
- [ ] Proposer beta test gratuit 1 mois
- [ ] Préparer onboarding personnalisé

**Tests** :
- [ ] Onboarding complet (signup → Sara opérationnelle)
- [ ] Workflow quotidien (recevoir appels, gérer RDV)
- [ ] Dashboard utilisation
- [ ] Questionnaire satisfaction
- [ ] Session feedback 1-on-1

**Métriques à mesurer** :
- [ ] Temps onboarding (objectif : <10min)
- [ ] Taux activation (objectif : >85%)
- [ ] Satisfaction Sara (objectif : >8/10)
- [ ] NPS (objectif : >50)

---

### 10. Tests techniques automatisés (2h)
**Objectif** : Suite de tests End-to-End

**Playwright E2E** :
- [ ] Test 1 : Signup → Dashboard
- [ ] Test 2 : Login → Logout
- [ ] Test 3 : Création prospect → Export
- [ ] Test 4 : Upload document KB → Search
- [ ] Test 5 : Création RDV → Notification

**Tests API (Postman)** :
- [ ] Collection complète 32 endpoints
- [ ] Tests authentification
- [ ] Tests CRUD complets
- [ ] Tests erreurs (400, 401, 404, 500)

**Tests de charge (Artillery.io)** :
- [ ] 100 req/s pendant 1min
- [ ] 1000 req/s pendant 10s (spike test)
- [ ] Vérifier latency <500ms

**Tests sécurité** :
- [ ] OWASP Top 10
- [ ] SQL injection
- [ ] XSS
- [ ] CSRF
- [ ] Rate limiting

---

## 🎯 PRIORITÉ 5 - BONUS (Optionnel, non urgent)

### 11. Documentation utilisateur (3h)
- [ ] Guide utilisateur PDF
- [ ] Vidéos tutoriels (5 vidéos)
- [ ] FAQ complète
- [ ] Base de connaissances

### 12. Features avancées (20h+)
- [ ] Multi-langue (EN, ES)
- [ ] Mobile app (React Native)
- [ ] Intégrations (Zapier, Make)
- [ ] Webhooks custom
- [ ] API publique

### 13. Migration SIP OVH (4h)
- [ ] Setup compte OVH SIP
- [ ] Configuration trunk SIP
- [ ] Migration depuis VAPI
- [ ] Tests appels
- [ ] **Économie** : -70% coûts téléphonie

---

## 📅 PLANNING RECOMMANDÉ

### Semaine 1 (11-17 nov) - 15h
**Lundi-Mardi** : Priorité 1 (5h)
- Page Settings
- Page Analytics finalisation
- Page Prospects finalisation

**Mercredi-Vendredi** : Priorité 2 (10h)
- Onboarding intégration backend (4h)
- Architecture modulaire (4h)
- Optimisations Sara (2h)

### Semaine 2 (18-24 nov) - 9h
**Lundi-Mardi** : Priorité 3 (4h)
- Déploiement Vercel
- Monitoring & alertes

**Mercredi-Vendredi** : Priorité 4 (5h)
- Tests utilisateurs pilotes
- Tests techniques automatisés

### Semaine 3 (25 nov - 1 déc) - Buffer
- Corrections feedback utilisateurs
- Ajustements finaux
- **LANCEMENT v1.0** 🚀

---

## ⚠️ BLOQUANTS ACTUELS

**Aucun bloquant actuellement** ✅

Tous les modules sont fonctionnels, il ne reste que :
- Finalisation pages frontend
- Intégrations backend
- Déploiement production
- Tests validation

---

## 📊 MÉTRIQUES PROGRESSION

| Priorité | Tâches | Heures | Status |
|----------|--------|--------|--------|
| P1 - Critique | 3 | 5h | 🔴 À faire |
| P2 - Important | 3 | 10h | 🔴 À faire |
| P3 - Déploiement | 2 | 4h | 🔴 À faire |
| P4 - Tests | 2 | 5h | 🔴 À faire |
| **TOTAL** | **10** | **24h** | **🟡 95%** |

**Temps restant jusqu'à v1.0** : 24 heures (~3 jours de dev)

---

## 🎯 QUICK WINS (Gains rapides)

**Actions 1h qui débloquent beaucoup** :
1. ✅ Page Settings basique (sans upload photo) - 1h
2. ✅ Filtres prospects (sans export) - 1h
3. ✅ 2 graphiques Analytics - 1h
4. ✅ Onboarding appel `/start` au minimum - 1h
5. ✅ Module Auth extrait - 1h

---

**Dernière mise à jour** : 8 novembre 2025, 19:00  
**Prochain check** : Après session suivante  
**Objectif** : v1.0 Production pour fin novembre 2025 🚀
