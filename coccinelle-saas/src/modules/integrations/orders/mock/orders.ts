/**
 * Mock Order System - Pour Tests & Développement
 * Coccinelle.AI - Mock Orders Implementation
 */

import {
  OrderSystem,
  OrderListOptions,
  OrderSearchOptions,
  CreateOrderParams,
  OrderUpdateParams,
  PaginatedOrderResult,
  Refund,
} from '../interface';
import { Order, Exchange, IntegrationHealth, ExchangeItem, Money, Address } from '../../types';

export class MockOrders implements OrderSystem {
  readonly systemName = 'mock';
  readonly apiVersion = '1.0.0';

  private orders: Map<string, Order> = new Map();
  private exchanges: Map<string, Exchange> = new Map();

  constructor(
    private credentials: Record<string, any>,
    private settings?: Record<string, any>
  ) {
    this.initializeMockData();
  }

  async checkHealth(): Promise<IntegrationHealth> {
    return {
      status: 'connected',
      lastChecked: new Date(),
      message: 'Mock order system is always healthy',
      details: {
        ordersCount: this.orders.size,
        exchangesCount: this.exchanges.size,
      },
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async getOrder(orderId: string): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order;
  }

  async getOrderByNumber(orderNumber: string): Promise<Order> {
    const order = Array.from(this.orders.values()).find(
      (o) => o.orderNumber === orderNumber
    );
    if (!order) {
      throw new Error(`Order not found: ${orderNumber}`);
    }
    return order;
  }

  async getCustomerOrders(
    customerId: string,
    options?: OrderListOptions
  ): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (o) => o.customer.id === customerId
    );
  }

  async getOrdersByEmail(email: string, options?: OrderListOptions): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (o) => o.customer.email === email
    );
  }

  async listOrders(options?: OrderListOptions): Promise<PaginatedOrderResult> {
    let orders = Array.from(this.orders.values());

    // Filtrer par statut
    if (options?.status) {
      orders = orders.filter((o) => o.status === options.status);
    }

    // Pagination
    const page = options?.page || 1;
    const perPage = options?.perPage || 20;
    const total = orders.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const data = orders.slice(start, end);

    return {
      data,
      pagination: {
        currentPage: page,
        perPage,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async searchOrders(query: string, options?: OrderSearchOptions): Promise<Order[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.orders.values()).filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(lowerQuery) ||
        o.customer.email?.toLowerCase().includes(lowerQuery) ||
        o.customer.firstName.toLowerCase().includes(lowerQuery) ||
        o.customer.lastName.toLowerCase().includes(lowerQuery)
    );
  }

  async createOrder(params: CreateOrderParams): Promise<Order> {
    // Implémentation simplifiée
    throw new Error('Not implemented in mock');
  }

  async updateOrder(orderId: string, updates: OrderUpdateParams): Promise<Order> {
    const order = await this.getOrder(orderId);
    Object.assign(order, updates);
    this.orders.set(orderId, order);
    return order;
  }

  async cancelOrder(orderId: string, reason?: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    order.status = 'cancelled';
    order.notes = reason;
    this.orders.set(orderId, order);
    return order;
  }

  async addOrderNote(orderId: string, note: string): Promise<void> {
    const order = await this.getOrder(orderId);
    order.notes = order.notes ? `${order.notes}\n${note}` : note;
    this.orders.set(orderId, order);
  }

  async updatePaymentStatus(
    orderId: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded'
  ): Promise<Order> {
    const order = await this.getOrder(orderId);
    order.paymentStatus = status;
    this.orders.set(orderId, order);
    return order;
  }

  async updateFulfillmentStatus(
    orderId: string,
    status: 'unfulfilled' | 'fulfilled' | 'partially_fulfilled'
  ): Promise<Order> {
    const order = await this.getOrder(orderId);
    order.fulfillmentStatus = status;
    this.orders.set(orderId, order);
    return order;
  }

  async markAsShipped(params: {
    orderId: string;
    trackingNumber?: string;
    carrier?: string;
    trackingUrl?: string;
    shippedAt?: Date;
  }): Promise<Order> {
    const order = await this.getOrder(params.orderId);
    order.trackingNumber = params.trackingNumber;
    order.carrier = params.carrier;
    order.trackingUrl = params.trackingUrl;
    order.shippedAt = params.shippedAt || new Date();
    order.fulfillmentStatus = 'fulfilled';
    this.orders.set(params.orderId, order);
    return order;
  }

  async markAsDelivered(orderId: string, deliveredAt?: Date): Promise<Order> {
    const order = await this.getOrder(orderId);
    order.deliveredAt = deliveredAt || new Date();
    order.status = 'completed';
    this.orders.set(orderId, order);
    return order;
  }

  async createExchange(params: {
    orderId: string;
    customerId: string;
    returnItems: ExchangeItem[];
    exchangeItems: ExchangeItem[];
    reason: string;
    notes?: string;
  }): Promise<Exchange> {
    const exchange: Exchange = {
      id: `exch_${Date.now()}`,
      orderId: params.orderId,
      customerId: params.customerId,
      returnItems: params.returnItems,
      exchangeItems: params.exchangeItems,
      status: 'requested',
      reason: params.reason,
      createdAt: new Date(),
      notes: params.notes,
    };

    this.exchanges.set(exchange.id, exchange);
    return exchange;
  }

  async getExchange(exchangeId: string): Promise<Exchange> {
    const exchange = this.exchanges.get(exchangeId);
    if (!exchange) {
      throw new Error(`Exchange not found: ${exchangeId}`);
    }
    return exchange;
  }

  async getOrderExchanges(orderId: string): Promise<Exchange[]> {
    return Array.from(this.exchanges.values()).filter(
      (e) => e.orderId === orderId
    );
  }

  async updateExchangeStatus(
    exchangeId: string,
    status: 'approved' | 'received' | 'completed' | 'cancelled'
  ): Promise<Exchange> {
    const exchange = await this.getExchange(exchangeId);
    exchange.status = status;
    this.exchanges.set(exchangeId, exchange);
    return exchange;
  }

  async generateReturnLabel(params: {
    exchangeId: string;
    returnAddress: Address;
    carrier?: string;
  }): Promise<{
    url: string;
    trackingNumber: string;
    carrier: string;
    cost: Money;
  }> {
    return {
      url: 'https://mock.com/labels/return-label-123.pdf',
      trackingNumber: `MOCK${Date.now()}`,
      carrier: params.carrier || 'Colissimo',
      cost: { amount: 4.9, currency: 'EUR' },
    };
  }

  private initializeMockData() {
    // Commande #2847 (exemple Emma - pantalon à échanger)
    const order2847: Order = {
      id: 'ord_2847',
      orderNumber: '#2847',
      customer: {
        id: 'cust_emma',
        firstName: 'Emma',
        lastName: 'Rousseau',
        email: 'emma.rousseau@gmail.com',
        phone: '+33612345678',
      },
      items: [
        {
          id: 'item_1',
          productId: 'prod_003',
          variantId: 'var_003_40',
          name: 'Pantalon Noir Taille Haute',
          sku: 'PT-2847-T40',
          quantity: 1,
          price: { amount: 79.0, currency: 'EUR' },
          total: { amount: 79.0, currency: 'EUR' },
        },
      ],
      subtotal: { amount: 79.0, currency: 'EUR' },
      shipping: { amount: 5.9, currency: 'EUR' },
      total: { amount: 84.9, currency: 'EUR' },
      status: 'completed',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      trackingNumber: 'FR123456789',
      carrier: 'Colissimo',
      createdAt: new Date('2025-01-13'),
      shippedAt: new Date('2025-01-14'),
      deliveredAt: new Date('2025-01-15'),
      updatedAt: new Date('2025-01-15'),
    };

    this.orders.set(order2847.id, order2847);

    // Commande #2901 (exemple Léa - mariage samedi)
    const order2901: Order = {
      id: 'ord_2901',
      orderNumber: '#2901',
      customer: {
        id: 'cust_lea',
        firstName: 'Léa',
        lastName: 'Martin',
        email: 'lea.martin@gmail.com',
        phone: '+33687654321',
      },
      items: [
        {
          id: 'item_2',
          productId: 'prod_001',
          variantId: 'var_001_40',
          name: 'Robe Fleurie Bleue',
          sku: 'RF-2847-T40',
          quantity: 1,
          price: { amount: 89.0, currency: 'EUR' },
          total: { amount: 89.0, currency: 'EUR' },
        },
      ],
      subtotal: { amount: 89.0, currency: 'EUR' },
      shipping: { amount: 0.0, currency: 'EUR' },
      total: { amount: 89.0, currency: 'EUR' },
      status: 'processing',
      paymentStatus: 'paid',
      fulfillmentStatus: 'fulfilled',
      trackingNumber: 'FR987654321',
      carrier: 'Colissimo',
      createdAt: new Date('2025-01-13'),
      shippedAt: new Date('2025-01-14'),
      updatedAt: new Date('2025-01-16'),
    };

    this.orders.set(order2901.id, order2901);
  }
}
