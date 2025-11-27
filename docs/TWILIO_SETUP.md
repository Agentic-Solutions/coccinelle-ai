# Configuration Twilio ConversationRelay pour Coccinelle.AI

## Architecture

```
Appel entrant → Numéro Twilio FR (+33939035760)
       ↓
   Webhook POST /webhooks/twilio/voice
       ↓
   TwiML avec <ConversationRelay>
       ↓
   WebSocket /webhooks/twilio/conversation
       ↓
   ConversationManager + Claude API
       ↓
   Réponse vocale (TTS ElevenLabs)
```

## Prérequis

1. Compte Twilio avec numéro français
2. Clés API configurées dans Cloudflare Workers

## Variables d'environnement requises

```bash
# Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+33939035760

# IA
ANTHROPIC_API_KEY=sk-ant-xxxxxxx
OPENAI_API_KEY=sk-xxxxxxx  # Pour les embeddings

# Optionnel - ElevenLabs pour TTS custom
ELEVENLABS_API_KEY=xxxxxxx
```

## Configuration sur Twilio Console

### 1. Configurer le numéro de téléphone

1. Aller sur https://console.twilio.com/
2. Phone Numbers → Manage → Active Numbers
3. Sélectionner le numéro +33939035760
4. Dans "Voice Configuration":
   - **A CALL COMES IN**: Webhook
   - **URL**: `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/twilio/voice`
   - **HTTP Method**: POST
5. Dans "Status Callback URL" (optionnel):
   - **URL**: `https://coccinelle-api.youssef-amrouche.workers.dev/webhooks/twilio/status`
   - **HTTP Method**: POST

### 2. Activer ConversationRelay (Beta)

ConversationRelay est en beta. Pour l'activer:
1. Contacter le support Twilio ou activer via la console
2. S'assurer que le numéro supporte les fonctionnalités vocales avancées

## Endpoints API

### Webhooks Twilio (internes)

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/webhooks/twilio/voice` | POST | Webhook initial appel entrant |
| `/webhooks/twilio/status` | POST | Callback statut d'appel |
| `/webhooks/twilio/conversation` | WebSocket | ConversationRelay bidirectionnel |

### API publique

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/v1/twilio/calls` | GET | Liste des appels |
| `/api/v1/twilio/stats` | GET | Statistiques d'appels |

## Configuration STT/TTS

### Deepgram (Speech-to-Text)
- Modèle: `nova-2` (meilleur pour le français)
- Langue: `fr-FR`
- Détection automatique de fin de phrase

### ElevenLabs / Polly (Text-to-Speech)
- Voix par défaut: `Polly.Lea-Neural` (AWS Polly)
- Alternative ElevenLabs pour voix plus naturelle
- Configurable par tenant

## Flux de conversation

1. **Appel entrant** → Webhook reçoit les infos de l'appel
2. **TwiML retourné** → Initie ConversationRelay avec WebSocket
3. **Message setup** → Connexion WebSocket établie
4. **Message prompt** → Transcription utilisateur reçue
5. **Traitement Claude** → Génération de réponse + tool calls
6. **Message text** → Réponse envoyée pour TTS
7. **Boucle** → Continue jusqu'à fin d'appel

## Tool Calls disponibles

### search_knowledge
Recherche dans la base de connaissances du tenant.

```json
{
  "name": "search_knowledge",
  "input": { "query": "Quels sont vos horaires ?" }
}
```

### check_availability
Vérifie les créneaux disponibles.

```json
{
  "name": "check_availability",
  "input": {
    "date": "2024-12-01",
    "service_type": "consultation"
  }
}
```

### book_appointment
Réserve un rendez-vous.

```json
{
  "name": "book_appointment",
  "input": {
    "date": "2024-12-01",
    "time": "14:00",
    "client_name": "Jean Dupont",
    "client_phone": "+33612345678",
    "service_type": "consultation"
  }
}
```

### transfer_to_human
Transfère à un conseiller humain.

```json
{
  "name": "transfer_to_human",
  "input": { "reason": "Demande complexe" }
}
```

## Codes DTMF

- **0** : Transfert immédiat à un humain
- **1** : Répéter le dernier message
- **9** : Terminer l'appel

## Test local

Pour tester localement avec ngrok:

```bash
# Terminal 1: Démarrer le worker
wrangler dev

# Terminal 2: Exposer via ngrok
ngrok http 8787

# Configurer l'URL ngrok dans Twilio Console
```

## Déploiement

```bash
# Déployer sur Cloudflare
npx wrangler deploy

# Vérifier les logs
npx wrangler tail
```

## Monitoring

Les appels sont enregistrés dans les tables:
- `calls` - Métadonnées des appels
- `call_messages` - Transcription complète
- `call_summaries` - Résumé post-appel
- `call_events` - Événements techniques

## Troubleshooting

### L'appel ne connecte pas
1. Vérifier l'URL webhook dans Twilio Console
2. Vérifier les logs Cloudflare Workers
3. S'assurer que le certificat SSL est valide

### Transcription de mauvaise qualité
1. Vérifier le modèle Deepgram (`nova-2` recommandé)
2. S'assurer que la langue est `fr-FR`
3. Vérifier la qualité audio de l'appelant

### Latence élevée
1. Activer le streaming de réponse
2. Réduire `max_tokens` dans les appels Claude
3. Utiliser des phrases courtes dans le system prompt
