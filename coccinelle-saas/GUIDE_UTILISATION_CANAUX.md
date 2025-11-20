# 📱 GUIDE D'UTILISATION - CANAUX DE COMMUNICATION
**Date**: 2025-11-14
**Pages créées**: Test Canaux + Préférences Canaux

---

## 🎯 DEUX NOUVELLES PAGES CRÉÉES

### 1. ✅ **Page de Test des Canaux**
**Chemin**: `/dashboard/test-channels`
**Fichier**: `app/dashboard/test-channels/page.tsx`

**Fonctionnalités**:
- Tester l'envoi de messages sur tous les canaux
- Choix du canal : Auto (Orchestrator), SMS, Email, WhatsApp
- Saisie des coordonnées (téléphone, email)
- Message personnalisé
- Résultats en temps réel
- Mode démo (simule les envois)

---

### 2. ✅ **Page de Préférences de Canaux**
**Chemin**: `/dashboard/settings/channels`
**Fichier**: `app/dashboard/settings/channels/page.tsx`

**Fonctionnalités**:
- Choix du canal préféré (Auto, SMS, Email, WhatsApp)
- Activation/désactivation de chaque canal
- Paramétrage fin par type de notification :
  - Rappels de RDV
  - Alertes biens immobiliers
  - Marketing
  - Enquêtes
  - Documents
- Heures de silence configurables (22h-8h par défaut)
- Autorisation messages urgents pendant heures de silence
- Sauvegarde en localStorage (prêt pour API)

---

## 🚀 COMMENT TESTER ?

### Étape 1: Accéder à la Page de Test

```
1. Lancer l'application: npm run dev
2. Ouvrir: http://localhost:3000/dashboard/test-channels
3. Ou ajouter un lien dans le dashboard principal
```

### Étape 2: Choisir un Canal

**4 options disponibles** :

#### 🤖 **Mode Automatique (Orchestrator)**
- Le système choisit automatiquement le meilleur canal
- Analyse 9 critères (urgence, coût, longueur, etc.)
- Affiche le canal choisi et la raison

**Exemple** :
```
Message long (300 caractères) + Pas urgent
→ Canal choisi: Email
→ Raison: Coût optimal, supporte contenu long
```

#### 📱 **SMS**
- Envoi direct par SMS via Twilio
- Taux d'ouverture: 98%
- Délai: ~10 secondes
- Coût: ~0.05€/message

#### ✉️ **Email**
- Envoi direct par Email via Resend
- Taux d'ouverture: 20-30%
- Délai: ~1-5 minutes
- Coût: ~0.0006€/message

#### 💬 **WhatsApp**
- Envoi direct par WhatsApp via Twilio
- Taux d'ouverture: 90%
- Délai: ~30 secondes
- Coût: ~0.01€/message

---

### Étape 3: Saisir les Informations

**Coordonnées** :
- Téléphone: `+33612345678` (format international)
- Email: `test@example.com`

**Message** :
- Saisir votre message de test
- Le compteur affiche le nombre de caractères
- Si > 160 caractères → multiple SMS (coût x2 ou x3)

**Exemple de message** :
```
Bonjour Marie,

Rappel de votre rendez-vous demain à 15h avec Jean Dupont.

Adresse: 123 Rue de la Paix, Paris

Merci de confirmer en répondant OUI.

Agence Dupont
```

---

### Étape 4: Envoyer le Test

**Mode Démo (actuel)** :
- Cliquer sur "Envoyer le Test"
- Les résultats s'affichent en temps réel
- Les messages ne sont pas réellement envoyés
- Parfait pour tester l'interface et la logique

**Mode Réel (avec API)** :
Pour activer les envois réels, configurer les variables d'environnement :

```env
# .env.local

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+33xxxxxxxxx

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@coccinelle.ai
FROM_NAME=Coccinelle.AI

# WhatsApp (Twilio Sandbox)
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

Puis créer les routes API (voir section suivante).

---

## ⚙️ COMMENT CONFIGURER LES PRÉFÉRENCES ?

### Accéder aux Préférences

```
1. Aller sur: http://localhost:3000/dashboard/settings/channels
2. Ou depuis le dashboard → Paramètres → Canaux
```

---

### Configuration Recommandée par Profil

#### 👔 **Profil Professionnel Pressé**
```yaml
Canal préféré: Automatique
SMS:
  ✅ Rappels RDV
  ✅ Alertes biens urgents
  ❌ Marketing
  ✅ Enquêtes
