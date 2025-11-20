/**
 * Mock Customer System - Pour Tests & Développement
 * Coccinelle.AI - Mock Customers Implementation
 */

import {
  CustomerSystem,
  CustomerListOptions,
  CustomerSearchOptions,
  CreateCustomerParams,
  CustomerUpdateParams,
  PaginatedCustomerResult,
  CommunicationPreferences,
} from '../interface';
import { Customer, IntegrationHealth } from '../../types';

export class MockCustomers implements CustomerSystem {
  readonly systemName = 'mock';
  readonly apiVersion = '1.0.0';

  private customers: Map<string, Customer> = new Map();

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
      message: 'Mock customer system is always healthy',
      details: {
        customersCount: this.customers.size,
      },
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async getCustomer(customerId: string): Promise<Customer> {
    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    return (
      Array.from(this.customers.values()).find((c) => c.email === email) || null
    );
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    return (
      Array.from(this.customers.values()).find((c) => c.phone === phone) || null
    );
  }

  async listCustomers(
    options?: CustomerListOptions
  ): Promise<PaginatedCustomerResult> {
    let customers = Array.from(this.customers.values());

    // Pagination
    const page = options?.page || 1;
    const perPage = options?.perPage || 20;
    const total = customers.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const data = customers.slice(start, end);

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

  async searchCustomers(
    query: string,
    options?: CustomerSearchOptions
  ): Promise<Customer[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.customers.values()).filter(
      (c) =>
        c.firstName.toLowerCase().includes(lowerQuery) ||
        c.lastName.toLowerCase().includes(lowerQuery) ||
        c.email?.toLowerCase().includes(lowerQuery) ||
        c.phone?.includes(query)
    );
  }

  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    const customer: Customer = {
      id: `cust_${Date.now()}`,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      defaultAddress: params.defaultAddress,
      preferredChannel: params.communicationPreferences?.preferredChannel,
      language: params.language,
      tags: params.tags,
      segment: params.segment,
      notes: params.notes,
      metadata: params.metadata,
      createdAt: new Date(),
    };

    this.customers.set(customer.id, customer);
    return customer;
  }

  async updateCustomer(
    customerId: string,
    updates: CustomerUpdateParams
  ): Promise<Customer> {
    const customer = await this.getCustomer(customerId);
    Object.assign(customer, updates);
    this.customers.set(customerId, customer);
    return customer;
  }

  async updateCommunicationPreferences(
    customerId: string,
    preferences: CommunicationPreferences
  ): Promise<Customer> {
    const customer = await this.getCustomer(customerId);
    customer.preferredChannel = preferences.preferredChannel;
    customer.metadata = {
      ...customer.metadata,
      communicationPreferences: preferences,
    };
    this.customers.set(customerId, customer);
    return customer;
  }

  async addCustomerNote(customerId: string, note: string): Promise<void> {
    const customer = await this.getCustomer(customerId);
    customer.notes = customer.notes ? `${customer.notes}\n${note}` : note;
    this.customers.set(customerId, customer);
  }

  async addTags(customerId: string, tags: string[]): Promise<Customer> {
    const customer = await this.getCustomer(customerId);
    customer.tags = [...new Set([...(customer.tags || []), ...tags])];
    this.customers.set(customerId, customer);
    return customer;
  }

  async removeTags(customerId: string, tags: string[]): Promise<Customer> {
    const customer = await this.getCustomer(customerId);
    customer.tags = (customer.tags || []).filter((t) => !tags.includes(t));
    this.customers.set(customerId, customer);
    return customer;
  }

  private initializeMockData() {
    // Julie Mercier
    const julie: Customer = {
      id: 'cust_julie',
      firstName: 'Julie',
      lastName: 'Mercier',
      email: 'julie.mercier@gmail.com',
      phone: '+33645789012',
      preferredChannel: 'sms',
      totalOrders: 8,
      totalSpent: { amount: 720.0, currency: 'EUR' },
      averageOrderValue: { amount: 90.0, currency: 'EUR' },
      tags: ['VIP', 'Fidèle'],
      segment: 'high_value',
      createdAt: new Date('2024-06-15'),
      lastOrderAt: new Date('2025-01-10'),
    };

    this.customers.set(julie.id, julie);

    // Emma Rousseau
    const emma: Customer = {
      id: 'cust_emma',
      firstName: 'Emma',
      lastName: 'Rousseau',
      email: 'emma.rousseau@gmail.com',
      phone: '+33612345678',
      preferredChannel: 'email',
      totalOrders: 3,
      totalSpent: { amount: 245.0, currency: 'EUR' },
      averageOrderValue: { amount: 81.67, currency: 'EUR' },
      tags: ['Nouveau'],
      createdAt: new Date('2024-11-20'),
      lastOrderAt: new Date('2025-01-13'),
    };

    this.customers.set(emma.id, emma);

    // Léa Martin
    const lea: Customer = {
      id: 'cust_lea',
      firstName: 'Léa',
      lastName: 'Martin',
      email: 'lea.martin@gmail.com',
      phone: '+33687654321',
      preferredChannel: 'whatsapp',
      totalOrders: 12,
      totalSpent: { amount: 1280.0, currency: 'EUR' },
      averageOrderValue: { amount: 106.67, currency: 'EUR' },
      tags: ['VIP', 'Fidèle', 'Influenceuse'],
      segment: 'high_value',
      createdAt: new Date('2024-03-10'),
      lastOrderAt: new Date('2025-01-13'),
    };

    this.customers.set(lea.id, lea);
  }
}
