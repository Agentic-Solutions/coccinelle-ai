# 🚀 Module Omnichannel - Documentation Complète

## 📦 Vue d'ensemble

Le **Module Omnichannel** est un module **100% indépendant** pour la gestion multi-canal (Voice, SMS, WhatsApp, Email) avec configuration d'agent personnalisée par tenant.

### Caractéristiques Clés

✅ **Isolation complète** - Aucune dépendance au code existant
✅ **Plug-and-play** - Activation/désactivation sans casser l'existant
✅ **Coexistence** - Fonctionne en parallèle avec VAPI et Twilio
✅ **Configuration flexible** - Support ElevenLabs, Amazon Polly, Google TTS
✅ **Multi-canal** - Voice, SMS, WhatsApp, Email dans une seule conversation

---

## 📁 Structure du Module

```
src/modules/omnichannel/
├── index.js                          ✅ Router principal
├── README.md                         ✅ Documentation
├── config.js                         ✅ Configuration centralisée
├── TEST.md                           ✅ Guide de test
│
├── controllers/
│   ├── agent-config.js               ✅ CRUD configuration agent
│   └── voices.js                     ✅ Gestion voix ElevenLabs
│
├── services/
│   ├── elevenlabs.js                 ✅ API ElevenLabs
│   ├── twilio-conversations.js       ✅ API Twilio Conversations
│   └── channel-switcher.js           ✅ Logique switch canaux
│
├── webhooks/
│   └── voice.js                      ✅ Webhook appels entrants
│
├── db/
│   ├── schema.sql                    ✅ Schéma DB (3 tables)
│   └── queries.js                    ✅ Requêtes SQL réutilisables
│
└── utils/
    ├── logger.js                     ✅ Logger spécifique
    └── validator.js                  ✅ Validateurs
```

**Total : 14 fichiers créés**

---

## 🗄️ Base de Données

### Tables Créées (préfixe `omni_*`)

| Table | Description | Colonnes principales |
|-------|-------------|---------------------|
| `omni_agent_configs` | Config agent par tenant | voice_provider, voice_id, system_prompt, greeting_message |
| `omni_conversations` | Conversations multi-canal | conversation_sid, active_channels, current_channel, context |
| `omni_messages` | Historique messages | channel, direction, content, transcript, sentiment |

### Index Créés

- `idx_omni_agent_configs_tenant`
- `idx_omni_conversations_tenant`
- `idx_omni_conversations_status`
- `idx_omni_conversations_sid`
- `idx_omni_messages_conversation`
- `idx_omni_messages_created`

---

## 🔌 Endpoints API

### Configuration Agent

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/omnichannel/agent/config?tenantId=xxx` | Récupérer config |
| PUT | `/api/v1/omnichannel/agent/config` | Créer/Mettre à jour config |
| DELETE | `/api/v1/omnichannel/agent/config?tenantId=xxx` | Supprimer config |

### Voix ElevenLabs

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/omnichannel/agent/voices` | Liste toutes les voix |
| GET | `/api/v1/omnichannel/agent/voices?language=fr` | Voix françaises uniquement |
| GET | `/api/v1/omnichannel/agent/voices/:voiceId` | Détails d'une voix |
| GET | `/api/v1/omnichannel/agent/voices/models` | Liste des modèles |

### Webhooks Twilio

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/webhooks/omnichannel/voice` | Appels entrants (TwiML) |
| GET | `/webhooks/omnichannel/conversation` | WebSocket ConversationRelay |
| POST | `/webhooks/omnichannel/sms` | SMS entrants ⚠️ TODO |
| POST | `/webhooks/omnichannel/whatsapp` | WhatsApp entrants ⚠️ TODO |

### Health Check

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/omnichannel/health` | Statut du module |

---

## ⚙️ Activation du Module

### 1. Variable d'environnement

Dans `wrangler.toml` :
```toml
[vars]
OMNICHANNEL_ENABLED = "true"  # Passer de "false" à "true"
```

