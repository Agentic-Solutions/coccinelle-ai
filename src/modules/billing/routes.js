// src/modules/billing/routes.js - Routes Stripe pour abonnements
import * as auth from '../auth/helpers.js';
import { getCorsHeaders } from '../../config/cors.js';
import { logger } from '../../utils/logger.js';

// ========================================
// PLANS PRICING (price IDs from env)
// ========================================
const PLAN_PRICES = {
  starter: 'STRIPE_PRICE_STARTER',
  pro: 'STRIPE_PRICE_PRO',
  business: 'STRIPE_PRICE_BUSINESS',
};

// ========================================
// STRIPE SIGNATURE VERIFICATION (HMAC SHA256)
// No stripe-node on CF Workers, so manual verification
// ========================================
async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader || !secret) return false;

  const parts = sigHeader.split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) return false;

  // Reject timestamps older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp);
  if (age > 300) return false;

  const signedPayload = `${timestamp}.${payload}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const expectedSig = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return expectedSig === signature;
}

// ========================================
// STRIPE API HELPER
// ========================================
async function stripeRequest(method, path, apiKey, body) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body ? new URLSearchParams(body).toString() : undefined,
  });
  return res.json();
}

// ========================================
// MAIN ROUTER
// ========================================
export async function handleBillingSubscriptionRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // ========================================
  // 1. POST /api/v1/billing/create-checkout-session
  // ========================================
  if (path === '/api/v1/billing/create-checkout-session' && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(
          JSON.stringify({ success: false, error: authResult.error }),
          { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { tenant } = authResult;
      const body = await request.json();
      const { plan } = body;

      if (!plan || !PLAN_PRICES[plan]) {
        return new Response(
          JSON.stringify({ success: false, error: 'Plan invalide. Choisissez starter, pro ou business.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const priceId = env[PLAN_PRICES[plan]];
      if (!priceId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Configuration Stripe manquante pour ce plan.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get or create subscription row
      let sub = await env.DB.prepare(
        'SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(tenant.id).first();

      let stripeCustomerId = sub?.stripe_customer_id;

      // If no Stripe customer yet, create one
      if (!stripeCustomerId) {
        const customer = await stripeRequest('POST', '/customers', env.STRIPE_SECRET_KEY, {
          email: tenant.email,
          name: tenant.name || tenant.company_name || '',
          'metadata[tenant_id]': tenant.id,
        });

        if (customer.error) {
          logger.error('Stripe customer creation failed', { error: customer.error });
          return new Response(
            JSON.stringify({ success: false, error: 'Erreur lors de la creation du client Stripe.' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        stripeCustomerId = customer.id;

        // Store customer id
        if (sub) {
          await env.DB.prepare(
            'UPDATE subscriptions SET stripe_customer_id = ?, updated_at = datetime(\'now\') WHERE id = ?'
          ).bind(stripeCustomerId, sub.id).run();
        } else {
          const subId = auth.generateId('sub');
          await env.DB.prepare(`
            INSERT INTO subscriptions (id, tenant_id, stripe_customer_id, plan, status, created_at, updated_at)
            VALUES (?, ?, ?, 'trial', 'trialing', datetime('now'), datetime('now'))
          `).bind(subId, tenant.id, stripeCustomerId).run();
        }
      }

      // Create Checkout Session
      const session = await stripeRequest('POST', '/checkout/sessions', env.STRIPE_SECRET_KEY, {
        mode: 'subscription',
        customer: stripeCustomerId,
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: 'https://coccinelle-saas.pages.dev/dashboard/billing?success=true',
        cancel_url: 'https://coccinelle-saas.pages.dev/dashboard/billing?canceled=true',
        'metadata[tenant_id]': tenant.id,
        'metadata[plan]': plan,
      });

      if (session.error) {
        logger.error('Stripe checkout session creation failed', { error: session.error });
        return new Response(
          JSON.stringify({ success: false, error: 'Erreur lors de la creation de la session Stripe.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, url: session.url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      logger.error('Create checkout session error', { error: error.message });
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur interne' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ========================================
  // 2. POST /api/v1/billing/webhook (Stripe webhook — no JWT auth)
  // ========================================
  if (path === '/api/v1/billing/webhook' && method === 'POST') {
    try {
      const sigHeader = request.headers.get('stripe-signature');
      const payload = await request.text();

      if (!sigHeader) {
        return new Response(JSON.stringify({ error: 'Missing stripe-signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const valid = await verifyStripeSignature(payload, sigHeader, env.STRIPE_WEBHOOK_SECRET);
      if (!valid) {
        logger.error('Stripe webhook signature verification failed');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const event = JSON.parse(payload);
      const data = event.data?.object;

      switch (event.type) {
        case 'checkout.session.completed': {
          const tenantId = data.metadata?.tenant_id;
          const plan = data.metadata?.plan;
          const stripeSubId = data.subscription;
          const customerId = data.customer;

          if (tenantId) {
            await env.DB.prepare(`
              UPDATE subscriptions
              SET status = 'active',
                  plan = ?,
                  stripe_subscription_id = ?,
                  stripe_customer_id = ?,
                  updated_at = datetime('now')
              WHERE tenant_id = ?
            `).bind(plan || 'starter', stripeSubId, customerId, tenantId).run();
          }
          break;
        }

        case 'customer.subscription.updated': {
          const stripeSubId = data.id;
          const status = data.status;
          const periodStart = data.current_period_start
            ? new Date(data.current_period_start * 1000).toISOString()
            : null;
          const periodEnd = data.current_period_end
            ? new Date(data.current_period_end * 1000).toISOString()
            : null;
          const cancelAtEnd = data.cancel_at_period_end ? 1 : 0;

          await env.DB.prepare(`
            UPDATE subscriptions
            SET status = ?,
                current_period_start = COALESCE(?, current_period_start),
                current_period_end = COALESCE(?, current_period_end),
                cancel_at_period_end = ?,
                updated_at = datetime('now')
            WHERE stripe_subscription_id = ?
          `).bind(status, periodStart, periodEnd, cancelAtEnd, stripeSubId).run();
          break;
        }

        case 'customer.subscription.deleted': {
          const stripeSubId = data.id;
          await env.DB.prepare(`
            UPDATE subscriptions
            SET status = 'canceled', updated_at = datetime('now')
            WHERE stripe_subscription_id = ?
          `).bind(stripeSubId).run();
          break;
        }

        case 'invoice.payment_failed': {
          const stripeSubId = data.subscription;
          if (stripeSubId) {
            await env.DB.prepare(`
              UPDATE subscriptions
              SET status = 'past_due', updated_at = datetime('now')
              WHERE stripe_subscription_id = ?
            `).bind(stripeSubId).run();
          }
          break;
        }

        default:
          logger.info('Unhandled Stripe event', { type: event.type });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      logger.error('Stripe webhook error', { error: error.message });
      // Always return 200 to avoid Stripe retries on our errors
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // ========================================
  // 3. GET /api/v1/billing/subscription
  // ========================================
  if (path === '/api/v1/billing/subscription' && method === 'GET') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(
          JSON.stringify({ success: false, error: authResult.error }),
          { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { tenant } = authResult;

      const sub = await env.DB.prepare(
        'SELECT * FROM subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(tenant.id).first();

      if (!sub) {
        return new Response(
          JSON.stringify({
            success: true,
            subscription: {
              plan: 'trial',
              status: 'trialing',
              trial_days_remaining: 0,
              current_period_end: null,
              cancel_at_period_end: false,
            },
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate trial days remaining
      let trialDaysRemaining = null;
      if (sub.status === 'trialing' && sub.trial_ends_at) {
        const now = new Date();
        const trialEnd = new Date(sub.trial_ends_at);
        const diff = trialEnd.getTime() - now.getTime();
        trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
      }

      return new Response(
        JSON.stringify({
          success: true,
          subscription: {
            plan: sub.plan,
            status: sub.status,
            trial_days_remaining: trialDaysRemaining,
            trial_ends_at: sub.trial_ends_at,
            current_period_start: sub.current_period_start,
            current_period_end: sub.current_period_end,
            cancel_at_period_end: sub.cancel_at_period_end === 1,
            stripe_customer_id: sub.stripe_customer_id,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      logger.error('Get subscription error', { error: error.message });
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur interne' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ========================================
  // 4. POST /api/v1/billing/portal
  // ========================================
  if (path === '/api/v1/billing/portal' && method === 'POST') {
    try {
      const authResult = await auth.requireAuth(request, env);
      if (authResult.error) {
        return new Response(
          JSON.stringify({ success: false, error: authResult.error }),
          { status: authResult.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { tenant } = authResult;

      const sub = await env.DB.prepare(
        'SELECT stripe_customer_id FROM subscriptions WHERE tenant_id = ? AND stripe_customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 1'
      ).bind(tenant.id).first();

      if (!sub || !sub.stripe_customer_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Aucun compte Stripe associe. Veuillez d\'abord souscrire un plan.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const session = await stripeRequest('POST', '/billing_portal/sessions', env.STRIPE_SECRET_KEY, {
        customer: sub.stripe_customer_id,
        return_url: 'https://coccinelle-saas.pages.dev/dashboard/billing',
      });

      if (session.error) {
        logger.error('Stripe portal session creation failed', { error: session.error });
        return new Response(
          JSON.stringify({ success: false, error: 'Erreur lors de la creation du portail Stripe.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, url: session.url }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (error) {
      logger.error('Create portal session error', { error: error.message });
      return new Response(
        JSON.stringify({ success: false, error: 'Erreur interne' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Route non trouvee
  return null;
}
