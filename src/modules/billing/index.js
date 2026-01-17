/**
 * Module Billing - Point d'entrée principal
 * Version: 1.0.0
 *
 * Module de gestion de la facturation, tracking d'usage et abonnements
 */

// Controllers
import {
  getCurrentUsage,
  getUsageHistory,
  getUsageSummary
} from './controllers/usage.js';

import {
  getPlans,
  getPlanDetails,
  comparePlans
} from './controllers/plans.js';

import {
  getSubscription,
  createSubscription,
  upgradeSubscription,
  cancelSubscription,
  reactivateSubscription
} from './controllers/subscriptions.js';

import {
  getInvoices,
  getInvoiceDetails,
  generateInvoice,
  markInvoiceAsPaid,
  downloadInvoicePDF
} from './controllers/invoices.js';

import {
  createCheckoutSession,
  createPortalSession,
  handleStripeWebhook
} from './controllers/stripe.js';

/**
 * Router principal du module Billing
 */
export async function handleBillingRoutes(request, env, path, method) {
  try {
    // ============================================
    // USAGE ROUTES - /api/v1/billing/usage/*
    // ============================================

    // GET /api/v1/billing/usage/current
    if (path === '/api/v1/billing/usage/current' && method === 'GET') {
      return await getCurrentUsage(request, env);
    }

    // GET /api/v1/billing/usage/history
    if (path === '/api/v1/billing/usage/history' && method === 'GET') {
      return await getUsageHistory(request, env);
    }

    // GET /api/v1/billing/usage/summary
    if (path === '/api/v1/billing/usage/summary' && method === 'GET') {
      return await getUsageSummary(request, env);
    }

    // ============================================
    // PLANS ROUTES - /api/v1/billing/plans/*
    // ============================================

    // GET /api/v1/billing/plans
    if (path === '/api/v1/billing/plans' && method === 'GET') {
      return await getPlans(request, env);
    }

    // GET /api/v1/billing/plans/compare
    if (path === '/api/v1/billing/plans/compare' && method === 'GET') {
      return await comparePlans(request, env);
    }

    // GET /api/v1/billing/plans/:planId
    if (path.startsWith('/api/v1/billing/plans/') && method === 'GET') {
      const pathParts = path.split('/');
      const planId = pathParts[pathParts.length - 1];

      // Ne pas confondre avec /compare
      if (planId !== 'compare') {
        return await getPlanDetails(request, env, planId);
      }
    }

    // ============================================
    // SUBSCRIPTIONS ROUTES - /api/v1/billing/subscriptions/*
    // ============================================

    // GET /api/v1/billing/subscriptions
    if (path === '/api/v1/billing/subscriptions' && method === 'GET') {
      return await getSubscription(request, env);
    }

    // POST /api/v1/billing/subscriptions
    if (path === '/api/v1/billing/subscriptions' && method === 'POST') {
      return await createSubscription(request, env);
    }

    // PUT /api/v1/billing/subscriptions/:subscriptionId/upgrade
    if (path.match(/^\/api\/v1\/billing\/subscriptions\/[^/]+\/upgrade$/) && method === 'PUT') {
      const pathParts = path.split('/');
      const subscriptionId = pathParts[pathParts.length - 2];
      return await upgradeSubscription(request, env, subscriptionId);
    }

    // POST /api/v1/billing/subscriptions/:subscriptionId/cancel
    if (path.match(/^\/api\/v1\/billing\/subscriptions\/[^/]+\/cancel$/) && method === 'POST') {
      const pathParts = path.split('/');
      const subscriptionId = pathParts[pathParts.length - 2];
      return await cancelSubscription(request, env, subscriptionId);
    }

    // POST /api/v1/billing/subscriptions/:subscriptionId/reactivate
    if (path.match(/^\/api\/v1\/billing\/subscriptions\/[^/]+\/reactivate$/) && method === 'POST') {
      const pathParts = path.split('/');
      const subscriptionId = pathParts[pathParts.length - 2];
      return await reactivateSubscription(request, env, subscriptionId);
    }

    // ============================================
    // INVOICES ROUTES - /api/v1/billing/invoices/*
    // ============================================

    // GET /api/v1/billing/invoices
    if (path === '/api/v1/billing/invoices' && method === 'GET') {
      return await getInvoices(request, env);
    }

    // POST /api/v1/billing/invoices/generate
    if (path === '/api/v1/billing/invoices/generate' && method === 'POST') {
      return await generateInvoice(request, env);
    }

    // GET /api/v1/billing/invoices/:invoiceId
    if (path.match(/^\/api\/v1\/billing\/invoices\/[^/]+$/) && method === 'GET') {
      const pathParts = path.split('/');
      const invoiceId = pathParts[pathParts.length - 1];

      // Ne pas confondre avec /generate
      if (invoiceId !== 'generate') {
        return await getInvoiceDetails(request, env, invoiceId);
      }
    }

    // PUT /api/v1/billing/invoices/:invoiceId/pay
    if (path.match(/^\/api\/v1\/billing\/invoices\/[^/]+\/pay$/) && method === 'PUT') {
      const pathParts = path.split('/');
      const invoiceId = pathParts[pathParts.length - 2];
      return await markInvoiceAsPaid(request, env, invoiceId);
    }

    // GET /api/v1/billing/invoices/:invoiceId/download
    if (path.match(/^\/api\/v1\/billing\/invoices\/[^/]+\/download$/) && method === 'GET') {
      const pathParts = path.split('/');
      const invoiceId = pathParts[pathParts.length - 2];
      return await downloadInvoicePDF(request, env, invoiceId);
    }

    // ============================================
    // STRIPE ROUTES - /api/v1/billing/stripe/*
    // ============================================

    // POST /api/v1/billing/stripe/checkout
    if (path === '/api/v1/billing/stripe/checkout' && method === 'POST') {
      return await createCheckoutSession(request, env);
    }

    // POST /api/v1/billing/stripe/portal
    if (path === '/api/v1/billing/stripe/portal' && method === 'POST') {
      return await createPortalSession(request, env);
    }

    // POST /api/v1/billing/stripe/webhook
    if (path === '/api/v1/billing/stripe/webhook' && method === 'POST') {
      return await handleStripeWebhook(request, env);
    }

    // ============================================
    // HEALTH CHECK
    // ============================================

    // GET /api/v1/billing/health
    if (path === '/api/v1/billing/health' && method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        module: 'billing',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route non trouvée
    return null;

  } catch (error) {
    console.error('Billing route error:', error);

    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export { UsageTracker } from './services/usage-tracker.js';
