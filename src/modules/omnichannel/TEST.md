# Tests Module Omnichannel

## 🎯 Activation du Module

### 1. Activer dans wrangler.toml
```toml
[vars]
OMNICHANNEL_ENABLED = "true"  # Changer de "false" à "true"
```

### 2. Redémarrer le worker
```bash
npx wrangler dev
# ou en production
npx wrangler deploy
```

---

## 🧪 Tests API

### Health Check
```bash
curl http://localhost:8787/api/v1/omnichannel/health
```

**Réponse attendue (module désactivé):**
```json
{
  "error": "Omnichannel module is disabled",
  "message": "Set OMNICHANNEL_ENABLED=true in wrangler.toml to enable this module"
}
```

**Réponse attendue (module activé):**
```json
{
  "status": "healthy",
  "module": "omnichannel",
  "version": "1.0.0",
  "enabled": true,
  "timestamp": "2025-12-02T..."
}
```

---

## 📋 Tests Agent Config

### 1. Créer une configuration
```bash
curl -X PUT http://localhost:8787/api/v1/omnichannel/agent/config \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_demo_001",
    "agent_name": "Sara",
    "agent_personality": "friendly",
    "voice_provider": "elevenlabs",
    "voice_id": "pNInz6obpgDQGcFmaJgB",
    "voice_language": "fr-FR",
    "greeting_message": "Bonjour ! Je suis Sara, comment puis-je vous aider ?",
    "voice_settings": {
      "stability": 0.6,
      "similarity_boost": 0.8
    }
  }'
```

### 2. Récupérer la configuration
```bash
curl "http://localhost:8787/api/v1/omnichannel/agent/config?tenantId=tenant_demo_001"
```

### 3. Supprimer la configuration
```bash
curl -X DELETE "http://localhost:8787/api/v1/omnichannel/agent/config?tenantId=tenant_demo_001"
```

---

## 🎙️ Tests Voix ElevenLabs

### 1. Lister toutes les voix
```bash
curl http://localhost:8787/api/v1/omnichannel/agent/voices
```

### 2. Lister uniquement les voix françaises
```bash
curl "http://localhost:8787/api/v1/omnichannel/agent/voices?language=fr"
```

### 3. Détails d'une voix spécifique
```bash
curl http://localhost:8787/api/v1/omnichannel/agent/voices/pNInz6obpgDQGcFmaJgB
```

### 4. Lister les modèles disponibles
```bash
curl http://localhost:8787/api/v1/omnichannel/agent/voices/models
```

---

## 📞 Tests Webhook Voice

### Simuler un appel entrant Twilio
```bash
curl -X POST http://localhost:8787/webhooks/omnichannel/voice \
  -d "CallSid=CA1234567890" \
  -d "From=+33612345678" \
  -d "To=+33939035760"
```

**Réponse attendue:** TwiML XML avec ConversationRelay

---

## 🗄️ Tests Database

### Vérifier les tables
```bash
npx wrangler d1 execute coccinelle-db --local \
  --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'omni_%'"
```

### Insérer une config de test
```sql
INSERT INTO omni_agent_configs (
  id, tenant_id, agent_name, voice_provider, voice_id, voice_language
) VALUES (
  'cfg_test_001',
  'tenant_demo_001',
  'Sara',
  'elevenlabs',
  'pNInz6obpgDQGcFmaJgB',
  'fr-FR'
);
```

### Requêter la config
```bash
npx wrangler d1 execute coccinelle-db --local \
  --command="SELECT * FROM omni_agent_configs WHERE tenant_id='tenant_demo_001'"
```

---

## ✅ Checklist de Validation

- [ ] Module désactivé par défaut (503 Service Unavailable)
- [ ] Module activable via OMNICHANNEL_ENABLED=true
- [ ] Health check fonctionne
- [ ] CRUD agent config fonctionne
- [ ] Liste des voix ElevenLabs fonctionne
- [ ] Webhook voice génère du TwiML valide
- [ ] Tables DB créées avec succès
- [ ] Routes ne cassent pas l'existant

---

## 🐛 Debugging

### Activer les logs
Les logs du module utilisent le préfixe `[OMNICHANNEL]` :
```
{"timestamp":"...","level":"INFO","module":"omnichannel","message":"..."}
```

### Erreurs communes

**1. Module disabled (503)**
→ Vérifier que `OMNICHANNEL_ENABLED="true"` dans wrangler.toml

**2. ElevenLabs API error**
→ Vérifier que `ELEVENLABS_API_KEY` est configuré

**3. Tables not found**
→ Exécuter la migration: `npx wrangler d1 execute coccinelle-db --local --file=src/modules/omnichannel/db/schema.sql`

---

## 📊 Métriques de Performance

- Temps de réponse API < 200ms
- Génération TwiML < 50ms
- Requête DB < 10ms
- Appel ElevenLabs API < 500ms
