/**
 * Native CRM - Coccinelle.AI
 * CRM intégré pour les clients sans système externe
 */

import {
  CustomerSystem,
  CustomerListOptions,
  CustomerSearchOptions,
  CreateCustomerParams,
  CustomerUpdateParams,
  PaginatedCustomerResult,
  CommunicationPreferences,
  CustomerNote,
  CustomerSegment,
  CustomerActivity,
  ActivityOptions,
  CustomerStats,
} from '../interface';
import { Customer, IntegrationHealth, Money } from '../../types';

export interface NativeCRMConfig {
  tenantId: string;
  database?: any; // Connection à la base de données (Supabase, etc.)
}

export class NativeCRM implements CustomerSystem {
  readonly systemName = 'coccinelle-native';
  readonly apiVersion = '1.0.0';

  private tenantId: string;
  private db: any;

  // Storage en mémoire pour le développement (à remplacer par DB)
  private customers: Map<string, Customer> = new Map();
  private notes: Map<string, CustomerNote[]> = new Map();
  private activities: Map<string, CustomerActivity[]> = new Map();

  constructor(config: NativeCRMConfig) {
    this.tenantId = config.tenantId;
    this.db = config.database;
  }

  // ============================================
  // SANTÉ & CONNEXION
  // ============================================

  async checkHealth(): Promise<IntegrationHealth> {
    return {
      status: 'connected',
      lastChecked: new Date(),
      message: 'Native CRM is operational',
      details: {
        customersCount: this.customers.size,
        tenantId: this.tenantId,
      },
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  // ============================================
  // RÉCUPÉRATION CLIENTS
  // ============================================

  async getCustomer(customerId: string): Promise<Customer> {
    // TODO: Remplacer par requête DB
    // const customer = await this.db.customers.findUnique({ where: { id: customerId, tenantId: this.tenantId } });

    const customer = this.customers.get(customerId);
    if (!customer) {
      throw new Error(`Customer not found: ${customerId}`);
    }
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    // TODO: Remplacer par requête DB
    // const customer = await this.db.customers.findFirst({ where: { email, tenantId: this.tenantId } });

    return (
      Array.from(this.customers.values()).find(
        (c) => c.email?.toLowerCase() === email.toLowerCase()
      ) || null
    );
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    // TODO: Remplacer par requête DB
    // const customer = await this.db.customers.findFirst({ where: { phone, tenantId: this.tenantId } });

    const cleanPhone = this.cleanPhoneNumber(phone);
    return (
      Array.from(this.customers.values()).find(
        (c) => this.cleanPhoneNumber(c.phone || '') === cleanPhone
      ) || null
    );
  }

  async listCustomers(
    options?: CustomerListOptions
  ): Promise<PaginatedCustomerResult> {
    // TODO: Remplacer par requête DB avec pagination
    let customers = Array.from(this.customers.values());

    // Filtrer par segment
    if (options?.segment) {
      customers = customers.filter((c) => c.segment === options.segment);
    }

    // Filtrer par tags
    if (options?.tags && options.tags.length > 0) {
      customers = customers.filter((c) =>
        options.tags!.some((tag) => c.tags?.includes(tag))
      );
    }

    // Filtrer par dates
    if (options?.createdAfter) {
      customers = customers.filter(
        (c) => c.createdAt && c.createdAt >= options.createdAfter!
      );
    }

    if (options?.createdBefore) {
      customers = customers.filter(
        (c) => c.createdAt && c.createdAt <= options.createdBefore!
      );
    }

    // Trier
    if (options?.sortBy) {
      customers = this.sortCustomers(customers, options.sortBy, options.sortOrder);
    }

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
    // TODO: Remplacer par requête DB avec full-text search
    const lowerQuery = query.toLowerCase();
    let results = Array.from(this.customers.values());

    results = results.filter((c) => {
      const searchInName =
        options?.searchInName !== false &&
        (c.firstName.toLowerCase().includes(lowerQuery) ||
          c.lastName.toLowerCase().includes(lowerQuery));

      const searchInEmail =
        options?.searchInEmail !== false &&
        c.email?.toLowerCase().includes(lowerQuery);

      const searchInPhone =
        options?.searchInPhone !== false && c.phone?.includes(query);

      return searchInName || searchInEmail || searchInPhone;
    });

    // Limiter les résultats
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ============================================
  // CRÉATION & MODIFICATION
  // ============================================

  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    // Vérifier si le client existe déjà
    if (params.email) {
      const existing = await this.getCustomerByEmail(params.email);
      if (existing) {
        throw new Error(`Customer with email ${params.email} already exists`);
      }
    }

    if (params.phone) {
      const existing = await this.getCustomerByPhone(params.phone);
      if (existing) {
        throw new Error(`Customer with phone ${params.phone} already exists`);
      }
    }

    const customer: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      externalId: undefined,
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phone: params.phone,
      defaultAddress: params.defaultAddress,
      addresses: params.defaultAddress ? [params.defaultAddress] : undefined,
      preferredChannel: params.communicationPreferences?.preferredChannel || (params as any).preferredChannel,
      language: params.language || 'fr',
      totalOrders: 0,
      totalSpent: { amount: 0, currency: 'EUR' },
      averageOrderValue: { amount: 0, currency: 'EUR' },
      tags: params.tags || [],
      segment: params.segment,
      createdAt: new Date(),
      lastOrderAt: undefined,
      notes: params.notes,
      communicationPreferences: params.communicationPreferences || {
        preferredChannel: (params as any).preferredChannel,
      },
      metadata: {
        ...params.metadata,
        communicationPreferences: params.communicationPreferences,
        source: 'coccinelle-native',
        tenantId: this.tenantId,
      },
    };

    // TODO: Remplacer par insertion DB
    // await this.db.customers.create({ data: customer });

    this.customers.set(customer.id, customer);

    // Logger l'activité
    await this.logInteraction({
      customerId: customer.id,
      type: 'note',
      subject: 'Client créé',
      content: `Client créé dans Coccinelle.AI`,
      metadata: {
        source: 'system',
        createdBy: 'auto',
      },
    });

    return customer;
  }

  async updateCustomer(
    customerId: string,
    updates: CustomerUpdateParams
  ): Promise<Customer> {
    const customer = await this.getCustomer(customerId);

    // Appliquer les mises à jour
    Object.assign(customer, {
      ...updates,
      metadata: {
        ...customer.metadata,
        ...updates.metadata,
        updatedAt: new Date(),
      },
    });

    // TODO: Remplacer par mise à jour DB
    // await this.db.customers.update({ where: { id: customerId }, data: updates });

    this.customers.set(customerId, customer);

    return customer;
  }

  async deleteCustomer(customerId: string): Promise<void> {
    const customer = await this.getCustomer(customerId);

    // Soft delete
    customer.metadata = {
      ...customer.metadata,
      deleted: true,
      deletedAt: new Date(),
    };

    // TODO: Remplacer par soft delete DB
    // await this.db.customers.update({ where: { id: customerId }, data: { deleted: true, deletedAt: new Date() } });

    this.customers.set(customerId, customer);
  }

  async mergeCustomers(primaryId: string, secondaryId: string): Promise<Customer> {
    const primary = await this.getCustomer(primaryId);
    const secondary = await this.getCustomer(secondaryId);

    // Fusionner les données
    primary.totalOrders = (primary.totalOrders || 0) + (secondary.totalOrders || 0);
    primary.totalSpent = {
      amount: (primary.totalSpent?.amount || 0) + (secondary.totalSpent?.amount || 0),
      currency: primary.totalSpent?.currency || 'EUR',
    };

    // Fusionner les tags
    primary.tags = [
      ...new Set([...(primary.tags || []), ...(secondary.tags || [])]),
    ];

    // Fusionner les adresses
    if (secondary.addresses) {
      primary.addresses = [
        ...(primary.addresses || []),
        ...secondary.addresses,
      ];
    }

    // Mettre à jour le primaire
    await this.updateCustomer(primaryId, primary);

    // Marquer le secondaire comme fusionné
    secondary.metadata = {
      ...secondary.metadata,
      merged: true,
      mergedInto: primaryId,
      mergedAt: new Date(),
    };
    await this.updateCustomer(secondaryId, secondary);

    return primary;
  }

  // ============================================
  // PROFIL & PRÉFÉRENCES
  // ============================================

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

    // TODO: DB update
    this.customers.set(customerId, customer);

    return customer;
  }

