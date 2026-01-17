# Instructions pour Test End-to-End

## 🎯 Objectif
Tester le flux complet : Onboarding → Synchronisation → Appel téléphonique avec Sara

---

## ⚠️ Problème d'Authentification Cloudflare

Wrangler ne peut pas s'authentifier actuellement. Erreur:
```
Failed to fetch auth token: TypeError: fetch failed
ETIMEDOUT
```

**Actions requises**:
1. Vérifier la connexion internet
2. Ré-authentifier Cloudflare: `npx wrangler login`
3. Ou définir `CLOUDFLARE_API_TOKEN` dans l'environnement

---

## 📋 Étape 1: Nettoyer la Base de Données

### Option A: Via l'API (après ré-authentification et déploiement)

```bash
# Déployer les changements de cleanup
npx wrangler deploy

# Nettoyer la DB via l'API
curl -X POST https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/admin/cleanup
```

### Option B: Via Cloudflare Dashboard

1. Aller sur https://dash.cloudflare.com
2. Workers & Pages > D1 > coccinelle-db
3. Console > Coller le contenu de `database/cleanup-for-e2e-test.sql`
4. Cliquer sur "Execute"

### Option C: Via SQL File (après ré-authentification)

```bash
npx wrangler d1 execute coccinelle-db --remote --file=database/cleanup-for-e2e-test.sql
```

---

## 📋 Étape 2: Créer un Nouveau Tenant via Onboarding

### 2.1 Accéder à l'Onboarding

Frontend en dev: http://localhost:3000/onboarding

### 2.2 Compléter les 6 Étapes

#### Étape 1: Informations Business
- Nom de l'entreprise: **Nestenn Toulouse Rangueil** (ou autre)
- Email: test-e2e@example.com
- Secteur: **Immobilier** (important pour auto-détection agent_type)

#### Étape 2: Plus de détails business
- Compléter selon besoin

#### Étape 3: Agents
- Auto-générer les agents

#### Étape 4: Configuration Sara (🆕 IMPORTANT)
- **Vérifier que les types d'agents se chargent depuis l'API**
- **Sélectionner**: "Réception d'appels immobiliers"
- Voix: Féminine
- Nom: Sara

**Points à vérifier**:
- ✅ Un spinner "Chargement des types d'agents..." apparaît
- ✅ 6 types d'agents s'affichent (pas 4)
- ✅ Icônes correctes pour chaque type

#### Étape 5: Knowledge Base
- Uploader quelques documents (optionnel)

#### Étape 6: Configuration Téléphonie
- Numéro Twilio: **+33939035760** (ou un autre)

### 2.3 Finaliser l'Onboarding

Cliquer sur "Terminer l'onboarding"

**Vérifier dans la réponse API**:
```json
{
  "success": true,
  "message": "Onboarding terminé avec succès ! 🎉",
  "sync_status": "synced"  // ← IMPORTANT: doit être "synced"
}
```

---

## 📋 Étape 3: Vérifier la Synchronisation en DB

### Via Cloudflare Dashboard

```sql
-- 1. Vérifier que le tenant existe
SELECT id, company_name, sector FROM tenants;

-- 2. Vérifier que omni_agent_configs a été créé
SELECT
  id,
  tenant_id,
  agent_type,
  agent_name,
  voice_provider,
  voice_id,
  greeting_message,
  knowledge_base_ids
FROM omni_agent_configs;

-- 3. Vérifier que omni_phone_mappings a été créé
SELECT
  id,
  phone_number,
  tenant_id,
  is_active
FROM omni_phone_mappings;

-- 4. Vérifier les documents KB liés (si uploadés)
SELECT id, tenant_id, title, status FROM knowledge_documents;
```

### Résultats Attendus

**Table tenants**:
```
id: tenant_xxx
company_name: Nestenn Toulouse Rangueil
sector: immobilier (ou real_estate)
```

