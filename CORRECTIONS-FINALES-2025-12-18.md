# Corrections Finales - Application Complète
## 18 Décembre 2025

---

## 🎯 OBJECTIF
Faire fonctionner l'application de bout en bout avec toutes les données onboarding disponibles dans le dashboard.

---

## ✅ DÉJÀ FONCTIONNEL
1. Signup + Login
2. Onboarding flow complet (6 étapes)
3. Synchronisation vers `omni_agent_configs` et `omni_phone_mappings`
4. Navigation dashboard
5. CORS configuré pour localhost:3002

---

## ❌ PROBLÈMES À CORRIGER

### 1. PRÉ-REMPLISSAGE CONFIG CANAL VOIX (PRIORITÉ 1)

**Problème**: Page `/dashboard/settings/voice-channel` ne charge pas les données depuis `omni_agent_configs`

**Données manquantes**:
- Numéro de téléphone du client
- Nom de l'agent (changé de Sara à Claude)
- Type d'agent sélectionné (multi_purpose au lieu de basique)
- Voix sélectionnée (féminine)

**Solution**:
1. Créer endpoint backend `GET /api/v1/omnichannel/agent-config` qui retourne les données
2. Modifier le frontend pour charger ces données au mount du composant

**Fichiers à modifier**:
- Frontend: `/coccinelle-saas/app/dashboard/settings/voice-channel/page.tsx`
- Backend: Ajouter route dans `/src/modules/omnichannel/index.js`

---

### 2. PRÉ-REMPLISSAGE PARAMÈTRES (PRIORITÉ 1)

**Problème**: Page `/dashboard/settings` (Profil) ne charge pas les infos business

**Données manquantes**:
- Prénom/Nom (depuis user.name)
- Email (non modifiable)
- Téléphone (depuis business_data)
- Entreprise (depuis business_data.company_name)

**Solution**:
Frontend doit charger via `GET /api/v1/auth/me` qui retourne déjà tenant.name

**Fichier à modifier**:
- `/coccinelle-saas/app/dashboard/settings/page.tsx`

---

### 3. CRAWLER KB ONBOARDING NON PERSISTÉ (PRIORITÉ 2)

**Problème**: Lors de l'onboarding step KB, le crawl fonctionne (3 documents retournés) mais ils ne sont PAS sauvegardés en DB

**Console logs**:
```
[Onboarding] processLocalCrawl retourné: 3 documents
✅ Documents sauvegardés dans la DB: 3
```
Mais dans le dashboard KB → aucun document

**Root cause probable**:
Le `tenant_id` utilisé lors du crawl onboarding ne correspond pas au tenant_id de l'utilisateur connecté au dashboard

**Solution**:
Vérifier que `processLocalCrawl()` dans `/lib/onboarding-kb-handlers.js` utilise bien le `tenantId` retourné par la session onboarding

**Fichiers à vérifier**:
- `/coccinelle-saas/lib/onboarding-kb-handlers.js`
- `/coccinelle-saas/src/components/onboarding/KnowledgeBaseStep.jsx`

---

### 4. CHARGEMENT INTERMITTENT DOCUMENTS KB (PRIORITÉ 2)

**Problème**: Page `/dashboard/knowledge` charge les documents de façon aléatoire

**Symptômes**: Parfois 0 documents, parfois 3, avec le même tenant_id

**Root cause probable**:
Race condition ou problème de cache dans la requête `GET /api/v1/knowledge/documents`

**Solution**:
Ajouter logging côté backend pour voir si la requête arrive avec le bon tenant_id

**Fichiers à vérifier**:
- Backend: `/src/modules/knowledge/routes.js`
- Frontend: `/coccinelle-saas/app/dashboard/knowledge/page.tsx`

---

### 5. BOUTON SAUVEGARDER RDV INACTIF (PRIORITÉ 3)

**Problème**: Dans `/dashboard/appointments/settings`, le bouton "Sauvegarder" sauvegarde en localStorage mais pas en API

**Solution**:
1. Créer endpoint backend `PUT /api/v1/appointments/settings`
2. Modifier le frontend pour appeler cet endpoint

**Fichiers à modifier**:
- Frontend: `/coccinelle-saas/app/dashboard/appointments/settings/page.tsx`
- Backend: Ajouter route dans `/src/modules/appointments/routes.js`

---

### 6. EMAIL CONFIRMATION & SMS RAPPEL (PRIORITÉ 4)

**Problème**: Toggles présents mais fonctionnalité pas implémentée

**Ce qui est nécessaire**:
1. **Backend**:
   - Route pour sauvegarder préférences notifications
   - Logique d'envoi email via Resend (déjà configuré dans .env.local)
   - Logique d'envoi SMS via Twilio (déjà configuré dans .env.local)

2. **Frontend**:
   - Connecter les toggles à l'API

**Fichiers à créer/modifier**:
- Backend: `/src/modules/appointments/notifications.js` (nouveau)
- Backend: Ajouter routes dans `/src/modules/appointments/routes.js`
- Frontend: `/coccinelle-saas/app/dashboard/appointments/settings/page.tsx`

**Note**: RESEND_API_KEY et TWILIO_* sont déjà dans .env.local, il suffit de les utiliser

---

