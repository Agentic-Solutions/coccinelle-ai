/**
 * Controller Subscriptions - Gestion des abonnements
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * GET /api/v1/billing/subscriptions
 * Récupérer l'abonnement actif d'un tenant
 */
export async function getSubscription(request, env) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing tenantId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await env.DB
      .prepare(`
        SELECT
          s.*,
          p.name as plan_name,
          p.monthly_price_cents,
          p.yearly_price_cents
        FROM billing_subscriptions s
        JOIN billing_plans p ON s.plan_id = p.plan_id
        WHERE s.tenant_id = ?
        ORDER BY s.created_at DESC
        LIMIT 1
      `)
      .bind(tenantId)
      .first();

    if (!result) {
      return new Response(JSON.stringify({
        error: 'No subscription found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const subscription = {
      subscriptionId: result.subscription_id,
      tenantId: result.tenant_id,
      plan: {
        id: result.plan_id,
        name: result.plan_name
      },
      status: result.status,
      billingPeriod: result.billing_period,
      period: {
        start: result.current_period_start,
        end: result.current_period_end
      },
      trial: {
        start: result.trial_start,
        end: result.trial_end
      },
      payment: {
        method: result.payment_method,
        lastPayment: result.last_payment_date,
        nextPayment: result.next_payment_date
      },
      cancelAtPeriodEnd: result.cancel_at_period_end === 1,
      canceledAt: result.canceled_at,
      stripe: {
        customerId: result.stripe_customer_id,
        subscriptionId: result.stripe_subscription_id
      },
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    return new Response(JSON.stringify({
      success: true,
      subscription
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/billing/subscriptions
 * Créer un nouvel abonnement
 */
export async function createSubscription(request, env) {
  try {
    const body = await request.json();
    const { tenantId, planId, billingPeriod = 'monthly' } = body;

    if (!tenantId || !planId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: tenantId, planId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier que le plan existe
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

    // Vérifier qu'il n'y a pas déjà un abonnement actif
    const existing = await env.DB
      .prepare(`
        SELECT * FROM billing_subscriptions
        WHERE tenant_id = ? AND status IN ('active', 'trialing')
      `)
      .bind(tenantId)
      .first();

    if (existing) {
      return new Response(JSON.stringify({
        error: 'Active subscription already exists'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Créer la subscription
    const subscriptionId = uuidv4();
    const now = new Date();
    const periodStart = now.toISOString();

    // Calculer la date de fin selon la période
    const periodEnd = new Date(now);
    if (billingPeriod === 'yearly') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Si c'est un free trial, définir les dates de trial
    const isTrial = planId === 'free_trial';
    const trialEnd = isTrial ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) : null; // 7 jours

    await env.DB
      .prepare(`
        INSERT INTO billing_subscriptions (
          subscription_id, tenant_id, plan_id,
          status, billing_period,
          current_period_start, current_period_end,
          trial_start, trial_end,
          next_payment_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        subscriptionId,
        tenantId,
        planId,
        isTrial ? 'trialing' : 'active',
        billingPeriod,
        periodStart,
        periodEnd.toISOString(),
        isTrial ? periodStart : null,
        isTrial ? trialEnd.toISOString() : null,
        isTrial ? trialEnd.toISOString() : periodEnd.toISOString()
      )
      .run();

    return new Response(JSON.stringify({
      success: true,
      subscriptionId,
      message: 'Subscription created successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PUT /api/v1/billing/subscriptions/:subscriptionId/upgrade
 * Changer de plan (upgrade ou downgrade)
 */
export async function upgradeSubscription(request, env, subscriptionId) {
  try {
    const body = await request.json();
    const { newPlanId, billingPeriod } = body;

    if (!newPlanId) {
      return new Response(JSON.stringify({
        error: 'Missing required field: newPlanId'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier que le plan existe
    const newPlan = await env.DB
      .prepare('SELECT * FROM billing_plans WHERE plan_id = ?')
      .bind(newPlanId)
      .first();

    if (!newPlan) {
      return new Response(JSON.stringify({
        error: 'Plan not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier que la subscription existe
    const subscription = await env.DB
      .prepare('SELECT * FROM billing_subscriptions WHERE subscription_id = ?')
      .bind(subscriptionId)
      .first();

    if (!subscription) {
      return new Response(JSON.stringify({
        error: 'Subscription not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mettre à jour la subscription
    await env.DB
      .prepare(`
        UPDATE billing_subscriptions
        SET plan_id = ?,
            billing_period = COALESCE(?, billing_period),
            updated_at = CURRENT_TIMESTAMP
        WHERE subscription_id = ?
      `)
      .bind(newPlanId, billingPeriod, subscriptionId)
      .run();

    // TODO: Créer une facture de prorata si upgrade immédiat

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription upgraded successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error upgrading subscription:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/billing/subscriptions/:subscriptionId/cancel
 * Annuler un abonnement
 */
export async function cancelSubscription(request, env, subscriptionId) {
  try {
    const body = await request.json();
    const { immediate = false } = body;

    // Vérifier que la subscription existe
    const subscription = await env.DB
      .prepare('SELECT * FROM billing_subscriptions WHERE subscription_id = ?')
      .bind(subscriptionId)
      .first();

    if (!subscription) {
      return new Response(JSON.stringify({
        error: 'Subscription not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (immediate) {
      // Annulation immédiate
      await env.DB
        .prepare(`
          UPDATE billing_subscriptions
          SET status = 'canceled',
              canceled_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE subscription_id = ?
        `)
        .bind(subscriptionId)
        .run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Subscription canceled immediately'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Annulation en fin de période
      await env.DB
        .prepare(`
          UPDATE billing_subscriptions
          SET cancel_at_period_end = TRUE,
              canceled_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE subscription_id = ?
        `)
        .bind(subscriptionId)
        .run();

      return new Response(JSON.stringify({
        success: true,
        message: 'Subscription will be canceled at period end',
        periodEnd: subscription.current_period_end
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/billing/subscriptions/:subscriptionId/reactivate
 * Réactiver un abonnement annulé (avant la fin de période)
 */
export async function reactivateSubscription(request, env, subscriptionId) {
  try {
    const subscription = await env.DB
      .prepare('SELECT * FROM billing_subscriptions WHERE subscription_id = ?')
      .bind(subscriptionId)
      .first();

    if (!subscription) {
      return new Response(JSON.stringify({
        error: 'Subscription not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!subscription.cancel_at_period_end) {
      return new Response(JSON.stringify({
        error: 'Subscription is not scheduled for cancellation'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB
      .prepare(`
        UPDATE billing_subscriptions
        SET cancel_at_period_end = FALSE,
            canceled_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE subscription_id = ?
      `)
      .bind(subscriptionId)
      .run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription reactivated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
