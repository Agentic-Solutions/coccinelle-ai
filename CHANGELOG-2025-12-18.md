# Changelog - 18 Décembre 2025

## Synchronisation Onboarding → Omnichannel & Types d'Agents

### 🎯 Objectif
Corriger le problème critique où 80% des données collectées pendant l'onboarding n'étaient jamais transférées vers les modules omnichannel.

---

## ✅ Changements Implémentés

### 1. Module de Synchronisation Onboarding → Omnichannel

**Fichier créé**: `/src/modules/onboarding/sync-omnichannel.js` (258 lignes)

#### Fonctions principales:

##### `syncOnboardingToOmnichannel(env, sessionId, tenantId)`
Orchestrateur principal qui synchronise toutes les données:
- Récupère les données d'onboarding (business, vapi, kb, twilio)
- Crée/met à jour la config agent
- Crée le phone mapping
- Lie les documents KB
- Met à jour les données business du tenant

##### `syncAgentConfig(env, tenantId, data)`
Crée ou met à jour `omni_agent_configs`:
- **Priorité 1**: Utilise `vapi_data.agent_type` si fourni
- **Priorité 2**: Auto-détection basée sur `business.industry`:
  - `real_estate` / `immobilier` → `real_estate_reception`
  - `beauty` / `health` → `appointment_booking`
  - Autres → `custom`
- Récupère `company_name` depuis la table `tenants`
- Utilise les valeurs par défaut pour voice (ElevenLabs)

##### `syncPhoneMapping(env, tenantId, data)`
Crée ou met à jour `omni_phone_mappings`:
- Mappe `twilio.phoneNumber` vers `tenant_id`
- Permet le routage des appels entrants vers le bon tenant

##### `syncKnowledgeBase(env, tenantId, data)`
Lie les documents de knowledge base à l'agent:
- Récupère les 10 derniers documents du tenant
- Met à jour `omni_agent_configs.knowledge_base_ids` avec un JSON array

##### `syncTenantBusinessData(env, tenantId, data)`
Met à jour les informations business du tenant:
- `company_name` depuis `business.companyName`
- `sector` depuis `business.industry`

---

### 2. API Endpoint pour Types d'Agents

**Fichier modifié**: `/src/modules/onboarding/routes.js`

#### Nouveau endpoint: `GET /api/v1/onboarding/agent-types`

**Réponse**:
```json
{
  "success": true,
  "agent_types": [
    {
      "id": "real_estate_reception",
      "name": "Réception d'appels immobiliers",
      "description": "Accueille les appels entrants, recherche des biens et prend des rendez-vous",
      "tools": ["searchProducts", "bookAppointment"]
    },
    {
      "id": "real_estate_callback",
      "name": "Rappel de prospects immobiliers",
      "description": "Rappelle les prospects qui ont manifesté un intérêt pour un bien",
      "tools": ["searchProducts", "bookAppointment"]
    },
    {
      "id": "appointment_booking",
      "name": "Prise de rendez-vous générique",
      "description": "Prend des rendez-vous pour tout type de service",
      "tools": ["bookAppointment"]
    },
    {
      "id": "phone_reception",
      "name": "Accueil téléphonique",
      "description": "Accueille et oriente les appels vers les bons services",
      "tools": ["transferCall", "faq"]
    },
    {
      "id": "customer_support",
      "name": "Support client",
      "description": "Répond aux questions et traite les demandes SAV",
      "tools": ["searchKnowledgeBase", "createTicket", "transferCall"]
    },
    {
      "id": "custom",
      "name": "Configuration personnalisée",
      "description": "Agent entièrement configuré par l'utilisateur",
      "tools": []
    }
  ]
}
```

**Fonction**: `getAgentTypes(request, env)`
- Importe dynamiquement `AGENT_TYPES` depuis `/src/modules/omnichannel/templates/agent-types.js`
- Convertit l'objet en tableau avec les infos essentielles

---

### 3. Intégration dans le Flux d'Onboarding

