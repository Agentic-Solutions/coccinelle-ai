/**
 * Service de tracking d'usage - Billing Module
 * Enregistre automatiquement la consommation (appels, SMS, TTS, etc.)
 */

import { v4 as uuidv4 } from 'uuid';

export class UsageTracker {
  constructor(env, db) {
    this.env = env;
    this.db = db;
  }

  /**
   * Enregistrer un appel téléphonique
   * @param {string} tenantId - ID du tenant
   * @param {object} callData - Données de l'appel
   * @returns {Promise<object>}
   */
  async trackCall(tenantId, callData) {
    const { duration, callId, direction } = callData;

    // Obtenir la subscription du tenant
    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // Obtenir les tarifs du plan
    const plan = await this.getPlan(subscription.plan_id);

    // Calculer le nombre de minutes (arrondi à la minute supérieure)
    const minutes = Math.ceil(duration / 60);

    // Calculer le coût
    const unitPrice = plan.overage_call_price_cents;
    const totalPrice = minutes * unitPrice;

    // Enregistrer l'usage
    const usageId = uuidv4();
    await this.db
      .prepare(`
        INSERT INTO billing_usage (
          usage_id, tenant_id, subscription_id,
          usage_type, quantity, unit,
          unit_price_cents, total_price_cents,
          resource_id, resource_metadata,
          billing_period_start, billing_period_end,
          occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        usageId,
        tenantId,
        subscription.subscription_id,
        'call',
        minutes,
        'minutes',
        unitPrice,
        totalPrice,
        callId,
        JSON.stringify({ direction, duration }),
        subscription.current_period_start,
        subscription.current_period_end
      )
      .run();

    return {
      usageId,
      type: 'call',
      quantity: minutes,
      cost: totalPrice / 100 // Convertir en euros
    };
  }

  /**
   * Enregistrer un SMS envoyé
   */
  async trackSMS(tenantId, smsData) {
    const { smsId, to, from, body } = smsData;

    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const plan = await this.getPlan(subscription.plan_id);

    const usageId = uuidv4();
    await this.db
      .prepare(`
        INSERT INTO billing_usage (
          usage_id, tenant_id, subscription_id,
          usage_type, quantity, unit,
          unit_price_cents, total_price_cents,
          resource_id, resource_metadata,
          billing_period_start, billing_period_end,
          occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        usageId,
        tenantId,
        subscription.subscription_id,
        'sms',
        1,
        'sms',
        plan.overage_sms_price_cents,
        plan.overage_sms_price_cents,
        smsId,
        JSON.stringify({ to, from, length: body.length }),
        subscription.current_period_start,
        subscription.current_period_end
      )
      .run();

    return {
      usageId,
      type: 'sms',
      quantity: 1,
      cost: plan.overage_sms_price_cents / 100
    };
  }

  /**
   * Enregistrer l'usage TTS (Text-to-Speech)
   */
  async trackTTS(tenantId, ttsData) {
    const { duration, provider, voiceId, textLength } = ttsData;

    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const plan = await this.getPlan(subscription.plan_id);

    // Arrondir à la minute supérieure
    const minutes = Math.ceil(duration / 60);
    const totalPrice = minutes * plan.overage_tts_minute_price_cents;

    const usageId = uuidv4();
    await this.db
      .prepare(`
        INSERT INTO billing_usage (
          usage_id, tenant_id, subscription_id,
          usage_type, quantity, unit,
          unit_price_cents, total_price_cents,
          resource_id, resource_metadata,
          billing_period_start, billing_period_end,
          occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        usageId,
        tenantId,
        subscription.subscription_id,
        'tts',
        minutes,
        'minutes',
        plan.overage_tts_minute_price_cents,
        totalPrice,
        voiceId,
        JSON.stringify({ provider, textLength, duration }),
        subscription.current_period_start,
        subscription.current_period_end
      )
      .run();

    return {
      usageId,
      type: 'tts',
      quantity: minutes,
      cost: totalPrice / 100
    };
  }

  /**
   * Enregistrer un message WhatsApp
   */
  async trackWhatsApp(tenantId, whatsappData) {
    const { messageId, to, from } = whatsappData;

    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) {
      throw new Error('No active subscription found');
    }

    const plan = await this.getPlan(subscription.plan_id);

    // Prix WhatsApp = prix SMS * 1.5
    const unitPrice = Math.ceil(plan.overage_sms_price_cents * 1.5);

    const usageId = uuidv4();
    await this.db
      .prepare(`
        INSERT INTO billing_usage (
          usage_id, tenant_id, subscription_id,
          usage_type, quantity, unit,
          unit_price_cents, total_price_cents,
          resource_id, resource_metadata,
          billing_period_start, billing_period_end,
          occurred_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `)
      .bind(
        usageId,
        tenantId,
        subscription.subscription_id,
        'whatsapp',
        1,
        'message',
        unitPrice,
        unitPrice,
        messageId,
        JSON.stringify({ to, from }),
        subscription.current_period_start,
        subscription.current_period_end
      )
      .run();

    return {
      usageId,
      type: 'whatsapp',
      quantity: 1,
      cost: unitPrice / 100
    };
  }

  /**
   * Obtenir le résumé de consommation pour le mois en cours
   */
  async getCurrentUsage(tenantId) {
    const subscription = await this.getActiveSubscription(tenantId);
    if (!subscription) {
      return null;
    }

    const plan = await this.getPlan(subscription.plan_id);

    // Agréger l'usage par type
    const usageByType = await this.db
      .prepare(`
        SELECT
          usage_type,
          SUM(quantity) as total_quantity,
          SUM(total_price_cents) as total_cost_cents,
          COUNT(*) as count
        FROM billing_usage
        WHERE tenant_id = ?
          AND billing_period_start = ?
          AND billing_period_end = ?
        GROUP BY usage_type
      `)
      .bind(
        tenantId,
        subscription.current_period_start,
        subscription.current_period_end
      )
      .all();

    // Calculer l'overage (dépassement)
    const usage = {
      calls: {
        used: 0,
        included: plan.included_calls,
        overage: 0,
        overageCost: 0
      },
      sms: {
        used: 0,
        included: plan.included_sms,
        overage: 0,
        overageCost: 0
      },
      tts: {
        used: 0,
        included: plan.included_tts_minutes,
        overage: 0,
        overageCost: 0
      }
    };

    for (const row of usageByType.results || []) {
      const type = row.usage_type;
      if (type === 'call') {
        usage.calls.used = row.total_quantity;
        usage.calls.overage = Math.max(0, row.total_quantity - plan.included_calls);
        usage.calls.overageCost = row.total_cost_cents / 100;
      } else if (type === 'sms') {
        usage.sms.used = row.total_quantity;
        usage.sms.overage = Math.max(0, row.total_quantity - plan.included_sms);
        usage.sms.overageCost = row.total_cost_cents / 100;
      } else if (type === 'tts') {
        usage.tts.used = row.total_quantity;
        usage.tts.overage = Math.max(0, row.total_quantity - plan.included_tts_minutes);
        usage.tts.overageCost = row.total_cost_cents / 100;
      }
    }

    // Coût total
    const totalOverageCost =
      usage.calls.overageCost +
      usage.sms.overageCost +
      usage.tts.overageCost;

    return {
      subscription: {
        planId: plan.plan_id,
        planName: plan.name,
        monthlyPrice: plan.monthly_price_cents / 100,
        periodStart: subscription.current_period_start,
        periodEnd: subscription.current_period_end
      },
      usage,
      totalOverageCost,
      totalCost: (plan.monthly_price_cents / 100) + totalOverageCost
    };
  }

  /**
   * Obtenir la subscription active d'un tenant
   */
  async getActiveSubscription(tenantId) {
    const result = await this.db
      .prepare(`
        SELECT * FROM billing_subscriptions
        WHERE tenant_id = ?
          AND status = 'active'
        ORDER BY created_at DESC
        LIMIT 1
      `)
      .bind(tenantId)
      .first();

    return result;
  }

  /**
   * Obtenir un plan par son ID
   */
  async getPlan(planId) {
    const result = await this.db
      .prepare(`SELECT * FROM billing_plans WHERE plan_id = ?`)
      .bind(planId)
      .first();

    if (!result) {
      throw new Error(`Plan ${planId} not found`);
    }

    return result;
  }
}