  async addCustomerNote(
    customerId: string,
    note: string,
    metadata?: Record<string, any>
  ): Promise<CustomerNote> {
    const customer = await this.getCustomer(customerId);

    const customerNote: CustomerNote = {
      id: `note_${Date.now()}`,
      customerId,
      content: note,
      createdBy: 'system', // TODO: Récupérer l'utilisateur connecté
      createdAt: new Date(),
      metadata,
    };

    // TODO: DB insert
    const notes = this.notes.get(customerId) || [];
    notes.push(customerNote);
    this.notes.set(customerId, notes);

    // Aussi ajouter aux notes du customer
    customer.notes = customer.notes ? `${customer.notes}\n${note}` : note;
    this.customers.set(customerId, customer);

    return customerNote;
  }

  async getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    // TODO: DB query
    return this.notes.get(customerId) || [];
  }

  async addTags(customerId: string, tags: string[]): Promise<Customer> {
    const customer = await this.getCustomer(customerId);

    customer.tags = [...new Set([...(customer.tags || []), ...tags])];

    // TODO: DB update
    this.customers.set(customerId, customer);

    return customer;
  }

  async removeTags(customerId: string, tags: string[]): Promise<Customer> {
    const customer = await this.getCustomer(customerId);

    customer.tags = (customer.tags || []).filter((t) => !tags.includes(t));

    // TODO: DB update
    this.customers.set(customerId, customer);

    return customer;
  }

  // ============================================
  // SEGMENTATION
  // ============================================

  async addToSegment(customerId: string, segmentId: string): Promise<void> {
    const customer = await this.getCustomer(customerId);
    customer.segment = segmentId;

    // TODO: DB update
    this.customers.set(customerId, customer);
  }

  async removeFromSegment(customerId: string, segmentId: string): Promise<void> {
    const customer = await this.getCustomer(customerId);
    if (customer.segment === segmentId) {
      customer.segment = undefined;
    }

    // TODO: DB update
    this.customers.set(customerId, customer);
  }

  async getCustomerSegments(customerId: string): Promise<CustomerSegment[]> {
    const customer = await this.getCustomer(customerId);

    if (!customer.segment) {
      return [];
    }

    // TODO: Récupérer les détails du segment depuis la DB
    return [
      {
        id: customer.segment,
        name: customer.segment,
        description: `Segment ${customer.segment}`,
      },
    ];
  }

  async listSegments(): Promise<CustomerSegment[]> {
    // TODO: DB query pour récupérer tous les segments
    const segments = new Set<string>();
    Array.from(this.customers.values()).forEach((c) => {
      if (c.segment) segments.add(c.segment);
    });

    return Array.from(segments).map((s) => ({
      id: s,
      name: s,
      description: `Segment ${s}`,
    }));
  }

  // ============================================
  // HISTORIQUE & ACTIVITÉ
  // ============================================

  async getCustomerActivity(
    customerId: string,
    options?: ActivityOptions
  ): Promise<CustomerActivity[]> {
    // TODO: DB query
    let activities = this.activities.get(customerId) || [];

    // Filtrer par type
    if (options?.type) {
      activities = activities.filter((a) => a.type === options.type);
    }

    // Filtrer par dates
    if (options?.startDate) {
      activities = activities.filter((a) => a.createdAt >= options.startDate!);
    }

    if (options?.endDate) {
      activities = activities.filter((a) => a.createdAt <= options.endDate!);
    }

    // Limiter
    if (options?.limit) {
      activities = activities.slice(0, options.limit);
    }

    return activities;
  }

  async logInteraction(params: {
    customerId: string;
    type: 'call' | 'email' | 'sms' | 'whatsapp' | 'visit' | 'note';
    subject?: string;
    content?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const activity: CustomerActivity = {
      id: `activity_${Date.now()}`,
      customerId: params.customerId,
      type: params.type,
      title: params.subject || `${params.type} interaction`,
      description: params.content,
      metadata: params.metadata,
      createdAt: new Date(),
    };

    // TODO: DB insert
    const activities = this.activities.get(params.customerId) || [];
    activities.push(activity);
    this.activities.set(params.customerId, activities);
  }

  async getCustomerStats(customerId: string): Promise<CustomerStats> {
    const customer = await this.getCustomer(customerId);

    // TODO: Calculer depuis les vraies commandes
    const totalOrders = customer.totalOrders || 0;
    const totalSpent = customer.totalSpent || { amount: 0, currency: 'EUR' };
    const avgOrderValue =
      totalOrders > 0
        ? { amount: totalSpent.amount / totalOrders, currency: totalSpent.currency }
        : { amount: 0, currency: 'EUR' };

    const daysSinceLastOrder = customer.lastOrderAt
      ? Math.floor(
          (new Date().getTime() - customer.lastOrderAt.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : undefined;

    return {
      totalOrders,
      totalSpent,
      averageOrderValue: avgOrderValue,
      firstOrderDate: customer.createdAt,
      lastOrderDate: customer.lastOrderAt,
      daysSinceLastOrder,
      purchaseFrequency: undefined, // TODO: Calculer
      returnRate: undefined, // TODO: Calculer
      estimatedLifetimeValue: totalSpent, // TODO: Prédiction ML
      loyaltyScore: totalOrders > 5 ? 80 : totalOrders > 2 ? 50 : 20,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[^0-9+]/g, '');
  }

  private sortCustomers(
    customers: Customer[],
    sortBy: string,
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Customer[] {
    return customers.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`
          );
          break;
        case 'email':
          comparison = (a.email || '').localeCompare(b.email || '');
          break;
        case 'created_at':
          comparison =
            (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0);
          break;
        case 'total_spent':
          comparison = (a.totalSpent?.amount || 0) - (b.totalSpent?.amount || 0);
          break;
        case 'last_order':
          comparison =
            (a.lastOrderAt?.getTime() || 0) - (b.lastOrderAt?.getTime() || 0);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }
}

/**
 * Créer une instance de CRM Natif
 */
export function createNativeCRM(tenantId: string, database?: any): NativeCRM {
  return new NativeCRM({ tenantId, database });
}