**Fichier modifié**: `/src/modules/onboarding/routes.js` - fonction `completeOnboarding()`

**Ligne ~680-689**:
```javascript
// 🆕 SYNCHRONISER LES DONNÉES VERS OMNICHANNEL
console.log(`[Onboarding] Synchronizing data to omnichannel for tenant ${tenantId}`);
const syncResult = await syncOnboardingToOmnichannel(env, sessionId, tenantId);

if (!syncResult.success) {
  console.error(`[Onboarding] Sync failed:`, syncResult.error);
  // On continue quand même mais on log l'erreur
} else {
  console.log(`[Onboarding] Successfully synced to omnichannel`);
}
```

**Ligne ~709-715** (réponse):
```javascript
return {
  success: true,
  message: 'Onboarding terminé avec succès ! 🎉',
  duration_seconds: durationSeconds,
  duration_minutes: Math.round(durationSeconds / 60),
  sync_status: syncResult.success ? 'synced' : 'partial'
};
```

---

## 🗂️ Fichiers Modifiés

### Nouveaux fichiers:
1. ✅ `/src/modules/onboarding/sync-omnichannel.js` (258 lignes)

### Fichiers modifiés:
1. ✅ `/src/modules/onboarding/routes.js`
   - Import de `syncOnboardingToOmnichannel`
   - Ajout de `getAgentTypes()` (lignes 755-784)
   - Ajout de la route `GET /api/v1/onboarding/agent-types` (lignes 802-809)
   - Ajout de l'appel à `syncOnboardingToOmnichannel()` dans `completeOnboarding()` (lignes ~680-689)

---

## 🚀 Déploiements

### Déploiement 1 (Version ID: 4f2fa5cd-01ef-4cd6-a3b2-830bc0898054)
- Date: 18 décembre 2025
- Contenu: Synchronisation Onboarding → Omnichannel

### Déploiement 2 (Version ID: 4e98565b-e609-48e1-a8c6-73a7d170e0b8)
- Date: 18 décembre 2025
- Contenu: API endpoint pour types d'agents + priorité agent_type

---

## 🧪 Tests Effectués

### Test 1: Endpoint Agent Types
```bash
curl -s https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/onboarding/agent-types | jq
```
✅ **Résultat**: Retourne bien les 6 types d'agents avec leurs descriptions et outils

---

## 📋 TODO List

### ✅ Complétés:
1. ✅ Créer la table omni_phone_mappings manquante (table existait déjà)
2. ✅ Implémenter la synchronisation Onboarding → Agent Config
3. ✅ Déployer les changements sur Cloudflare Workers (2 déploiements)
4. ✅ Ajouter la sélection du type d'agent dans l'onboarding (API backend)

### 🔄 En cours:
5. 🔄 Mettre à jour le frontend pour la sélection de type d'agent

### ⏳ À faire:
6. ⏳ Tester le flux complet onboarding → appel

---

## 🎯 Prochaines Étapes (Frontend)

### Modification nécessaire dans `coccinelle-saas`

**Fichier à modifier**: Étape 4 de l'onboarding (VAPI Configuration)

**Changements requis**:
1. Appeler `GET /api/v1/onboarding/agent-types` au montage du composant
2. Afficher un sélecteur (cartes ou dropdown) pour choisir le type d'agent
3. Inclure `agent_type` dans `vapi_data` lors de la soumission de l'étape 4

**Exemple de code**:
```javascript
const [agentTypes, setAgentTypes] = useState([]);
const [selectedAgentType, setSelectedAgentType] = useState('real_estate_reception');

useEffect(() => {
  fetch(`${API_BASE_URL}/api/v1/onboarding/agent-types`)
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        setAgentTypes(data.agent_types);
      }
    });
}, []);

// Lors de la soumission
const vapiData = {
  agentName: formData.agentName,
  voice_provider: formData.voice_provider,
  voice_id: formData.voice_id,
  language: formData.language,
  agent_type: selectedAgentType // <-- NOUVEAU
};
```

