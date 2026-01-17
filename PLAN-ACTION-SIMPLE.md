# Plan d'Action Simplifié - 3 Corrections Critiques
## 18 Décembre 2025

---

## 🎯 OBJECTIF
Faire fonctionner l'onboarding → dashboard de bout en bout avec l'essentiel

---

## ✅ CE QUI FONCTIONNE DÉJÀ
- Sign up / Login
- Onboarding complet
- Synchronisation omni_agent_configs
- Navigation dashboard

---

## 🔧 LES 3 CORRECTIONS ESSENTIELLES

### 1. ✅ Enrichir GET /api/v1/omnichannel/agent/config

**Fichier**: `/src/modules/omnichannel/controllers/agent-config.js`

**Modification**: Ajouter `agent_type` et `phone_number` à la réponse

**Code à ajouter** (après ligne 48):
```javascript
// Récupérer aussi le phone mapping
const phoneMapping = await env.DB.prepare(`
  SELECT client_phone_number FROM omni_phone_mappings
  WHERE tenant_id = ?
  LIMIT 1
`).bind(tenantId).first();

// Ajouter agent_type et phone_number à la réponse
config.phone_number = phoneMapping?.client_phone_number || null;
```

---

### 2. ✅ Frontend - Charger les données dans Config Canal Voix

**Fichier**: `/coccinelle-saas/app/dashboard/settings/voice-channel/page.tsx`

**Problème**: La page existe mais ne charge pas les données depuis l'API

**Solution**: Il faut vérifier si ce fichier existe, sinon le créer

---

### 3. ✅ Frontend - Charger profil utilisateur dans Paramètres

**Fichier**: `/coccinelle-saas/app/dashboard/settings/page.tsx`

**Solution**: Charger via `GET /api/v1/auth/me` qui retourne déjà `user` et `tenant`

---

## 📝 ACTIONS CONCRÈTES

### Action 1: Backend - Enrichir agent-config
1. Lire `/src/modules/omnichannel/controllers/agent-config.js`
2. Ajouter requête pour phone_number
3. Ajouter à la réponse JSON

### Action 2: Frontend - Vérifier/créer page Config Canal Voix
1. Chercher le fichier de settings voice
2. Si n'existe pas, le créer from scratch
3. Charger données via API au mount

### Action 3: Frontend - Pré-remplir Paramètres
1. Modifier `/app/dashboard/settings/page.tsx`
2. Appeler `/api/v1/auth/me` au mount
3. Pré-remplir les champs

---

## 🚫 CE QU'ON NE FAIT PAS (POUR L'INSTANT)

- ❌ Crawler KB onboarding (complexe, non bloquant)
- ❌ Fix chargement intermittent KB (non bloquant)
- ❌ Bouton Sauvegarder RDV (feature secondaire)
- ❌ Email/SMS notifications (feature avancée)

---

## ⏱️ ESTIMATION
- Action 1: 5 min
- Action 2: 15 min
- Action 3: 10 min
**TOTAL: 30 minutes**

---

## ✅ RÉSULTAT ATTENDU

Après ces 3 corrections, l'utilisateur qui termine l'onboarding verra dans son dashboard :

**Config Canal Voix** :
- ✅ Numéro de téléphone pré-rempli
- ✅ Type d'agent sélectionné (multi_purpose)
- ✅ Nom de l'agent (Claude)
- ✅ Voix sélectionnée (féminine)

**Paramètres (Profil)** :
- ✅ Nom/Prénom
- ✅ Email
- ✅ Entreprise

---

**Statut**: 🟢 Prêt à exécuter
**Priorité**: CRITIQUE
**Impact**: UX PME