### 2. Secrets requis

```bash
# ElevenLabs (obligatoire pour les voix)
npx wrangler secret put ELEVENLABS_API_KEY

# Twilio Conversations (optionnel, pour multi-canal)
npx wrangler secret put TWILIO_CONVERSATIONS_SERVICE_SID
```

### 3. Migration DB

```bash
# Local
npx wrangler d1 execute coccinelle-db --local \
  --file=src/modules/omnichannel/db/schema.sql

# Production (via Dashboard Cloudflare ou après réauth)
npx wrangler d1 execute coccinelle-db --remote \
  --file=src/modules/omnichannel/db/schema.sql
```

### 4. Redémarrer

```bash
# Dev
npx wrangler dev

# Production
npx wrangler deploy
```

---

## 🎯 Configuration Agent - Exemple

```json
{
  "tenantId": "tenant_xxx",
  "agent_name": "Sara",
  "agent_personality": "friendly",
  "voice_provider": "elevenlabs",
  "voice_id": "pNInz6obpgDQGcFmaJgB",
  "voice_language": "fr-FR",
  "greeting_message": "Bonjour ! Je suis Sara, votre assistante IA.",
  "fallback_message": "Désolé, je n'ai pas compris.",
  "transfer_message": "Je vous transfère vers un conseiller.",
  "voice_settings": {
    "stability": 0.6,
    "similarity_boost": 0.8
  },
  "max_conversation_duration": 1800,
  "interruption_enabled": true,
  "sentiment_analysis_enabled": true
}
```

---

## 🔍 Providers TTS Supportés

### ElevenLabs (Recommandé)

**Avantages :**
- Voix ultra-réalistes
- 1000+ voix disponibles
- Support multilingue parfait

**Configuration :**
```json
{
  "voice_provider": "elevenlabs",
  "voice_id": "pNInz6obpgDQGcFmaJgB",  // Antoine (FR)
  "voice_settings": {
    "stability": 0.6,
    "similarity_boost": 0.8
  }
}
```

### Amazon Polly

**Configuration :**
```json
{
  "voice_provider": "amazon",
  "voice_id": "Lea-Neural"  // Voix française
}
```

### Google Cloud TTS

**Configuration :**
```json
{
  "voice_provider": "google",
  "voice_id": "fr-FR-Wavenet-A"
}
```

---

## 🧪 Tests Rapides

### 1. Health Check (module désactivé)
```bash
curl http://localhost:8787/api/v1/omnichannel/health
# Retourne 503 si désactivé
```

### 2. Health Check (module activé)
```bash
curl http://localhost:8787/api/v1/omnichannel/health
# Retourne {"status":"healthy",...}
```

### 3. Créer une config agent
```bash
curl -X PUT http://localhost:8787/api/v1/omnichannel/agent/config \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_demo_001",
    "agent_name": "Sara",
    "voice_provider": "elevenlabs",
    "voice_id": "pNInz6obpgDQGcFmaJgB"
  }'
```

### 4. Lister les voix françaises
```bash
curl "http://localhost:8787/api/v1/omnichannel/agent/voices?language=fr"
```

---

## ✅ Checklist d'Implémentation

### Phase 1 - Infrastructure ✅ FAIT
- [x] Structure de fichiers créée
- [x] Schéma DB créé (3 tables + 6 index)
- [x] Migration DB locale réussie
- [x] Variable OMNICHANNEL_ENABLED ajoutée
- [x] Intégration dans src/index.js

### Phase 2 - Services ✅ FAIT
- [x] Logger spécifique module
- [x] Validateurs
- [x] Service ElevenLabs
- [x] Service Twilio Conversations
- [x] Service Channel Switcher

### Phase 3 - Controllers ✅ FAIT
- [x] Agent Config CRUD
- [x] Voices Controller (liste, détails, modèles)

