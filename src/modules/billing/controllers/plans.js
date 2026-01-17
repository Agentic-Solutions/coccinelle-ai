/**
 * Controller Plans - Gestion des plans d'abonnement
 */

/**
 * GET /api/v1/billing/plans
 * Liste tous les plans disponibles
 */
export async function getPlans(request, env) {
  try {
    const url = new URL(request.url);
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    let query = 'SELECT * FROM billing_plans';
    const params = [];

    if (activeOnly) {
      query += ' WHERE is_active = ?';
      params.push(true);
    }

    query += ' ORDER BY monthly_price_cents ASC';

    const result = await env.DB
      .prepare(query)
      .bind(...params)
      .all();

    const plans = (result.results || []).map(row => ({
      planId: row.plan_id,
      name: row.name,
      description: row.description,
      pricing: {
        monthly: row.monthly_price_cents / 100,
        yearly: row.yearly_price_cents ? row.yearly_price_cents / 100 : null,
        currency: row.currency
      },
      included: {
        calls: row.included_calls,
        sms: row.included_sms,
        ttsMinutes: row.included_tts_minutes,
        storageGb: row.included_storage_gb
      },
      overage: {
        callPrice: row.overage_call_price_cents / 100,
        smsPrice: row.overage_sms_price_cents / 100,
        ttsMinutePrice: row.overage_tts_minute_price_cents / 100
      },
      features: JSON.parse(row.features_json || '[]'),
      limits: {
        maxUsers: row.max_users,
        maxChannels: row.max_channels
      },
      isActive: row.is_active === 1
    }));

    return new Response(JSON.stringify({
      success: true,
      plans,
      count: plans.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching plans:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/billing/plans/:planId
 * Détails d'un plan spécifique
 */
export async function getPlanDetails(request, env, planId) {
  try {
    const result = await env.DB
      .prepare('SELECT * FROM billing_plans WHERE plan_id = ?')
      .bind(planId)
      .first();

    if (!result) {
      return new Response(JSON.stringify({
        error: 'Plan not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const plan = {
      planId: result.plan_id,
      name: result.name,
      description: result.description,
      pricing: {
        monthly: result.monthly_price_cents / 100,
        yearly: result.yearly_price_cents ? result.yearly_price_cents / 100 : null,
        currency: result.currency,
        yearlyDiscount: result.yearly_price_cents
          ? Math.round((1 - (result.yearly_price_cents / 12) / result.monthly_price_cents) * 100)
          : 0
      },
      included: {
        calls: result.included_calls,
        sms: result.included_sms,
        ttsMinutes: result.included_tts_minutes,
        storageGb: result.included_storage_gb
      },
      overage: {
        callPrice: result.overage_call_price_cents / 100,
        smsPrice: result.overage_sms_price_cents / 100,
        ttsMinutePrice: result.overage_tts_minute_price_cents / 100
      },
      features: JSON.parse(result.features_json || '[]'),
      limits: {
        maxUsers: result.max_users,
        maxChannels: result.max_channels
      },
      stripe: {
        priceId: result.stripe_price_id,
        productId: result.stripe_product_id
      },
      isActive: result.is_active === 1,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    return new Response(JSON.stringify({
      success: true,
      plan
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching plan details:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/billing/plans/compare
 * Comparaison des plans côte à côte
 */
export async function comparePlans(request, env) {
  try {
    const result = await env.DB
      .prepare(`
        SELECT * FROM billing_plans
        WHERE is_active = TRUE
        ORDER BY monthly_price_cents ASC
      `)
      .all();

    const plans = (result.results || []).map(row => ({
      planId: row.plan_id,
      name: row.name,
      monthlyPrice: row.monthly_price_cents / 100,
      yearlyPrice: row.yearly_price_cents ? row.yearly_price_cents / 100 : null,
      included: {
        calls: row.included_calls,
        sms: row.included_sms,
        ttsMinutes: row.included_tts_minutes,
        storageGb: row.included_storage_gb
      },
      features: JSON.parse(row.features_json || '[]'),
      maxUsers: row.max_users
    }));

    // Extraire toutes les features uniques
    const allFeatures = new Set();
    plans.forEach(plan => {
      plan.features.forEach(feature => allFeatures.add(feature));
    });

    return new Response(JSON.stringify({
      success: true,
      plans,
      allFeatures: Array.from(allFeatures)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error comparing plans:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