**Table omni_agent_configs**:
```
agent_type: real_estate_reception  ← IMPORTANT!
agent_name: Sara
voice_provider: elevenlabs
greeting_message: Bonjour, je suis Sara, votre assistante virtuelle.
knowledge_base_ids: ["doc_id_1", "doc_id_2"]  (si KB uploadée)
```

**Table omni_phone_mappings**:
```
phone_number: +33939035760
tenant_id: tenant_xxx
is_active: 1
```

---

## 📋 Étape 4: Tester l'Appel Téléphonique

### 4.1 Appeler le Numéro Twilio

Composer: **+33 9 39 03 57 60**

### 4.2 Vérifications Critiques

#### ✅ Greeting Personnalisé
Sara devrait dire:
> "Bonjour, Sara IA de Nestenn Toulouse Rangueil. Comment puis-je vous aider aujourd'hui ?"

❌ **PAS**: "Bonjour, je suis Sara, votre assistante virtuelle."

#### ✅ Comportement Real Estate Reception
1. Sara écoute votre demande
2. Elle demande vos critères de recherche (ville, budget, nombre de pièces)
3. Elle peut rechercher des biens avec `searchProducts`
4. Elle peut prendre un RDV avec `bookAppointment`

### 4.3 Scénario de Test Complet

**Conversation exemple**:

```
Vous: Bonjour
Sara: Bonjour, Sara IA de Nestenn Toulouse Rangueil. Comment puis-je vous aider aujourd'hui ?

Vous: Je cherche un appartement
Sara: Très bien. Dans quelle ville recherchez-vous ?

Vous: À Toulouse
Sara: Parfait. Quel est votre budget ?

Vous: Environ 300 000 euros
Sara: Combien de pièces souhaitez-vous ?

Vous: 3 pièces
Sara: [Recherche dans la base...] Nous avons X biens disponibles. Voici un premier bien...

Vous: Le premier m'intéresse, je voudrais le visiter
Sara: Excellent ! Pour planifier une visite, j'ai besoin de votre nom et email...

Vous: Jean Dupont, jean@example.com
Sara: Merci. Je vous propose demain à 14h, cela vous convient ?

Vous: Oui parfait
Sara: Parfait ! Votre rendez-vous est confirmé pour demain 14h...
```

---

## 📋 Étape 5: Vérifier les Données Post-Appel

### Via Cloudflare Dashboard

```sql
-- 1. Vérifier la conversation
SELECT
  id,
  tenant_id,
  phone,
  status,
  created_at
FROM omni_conversations
ORDER BY created_at DESC
LIMIT 1;

-- 2. Vérifier les messages
SELECT
  role,
  content,
  created_at
FROM omni_messages
WHERE conversation_id = 'conv_xxx'
ORDER BY created_at;

-- 3. Vérifier le RDV créé (si test complet)
SELECT
  id,
  tenant_id,
  prospect_id,
  property_id,
  type,
  scheduled_at,
  status,
  notes
FROM appointments
ORDER BY created_at DESC
LIMIT 1;

-- 4. Vérifier le prospect créé
SELECT
  id,
  tenant_id,
  name,
  email,
  phone,
  created_at
FROM prospects
ORDER BY created_at DESC
LIMIT 1;
```

---

## 🐛 Troubleshooting

### Problème 1: Greeting Non Personnalisé

**Symptôme**: Sara dit "Bonjour, je suis Sara, votre assistante virtuelle."

**Causes possibles**:
1. `agent_type` = 'custom' au lieu de 'real_estate_reception'
2. `company_name` NULL dans tenants
3. Ancien déploiement (voice.js pas à jour)

**Solutions**:
```sql
-- Vérifier agent_type
SELECT agent_type, greeting_message FROM omni_agent_configs WHERE tenant_id = 'tenant_xxx';

-- Forcer le bon type
UPDATE omni_agent_configs
SET agent_type = 'real_estate_reception',
    greeting_message = 'Bonjour, je suis Sara, votre assistante virtuelle.'
WHERE tenant_id = 'tenant_xxx';

-- Vérifier company_name
SELECT company_name FROM tenants WHERE id = 'tenant_xxx';

-- Si NULL, mettre à jour
UPDATE tenants SET company_name = 'Nestenn Toulouse Rangueil' WHERE id = 'tenant_xxx';
```

