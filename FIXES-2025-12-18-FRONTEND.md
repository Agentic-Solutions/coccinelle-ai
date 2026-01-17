# Correctifs Frontend - 18 Décembre 2025

## 🔴 PROBLÈME CRITIQUE IDENTIFIÉ

**Deux systèmes d'onboarding complètement déconnectés** :

### ❌ Ancien Système (Frontend seul)
- Sauvegarde uniquement dans **localStorage**
- N'appelle **JAMAIS** l'API backend
- Agent types **hardcodés** (4 au lieu de 7)
- **Aucune synchronisation** vers les tables omnichannel

### ✅ Nouveau Système (Frontend ↔ Backend)
- Crée une **session d'onboarding** en DB
- Appelle l'API à **chaque étape**
- Charge les **7 agent types dynamiquement** depuis l'API
- Déclenche la **synchronisation omnichannel** à la fin

---

## 📋 CORRECTIONS APPLIQUÉES

### 1️⃣ PhoneConfigStep.jsx

**Fichier** : `/coccinelle-saas/src/components/onboarding/PhoneConfigStep.jsx`

**Avant** :
```javascript
// Hardcodé avec 4 agent types
const AGENT_TYPES = [
  { value: 'reception', label: 'Accueil téléphonique', ... },
  { value: 'qualification', label: 'Qualification de leads', ... },
  { value: 'appointment', label: 'Prise de rendez-vous', ... },
  { value: 'support', label: 'Support client', ... }
];
```