Email:
  ✅ Confirmations RDV
  ✅ Alertes biens (détaillées)
  ❌ Marketing
  ✅ Documents
WhatsApp:
  ❌ Désactivé
Heures silence: 22h-7h (autoriser urgent)
```

#### 🏠 **Profil Acheteur Actif**
```yaml
Canal préféré: Automatique
SMS:
  ✅ Rappels RDV
  ✅ Alertes biens
  ❌ Marketing
  ❌ Enquêtes
Email:
  ✅ Tout activer
WhatsApp:
  ✅ Rappels RDV
  ✅ Alertes avec photos
  ✅ Enquêtes
Heures silence: 22h-8h (autoriser urgent)
```

#### 📧 **Profil Email Only**
```yaml
Canal préféré: Email
SMS:
  ✅ Rappels RDV uniquement (urgent)
  ❌ Reste désactivé
Email:
  ✅ Tout activer
WhatsApp:
  ❌ Désactivé
Heures silence: 21h-9h (pas d'urgent)
```

#### 💬 **Profil Digital Native**
```yaml
Canal préféré: WhatsApp
SMS:
  ❌ Désactivé (sauf urgence)
Email:
  ✅ Documents uniquement
WhatsApp:
  ✅ Tout activer
Heures silence: 23h-8h (autoriser urgent)
```

---

## 🔧 INTÉGRATION API (Pour Envois Réels)

### Créer les Routes API

Pour passer du mode démo aux envois réels, créer ces routes :

#### 1. Route SMS

**Fichier**: `app/api/channels/sms/send/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createTwilioClientFromEnv } from '@/modules/channels/sms/twilioClient';
import { createSMSService } from '@/modules/channels/sms/smsService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, templateId, data } = body;

    // Initialiser le service
    const twilioClient = createTwilioClientFromEnv(process.env);
    const smsService = createSMSService(twilioClient);

    // Envoyer le SMS
    const result = await smsService.sendTemplatedSMS({
      tenantId: 'test', // TODO: Get from session
      to,
      customMessage: message,
      templateId,
      data,
    });

    return NextResponse.json({
      success: true,
      channel: 'sms',
      messageId: result.id,
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

---

#### 2. Route Email

**Fichier**: `app/api/channels/email/send/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createEmailClientFromEnv } from '@/modules/channels/email/emailClient';
import { createEmailService } from '@/modules/channels/email/emailService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, message, templateId, data } = body;

    // Initialiser le service
    const emailClient = createEmailClientFromEnv(process.env);
    const emailService = createEmailService(emailClient);

    // Envoyer l'email
    const result = await emailService.sendTemplatedEmail({
      tenantId: 'test',
      to,
      customSubject: subject || 'Message de Coccinelle.AI',
      customHtml: `<p>${message}</p>`,
      templateId,
      data,
    });

    return NextResponse.json({
      success: true,
      channel: 'email',
      messageId: result.id,
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

---

#### 3. Route WhatsApp

**Fichier**: `app/api/channels/whatsapp/send/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createWhatsAppClientFromEnv } from '@/modules/channels/whatsapp/whatsappClient';
import { createWhatsAppService } from '@/modules/channels/whatsapp/whatsappService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, message, templateId, data } = body;

    // Initialiser le service
    const whatsappClient = createWhatsAppClientFromEnv(process.env);
    const whatsappService = createWhatsAppService(whatsappClient);

    // Envoyer le message WhatsApp
    const result = await whatsappService.sendTemplatedMessage({
      tenantId: 'test',
      to,
      customMessage: message,
      templateId,
      data,
    });

    return NextResponse.json({
      success: true,
      channel: 'whatsapp',
      messageId: result.id,
      status: result.status,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

---

#### 4. Route Orchestrator

**Fichier**: `app/api/channels/auto/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createChannelOrchestrator } from '@/modules/orchestrator/channelOrchestrator';
import { createSMSService } from '@/modules/channels/sms/smsService';
import { createEmailService } from '@/modules/channels/email/emailService';
import { createTwilioClientFromEnv } from '@/modules/channels/sms/twilioClient';
import { createEmailClientFromEnv } from '@/modules/channels/email/emailClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, email, message, priority = 'normal', messageType = 'general' } = body;

    // Initialiser les services
    const twilioClient = createTwilioClientFromEnv(process.env);
    const emailClient = createEmailClientFromEnv(process.env);
    const smsService = createSMSService(twilioClient);
    const emailService = createEmailService(emailClient);

    // Créer l'orchestrator
    const orchestrator = createChannelOrchestrator({
      smsService,
      emailService,
    });

    // Routage automatique
    const result = await orchestrator.routeMessage(
      {
        tenantId: 'test',
        prospectId: 'test_prospect',
        prospectName: 'Test User',
        prospectPhone: phone,
        prospectEmail: email,
        messageType,
        priority: { level: priority },
      },
      {
        body: message,
      }
    );

    return NextResponse.json({
      success: result.success,
      channel: result.channel,
      messageId: result.messageId,
      status: result.status,
      fallbackUsed: result.fallbackAttempted,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
```

---

### Modifier la Page de Test

Dans `app/dashboard/test-channels/page.tsx`, remplacer les TODO par des vrais appels :

```typescript
// Remplacer cette ligne:
// TODO: Appeler l'API réelle

// Par:
const response = await fetch('/api/channels/sms/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ to: phoneNumber, message }),
});

const data = await response.json();

if (data.success) {
  newResults[newResults.length - 1] = {
    channel: 'SMS',
    status: 'success',
    message: 'Message envoyé avec succès',
    details: `ID: ${data.messageId}`,
  };
} else {
  newResults[newResults.length - 1] = {
    channel: 'SMS',
    status: 'error',
    message: 'Erreur lors de l\'envoi',
    details: data.error,
  };
}
```

---

## 🔗 AJOUTER LES LIENS DANS LE DASHBOARD

### Option 1: Ajouter dans la Navigation Principale

Dans `app/dashboard/page.tsx` ou votre navigation :

```tsx
<Link href="/dashboard/test-channels">
  <button className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
    <Send className="w-6 h-6 text-gray-900" />
    <div className="text-left">
      <h3 className="font-medium text-gray-900">Test des Canaux</h3>
      <p className="text-sm text-gray-600">Tester SMS, Email, WhatsApp</p>
    </div>
  </button>
</Link>

<Link href="/dashboard/settings/channels">
  <button className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
    <Settings className="w-6 h-6 text-gray-900" />
    <div className="text-left">
      <h3 className="font-medium text-gray-900">Préférences Canaux</h3>
      <p className="text-sm text-gray-600">Configurer vos notifications</p>
    </div>
  </button>
</Link>
```

---

### Option 2: Section "Communication" dans le Dashboard

```tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
  <h2 className="text-xl font-bold text-gray-900 mb-4">Communication</h2>

  <div className="grid grid-cols-3 gap-4">
    <Link href="/dashboard/inbox">
      <button className="p-4 text-center hover:bg-gray-50 rounded-lg transition-colors">
        <MessageSquare className="w-8 h-8 mx-auto mb-2" />
        <span className="text-sm font-medium">Inbox</span>
      </button>
    </Link>

    <Link href="/dashboard/test-channels">
      <button className="p-4 text-center hover:bg-gray-50 rounded-lg transition-colors">
        <Send className="w-8 h-8 mx-auto mb-2" />
        <span className="text-sm font-medium">Test Canaux</span>
      </button>
    </Link>

    <Link href="/dashboard/settings/channels">
      <button className="p-4 text-center hover:bg-gray-50 rounded-lg transition-colors">
        <Settings className="w-8 h-8 mx-auto mb-2" />
        <span className="text-sm font-medium">Préférences</span>
      </button>
    </Link>
  </div>
</div>
```

---

## 📊 EXEMPLES D'UTILISATION

### Exemple 1: Tester un Rappel de RDV

**Scénario**: Agence veut tester un rappel de RDV 24h avant

**Étapes**:
1. Aller sur `/dashboard/test-channels`
2. Choisir: **Mode Automatique**
3. Saisir:
   - Téléphone: `+33612345678`
   - Email: `marie.dupont@example.com`
   - Message: "Bonjour Marie, rappel de votre RDV demain à 15h avec Jean Dupont. Adresse: 123 Rue de la Paix, Paris. Merci de confirmer."
4. Envoyer

**Résultat Attendu**:
```
✅ Orchestrator
Canal optimal: SMS
Raison: Appointment type, urgent priority, short message
Coût: 0.05€
Délai: 10s
```

---

### Exemple 2: Newsletter avec Photos

**Scénario**: Envoi d'une newsletter avec nouveaux biens

**Étapes**:
1. Choisir: **Email**
2. Saisir:
   - Email: `prospects@example.com`
   - Message: "Découvrez nos 5 nouveaux biens cette semaine ! [Description longue + photos]"
3. Envoyer

**Résultat**:
```
✅ Email
Message envoyé avec succès
Envoyé à prospects@example.com
Coût: 0.0006€
Support rich media: Oui
```

---

### Exemple 3: Alerte Urgente Baisse de Prix

**Scénario**: Bien baisse de 50k€, alerte immédiate

**Étapes**:
1. Choisir: **Mode Automatique**
2. Priority: **Urgent**
3. Message: "🔥 URGENT: Le bien 45 Avenue des Champs vient de baisser de 50 000€ ! Contactez-nous vite."
4. Envoyer

**Résultat**:
```
✅ Orchestrator
Canal optimal: WhatsApp
Raison: Urgent, rich media (emoji), engagement élevé
Fallback: SMS
Coût: 0.01€
```

---

## 🎓 BEST PRACTICES

### ✅ À Faire

1. **Tester en mode démo d'abord** avant d'activer les envois réels
2. **Configurer les préférences** selon votre profil
3. **Utiliser le mode Auto** pour optimiser coûts et engagement
4. **Respecter les heures de silence** (22h-8h)
5. **Personnaliser les messages** avec prénom et contexte
6. **Vérifier le format des numéros** (+33... format international)

### ❌ À Éviter

1. ❌ Envoyer du marketing par SMS (intrusif + coûteux)
2. ❌ Désactiver tous les canaux (pas de communication!)
3. ❌ Ignorer les heures de silence
4. ❌ Messages trop longs en SMS (coût x3)
5. ❌ Spam (max 1-2 messages/semaine)

---

## 🚀 PROCHAINES ÉTAPES

### Court Terme
1. ✅ Tester l'interface des deux pages
2. ⏸️ Configurer les clés API (Twilio, Resend)
3. ⏸️ Créer les routes API
4. ⏸️ Tester les envois réels
5. ⏸️ Ajouter les liens dans le dashboard

### Moyen Terme
1. ⏸️ Sauvegarder préférences en base de données (vs localStorage)
2. ⏸️ Historique des tests envoyés
3. ⏸️ Analytics par canal (taux ouverture, réponse)
4. ⏸️ Templates pré-remplis (RDV, Alerte bien, etc.)
5. ⏸️ Envoi groupé (broadcast à plusieurs prospects)

---

## 📞 SUPPORT

### En cas de problème

**Page ne s'affiche pas** :
- Vérifier que l'application tourne: `npm run dev`
- Vérifier l'URL: `/dashboard/test-channels` ou `/dashboard/settings/channels`
- Vérifier les imports (Logo, Lucide icons)

**Erreur lors de l'envoi (mode réel)** :
- Vérifier les variables d'environnement (.env.local)
- Vérifier que les routes API existent
- Vérifier les logs dans la console

**Préférences non sauvegardées** :
- Vérifier localStorage du navigateur (F12 → Application → Local Storage)
- Créer la route API `/api/settings/channels` pour sauvegarde en base

---

## 🎉 RÉSUMÉ

**Vous avez maintenant** :

1. ✅ **Page de test** complète et fonctionnelle
2. ✅ **Page de préférences** intuitive et détaillée
3. ✅ **Mode démo** pour tester sans API
4. ✅ **Instructions** pour passer en mode réel
5. ✅ **Exemples** d'utilisation concrets

**Prêt à tester !** 🚀

Accédez à :
- **Test**: http://localhost:3000/dashboard/test-channels
- **Préférences**: http://localhost:3000/dashboard/settings/channels

---

*Guide créé le 2025-11-14*
*Pages 100% fonctionnelles en mode démo* ✅
