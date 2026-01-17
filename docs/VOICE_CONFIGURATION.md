# Configuration des Voix - Twilio ConversationRelay

Ce document explique comment configurer les différents providers de synthèse vocale (TTS) pour vos appels téléphoniques.

## 📋 Vue d'ensemble

Coccinelle supporte trois providers TTS :
- **Amazon Polly** (par défaut) - Voix naturelles, inclus dans le prix Twilio
- **ElevenLabs** - Voix ultra-réalistes, facturation supplémentaire (~5x plus cher)
- **Google Cloud TTS** - Voix Google, inclus dans le prix Twilio

Et deux providers STT (transcription) :
- **Deepgram** (par défaut, recommandé)
- **Google Speech-to-Text**

## 🎯 Configuration dans la Base de Données

La configuration vocale est stockée dans `channel_configurations.config_public` (format JSON) :

```json
{
  "clientPhoneNumber": "+33987654321",
  "twilioSharedNumber": "+33939035761",
  "sara": {
    "assistantName": "Sara",
    "agentType": "reception",
    "language": "fr-FR",

    // Configuration TTS (Synthèse vocale)
    "ttsProvider": "amazon",              // "amazon" | "elevenlabs" | "google"
    "ttsVoice": "Lea-Neural",             // Nom de la voix
    "ttsVoiceId": null,                   // Voice ID (ElevenLabs uniquement)

    // Configuration STT (Transcription)
    "transcriptionProvider": "Deepgram",  // "Deepgram" | "Google"
    "transcriptionLanguage": "fr-FR",     // Code langue BCP-47
    "speechModel": "nova-2-conversationalai",  // Modèle Deepgram

    // Message de bienvenue
    "welcomeMessage": "Bonjour, bienvenue chez Coccinelle. Je suis Sara, votre assistante virtuelle. Comment puis-je vous aider ?"
  },
  "transferNumber": "+33612345678"
}
```

## 🎙️ Voix Disponibles

### Amazon Polly (par défaut)

**Français européen (fr-FR) :**
- `Lea-Neural` - Féminin, naturelle ⭐ Recommandée
- `Remi-Neural` - Masculin, naturel
- `Lea-Generative` - Féminin, version avancée
- `Remi-Generative` - Masculin, version avancé

**Exemple de configuration :**
```json
{
  "sara": {
    "ttsProvider": "amazon",
    "ttsVoice": "Lea-Neural",
    "ttsVoiceId": null
  }
}
```

**Coût :** Inclus dans le prix Twilio ConversationRelay

### ElevenLabs (Premium)

**Français européen (fr-FR) :**
- Voice ID : `a5n9pJUnAhX4fn7lx3uo` (voix par défaut fr-FR)

**Français canadien (fr-CA) :**
- Voice ID : `IPgYtHTNLjC7Bq7IPHrm`

**Voix nommées françaises :**
- Adina (féminin) - Voix claire, professionnelle
- Abdel (masculin) - Voix chaleureuse, narration

**Exemple de configuration :**
```json
{
  "sara": {
    "ttsProvider": "elevenlabs",
    "ttsVoice": "French Female",
    "ttsVoiceId": "a5n9pJUnAhX4fn7lx3uo"
  }
}
```

**Coût :** ~5x plus cher qu'Amazon Polly (facturation ElevenLabs en plus de Twilio)

**Comment trouver les Voice IDs :**
1. Via l'interface ElevenLabs Voice Library
2. API : `GET https://api.elevenlabs.io/v1/voices`
3. Documentation Twilio : https://www.twilio.com/docs/voice/conversationrelay/voice-configuration

### Google Cloud TTS

**Français (fr-FR) :**
- `fr-FR-Wavenet-A` - Féminin
- `fr-FR-Wavenet-B` - Masculin
- `fr-FR-Wavenet-C` - Féminin
- `fr-FR-Wavenet-D` - Masculin
- `fr-FR-Neural2-A` - Féminin, neural
- `fr-FR-Neural2-B` - Masculin, neural

**Exemple de configuration :**
```json
{
  "sara": {
    "ttsProvider": "google",
    "ttsVoice": "fr-FR-Wavenet-A",
    "ttsVoiceId": null
  }
}
```

**Coût :** Inclus dans le prix Twilio ConversationRelay

## 🎧 Configuration de la Transcription (STT)

### Deepgram (Recommandé)

**Modèles disponibles :**
- `nova-2-general` - Usage général (par défaut)
- `nova-2-conversationalai` - Optimisé pour dialogue IA ⭐
- `nova-2-phonecall` - Optimisé pour téléphone
- `nova-2-meeting` - Optimisé pour réunions

**Exemple :**
```json
{
  "sara": {
    "transcriptionProvider": "Deepgram",
    "transcriptionLanguage": "fr-FR",
    "speechModel": "nova-2-conversationalai"
  }
}
```

### Google Speech-to-Text

**Modèle :**
- `telephony` - Optimisé pour téléphone

**Exemple :**
```json
{
  "sara": {
    "transcriptionProvider": "Google",
    "transcriptionLanguage": "fr-FR",
    "speechModel": "telephony"
  }
}
```

## 🛠️ Mise à Jour de la Configuration

### Via SQL (Direct)

```sql
-- Mettre à jour la configuration pour un tenant
UPDATE channel_configurations
SET config_public = json_set(
  config_public,
  '$.sara.ttsProvider', 'elevenlabs',
  '$.sara.ttsVoice', 'French Female',
  '$.sara.ttsVoiceId', 'a5n9pJUnAhX4fn7lx3uo',
  '$.sara.transcriptionProvider', 'Deepgram',
  '$.sara.transcriptionLanguage', 'fr-FR',
  '$.sara.speechModel', 'nova-2-conversationalai'
)
WHERE tenant_id = 'tenant_xxx' AND channel_type = 'phone';
```

### Via API (À implémenter)

```javascript
POST /api/v1/channels/phone/voice-config
{
  "tenantId": "tenant_xxx",
  "ttsProvider": "elevenlabs",
  "ttsVoice": "French Female",
  "ttsVoiceId": "a5n9pJUnAhX4fn7lx3uo"
}
```

## 💰 Comparatif des Coûts

| Provider | Qualité | Latence | Coût estimé (1000 minutes) | Recommandation |
|----------|---------|---------|---------------------------|----------------|
| Amazon Polly | ⭐⭐⭐⭐ | Basse | Inclus (~$10) | Par défaut |
| Google TTS | ⭐⭐⭐⭐ | Basse | Inclus (~$10) | Alternative à Amazon |
| ElevenLabs | ⭐⭐⭐⭐⭐ | Moyenne | ~$50 | Premium clients |

## 🔍 Debugging

Pour vérifier la configuration actuelle d'un tenant :

```sql
SELECT
  tenant_id,
  json_extract(config_public, '$.sara.ttsProvider') as tts_provider,
  json_extract(config_public, '$.sara.ttsVoice') as tts_voice,
  json_extract(config_public, '$.sara.ttsVoiceId') as tts_voice_id,
  json_extract(config_public, '$.sara.transcriptionProvider') as stt_provider
FROM channel_configurations
WHERE channel_type = 'phone' AND enabled = 1;
```

## 📚 Références

- [Twilio ConversationRelay - Voice Configuration](https://www.twilio.com/docs/voice/conversationrelay/voice-configuration)
- [Amazon Polly Voices](https://docs.aws.amazon.com/polly/latest/dg/available-voices.html)
- [ElevenLabs Voice Library](https://elevenlabs.io/docs/product-guides/voices/voice-library)
- [Deepgram Models](https://developers.deepgram.com/docs/models-overview)