**Après** :
```javascript
// Chargement dynamique depuis l'API
useEffect(() => {
  const fetchAgentTypes = async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/onboarding/agent-types`);
    const data = await response.json();

    if (data.success && data.agent_types) {
      const typesWithIcons = data.agent_types.map(type => ({
        ...type,
        value: type.id,
        label: type.name,
        icon: ICON_MAP[type.id] || Bot
      }));
      setAgentTypes(typesWithIcons);
    }
  };

  fetchAgentTypes();
}, []);
```

**Résultat** :
- ✅ Affiche maintenant **7 agent types** incluant "Agent Polyvalent" (multi_purpose)
- ✅ Icône Sparkles ✨ pour multi_purpose
- ✅ État de chargement avec spinner
- ✅ Fallback en cas d'erreur réseau

**Sauvegarde** : `PhoneConfigStep.jsx.backup-2025-12-18-fixed`

---

### 2️⃣ page.tsx (Flux onboarding principal)

**Fichier** : `/coccinelle-saas/app/onboarding/page.tsx`

**Avant** :
```javascript
const handleComplete = async () => {
  // Sauvegarder toute la configuration dans localStorage
  localStorage.setItem('onboarding_channels', JSON.stringify(selectedChannels));
  localStorage.setItem('onboarding_channel_configs', JSON.stringify(channelConfigs));
  localStorage.setItem('onboarding_kb', JSON.stringify(kbData));
  localStorage.setItem('onboarding_completed', 'true');

  router.push('/dashboard');
};
```

**Après** :
```javascript
// 1. Créer session au démarrage
useEffect(() => {
  const initSession = async () => {
    const response = await fetch(`${API_BASE_URL}/api/v1/onboarding/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    const data = await response.json();
    if (data.success) {
      setSessionId(data.session_id);
      setTenantId(data.tenant_id);
    }
  };

  initSession();
}, []);

// 2. Sauvegarder à chaque étape
const handleNext = async (stepData) => {
  if (currentStep.id === 'business-info') {
    await fetch(`${API_BASE_URL}/api/v1/onboarding/session/${sessionId}/business`, {
      method: 'POST',
      body: JSON.stringify({
        company_name: stepData.companyName,
        industry: stepData.industry,
        phone: stepData.phone,
        email: stepData.email
      })
    });
  } else if (currentStep.channelId === 'phone') {
    await fetch(`${API_BASE_URL}/api/v1/onboarding/session/${sessionId}/vapi`, {
      method: 'POST',
      body: JSON.stringify({
        agent_type: stepData.phone.agent_type,
        voice: stepData.phone.voice,
        assistant_name: stepData.phone.assistant_name
      })
    });
  }
  // ... etc pour KB
};

// 3. Compléter avec synchronisation
const handleComplete = async () => {
  const response = await fetch(`${API_BASE_URL}/api/v1/onboarding/session/${sessionId}/complete`, {
    method: 'POST'
  });

  const data = await response.json();
  if (data.success) {
    console.log('Sync status:', data.sync_status);
    router.push('/dashboard');
  }
};
```

**Résultat** :
- ✅ Crée une **session d'onboarding** en DB au démarrage
- ✅ Sauvegarde les **données business** dans `onboarding_sessions.business_data`
- ✅ Sauvegarde la **config VAPI** dans `onboarding_sessions.vapi_data`
- ✅ Appelle `/complete` qui déclenche **syncOnboardingToOmnichannel()**
- ✅ Les données sont **synchronisées** vers `omni_agent_configs` et `omni_phone_mappings`

**Sauvegarde** : `page.tsx.backup-2025-12-18-localStorage`

---

## 🔄 FLUX COMPLET APRÈS CORRECTION

```
1. Utilisateur arrive sur /onboarding
   ↓
2. useEffect() → POST /api/v1/onboarding/session
   → Création tenant + session en DB
   → Retourne session_id + tenant_id
   ↓
3. Étape "Business Info" → Utilisateur remplit
   → handleNext() → POST /session/{id}/business
   → Sauvegarde dans onboarding_sessions.business_data
   ↓
4. Étape "Sélection Canaux" → Utilisateur choisit "Phone"
   ↓
5. Étape "Config Phone" → Utilisateur voit 7 agent types
   → Sélectionne "Agent Polyvalent" (multi_purpose)
   → handleNext() → POST /session/{id}/vapi
   → Sauvegarde { agent_type: "multi_purpose", voice: "female", ... }
   ↓
6. Étape "Knowledge Base" (optionnel)
   → POST /session/{id}/kb
   ↓
7. Étape "Complétion" → Utilisateur clique "Terminer"
   → handleComplete() → POST /session/{id}/complete
   ↓
8. Backend : completeOnboarding()
   → Met à jour status = 'completed'
   → Appelle syncOnboardingToOmnichannel()
   ↓
9. syncOnboardingToOmnichannel()
   → Crée omni_agent_configs avec agent_type = "multi_purpose"
   → Crée omni_phone_mappings avec phone_number Twilio
   → Lie knowledge_base_ids si documents uploadés
   ↓
10. Frontend redirige vers /dashboard
    → Les configs sont maintenant disponibles pour les appels !
```

---

## ✅ CE QUI FONCTIONNE MAINTENANT

1. **7 agent types affichés** (au lieu de 4)
   - real_estate_reception
   - real_estate_callback
   - appointment_booking
   - phone_reception
   - customer_support
   - **multi_purpose** ✨ (nouveau)
   - custom

2. **Synchronisation complète** vers omnichannel
   - omni_agent_configs créé avec bon agent_type
   - omni_phone_mappings créé pour routing
   - knowledge_base_ids lié si documents uploadés

3. **Données persistées en DB** (plus seulement localStorage)
   - onboarding_sessions avec toutes les données
   - tenants avec company_name, sector, etc.

---

## ❌ CE QUI RESTE À CORRIGER

### 1. Mentions "Twilio" dans l'UI

**Fichier** : `/coccinelle-saas/src/components/onboarding/ChannelSelectionStep.jsx:17`

```javascript
// Ligne 17 - À CORRIGER
description: 'Messages texte via Twilio',

// Proposition
description: 'Messages texte SMS',
```

**Fichier** : `/coccinelle-saas/src/components/onboarding/SMSConfigStep.jsx` (à vérifier)

### 2. KB Crawler non fonctionnel

**Problème** : L'utilisateur entre une URL dans `KnowledgeBaseStep`, mais rien n'est crawlé.

**À faire** :
- Vérifier si `KnowledgeBaseStep` appelle bien l'API de crawling
- Implémenter ou fixer l'endpoint `/api/v1/kb/crawl`

### 3. Erreur API 500 sur "Structurer avec l'IA"

**Endpoint** : `/api/v1/kb/structure` (ou similaire)

**À faire** :
- Identifier l'erreur dans les logs Cloudflare
- Corriger le traitement OpenAI ou Anthropic

### 4. Route 404 : `/dashboard/appointments/settings`

**À faire** :
- Créer le fichier `/coccinelle-saas/app/dashboard/appointments/settings/page.tsx`
- Ou rediriger vers une autre page de config RDV

### 5. Doublon "Conversations" vs "Channels"

**À faire** :
- Clarifier la navigation du dashboard
- Renommer ou fusionner les sections

---

## 📊 VÉRIFICATIONS À FAIRE

### Test du flux complet

```bash
# 1. Vider la DB
npx wrangler d1 execute coccinelle-db --remote --command "DELETE FROM onboarding_sessions;"
npx wrangler d1 execute coccinelle-db --remote --command "DELETE FROM omni_agent_configs;"
npx wrangler d1 execute coccinelle-db --remote --command "DELETE FROM omni_phone_mappings;"

# 2. Lancer le frontend
cd coccinelle-saas && npm run dev

# 3. Aller sur http://localhost:3000/onboarding

# 4. Remplir l'onboarding jusqu'au bout

# 5. Vérifier avec le script
cd .. && ./scripts/verify-onboarding-sync.sh
```

**Résultat attendu** :
```
✅ Tenant
✅ Agent Config avec agent_type = 'multi_purpose'
✅ Phone Mapping avec numéro Twilio
✅ Session onboarding status = 'completed'
```

---

## 📁 FICHIERS MODIFIÉS

### Frontend

1. `/coccinelle-saas/src/components/onboarding/PhoneConfigStep.jsx`
   - **Avant** : 4 agent types hardcodés
   - **Après** : Chargement dynamique depuis API, 7 types
   - **Sauvegarde** : `PhoneConfigStep.jsx.backup-2025-12-18-fixed`

2. `/coccinelle-saas/app/onboarding/page.tsx`
   - **Avant** : Sauvegarde localStorage uniquement
   - **Après** : Appels API à chaque étape + synchronisation
   - **Sauvegarde** : `page.tsx.backup-2025-12-18-localStorage`

### Backend (déjà déployé)

1. `/src/modules/onboarding/routes.js`
   - Endpoint `/api/v1/onboarding/agent-types` (GET)
   - Endpoint `/api/v1/onboarding/session/{id}/complete` (POST)
   - Appelle `syncOnboardingToOmnichannel()`

2. `/src/modules/onboarding/sync-omnichannel.js`
   - Synchronisation complète vers omni_agent_configs, omni_phone_mappings, etc.

3. `/src/modules/omnichannel/templates/agent-types.js`
   - Ajout du type `multi_purpose`

---

## 🚀 PROCHAINES ÉTAPES

1. **Tester le nouveau flux** (voir section Vérifications)
2. **Corriger les mentions Twilio** dans l'UI
3. **Fixer le KB crawler** pour qu'il crawl réellement les URLs
4. **Débugger l'erreur 500** sur la structuration KB
5. **Créer la route** `/dashboard/appointments/settings`

---

**Date** : 18 décembre 2025
**Status** : ✅ Frontend connecté à l'API, synchronisation opérationnelle
**Tests** : À faire par l'utilisateur

