/**
 * Controller Usage - Gestion de la consommation
 */

import { UsageTracker } from '../services/usage-tracker.js';

/**
 * GET /api/v1/billing/usage/current
 * Récupérer la consommation du mois en cours
 */
export async function getCurrentUsage(request, env) {
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

    const tracker = new UsageTracker(env, env.DB);
    const usage = await tracker.getCurrentUsage(tenantId);

    if (!usage) {
      return new Response(JSON.stringify({
        error: 'No active subscription found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      usage
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching current usage:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/billing/usage/history
 * Récupérer l'historique de consommation
 */
export async function getUsageHistory(request, env) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const type = url.searchParams.get('type'); // 'call', 'sms', 'tts', etc.

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing tenantId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let query = `
      SELECT
        usage_id,
        usage_type,
        quantity,
        unit,
        unit_price_cents,
        total_price_cents,
        resource_id,
        resource_metadata,
        occurred_at
      FROM billing_usage
      WHERE tenant_id = ?
    `;
    const params = [tenantId];

    if (type) {
      query += ` AND usage_type = ?`;
      params.push(type);
    }

    if (startDate) {
      query += ` AND occurred_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND occurred_at <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY occurred_at DESC LIMIT 1000`;

    const result = await env.DB
      .prepare(query)
      .bind(...params)
      .all();

    // Formater les résultats
    const history = (result.results || []).map(row => ({
      usageId: row.usage_id,
      type: row.usage_type,
      quantity: row.quantity,
      unit: row.unit,
      cost: row.total_price_cents / 100,
      metadata: JSON.parse(row.resource_metadata || '{}'),
      date: row.occurred_at
    }));

    return new Response(JSON.stringify({
      success: true,
      history,
      count: history.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching usage history:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/billing/usage/summary
 * Résumé agrégé de la consommation par période
 */
export async function getUsageSummary(request, env) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    const period = url.searchParams.get('period') || 'month'; // 'day', 'week', 'month'

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing tenantId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Déterminer la date de début selon la période
    const now = new Date();
    let startDate;

    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
    } else { // month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const result = await env.DB
      .prepare(`
        SELECT
          usage_type,
          SUM(quantity) as total_quantity,
          SUM(total_price_cents) as total_cost_cents,
          COUNT(*) as count,
          MIN(occurred_at) as first_occurrence,
          MAX(occurred_at) as last_occurrence
        FROM billing_usage
        WHERE tenant_id = ?
          AND occurred_at >= ?
        GROUP BY usage_type
        ORDER BY total_cost_cents DESC
      `)
      .bind(tenantId, startDate.toISOString())
      .all();

    const summary = (result.results || []).map(row => ({
      type: row.usage_type,
      quantity: row.total_quantity,
      cost: row.total_cost_cents / 100,
      count: row.count,
      firstOccurrence: row.first_occurrence,
      lastOccurrence: row.last_occurrence
    }));

    const totalCost = summary.reduce((sum, item) => sum + item.cost, 0);

    return new Response(JSON.stringify({
      success: true,
      period,
      startDate: startDate.toISOString(),
      summary,
      totalCost
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
      });

  } catch (error) {
    console.error('Error fetching usage summary:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
