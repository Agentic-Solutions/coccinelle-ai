# Requêtes de Vérification Post-Onboarding

## 🚀 Utilisation Rapide

### Option 1: Script Automatique (Recommandé)
```bash
./scripts/verify-onboarding-sync.sh
```

### Option 2: Commandes Manuelles
Copiez-collez les requêtes ci-dessous dans le terminal ou le dashboard Cloudflare.

---

## 📋 Requêtes SQL de Vérification

### 1. Vérifier le Tenant (Dernier créé)

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT id, company_name, sector, created_at FROM tenants ORDER BY created_at DESC LIMIT 1;"
```

**Résultat attendu**:
```json
{
  "id": "tenant_xxx",
  "company_name": "Nom de l'entreprise",
  "sector": "real_estate" (ou autre),
  "created_at": "2025-12-18..."
}
```

**🔴 Si vide**: Aucun tenant créé, l'onboarding n'a pas démarré.

---

### 2. Vérifier omni_agent_configs

**Remplacer `TENANT_ID` par l'ID du tenant obtenu ci-dessus**

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  id,
  tenant_id,
  agent_type,
  agent_name,
  voice_provider,
  voice_id,
  greeting_message,
  knowledge_base_ids,
  created_at
FROM omni_agent_configs
WHERE tenant_id = 'TENANT_ID';"
```

**Résultat attendu**:
```json
{
  "id": "agent_xxx",
  "tenant_id": "tenant_xxx",
  "agent_type": "real_estate_reception" (ou multi_purpose, etc.),
  "agent_name": "Sara",
  "voice_provider": "elevenlabs",
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "greeting_message": "Bonjour, je suis Sara, votre assistante virtuelle.",
  "knowledge_base_ids": "[\"doc_1\", \"doc_2\"]" (ou null),
  "created_at": "2025-12-18..."
}
```

**🔴 Si vide**: La synchronisation a échoué! Vérifier les logs.

**⚠️ Si agent_type = 'custom'**: Soit c'était le choix, soit l'auto-détection a échoué.

---

### 3. Vérifier omni_phone_mappings

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  id,
  phone_number,
  tenant_id,
  is_active,
  created_at
FROM omni_phone_mappings
WHERE tenant_id = 'TENANT_ID';"
```

**Résultat attendu**:
```json
{
  "id": "mapping_xxx",
  "phone_number": "+33939035760",
  "tenant_id": "tenant_xxx",
  "is_active": 1,
  "created_at": "2025-12-18..."
}
```

**🔴 Si vide**: Aucun mapping créé, les appels ne pourront pas être routés!

---

### 4. Vérifier Knowledge Base Documents

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  id,
  title,
  status,
  created_at
FROM knowledge_documents
WHERE tenant_id = 'TENANT_ID'
ORDER BY created_at DESC
LIMIT 5;"
```

**Résultat attendu**:
```json
[
  {
    "id": "doc_xxx",
    "title": "Guide utilisateur",
    "status": "processed",
    "created_at": "2025-12-18..."
  }
]
```

**⚠️ Si vide**: Aucun document KB uploadé (peut être normal).

---

### 5. Vérifier la Session d'Onboarding

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  id,
  status,
  current_step,
  progress_percentage,
  business_data,
  vapi_data,
  completed_at
FROM onboarding_sessions
WHERE tenant_id = 'TENANT_ID'
ORDER BY created_at DESC
LIMIT 1;"
```

**Résultat attendu**:
```json
{
  "id": "onb_xxx",
  "status": "completed",
  "current_step": 6,
  "progress_percentage": 100,
  "business_data": "{...}",
  "vapi_data": "{\"agent_type\": \"real_estate_reception\", ...}",
  "completed_at": "2025-12-18..."
}
```

**Vérifications importantes**:
- ✅ `status = 'completed'`
- ✅ `current_step = 6`
- ✅ `vapi_data` contient `agent_type`

---

### 6. Vérifier le Lien KB → Agent Config

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  ac.id as config_id,
  ac.agent_type,
  ac.knowledge_base_ids,
  COUNT(kd.id) as kb_docs_count
FROM omni_agent_configs ac
LEFT JOIN knowledge_documents kd ON kd.tenant_id = ac.tenant_id
WHERE ac.tenant_id = 'TENANT_ID'
GROUP BY ac.id;"
```

**Résultat attendu**:
```json
{
  "config_id": "agent_xxx",
  "agent_type": "real_estate_reception",
  "knowledge_base_ids": "[\"doc_1\", \"doc_2\"]",
  "kb_docs_count": 2
}
```

**⚠️ Si `knowledge_base_ids` est null mais `kb_docs_count` > 0**:
Les documents existent mais ne sont pas liés à l'agent.

---

### 7. Compter les Produits

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  COUNT(*) as total_products,
  SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_products
