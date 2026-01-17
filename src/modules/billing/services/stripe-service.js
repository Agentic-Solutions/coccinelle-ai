/**
 * Service Stripe - Gestion des paiements
 */

import Stripe from 'stripe';

export class StripeService {
  constructor(apiKey) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2023-10-16',
      // Pour Cloudflare Workers, on utilise la fetch API native
      httpClient: Stripe.createFetchHttpClient(),
    });
  }

  /**
   * Créer un customer Stripe
   */
  async createCustomer(data) {
    try {
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          tenantId: data.tenantId,
          companyName: data.companyName || ''
        }
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Récupérer un customer Stripe
   */
  async getCustomer(customerId) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId);
      return customer;
    } catch (error) {
      console.error('Error retrieving Stripe customer:', error);
      throw error;
    }
  }

  /**
   * Créer une session de checkout Stripe
   */
  async createCheckoutSession(data) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: data.customerId,
        mode: data.mode || 'subscription', // 'subscription' ou 'payment'
        line_items: data.lineItems,
        success_url: data.successUrl,
        cancel_url: data.cancelUrl,
        metadata: {
          tenantId: data.tenantId,
          planId: data.planId,
          billingPeriod: data.billingPeriod || 'monthly'
        },
        subscription_data: data.mode === 'subscription' ? {
          metadata: {
            tenantId: data.tenantId,
            planId: data.planId
          }
        } : undefined,
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        payment_method_types: ['card', 'sepa_debit'],
        locale: 'fr'
      });

      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  }

  /**
   * Créer un abonnement Stripe directement
   */
  async createSubscription(data) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: data.customerId,
        items: data.items,
        metadata: {
          tenantId: data.tenantId,
          planId: data.planId
        },
        trial_period_days: data.trialDays || undefined,
        default_payment_method: data.paymentMethodId || undefined
      });

      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Modifier un abonnement (upgrade/downgrade)
   */
  async updateSubscription(subscriptionId, data) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        items: data.items,
        proration_behavior: data.prorate ? 'create_prorations' : 'none',
        metadata: {
          planId: data.planId
        }
      });

      return subscription;
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }

  /**
   * Annuler un abonnement
   */
  async cancelSubscription(subscriptionId, immediate = false) {
    try {
      if (immediate) {
        const subscription = await this.stripe.subscriptions.cancel(subscriptionId);
        return subscription;
      } else {
        const subscription = await this.stripe.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true
        });
        return subscription;
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  /**
   * Réactiver un abonnement
   */
  async reactivateSubscription(subscriptionId) {
    try {
      const subscription = await this.stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: false
      });
      return subscription;
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  /**
   * Créer un Price (pour un plan)
   */
  async createPrice(data) {
    try {
      const price = await this.stripe.prices.create({
        product: data.productId,
        unit_amount: data.amountCents,
        currency: data.currency || 'eur',
        recurring: data.recurring ? {
          interval: data.recurring.interval, // 'month' ou 'year'
          interval_count: data.recurring.intervalCount || 1
        } : undefined,
        metadata: {
          planId: data.planId
        }
      });

      return price;
    } catch (error) {
      console.error('Error creating price:', error);
      throw error;
    }
  }

  /**
   * Créer un Product (pour un plan)
   */
  async createProduct(data) {
    try {
      const product = await this.stripe.products.create({
        name: data.name,
        description: data.description,
        metadata: {
          planId: data.planId
        }
      });

      return product;
    } catch (error) {
      console.error('Error creating product:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les invoices d'un customer
   */
  async getCustomerInvoices(customerId) {
    try {
      const invoices = await this.stripe.invoices.list({
        customer: customerId,
        limit: 100
      });

      return invoices.data;
    } catch (error) {
      console.error('Error retrieving customer invoices:', error);
      throw error;
    }
  }

  /**
   * Récupérer une invoice
   */
  async getInvoice(invoiceId) {
    try {
      const invoice = await this.stripe.invoices.retrieve(invoiceId);
      return invoice;
    } catch (error) {
      console.error('Error retrieving invoice:', error);
      throw error;
    }
  }

  /**
   * Créer une invoice manuelle
   */
  async createInvoice(data) {
    try {
      const invoice = await this.stripe.invoices.create({
        customer: data.customerId,
        description: data.description,
        metadata: {
          tenantId: data.tenantId
        },
        auto_advance: true
      });

      // Ajouter les line items
      if (data.lineItems) {
        for (const item of data.lineItems) {
          await this.stripe.invoiceItems.create({
            customer: data.customerId,
            invoice: invoice.id,
            amount: item.amountCents,
            currency: 'eur',
            description: item.description
          });
        }
      }

      // Finaliser l'invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);
      return finalizedInvoice;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Récupérer les payment methods d'un customer
   */
  async getCustomerPaymentMethods(customerId) {
    try {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card'
      });

      return paymentMethods.data;
    } catch (error) {
      console.error('Error retrieving payment methods:', error);
      throw error;
    }
  }

  /**
   * Définir un payment method par défaut
   */
  async setDefaultPaymentMethod(customerId, paymentMethodId) {
    try {
      const customer = await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId
        }
      });

      return customer;
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw error;
    }
  }

  /**
   * Vérifier la signature d'un webhook Stripe
   */
  verifyWebhookSignature(payload, signature, secret) {
    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
      return event;
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      throw error;
    }
  }

  /**
   * Créer un portal session pour que le customer gère son abonnement
   */
  async createPortalSession(customerId, returnUrl) {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      });

      return session;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw error;
    }
  }
}