### Problème 2: Aucun Type d'Agent ne se Charge

**Symptôme**: Loading infini à l'étape 4

**Solutions**:
1. Vérifier que l'API répond:
   ```bash
   curl https://coccinelle-api.youssef-amrouche.workers.dev/api/v1/onboarding/agent-types
   ```

2. Vérifier les logs navigateur (F12 > Console)

3. Vérifier `NEXT_PUBLIC_API_BASE_URL` dans le .env frontend

### Problème 3: Synchronisation Échouée

**Symptôme**: `sync_status: "partial"` dans la réponse

**Solutions**:
1. Vérifier les logs Cloudflare:
   ```bash
   npx wrangler tail --format pretty
   ```

2. Chercher `[Sync] Error:` dans les logs

3. Vérifier que toutes les tables existent

### Problème 4: Pas de Phone Mapping

**Symptôme**: Appel entrant → "default tenant" au lieu du bon tenant

**Solutions**:
```sql
-- Vérifier phone mappings
SELECT * FROM omni_phone_mappings;

-- Créer manuellement si manquant
INSERT INTO omni_phone_mappings (
  id, phone_number, tenant_id, is_active, created_at, updated_at
) VALUES (
  'mapping_manual_001',
  '+33939035760',
  'tenant_xxx',
  1,
  datetime('now'),
  datetime('now')
);
```

---

## 📊 Checklist de Validation Finale

### Frontend
- [ ] 6 types d'agents s'affichent (pas 4)
- [ ] Spinner de chargement visible
- [ ] Icônes correctes pour chaque type
- [ ] Sélection d'un type fonctionne
- [ ] Soumission de l'étape 4 inclut `agent_type`

### Backend
- [ ] `sync_status: "synced"` dans la réponse de completion
- [ ] `omni_agent_configs` créé avec bon `agent_type`
- [ ] `omni_phone_mappings` créé avec le numéro Twilio
- [ ] `knowledge_base_ids` rempli (si KB uploadée)
- [ ] `company_name` et `sector` mis à jour dans tenants

### Appel Téléphonique
- [ ] Greeting personnalisé avec nom de l'agence
- [ ] Comportement Real Estate (demande critères)
- [ ] Recherche de produits fonctionne
- [ ] Prise de RDV fonctionne (collecte nom + email)
- [ ] Conversation enregistrée dans omni_conversations
- [ ] Messages enregistrés dans omni_messages

---

## 🚀 Après le Test

Si tout fonctionne:
1. ✅ Marquer le TODO "Tester le flux complet" comme completed
2. ✅ Déployer en production si nécessaire
3. ✅ Documenter tout bug trouvé

Si des problèmes:
1. Noter les symptômes précis
2. Copier les logs Cloudflare pertinents
3. Copier les résultats SQL des vérifications
4. Partager pour debugging

---

## 📝 Fichiers Importants

### Documentation
- `/CHANGELOG-2025-12-18.md` - Détails techniques complets
- `/MANIFEST-2025-12-18.md` - Inventaire des modifications
- `/INSTRUCTIONS-TEST-E2E.md` - Ce fichier

### Scripts
- `/database/cleanup-for-e2e-test.sql` - Nettoyage SQL
- `/src/utils/cleanup-database.js` - Utilitaire de nettoyage

### Backup
- `/coccinelle-saas/src/components/onboarding/SaraConfigStep.jsx.backup-2025-12-18`

---

**Document créé le**: 18 décembre 2025
**Pour**: Test End-to-End après synchronisation Onboarding → Omnichannel
**Version API**: coccinelle-api v2.8.0 (à déployer après ré-auth)