### Phase 4 - Webhooks ✅ FAIT (partiel)
- [x] Webhook Voice (appels entrants + TwiML)
- [ ] Webhook WebSocket ConversationRelay ⚠️ TODO
- [ ] Webhook SMS ⚠️ TODO
- [ ] Webhook WhatsApp ⚠️ TODO

### Phase 5 - Documentation ✅ FAIT
- [x] README.md du module
- [x] TEST.md avec tous les tests
- [x] OMNICHANNEL_MODULE.md (ce fichier)
- [x] VOICE_CONFIGURATION.md (guide voix)

---

## 🚨 Points d'Attention

### 1. Module désactivé par défaut
Le module retourne **503 Service Unavailable** tant que `OMNICHANNEL_ENABLED` n'est pas à `"true"`.

### 2. Coexistence avec VAPI/Twilio existant
Le module n'interfère pas avec les routes existantes :
- `/webhooks/twilio/*` → Module Twilio existant
- `/webhooks/omnichannel/*` → Module Omnichannel nouveau
- `/webhooks/vapi/*` → Module VAPI existant

### 3. Migration DB production
La migration remote a échoué (erreur auth Cloudflare).
**Solution :** Exécuter manuellement via Dashboard ou réauthentifier wrangler.

### 4. WebSocket non implémenté
Le handler WebSocket pour ConversationRelay retourne 501 pour l'instant.
**TODO :** Implémenter `webhooks/websocket.js` pour conversations temps réel.

---

## 📊 Métriques de Performance

| Opération | Temps attendu |
|-----------|---------------|
| Health check | < 10ms |
| GET agent config | < 50ms |
| PUT agent config | < 100ms |
| GET voices (ElevenLabs API) | < 500ms |
| Génération TwiML | < 20ms |
| Webhook voice | < 100ms |

---

## 🔗 Intégration avec Existant

### Code modifié

| Fichier | Modification | Impact |
|---------|--------------|--------|
| `src/index.js` | Ajout import + route | Aucun (conditionnel) |
| `wrangler.toml` | Ajout variable | Aucun (désactivé par défaut) |

### Code NON modifié

- ✅ Aucune modification dans `/modules/twilio/`
- ✅ Aucune modification dans `/modules/vapi/`
- ✅ Aucune modification dans autres modules
- ✅ Tables existantes intactes (préfixe `omni_*`)

---

## 🎓 Prochaines Étapes Recommandées

### Court terme
1. ✅ Activer le module (`OMNICHANNEL_ENABLED=true`)
2. ✅ Tester le health check
3. ✅ Créer une config agent de test
4. ✅ Tester la liste des voix ElevenLabs
5. ⚠️ Implémenter le WebSocket handler

### Moyen terme
6. Implémenter webhook SMS
7. Implémenter webhook WhatsApp
8. Créer UI dashboard pour config agent
9. Ajouter analytics conversations
10. Implémenter switch de canal automatique

### Long terme
11. Support email (SendGrid)
12. IA sentiment analysis temps réel
13. Enregistrement & transcription appels
14. Export conversations vers CRM

---

## 📞 Support

### Logs
Tous les logs du module utilisent le préfixe `module: "omnichannel"` :
```json
{
  "timestamp": "2025-12-02T...",
  "level": "INFO",
  "module": "omnichannel",
  "message": "..."
}
```

### Debugging
- Vérifier `OMNICHANNEL_ENABLED` dans wrangler.toml
- Vérifier secrets (`ELEVENLABS_API_KEY`)
- Vérifier tables DB créées
- Consulter `src/modules/omnichannel/TEST.md`

---

## 🏆 Résumé

**Module Omnichannel v1.0.0**

✅ **14 fichiers** créés
✅ **3 tables DB** + 6 index
✅ **2 services** (ElevenLabs, Twilio)
✅ **2 controllers** (Agent Config, Voices)
✅ **1 webhook** (Voice)
✅ **7 endpoints API** fonctionnels
✅ **Isolation complète** du code existant
✅ **Plug-and-play** activation/désactivation

**État : PRÊT POUR TESTS** 🚀
