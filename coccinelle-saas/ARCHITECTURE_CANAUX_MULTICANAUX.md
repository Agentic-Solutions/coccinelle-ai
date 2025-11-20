# 🌐 ARCHITECTURE CANAUX MULTICANAUX - COCCINELLE.AI
**Date**: 2025-11-14
**Version**: 1.0
**Objectif**: Transformer Coccinelle.AI d'une plateforme vocale en une plateforme omnicanale

---

## 🎯 VISION

**De**: Assistant vocal intelligent (voix uniquement)
**Vers**: **Plateforme omnicanale IA** (voix + SMS + Email + WhatsApp + Telegram)

**Game Changer**: Être le **seul agent IA capable de gérer tous les canaux de communication** de manière cohérente et intelligente.

---

## 📊 CANAUX À IMPLÉMENTER

### 1. ✅ Voix (EXISTANT)
- **Provider**: VAPI
- **Status**: Fonctionnel
- **Use Cases**: Appels entrants/sortants, répondeur vocal

### 2. 📱 SMS (NOUVEAU - Priorité 1)
- **Provider**: Twilio SMS API
- **Status**: À développer
- **Use Cases**:
  - Rappels RDV automatiques
  - Confirmations RDV
  - Notifications urgentes
  - Conversations SMS bidirectionnelles
  - Enquêtes de satisfaction post-RDV

### 3. ✉️ Email (NOUVEAU - Priorité 2)
- **Provider**: SendGrid / Resend / Amazon SES
- **Status**: À développer
- **Use Cases**:
  - Récapitulatifs RDV détaillés
  - Envoi de documents (contrats, devis)
  - Newsletters automatisées
  - Follow-ups personnalisés
  - Réponses automatiques aux emails entrants

### 4. 💬 WhatsApp (NOUVEAU - Priorité 3)
- **Provider**: Twilio WhatsApp API / Meta WhatsApp Business API
- **Status**: À développer
- **Use Cases**:
  - Conversations instantanées
  - Partage de photos/documents
  - Localisation pour visites
  - Statut de lecture
  - Templates messages approuvés

### 5. ✈️ Telegram (NOUVEAU - Priorité 4)
- **Provider**: Telegram Bot API
- **Status**: À développer
- **Use Cases**:
  - Bot automatisé
  - Notifications push
  - Commandes rapides (/rdv, /info)
  - Groupes d'équipe

---

## 🏗️ ARCHITECTURE TECHNIQUE

### Stack Proposé

```
┌─────────────────────────────────────────────────────────────┐
│                    COCCINELLE.AI FRONTEND                    │
│                    (Next.js 15.5.6)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │  Inbox   │  │Analytics │  │ Settings │   │
│  │ Unified  │  │ Omnicana │  │ Canaux   │  │ Canaux   │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              COCCINELLE.AI BACKEND (Cloudflare Workers)      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          CHANNEL ORCHESTRATOR (Nouveau)               │  │
│  │  - Routing intelligent par canal                      │  │
│  │  - Gestion des conversations multi-canaux             │  │
│  │  - Historique unifié                                  │  │
│  │  - Context switching automatique                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                               │
│  ┌──────┐  ┌──────┐  ┌────────┐  ┌──────────┐  ┌────────┐ │
│  │ VAPI │  │ SMS  │  │ Email  │  │ WhatsApp │  │Telegram│ │
│  │Module│  │Module│  │ Module │  │  Module  │  │ Module │ │
│  └──────┘  └──────┘  └────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────────┘
       │          │         │           │            │
       ▼          ▼         ▼           ▼            ▼
┌──────────┐ ┌─────────┐ ┌────────┐ ┌──────────┐ ┌──────────┐
│   VAPI   │ │ Twilio  │ │SendGrid│ │  Twilio  │ │ Telegram │
│   API    │ │SMS API  │ │   API  │ │WhatsApp  │ │ Bot API  │
└──────────┘ └─────────┘ └────────┘ └──────────┘ └──────────┘
```

### Database Schema (Extensions)

