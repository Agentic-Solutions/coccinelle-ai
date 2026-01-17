# @coccinelle/billing-stripe

Module de facturation Stripe réutilisable pour applications SaaS basées sur Cloudflare Workers et Next.js.

## Fonctionnalités

- ✅ Gestion complète des plans et abonnements
- ✅ Tracking d'usage en temps réel (appels, SMS, TTS, WhatsApp, etc.)
- ✅ Calcul automatique des dépassements (overage)
- ✅ Génération de factures avec ligne de détail
- ✅ Intégration Stripe (checkout, webhooks, portail client)
- ✅ Composants React prêts à l'emploi
- ✅ Compatible Cloudflare Workers D1
- ✅ Support TypeScript

## Installation

```bash
npm install @coccinelle/billing-stripe stripe uuid
```

## Configuration Backend (Cloudflare Workers)

### 1. Créer la base de données

Appliquez le schéma SQL à votre base D1:

```bash
npx wrangler d1 execute YOUR_DATABASE --file=node_modules/@coccinelle/billing-stripe/src/db/schema.sql
```

### 2. Configurer les variables d'environnement

Dans `wrangler.toml`:

```toml
[vars]
FRONTEND_URL = "https://your-app.com"

# Ajoutez ces secrets
# npx wrangler secret put STRIPE_SECRET_KEY
# npx wrangler secret put STRIPE_WEBHOOK_SECRET
```

### 3. Intégrer dans votre Worker

```typescript
import { createBillingRouter } from '@coccinelle/billing-stripe';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Router billing
    if (path.startsWith('/api/v1/billing')) {
      const billingRouter = createBillingRouter({
        stripeSecretKey: env.STRIPE_SECRET_KEY,
        stripeWebhookSecret: env.STRIPE_WEBHOOK_SECRET,
        frontendUrl: env.FRONTEND_URL,
        database: env.DB
      });

      const response = await billingRouter.handleRequest(request, path, method);
      if (response) return response;
    }

    // Autres routes...
  }
};
```

### 4. Tracker l'usage

```typescript
import { UsageTracker } from '@coccinelle/billing-stripe';

const tracker = new UsageTracker(env, env.DB);

// Tracker un appel téléphonique
await tracker.trackCall('tenant_123', {
  duration: 180, // secondes
  direction: 'outbound',
  metadata: { callId: 'call_abc' }
});

// Tracker un SMS
await tracker.trackSMS('tenant_123', {
  direction: 'outbound',
  metadata: { smsId: 'sms_xyz' }
});

// Tracker Text-to-Speech
await tracker.trackTTS('tenant_123', {
  characters: 1500,
  metadata: { voiceId: 'fr-FR-Neural2-A' }
});
```

## Configuration Frontend (Next.js)

### Pages prêtes à l'emploi

Le package inclut 5 composants React:

#### 1. Vue d'ensemble

```typescript
import { BillingOverview } from '@coccinelle/billing-stripe/components';

export default function BillingPage() {
  return <BillingOverview apiUrl="https://api.your-app.com" tenantId="tenant_123" />;
}
```

#### 2. Changement de plan

```typescript
import { UpgradePage } from '@coccinelle/billing-stripe/components';

export default function UpgradePage() {
  return <UpgradePage apiUrl="https://api.your-app.com" tenantId="tenant_123" />;
}
```

#### 3. Consommation détaillée

```typescript
import { UsagePage } from '@coccinelle/billing-stripe/components';

export default function UsagePage() {
  return <UsagePage apiUrl="https://api.your-app.com" tenantId="tenant_123" />;
}
```

#### 4. Méthodes de paiement

```typescript
import { PaymentPage } from '@coccinelle/billing-stripe/components';

export default function PaymentPage() {
  return <PaymentPage apiUrl="https://api.your-app.com" tenantId="tenant_123" />;
}
```

#### 5. Historique des factures

```typescript
import { InvoicesPage } from '@coccinelle/billing-stripe/components';

export default function InvoicesPage() {
  return <InvoicesPage apiUrl="https://api.your-app.com" tenantId="tenant_123" />;
}
```

## Customisation

### Plans personnalisés

Créez vos propres plans en insérant dans la table `billing_plans`:

```sql
INSERT INTO billing_plans (
  plan_id, name, description,
  monthly_price_cents, yearly_price_cents,
  included_calls, included_sms, included_tts_minutes,
  overprice_calls, overprice_sms, overprice_tts,
  is_active
) VALUES (
  'custom_plan',
  'Plan Custom',
  'Mon plan personnalisé',
  9900, 99000,
  500, 1000, 600,
  5, 10, 8,
  1
);
```

### Types d'usage personnalisés

Étendez le `UsageTracker` pour tracker d'autres types:

```typescript
import { UsageTracker } from '@coccinelle/billing-stripe';

class MyUsageTracker extends UsageTracker {
  async trackCustomUsage(tenantId: string, data: CustomUsageData) {
    const unitPrice = 15; // centimes
    const totalPrice = data.quantity * unitPrice;

    await this.db
      .prepare(`INSERT INTO billing_usage (...) VALUES (...)`)
      .bind(...)
      .run();
  }
}
```

### Composants personnalisés

Tous les composants acceptent des props de customisation:

```typescript
<BillingOverview
  apiUrl="https://api.your-app.com"
  tenantId="tenant_123"
  theme={{
    primaryColor: '#3B82F6',
    cardBackground: '#FFFFFF'
  }}
  onUpgradeClick={() => router.push('/billing/upgrade')}
/>
```

## API Endpoints

Le module expose les endpoints suivants:

### Plans
- `GET /api/v1/billing/plans` - Liste des plans
- `GET /api/v1/billing/plans/:id` - Détails d'un plan
- `GET /api/v1/billing/plans/compare` - Comparaison des plans

### Subscriptions
- `GET /api/v1/billing/subscriptions` - Subscription active
- `POST /api/v1/billing/subscriptions` - Créer une subscription
- `PUT /api/v1/billing/subscriptions/:id/upgrade` - Changer de plan
- `POST /api/v1/billing/subscriptions/:id/cancel` - Annuler
- `POST /api/v1/billing/subscriptions/:id/reactivate` - Réactiver

### Usage
- `GET /api/v1/billing/usage/current` - Usage du mois en cours
- `GET /api/v1/billing/usage/history` - Historique d'usage
- `GET /api/v1/billing/usage/summary` - Résumé par période

### Invoices
- `GET /api/v1/billing/invoices` - Liste des factures
- `GET /api/v1/billing/invoices/:id` - Détails d'une facture
- `POST /api/v1/billing/invoices/generate` - Générer une facture
- `GET /api/v1/billing/invoices/:id/download` - Télécharger PDF

### Stripe
- `POST /api/v1/billing/stripe/checkout` - Créer session de paiement
- `POST /api/v1/billing/stripe/portal` - Accès portail client
- `POST /api/v1/billing/stripe/webhook` - Webhooks Stripe

## Webhooks Stripe

Configurez ces événements dans votre dashboard Stripe:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

URL du webhook: `https://your-api.com/api/v1/billing/stripe/webhook`

## Sécurité

- ✅ Validation des webhooks Stripe avec signature
- ✅ Montants stockés en centimes (pas de float)
- ✅ Isolation multi-tenant (tenant_id)
- ✅ PCI-DSS compliant (via Stripe)

## Exemples

Voir le dossier `/examples` pour des exemples complets d'intégration.

## License

MIT

## Support

Pour toute question ou problème, ouvrez une issue sur GitHub.
