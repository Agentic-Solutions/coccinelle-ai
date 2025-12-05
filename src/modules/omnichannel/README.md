# Module Omnichannel - Coccinelle.AI

## Description
Module indépendant pour la gestion multi-canal (Voice, SMS, WhatsApp, Email)
et la configuration personnalisée des agents IA par tenant.

## Activation
```bash
# Dans wrangler.toml
[vars]
OMNICHANNEL_ENABLED = "true"
```

## Architecture
- **Isolation complète** : Aucune dépendance au code existant
- **Activation/désactivation** : Via variable d'environnement
- **Coexistence** : Fonctionne en parallèle avec VAPI

## Tables DB
- `omni_agent_configs` : Configuration agent par tenant
- `omni_conversations` : Conversations multi-canal
- `omni_messages` : Historique messages tous canaux

## Endpoints API
- `GET /api/v1/omnichannel/agent/config`
- `PUT /api/v1/omnichannel/agent/config`
- `GET /api/v1/omnichannel/agent/voices`
- `POST /api/v1/omnichannel/conversations`
- `POST /api/v1/omnichannel/conversations/:id/switch`

## Webhooks Twilio
- `POST /webhooks/omnichannel/voice` : Appels entrants
- `POST /webhooks/omnichannel/sms` : SMS entrants
- `POST /webhooks/omnichannel/whatsapp` : WhatsApp entrants
- `POST /webhooks/omnichannel/conversation` : WebSocket ConversationRelay

## Version
1.0.0