```sql
-- Nouvelle table: channels
CREATE TABLE channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  channel_type VARCHAR(20) NOT NULL, -- 'voice', 'sms', 'email', 'whatsapp', 'telegram'
  enabled BOOLEAN DEFAULT true,
  config JSONB, -- Configuration spécifique au canal
  credentials JSONB, -- API keys, tokens
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Nouvelle table: conversations (unifié tous canaux)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  prospect_id UUID REFERENCES prospects(id),
  channel_type VARCHAR(20) NOT NULL,
  channel_identifier VARCHAR(255), -- phone, email, whatsapp_id, etc.
  status VARCHAR(50), -- 'active', 'closed', 'waiting'
  context JSONB, -- Contexte de la conversation
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  closed_at TIMESTAMP
);

-- Nouvelle table: messages (tous canaux)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) NOT NULL,
  direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
  channel_type VARCHAR(20) NOT NULL,
  sender_type VARCHAR(20), -- 'prospect', 'sara', 'agent'
  sender_id UUID, -- prospect_id ou agent_id
  content TEXT,
  metadata JSONB, -- Media URLs, attachments, etc.
  status VARCHAR(50), -- 'sent', 'delivered', 'read', 'failed'
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP
);

-- Nouvelle table: message_templates
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  channel_type VARCHAR(20) NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_type VARCHAR(50), -- 'rdv_reminder', 'rdv_confirmation', 'follow_up', etc.
  subject VARCHAR(255), -- Pour emails
  content TEXT NOT NULL,
  variables JSONB, -- Variables disponibles {{prospect_name}}, etc.
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nouvelle table: channel_analytics
CREATE TABLE channel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  channel_type VARCHAR(20) NOT NULL,
  metric_type VARCHAR(50), -- 'messages_sent', 'messages_received', 'response_rate', etc.
  metric_value DECIMAL,
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🛠️ MODULES À DÉVELOPPER

### Module 1: SMS (Twilio)

#### Fichiers à créer

```
src/modules/channels/
├── sms/
│   ├── routes.js              # API endpoints SMS
│   ├── twilioClient.js        # Client Twilio
│   ├── smsService.js          # Logic métier SMS
│   ├── templates.js           # Templates SMS
│   └── webhooks.js            # Webhooks Twilio
```

#### API Endpoints

```javascript
// Routes SMS
POST   /api/v1/channels/sms/send           // Envoyer SMS
POST   /api/v1/channels/sms/send-bulk      // SMS en masse
POST   /api/v1/channels/sms/webhook        // Webhook Twilio (réception)
GET    /api/v1/channels/sms/conversations/:id  // Conversation SMS
GET    /api/v1/channels/sms/history        // Historique SMS
POST   /api/v1/channels/sms/schedule       // Programmer SMS
```

#### Fonctionnalités

1. **Rappels RDV Automatiques**
```javascript
// Exemple template
const rdvReminderSMS = {
  name: 'rdv_reminder_24h',
  content: `Bonjour {{prospect_name}},

Rappel : RDV demain à {{rdv_time}} avec {{agent_name}}.

Confirmez en répondant OUI ou annulez avec NON.

{{company_name}}`,
  variables: ['prospect_name', 'rdv_time', 'agent_name', 'company_name']
};
```

2. **Conversations Bidirectionnelles**
- Détection réponses : OUI/NON/ANNULER
- Routing vers agents si needed
- IA pour réponses automatiques

3. **Enquêtes Satisfaction**
```javascript
const satisfactionSMS = {
  content: `Merci d'avoir choisi {{company_name}} !

Notez votre expérience de 1 à 5 :
Répondez avec un chiffre (1=Mauvais, 5=Excellent)`
};
```

---

### Module 2: Email (SendGrid/Resend)

#### Fichiers à créer

```
src/modules/channels/
├── email/
│   ├── routes.js              # API endpoints Email
│   ├── emailClient.js         # Client SendGrid/Resend
│   ├── emailService.js        # Logic métier Email
│   ├── templates/
│   │   ├── rdv-confirmation.html
│   │   ├── rdv-reminder.html
│   │   ├── follow-up.html
│   │   └── newsletter.html
│   ├── parser.js              # Parser emails entrants
│   └── webhooks.js            # Webhooks provider
```

#### API Endpoints

```javascript
POST   /api/v1/channels/email/send            // Envoyer email
POST   /api/v1/channels/email/send-template   // Email depuis template
POST   /api/v1/channels/email/webhook         // Webhook provider
GET    /api/v1/channels/email/inbox           // Emails reçus
GET    /api/v1/channels/email/thread/:id      // Thread email
POST   /api/v1/channels/email/reply           // Répondre à email
```

#### Templates HTML

**Template Confirmation RDV** :
```html
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #9333ea, #2563eb); color: white; padding: 30px; text-align: center; }
    .content { padding: 30px; background: #f9fafb; }
    .button { background: #000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rendez-vous confirmé ✓</h1>
    </div>
    <div class="content">
      <p>Bonjour {{prospect_name}},</p>

      <p>Votre rendez-vous est confirmé :</p>

      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p><strong>📅 Date :</strong> {{rdv_date}}</p>
        <p><strong>⏰ Heure :</strong> {{rdv_time}}</p>
        <p><strong>👤 Avec :</strong> {{agent_name}}</p>
        <p><strong>📍 Lieu :</strong> {{location}}</p>
      </div>

      <p><a href="{{calendar_link}}" class="button">Ajouter au calendrier</a></p>

      <p>À bientôt,<br>L'équipe {{company_name}}</p>
    </div>
  </div>
</body>
</html>
```

---

### Module 3: WhatsApp (Twilio/Meta)

#### Fichiers à créer

```
src/modules/channels/
├── whatsapp/
│   ├── routes.js              # API endpoints WhatsApp
│   ├── whatsappClient.js      # Client Twilio/Meta
│   ├── whatsappService.js     # Logic métier WhatsApp
│   ├── templates.js           # Templates approuvés Meta
│   ├── mediaHandler.js        # Gestion images/docs
│   └── webhooks.js            # Webhooks
```

#### Templates Meta Approuvés

Exemples de templates à soumettre pour approbation Meta :

```javascript
const whatsappTemplates = [
  {
    name: 'rdv_confirmation_fr',
    language: 'fr',
    category: 'UTILITY',
    components: [
      {
        type: 'HEADER',
        format: 'TEXT',
        text: 'Confirmation de rendez-vous'
      },
      {
        type: 'BODY',
        text: `Bonjour {{1}},

Votre RDV est confirmé :
📅 {{2}}
⏰ {{3}}
📍 {{4}}

Répondez "OK" pour confirmer ou "ANNULER" pour annuler.`
      },
      {
        type: 'FOOTER',
        text: 'Message de {{5}}'
      }
    ]
  }
];
```

#### Fonctionnalités Spécifiques

1. **Partage de localisation**
```javascript
// Envoyer localisation agence
await whatsappClient.sendLocation({
  to: prospectPhone,
  latitude: 48.8566,
  longitude: 2.3522,
  name: 'Agence Immobilière Demo',
  address: '15 rue de la Paix, Paris'
});
```

2. **Envoi de documents**
```javascript
await whatsappClient.sendDocument({
  to: prospectPhone,
  document: documentUrl,
  filename: 'Contrat_Location.pdf',
  caption: 'Voici votre contrat de location'
});
```

---

### Module 4: Telegram (Bot API)

#### Fichiers à créer

```
src/modules/channels/
├── telegram/
│   ├── routes.js              # API endpoints Telegram
│   ├── botClient.js           # Client Telegram Bot
│   ├── botService.js          # Logic métier Bot
│   ├── commands.js            # Commandes bot
│   └── webhooks.js            # Webhooks Telegram
```

#### Commandes Bot

```javascript
const telegramCommands = {
  '/start': 'Démarrer conversation avec Sara',
  '/rdv': 'Voir mes rendez-vous',
  '/nouveau_rdv': 'Prendre un nouveau RDV',
  '/annuler': 'Annuler un RDV',
  '/info': 'Informations entreprise',
  '/contact': 'Contacter un conseiller',
  '/help': 'Aide et support'
};
```

---

## 🎨 FRONTEND CHANGES

### 1. Dashboard Unified Inbox (NOUVEAU)

**Page**: `/app/dashboard/inbox/page.tsx`

**Fonctionnalités** :
- Vue unifiée de toutes les conversations (tous canaux)
- Filtres par canal, statut, date
- Recherche globale
- Labels et tags
- Tri par priorité
- Réponse directe depuis l'inbox

**UI/UX** :
```
┌─────────────────────────────────────────────────────────────┐
│  [Logo]  Inbox Unifiée                    [Search] [Filters]│
├───────────┬─────────────────────────────────────────────────┤
│           │  📞 Appel - Jean Dupont         Il y a 5min     │
│  Tous     │  "Bonjour, je souhaite un RDV..."               │
│  (147)    ├─────────────────────────────────────────────────┤
│           │  💬 WhatsApp - Marie Martin     Il y a 12min    │
│  📞 Voice │  "Photo du bien envoyée 📷"                     │
│  (23)     ├─────────────────────────────────────────────────┤
│           │  📧 Email - Pierre Durand       Il y a 1h       │
│  📱 SMS   │  "Re: Estimation gratuite"                      │
│  (45)     ├─────────────────────────────────────────────────┤
│           │  📱 SMS - Sophie Bernard        Il y a 2h       │
│  ✉️ Email │  "OUI pour confirmer mon RDV"                   │
│  (62)     ├─────────────────────────────────────────────────┤
│           │  ✈️ Telegram - Luc Petit        Il y a 3h       │
│  💬 WhatsA│  "/rdv - Mes rendez-vous"                       │
│  (12)     └─────────────────────────────────────────────────┘
│
│  ✈️ Telg
│  (5)
└───────────┘
```

---

### 2. Analytics Canaux (Extension)

**Page**: `/app/dashboard/analytics/page.tsx` (nouvelle section)

**Métriques par canal** :
- Messages envoyés/reçus
- Taux de réponse
- Temps de réponse moyen
- Taux de conversion par canal
- Canal préféré des prospects
- Graphiques comparatifs

---

### 3. Settings Canaux (NOUVEAU)

**Page**: `/app/dashboard/settings/channels/page.tsx`

**Sections** :

1. **Configuration générale**
   - Activer/Désactiver chaque canal
   - Numéros/emails/tokens

2. **SMS Settings**
   - Numéro Twilio
   - Templates SMS
   - Horaires d'envoi autorisés
   - Limite quotidienne

3. **Email Settings**
   - Adresse email entreprise
   - Signature email
   - Templates HTML
   - Forwarding rules

4. **WhatsApp Settings**
   - WhatsApp Business Account
   - Templates approuvés
   - Réponses automatiques
   - Horaires disponibilité

5. **Telegram Settings**
   - Bot token
   - Commandes personnalisées
   - Groupes notifications

---

## 🤖 CHANNEL ORCHESTRATOR - Le Cerveau

**Fichier**: `src/modules/channels/orchestrator.js`

**Responsabilités** :

### 1. Routing Intelligent

```javascript
async function routeMessage(message) {
  const { channel, content, prospectId } = message;

  // Récupérer le contexte du prospect
  const context = await getProspectContext(prospectId);

  // Déterminer si IA ou Agent humain
  if (shouldRouteToAI(context, content)) {
    return await handleWithAI(message, context);
  } else {
    return await routeToAgent(message, context);
  }
}
```

### 2. Context Switching

```javascript
// Passer d'un canal à l'autre en gardant le contexte
async function switchChannel(conversationId, fromChannel, toChannel) {
  const context = await getConversationContext(conversationId);

  // Créer nouvelle conversation dans le nouveau canal
  const newConversation = await createConversation({
    prospectId: context.prospectId,
    channel: toChannel,
    context: {
      ...context,
      previousChannel: fromChannel,
      switchedAt: new Date()
    }
  });

  // Envoyer message de transition
  await sendMessage({
    conversationId: newConversation.id,
    channel: toChannel,
    content: `Bonjour ${context.prospectName}, je continue notre conversation via ${toChannel}.`
  });
}
```

### 3. Unified Response

```javascript
async function sendUnifiedMessage({ prospectId, content, preferredChannel }) {
  const prospect = await getProspect(prospectId);

  // Essayer canal préféré
  let channel = preferredChannel || prospect.preferredChannel;

  // Fallback si canal non disponible
  if (!isChannelAvailable(channel, prospect)) {
    channel = findBestAvailableChannel(prospect);
  }

  // Envoyer sur le canal choisi
  return await sendMessageViaChannel(channel, {
    to: prospect[`${channel}Identifier`],
    content: content
  });
}
```

---

## 📅 ROADMAP DE DÉVELOPPEMENT

### Phase 1: SMS (2 semaines)

**Sprint 1 (Semaine 1)**
- [ ] Setup Twilio account + phone number
- [ ] Créer module SMS backend
  - [ ] Routes API
  - [ ] Twilio client
  - [ ] Service layer
- [ ] Créer templates SMS (5 templates)
- [ ] Database migrations (tables messages, conversations)
- [ ] Tests unitaires

**Sprint 2 (Semaine 2)**
- [ ] Webhook Twilio (réception SMS)
- [ ] Frontend: Page Settings SMS
- [ ] Frontend: SMS composer
- [ ] Frontend: Conversation SMS viewer
- [ ] Intégration avec prospects existants
- [ ] Tests end-to-end
- [ ] Documentation

**Fonctionnalités MVP** :
- ✅ Envoi SMS simple
- ✅ Réception SMS (webhook)
- ✅ Rappels RDV automatiques
- ✅ Confirmation OUI/NON
- ✅ Historique SMS par prospect

---

### Phase 2: Email (2 semaines)

**Sprint 3 (Semaine 3)**
- [ ] Setup SendGrid/Resend account
- [ ] Créer module Email backend
- [ ] Créer templates HTML (5 templates)
- [ ] Email parser (réponses entrantes)
- [ ] Tests unitaires

**Sprint 4 (Semaine 4)**
- [ ] Frontend: Email composer WYSIWYG
- [ ] Frontend: Template editor
- [ ] Frontend: Email thread view
- [ ] Attachments support
- [ ] Tests end-to-end
- [ ] Documentation

**Fonctionnalités MVP** :
- ✅ Envoi emails from templates
- ✅ Réception emails (parsing)
- ✅ Threads/conversations
- ✅ Pièces jointes
- ✅ Auto-réponses

---

### Phase 3: Unified Inbox (1 semaine)

**Sprint 5 (Semaine 5)**
- [ ] Créer Channel Orchestrator
- [ ] Créer page Inbox unifiée
- [ ] Filtres et recherche
- [ ] Vue conversation unifiée
- [ ] Quick reply depuis inbox
- [ ] Tests et optimisation

**Fonctionnalités** :
- ✅ Vue tous canaux
- ✅ Filtres avancés
- ✅ Réponse rapide
- ✅ Context switching

---

### Phase 4: WhatsApp (3 semaines)

**Sprint 6-7 (Semaines 6-7)**
- [ ] Setup WhatsApp Business API
- [ ] Soumettre templates pour approbation Meta
- [ ] Créer module WhatsApp backend
- [ ] Media handler (images, docs, location)
- [ ] Webhooks WhatsApp
- [ ] Tests unitaires

**Sprint 8 (Semaine 8)**
- [ ] Frontend: WhatsApp chat UI
- [ ] Statut messages (sent/delivered/read)
- [ ] Quick replies & buttons
- [ ] Tests end-to-end
- [ ] Documentation

**Fonctionnalités MVP** :
- ✅ Messages texte
- ✅ Templates approuvés
- ✅ Media (images, docs)
- ✅ Localisation
- ✅ Statuts de lecture

---

### Phase 5: Telegram (1 semaine)

**Sprint 9 (Semaine 9)**
- [ ] Setup Telegram Bot
- [ ] Créer module Telegram backend
- [ ] Commandes bot
- [ ] Webhooks Telegram
- [ ] Frontend: Telegram settings
- [ ] Tests et documentation

**Fonctionnalités MVP** :
- ✅ Bot répondeur
- ✅ Commandes personnalisées
- ✅ Notifications push
- ✅ Groupes

---

### Phase 6: Analytics & Optimisation (1 semaine)

**Sprint 10 (Semaine 10)**
- [ ] Analytics par canal
- [ ] Graphiques comparatifs
- [ ] AI Insights multicanaux
- [ ] Optimisations performances
- [ ] Tests finaux
- [ ] Documentation complète

---

## 💰 COÛTS ESTIMÉS

### Setup Initial

| Service | Setup | Mensuel (estimation) |
|---------|-------|---------------------|
| Twilio SMS | $0 | $50-200 (selon volume) |
| SendGrid/Resend | $0 | $0-100 (plan gratuit puis scale) |
| WhatsApp Business | $0 | $0.005-0.01 par message |
| Telegram Bot | $0 | $0 (gratuit) |
| **Total** | **$0** | **$50-300** |

### Volume Estimé (par tenant)

- SMS: 100-500 messages/mois
- Email: 200-1000 emails/mois
- WhatsApp: 50-300 messages/mois
- Telegram: 20-100 messages/mois

---

## 🎯 BÉNÉFICES BUSINESS

### 1. Différenciation Marché
- **Seule plateforme omnicanale** complète
- Concurrent le plus proche: voix uniquement
- **USP**: "1 plateforme, 5 canaux, 0 friction"

### 2. Augmentation Engagement
- Taux de réponse SMS: 98% (vs 20% email)
- WhatsApp: Temps de réponse <5min
- Préférence utilisateur respectée

### 3. Automatisation Poussée
- Rappels automatiques sur canal préféré
- Follow-ups intelligents
- Réduction charge agents de 40%

### 4. Analytics Riches
- Comprendre quel canal convertit le mieux
- A/B testing par canal
- Optimisation ROI marketing

---

## 🚀 QUICK START

### Étape 1: Choisir le canal prioritaire

**Recommandation**: Commencer par **SMS** car :
- Plus simple techniquement
- ROI immédiat (rappels RDV)
- Setup rapide (1-2 semaines)

### Étape 2: Setup Twilio

```bash
# Créer compte Twilio
# Acheter numéro téléphone SMS-enabled
# Récupérer Account SID + Auth Token
```

### Étape 3: Variables d'environnement

```bash
# .env.local
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+33612345678
```

### Étape 4: Installer dépendances

```bash
npm install twilio
```

### Étape 5: Créer premier module SMS

```bash
mkdir -p src/modules/channels/sms
touch src/modules/channels/sms/routes.js
touch src/modules/channels/sms/twilioClient.js
```

---

## 📚 RESSOURCES

### Documentation APIs

- **Twilio SMS**: https://www.twilio.com/docs/sms
- **Twilio WhatsApp**: https://www.twilio.com/docs/whatsapp
- **SendGrid**: https://docs.sendgrid.com/
- **Resend**: https://resend.com/docs
- **Telegram Bot**: https://core.telegram.org/bots/api
- **Meta WhatsApp**: https://developers.facebook.com/docs/whatsapp

### Libraries Recommandées

```json
{
  "twilio": "^5.0.0",
  "@sendgrid/mail": "^8.0.0",
  "resend": "^3.0.0",
  "node-telegram-bot-api": "^0.64.0"
}
```

---

## ✅ CHECKLIST AVANT DE COMMENCER

### Business
- [ ] Budget alloué ($300/mois minimum)
- [ ] Use cases identifiés par canal
- [ ] Templates messages rédigés
- [ ] Compliance RGPD validée

### Technique
- [ ] Architecture validée
- [ ] Database schema approuvé
- [ ] Comptes providers créés
- [ ] Numéros/emails/tokens obtenus

### Équipe
- [ ] Développeur backend alloué (2-3 semaines)
- [ ] Développeur frontend alloué (2-3 semaines)
- [ ] Designer pour templates (1 semaine)
- [ ] Tests & QA (1 semaine)

---

*Architecture créée le 2025-11-14*
*Prête pour implémentation immediate* 🚀
