/**
 * Controller Stripe - Gestion des paiements Stripe
 */

import { StripeService } from '../services/stripe-service.js';

/**
 * POST /api/v1/billing/stripe/checkout
 * Créer une session de checkout Stripe
 */
export async function createCheckoutSession(request, env) {
  try {
    const body = await request.json();
    const { tenantId, planId, billingPeriod, email, name } = body;

    if (!tenantId || !planId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: tenantId, planId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer le plan
    const plan = await env.DB
      .prepare('SELECT * FROM billing_plans WHERE plan_id = ?')
      .bind(planId)
      .first();

    if (!plan) {
      return new Response(JSON.stringify({
        error: 'Plan not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialiser Stripe
    const stripe = new StripeService(env.STRIPE_SECRET_KEY);

    // Vérifier si le customer existe déjà
    let customerId;
    const existingCustomer = await env.DB
      .prepare('SELECT stripe_customer_id FROM billing_subscriptions WHERE tenant_id = ?')
      .bind(tenantId)
      .first();

    if (existingCustomer && existingCustomer.stripe_customer_id) {
      customerId = existingCustomer.stripe_customer_id;
    } else {
      // Créer un nouveau customer Stripe
      const customer = await stripe.createCustomer({
        email,
        name,
        tenantId,
        companyName: name
      });
      customerId = customer.id;
    }

    // Déterminer le prix en fonction de la période de facturation
    const priceAmount = billingPeriod === 'yearly'
      ? plan.yearly_price_cents
      : plan.monthly_price_cents;

    // Créer la session de checkout
    const session = await stripe.createCheckoutSession({
      customerId,
      mode: 'subscription',
      lineItems: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: plan.name,
            description: plan.description,
          },
          unit_amount: priceAmount,
          recurring: {
            interval: billingPeriod === 'yearly' ? 'year' : 'month'
          }
        },
        quantity: 1
      }],
      successUrl: `${env.FRONTEND_URL}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${env.FRONTEND_URL}/dashboard/billing/upgrade?canceled=true`,
      tenantId,
      planId,
      billingPeriod
    });

    return new Response(JSON.stringify({
      success: true,
      sessionId: session.id,
      url: session.url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/billing/stripe/portal
 * Créer une session de portal Stripe (pour gérer l'abonnement)
 */
export async function createPortalSession(request, env) {
  try {
    const body = await request.json();
    const { tenantId } = body;

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing tenantId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer le customer ID
    const subscription = await env.DB
      .prepare('SELECT stripe_customer_id FROM billing_subscriptions WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 1')
      .bind(tenantId)
      .first();

    if (!subscription || !subscription.stripe_customer_id) {
      return new Response(JSON.stringify({
        error: 'No Stripe customer found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialiser Stripe
    const stripe = new StripeService(env.STRIPE_SECRET_KEY);

    // Créer la session portal
    const session = await stripe.createPortalSession(
      subscription.stripe_customer_id,
      `${env.FRONTEND_URL}/dashboard/billing`
    );

    return new Response(JSON.stringify({
      success: true,
      url: session.url
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/billing/stripe/webhook
 * Gérer les webhooks Stripe
 */
export async function handleStripeWebhook(request, env) {
  try {
    const signature = request.headers.get('stripe-signature');
    const body = await request.text();

    if (!signature) {
      return new Response(JSON.stringify({
        error: 'Missing stripe-signature header'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialiser Stripe
    const stripe = new StripeService(env.STRIPE_SECRET_KEY);

    // Vérifier la signature du webhook
    const event = stripe.verifyWebhookSignature(
      body,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    console.log('Stripe webhook received:', event.type);

    // Gérer les différents événements
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, env);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, env);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, env);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, env);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object, env);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object, env);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error handling webhook:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Gérer la complétion d'un checkout
 */
async function handleCheckoutCompleted(session, env) {
  try {
    const tenantId = session.metadata.tenantId;
    const planId = session.metadata.planId;
    const billingPeriod = session.metadata.billingPeriod || 'monthly';

    // Créer ou mettre à jour la subscription dans notre DB
    const subscriptionId = session.subscription;
    const customerId = session.customer;

    // Vérifier si une subscription existe déjà
    const existing = await env.DB
      .prepare('SELECT * FROM billing_subscriptions WHERE tenant_id = ?')
      .bind(tenantId)
      .first();

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    if (existing) {
      // Mettre à jour
      await env.DB
        .prepare(`
          UPDATE billing_subscriptions
          SET plan_id = ?,
              status = 'active',
              billing_period = ?,
              stripe_customer_id = ?,
              stripe_subscription_id = ?,
              current_period_start = ?,
              current_period_end = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE tenant_id = ?
        `)
        .bind(
          planId,
          billingPeriod,
          customerId,
          subscriptionId,
          now.toISOString(),
          periodEnd.toISOString(),
          tenantId
        )
        .run();
    } else {
      // Créer
      const { v4: uuidv4 } = await import('uuid');
      await env.DB
        .prepare(`
          INSERT INTO billing_subscriptions (
            subscription_id, tenant_id, plan_id,
            status, billing_period,
            stripe_customer_id, stripe_subscription_id,
            current_period_start, current_period_end
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          uuidv4(),
          tenantId,
          planId,
          'active',
          billingPeriod,
          customerId,
          subscriptionId,
          now.toISOString(),
          periodEnd.toISOString()
        )
        .run();
    }

    console.log(`Subscription created/updated for tenant: ${tenantId}`);
  } catch (error) {
    console.error('Error handling checkout completed:', error);
  }
}

/**
 * Gérer la création d'une subscription
 */
async function handleSubscriptionCreated(subscription, env) {
  console.log('Subscription created:', subscription.id);
  // La logique est gérée dans handleCheckoutCompleted
}

/**
 * Gérer la mise à jour d'une subscription
 */
async function handleSubscriptionUpdated(subscription, env) {
  try {
    const subscriptionId = subscription.id;
    const status = subscription.status;

    await env.DB
      .prepare(`
        UPDATE billing_subscriptions
        SET status = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = ?
      `)
      .bind(status, subscriptionId)
      .run();

    console.log(`Subscription updated: ${subscriptionId}, status: ${status}`);
  } catch (error) {
    console.error('Error handling subscription updated:', error);
  }
}

/**
 * Gérer la suppression d'une subscription
 */
async function handleSubscriptionDeleted(subscription, env) {
  try {
    const subscriptionId = subscription.id;

    await env.DB
      .prepare(`
        UPDATE billing_subscriptions
        SET status = 'canceled',
            canceled_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = ?
      `)
      .bind(subscriptionId)
      .run();

    console.log(`Subscription canceled: ${subscriptionId}`);
  } catch (error) {
    console.error('Error handling subscription deleted:', error);
  }
}

/**
 * Gérer le paiement d'une invoice
 */
async function handleInvoicePaid(invoice, env) {
  try {
    const subscriptionId = invoice.subscription;
    const amountPaid = invoice.amount_paid;

    // Mettre à jour la date du dernier paiement
    await env.DB
      .prepare(`
        UPDATE billing_subscriptions
        SET last_payment_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = ?
      `)
      .bind(subscriptionId)
      .run();

    console.log(`Invoice paid: ${invoice.id}, amount: ${amountPaid}`);
  } catch (error) {
    console.error('Error handling invoice paid:', error);
  }
}

/**
 * Gérer l'échec de paiement d'une invoice
 */
async function handleInvoicePaymentFailed(invoice, env) {
  try {
    const subscriptionId = invoice.subscription;

    // Marquer la subscription comme ayant un problème de paiement
    await env.DB
      .prepare(`
        UPDATE billing_subscriptions
        SET status = 'past_due',
            updated_at = CURRENT_TIMESTAMP
        WHERE stripe_subscription_id = ?
      `)
      .bind(subscriptionId)
      .run();

    console.log(`Invoice payment failed: ${invoice.id}`);
    // TODO: Envoyer une notification au customer
  } catch (error) {
    console.error('Error handling invoice payment failed:', error);
  }
}