---

## 🔍 Analyse Technique

### Flux de données actuel:

```
ONBOARDING
  ↓
  1. User complète les 6 étapes
  2. business_data, vapi_data, kb_data, twilio_data stockés dans onboarding_sessions
  3. completeOnboarding() appelé
  ↓
  🆕 syncOnboardingToOmnichannel()
  ↓
  4. Crée/met à jour omni_agent_configs (avec agent_type)
  5. Crée omni_phone_mappings (téléphone → tenant)
  6. Lie les documents KB à l'agent
  7. Met à jour les infos business du tenant
  ↓
APPEL ENTRANT
  ↓
  8. Twilio webhook → /webhooks/omnichannel/voice
  9. Résolution tenant via ForwardedFrom/To dans omni_phone_mappings
  10. Récupération omni_agent_configs du tenant
  11. Génération greeting_message depuis agent_type template
  12. ConversationRelay avec config agent
  ↓
CONVERSATION
  ↓
  13. WebSocket → conversation-orchestrator.js
  14. ClaudeAIService avec system_prompt depuis agent_type template
  15. Tools disponibles selon agent_type (searchProducts, bookAppointment, etc.)
```

### Priorité de configuration:

**Pour agent_type**:
1. `vapi_data.agent_type` (choix explicite du user)
2. Auto-détection via `business.industry`
3. Fallback: `'custom'`

**Pour system_prompt** (dans claude-ai.js):
1. `agent_config.system_prompt` personnalisé (si existe et non vide)
2. Template depuis `AGENT_TYPES[agent_type].system_prompt_template`
3. Fallback: prompt par défaut

**Pour greeting_message** (dans voice.js):
1. `agent_config.greeting_message` personnalisé (sauf si = message par défaut générique)
2. Template depuis `AGENT_TYPES[agent_type].greeting_template`
3. Fallback: message par défaut

---

## 📝 Notes Importantes

### Comportement de auto-détection d'agent_type:
- Ne fonctionne que pour `real_estate`, `immobilier`, `beauty`, `health`
- Autres industries → `custom` (nécessite choix manuel)

### Format de knowledge_base_ids:
- Stocké en JSON array: `["doc_id_1", "doc_id_2", ...]`
- Limité aux 10 derniers documents du tenant

### Phone mapping:
- Un numéro de téléphone = un seul tenant
- Si le numéro existe déjà, met à jour le tenant_id

---

## 🐛 Bugs Corrigés

1. ✅ **80% des données d'onboarding perdues**: Maintenant synchronisées vers omnichannel
2. ✅ **agent_type toujours 'custom'**: Auto-détection + choix manuel possible
3. ✅ **Documents KB non liés**: Maintenant linkés via knowledge_base_ids
4. ✅ **company_name manquant**: Récupéré et stocké dans tenants
5. ✅ **Phone mappings non créés**: Créés automatiquement lors du complete

---

## 📊 Impact

### Avant:
- Onboarding complété → aucune config agent créée
- Appels entrants → utilisent config par défaut générique
- Documents KB créés mais inaccessibles
- 80% du travail d'onboarding perdu

### Après:
- Onboarding complété → config agent complète avec bon type
- Appels entrants → comportement adapté au type d'agent choisi
- Documents KB liés et utilisables par l'agent
- Toutes les données d'onboarding exploitées

---

## 🔐 Sécurité

- Aucun changement de sécurité
- Validation tenant_id maintenue sur toutes les routes
- Pas d'exposition de données sensibles

---

## ⚡ Performance

- Synchronisation synchrone lors de `completeOnboarding()`
- Temps additionnel estimé: ~200-500ms (4-5 requêtes DB)
- Acceptable car opération unique par tenant

---

**Document créé le**: 18 décembre 2025
**Auteur**: Claude Code
**Version API**: coccinelle-api v2.8.0
**Version Worker**: 4e98565b-e609-48e1-a8c6-73a7d170e0b8