## 📋 PLAN D'ACTION DÉTAILLÉ

### Phase 1: Pré-remplissage (CRITIQUE pour UX)

#### 1.1 Config Canal Voix

**Backend** - Créer endpoint GET:
```javascript
// Dans /src/modules/omnichannel/index.js
if (path === '/api/v1/omnichannel/agent-config' && method === 'GET') {
  const config = await env.DB.prepare(`
    SELECT * FROM omni_agent_configs
    WHERE tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 1
  `).bind(tenantId).first();

  const phoneMapping = await env.DB.prepare(`
    SELECT * FROM omni_phone_mappings
    WHERE tenant_id = ?
  `).bind(tenantId).first();

  return {
    success: true,
    config: config,
    phone_number: phoneMapping?.client_phone_number
  };
}
```

**Frontend** - Charger au mount:
```typescript
// Dans /app/dashboard/settings/voice-channel/page.tsx
useEffect(() => {
  const loadConfig = async () => {
    const res = await fetch(`${API_URL}/api/v1/omnichannel/agent-config`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      setAgentType(data.config.agent_type);
      setVoice(data.config.voice_id);
      setAssistantName(data.config.assistant_name);
      setPhoneNumber(data.phone_number);
    }
  };
  loadConfig();
}, []);
```

#### 1.2 Paramètres Profil

**Frontend** - Charger depuis /auth/me:
```typescript
useEffect(() => {
  const loadProfile = async () => {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      setName(data.user.name);
      setEmail(data.user.email);
      setCompanyName(data.tenant.name);
      // Phone depuis onboarding_sessions.business_data si disponible
    }
  };
  loadProfile();
}, []);
```

---

### Phase 2: Knowledge Base

#### 2.1 Fixer crawler onboarding

**Problème**: tenantId mismatch entre onboarding et dashboard

**Solution**:
1. S'assurer que `processLocalCrawl()` utilise le tenantId de la session
2. Vérifier que les documents sont bien insérés avec le bon tenant_id

**Vérification**:
```sql
-- Après onboarding, dans D1:
SELECT id, tenant_id, title FROM knowledge_documents
WHERE tenant_id = 'tenant_xxx'
ORDER BY created_at DESC;
```

#### 2.2 Corriger chargement intermittent

**Backend logging**:
```javascript
// Dans /src/modules/knowledge/routes.js
console.log('[KB] GET documents for tenant:', tenantId);
const docs = await env.DB.prepare(`
  SELECT * FROM knowledge_documents
  WHERE tenant_id = ?
`).bind(tenantId).all();
console.log('[KB] Found documents:', docs.results.length);
```

---

### Phase 3: Appointments

#### 3.1 Sauvegarder paramètres RDV

**Backend** - Créer table `appointment_settings`:
```sql
CREATE TABLE IF NOT EXISTS appointment_settings (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  default_duration INTEGER DEFAULT 30,
  buffer_time INTEGER DEFAULT 15,
  working_hours TEXT, -- JSON
  notifications TEXT, -- JSON
  max_daily_appointments INTEGER DEFAULT 12,
  allow_same_day_booking INTEGER DEFAULT 1,
  advance_booking_days INTEGER DEFAULT 30,
  created_at TEXT,
  updated_at TEXT
);
```

**Backend** - Routes:
```javascript
// GET /api/v1/appointments/settings
// PUT /api/v1/appointments/settings
```

#### 3.2 Implémenter Email & SMS

**Backend** - Module notifications:
```javascript
// /src/modules/appointments/notifications.js
export async function sendConfirmationEmail(env, appointment) {
  // Utiliser env.RESEND_API_KEY
  // Template email avec détails RDV
}

export async function sendSMSReminder(env, appointment) {
  // Utiliser env.TWILIO_*
  // Envoyer SMS X heures avant
}
```

---

## 🧪 TESTS À EFFECTUER

### Test E2E complet:
1. ✅ Signup nouveau compte
2. ✅ Onboarding complet avec:
   - Nom entreprise: "Test PME"
   - Phone: +33612345678
   - Agent type: multi_purpose
   - Voix: féminine
   - Nom agent: "Julie"
   - KB: crawler https://example.com
3. ⏳ Vérifier dashboard:
   - Config Canal Voix pré-remplie
   - Paramètres pré-remplis
   - Knowledge Base affiche 3+ documents
   - RDV settings sauvegardent en DB

---

## 📊 ORDRE DE PRIORITÉ

### URGENT (Impact UX PME direct):
1. Pré-remplir Config Canal Voix
2. Pré-remplir Paramètres
3. Fixer crawler KB onboarding

### IMPORTANT (Fonctionnalités essentielles):
4. Corriger chargement documents KB
5. Connecter bouton Sauvegarder RDV

### NICE TO HAVE (Fonctionnalités avancées):
6. Implémenter Email confirmation
7. Implémenter SMS rappel

---

## 🚀 DÉPLOIEMENT

Après corrections:
```bash
# Backend
npx wrangler deploy

# Frontend (déjà en dev sur :3002)
# Aucun redémarrage nécessaire (hot reload)
```

---

**Document créé le**: 18 décembre 2025
**Objectif**: Application complète et fonctionnelle
**Status**: 🟡 En cours de correction