FROM products
WHERE tenant_id = 'TENANT_ID';"
```

**Résultat attendu**:
```json
{
  "total_products": 50,
  "active_products": 45
}
```

**⚠️ Si 0**: Aucun produit importé (peut être normal).

---

## 🔍 Requêtes de Diagnostic Avancé

### Vérifier TOUS les Agents Configs (Debug)

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  ac.id,
  ac.tenant_id,
  t.company_name,
  ac.agent_type,
  ac.agent_name,
  ac.created_at
FROM omni_agent_configs ac
JOIN tenants t ON ac.tenant_id = t.id
ORDER BY ac.created_at DESC
LIMIT 10;"
```

### Vérifier TOUS les Phone Mappings (Debug)

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  pm.id,
  pm.phone_number,
  pm.tenant_id,
  t.company_name,
  pm.is_active
FROM omni_phone_mappings pm
JOIN tenants t ON pm.tenant_id = t.id
ORDER BY pm.created_at DESC;"
```

### Trouver les Onboardings Non Synchronisés

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT
  os.id as session_id,
  os.tenant_id,
  os.status,
  os.completed_at,
  CASE
    WHEN ac.id IS NULL THEN 'NOT_SYNCED'
    ELSE 'SYNCED'
  END as sync_status
FROM onboarding_sessions os
LEFT JOIN omni_agent_configs ac ON os.tenant_id = ac.tenant_id
WHERE os.status = 'completed'
ORDER BY os.completed_at DESC
LIMIT 5;"
```

---

## 📊 Interprétation des Résultats

### ✅ Synchronisation Réussie

**Tous ces critères doivent être vrais**:
1. ✅ Tenant existe avec `company_name` et `sector` remplis
2. ✅ `omni_agent_configs` existe avec `agent_type` != 'custom' (sauf si voulu)
3. ✅ `omni_phone_mappings` existe avec `is_active = 1`
4. ✅ Si KB uploadée: `knowledge_base_ids` contient des IDs
5. ✅ Session onboarding `status = 'completed'`

### ❌ Synchronisation Échouée

**Symptômes**:
- ❌ `omni_agent_configs` vide pour le tenant
- ❌ `omni_phone_mappings` vide pour le tenant
- ❌ `knowledge_base_ids` null alors que des docs existent

**Actions**:
1. Vérifier les logs: `npx wrangler tail --format pretty`
2. Chercher `[Sync]` dans les logs
3. Vérifier que `completeOnboarding()` a bien appelé `syncOnboardingToOmnichannel()`

### ⚠️ Synchronisation Partielle

**Symptômes**:
- ✅ `omni_agent_configs` créé
- ❌ `knowledge_base_ids` null
- ⚠️ `agent_type = 'custom'` alors que sector = 'real_estate'

**Possible si**:
- Auto-détection agent_type a échoué
- KB non uploadée (normal)
- Phone mapping échoué mais agent config ok

---

## 🛠️ Commandes de Correction

### Forcer le Type d'Agent

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"UPDATE omni_agent_configs
SET agent_type = 'real_estate_reception',
    greeting_message = 'Bonjour, je suis Sara, votre assistante virtuelle.'
WHERE tenant_id = 'TENANT_ID';"
```

### Lier Manuellement les Documents KB

```bash
# 1. Récupérer les IDs des docs
npx wrangler d1 execute coccinelle-db --remote --command \
"SELECT id FROM knowledge_documents WHERE tenant_id = 'TENANT_ID';"

# 2. Mettre à jour (remplacer doc_1, doc_2 par les vrais IDs)
npx wrangler d1 execute coccinelle-db --remote --command \
"UPDATE omni_agent_configs
SET knowledge_base_ids = '[\"doc_1\", \"doc_2\", \"doc_3\"]'
WHERE tenant_id = 'TENANT_ID';"
```

### Créer Manuellement un Phone Mapping

```bash
npx wrangler d1 execute coccinelle-db --remote --command \
"INSERT INTO omni_phone_mappings (
  id, phone_number, tenant_id, is_active, created_at, updated_at
) VALUES (
  'mapping_manual_$(date +%s)',
  '+33939035760',
  'TENANT_ID',
  1,
  datetime('now'),
  datetime('now')
);"
```

---

## 📝 Checklist Finale

Après avoir exécuté les vérifications, cochez:

- [ ] Tenant existe avec données business
- [ ] omni_agent_configs créé avec bon agent_type
- [ ] omni_phone_mappings créé avec numéro Twilio
- [ ] knowledge_base_ids rempli (si applicable)
- [ ] Session onboarding status = 'completed'
- [ ] Tous les outils disponibles pour le type d'agent

**Si toutes les cases sont cochées** → 🎉 Prêt pour tester l'appel!

---

**Créé le**: 18 décembre 2025
**Usage**: Après chaque completion d'onboarding
**Voir aussi**: `./verify-onboarding-sync.sh` pour vérification automatique
