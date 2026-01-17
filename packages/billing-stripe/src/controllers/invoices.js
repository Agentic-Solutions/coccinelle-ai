/**
 * Controller Invoices - Gestion des factures
 */

import { v4 as uuidv4 } from 'uuid';
import { UsageTracker } from '../services/usage-tracker.js';

/**
 * GET /api/v1/billing/invoices
 * Liste des factures d'un tenant
 */
export async function getInvoices(request, env) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenantId');
    const status = url.searchParams.get('status'); // 'draft', 'open', 'paid', etc.
    const limit = parseInt(url.searchParams.get('limit') || '50');

    if (!tenantId) {
      return new Response(JSON.stringify({
        error: 'Missing tenantId parameter'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let query = `
      SELECT * FROM billing_invoices
      WHERE tenant_id = ?
    `;
    const params = [tenantId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY issue_date DESC LIMIT ?`;
    params.push(limit);

    const result = await env.DB
      .prepare(query)
      .bind(...params)
      .all();

    const invoices = (result.results || []).map(row => ({
      invoiceId: row.invoice_id,
      invoiceNumber: row.invoice_number,
      status: row.status,
      period: {
        start: row.period_start,
        end: row.period_end
      },
      amounts: {
        subscription: row.subscription_amount_cents / 100,
        overage: row.overage_amount_cents / 100,
        subtotal: row.subtotal_cents / 100,
        tax: row.tax_amount_cents / 100,
        total: row.total_cents / 100,
        currency: 'EUR'
      },
      payment: {
        date: row.payment_date,
        method: row.payment_method
      },
      dates: {
        issued: row.issue_date,
        due: row.due_date
      },
      pdfUrl: row.pdf_url,
      createdAt: row.created_at
    }));

    return new Response(JSON.stringify({
      success: true,
      invoices,
      count: invoices.length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching invoices:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/billing/invoices/:invoiceId
 * Détails d'une facture spécifique
 */
export async function getInvoiceDetails(request, env, invoiceId) {
  try {
    const result = await env.DB
      .prepare(`
        SELECT
          i.*,
          s.plan_id,
          p.name as plan_name
        FROM billing_invoices i
        JOIN billing_subscriptions s ON i.subscription_id = s.subscription_id
        JOIN billing_plans p ON s.plan_id = p.plan_id
        WHERE i.invoice_id = ?
      `)
      .bind(invoiceId)
      .first();

    if (!result) {
      return new Response(JSON.stringify({
        error: 'Invoice not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const invoice = {
      invoiceId: result.invoice_id,
      invoiceNumber: result.invoice_number,
      status: result.status,
      subscription: {
        id: result.subscription_id,
        planId: result.plan_id,
        planName: result.plan_name
      },
      period: {
        start: result.period_start,
        end: result.period_end
      },
      amounts: {
        subscription: result.subscription_amount_cents / 100,
        overage: result.overage_amount_cents / 100,
        subtotal: result.subtotal_cents / 100,
        tax: result.tax_amount_cents / 100,
        total: result.total_cents / 100,
        currency: 'EUR'
      },
      usageSummary: JSON.parse(result.usage_summary || '{}'),
      lineItems: JSON.parse(result.line_items || '[]'),
      payment: {
        date: result.payment_date,
        method: result.payment_method
      },
      dates: {
        issued: result.issue_date,
        due: result.due_date
      },
      pdfUrl: result.pdf_url,
      stripe: {
        invoiceId: result.stripe_invoice_id
      },
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };

    return new Response(JSON.stringify({
      success: true,
      invoice
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/billing/invoices/generate
 * Générer une facture pour une période
 */
export async function generateInvoice(request, env) {
  try {
    const body = await request.json();
    const { tenantId, subscriptionId } = body;

    if (!tenantId || !subscriptionId) {
      return new Response(JSON.stringify({
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer la subscription et le plan
    const subscription = await env.DB
      .prepare(`
        SELECT s.*, p.*
        FROM billing_subscriptions s
        JOIN billing_plans p ON s.plan_id = p.plan_id
        WHERE s.subscription_id = ?
      `)
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

    // Récupérer l'usage de la période
    const tracker = new UsageTracker(env, env.DB);
    const usage = await tracker.getCurrentUsage(tenantId);

    if (!usage) {
      return new Response(JSON.stringify({
        error: 'No usage data found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculer les montants
    const subscriptionAmount = subscription.billing_period === 'yearly'
      ? subscription.yearly_price_cents
      : subscription.monthly_price_cents;

    const overageAmount = Math.round(usage.totalOverageCost * 100); // Convertir en centimes
    const subtotal = subscriptionAmount + overageAmount;
    const taxRate = 0.20; // TVA 20%
    const taxAmount = Math.round(subtotal * taxRate);
    const total = subtotal + taxAmount;

    // Générer le numéro de facture
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    // Compter les factures du mois
    const countResult = await env.DB
      .prepare(`
        SELECT COUNT(*) as count
        FROM billing_invoices
        WHERE invoice_number LIKE ?
      `)
      .bind(`INV-${year}${month}-%`)
      .first();

    const invoiceNumber = `INV-${year}${month}-${String((countResult.count || 0) + 1).padStart(4, '0')}`;

    // Créer les lignes de facturation
    const lineItems = [
      {
        description: `Abonnement ${subscription.name} (${subscription.billing_period})`,
        quantity: 1,
        unitPrice: subscriptionAmount / 100,
        total: subscriptionAmount / 100
      }
    ];

    // Ajouter les overages
    if (usage.usage.calls.overage > 0) {
      lineItems.push({
        description: `Appels supplémentaires (${usage.usage.calls.overage} appels)`,
        quantity: usage.usage.calls.overage,
        unitPrice: subscription.overage_call_price_cents / 100,
        total: usage.usage.calls.overageCost
      });
    }

    if (usage.usage.sms.overage > 0) {
      lineItems.push({
        description: `SMS supplémentaires (${usage.usage.sms.overage} SMS)`,
        quantity: usage.usage.sms.overage,
        unitPrice: subscription.overage_sms_price_cents / 100,
        total: usage.usage.sms.overageCost
      });
    }

    if (usage.usage.tts.overage > 0) {
      lineItems.push({
        description: `TTS supplémentaire (${usage.usage.tts.overage} minutes)`,
        quantity: usage.usage.tts.overage,
        unitPrice: subscription.overage_tts_minute_price_cents / 100,
        total: usage.usage.tts.overageCost
      });
    }

    // Créer la facture
    const invoiceId = uuidv4();
    const dueDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 jours

    await env.DB
      .prepare(`
        INSERT INTO billing_invoices (
          invoice_id, tenant_id, subscription_id,
          invoice_number,
          period_start, period_end,
          subtotal_cents, subscription_amount_cents, overage_amount_cents,
          tax_amount_cents, total_cents,
          status, issue_date, due_date,
          usage_summary, line_items
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        invoiceId,
        tenantId,
        subscriptionId,
        invoiceNumber,
        subscription.current_period_start,
        subscription.current_period_end,
        subtotal,
        subscriptionAmount,
        overageAmount,
        taxAmount,
        total,
        'open',
        now.toISOString(),
        dueDate.toISOString(),
        JSON.stringify(usage),
        JSON.stringify(lineItems)
      )
      .run();

    return new Response(JSON.stringify({
      success: true,
      invoiceId,
      invoiceNumber,
      totalAmount: total / 100,
      message: 'Invoice generated successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * PUT /api/v1/billing/invoices/:invoiceId/pay
 * Marquer une facture comme payée
 */
export async function markInvoiceAsPaid(request, env, invoiceId) {
  try {
    const body = await request.json();
    const { paymentMethod } = body;

    const invoice = await env.DB
      .prepare('SELECT * FROM billing_invoices WHERE invoice_id = ?')
      .bind(invoiceId)
      .first();

    if (!invoice) {
      return new Response(JSON.stringify({
        error: 'Invoice not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB
      .prepare(`
        UPDATE billing_invoices
        SET status = 'paid',
            payment_date = CURRENT_TIMESTAMP,
            payment_method = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE invoice_id = ?
      `)
      .bind(paymentMethod || 'card', invoiceId)
      .run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Invoice marked as paid'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error marking invoice as paid:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * GET /api/v1/billing/invoices/:invoiceId/download
 * Télécharger le PDF d'une facture
 * TODO: Implémenter la génération PDF
 */
export async function downloadInvoicePDF(request, env, invoiceId) {
  try {
    const invoice = await env.DB
      .prepare('SELECT * FROM billing_invoices WHERE invoice_id = ?')
      .bind(invoiceId)
      .first();

    if (!invoice) {
      return new Response(JSON.stringify({
        error: 'Invoice not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Générer le PDF avec une bibliothèque comme pdfmake ou puppeteer
    // Pour l'instant, retourner un message
    return new Response(JSON.stringify({
      success: false,
      message: 'PDF generation not yet implemented',
      invoiceNumber: invoice.invoice_number
    }), {
      status: 501,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
