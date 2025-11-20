/**
 * Service de base de données pour le CRM
 * Connecte les modules CRM avec Cloudflare D1
 */

import { Customer, CustomerNote, CustomerActivity, CreateCustomerParams } from '@/modules/integrations/types';

// Type pour la base de données Cloudflare D1
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: any[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta: any;
  error?: string;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

/**
 * Service CRM Database - Connexion avec D1
 */
export class CRMDatabaseService {
  constructor(private db: D1Database, private tenantId: string) {}

  /**
   * Créer un nouveau client
   */
  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    const customerId = `cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Insérer dans prospects (qui sert de table customers)
    await this.db
      .prepare(`
        INSERT INTO prospects (
          id, tenant_id, first_name, last_name, email, phone,
          preferred_channel, segment, address, city, postal_code, country,
          status, total_orders, total_revenue, currency, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(
        customerId,
        this.tenantId,
        params.firstName,
        params.lastName,
        params.email || null,
        params.phone || null,
        params.communicationPreferences?.preferredChannel || 'phone',
        params.segment || 'prospect',
        params.address || null,
        params.city || null,
        params.postalCode || null,
        params.country || 'FR',
        'new',
        0,
        0.0,
        'EUR',
        JSON.stringify(params.metadata || {})
      )
      .run();

    // Ajouter les tags
    if (params.tags && params.tags.length > 0) {
      const tagStatements = params.tags.map((tag) =>
        this.db
          .prepare(`INSERT INTO customer_tags (id, tenant_id, prospect_id, tag) VALUES (?, ?, ?, ?)`)
          .bind(`tag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, this.tenantId, customerId, tag)
      );
      await this.db.batch(tagStatements);
    }

    return this.getCustomer(customerId);
  }

  /**
   * Récupérer un client par ID
   */
  async getCustomer(customerId: string): Promise<Customer> {
    const customer = await this.db
      .prepare(`
        SELECT * FROM v_customers WHERE id = ? AND tenant_id = ?
      `)
      .bind(customerId, this.tenantId)
      .first();

    if (!customer) {
      throw new Error(`Customer ${customerId} not found`);
    }

    return this.mapToCustomer(customer);
  }

  /**
   * Récupérer un client par email
   */
  async getCustomerByEmail(email: string): Promise<Customer | null> {
    const customer = await this.db
      .prepare(`
        SELECT * FROM v_customers WHERE email = ? AND tenant_id = ?
      `)
      .bind(email, this.tenantId)
      .first();

    return customer ? this.mapToCustomer(customer) : null;
  }

  /**
   * Récupérer un client par téléphone
   */
  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    const customer = await this.db
      .prepare(`
        SELECT * FROM v_customers WHERE phone = ? AND tenant_id = ?
      `)
      .bind(phone, this.tenantId)
      .first();

    return customer ? this.mapToCustomer(customer) : null;
  }

  /**
   * Rechercher des clients
   */
  async searchCustomers(query: string, options?: { limit?: number; offset?: number }): Promise<Customer[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    const result = await this.db
      .prepare(`
        SELECT * FROM v_customers
        WHERE tenant_id = ?
        AND (
          first_name LIKE ? OR
          last_name LIKE ? OR
          email LIKE ? OR
          phone LIKE ?
        )
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `)
      .bind(this.tenantId, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, limit, offset)
      .all();

    return (result.results || []).map(this.mapToCustomer);
  }

  /**
   * Lister tous les clients
   */
  async listCustomers(options?: { limit?: number; offset?: number; segment?: string }): Promise<Customer[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    let query = `SELECT * FROM v_customers WHERE tenant_id = ?`;
    const params: any[] = [this.tenantId];

    if (options?.segment) {
      query += ` AND segment = ?`;
      params.push(options.segment);
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await this.db.prepare(query).bind(...params).all();

    return (result.results || []).map(this.mapToCustomer);
  }

  /**
   * Ajouter une note
   */
  async addCustomerNote(customerId: string, content: string, metadata?: Record<string, any>): Promise<CustomerNote> {
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db
      .prepare(`
        INSERT INTO customer_notes (id, tenant_id, prospect_id, content, created_by, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(noteId, this.tenantId, customerId, content, 'system', JSON.stringify(metadata || {}))
      .run();

    return {
      id: noteId,
      customerId,
      content,
      createdBy: 'system',
      createdAt: new Date(),
      metadata,
    };
  }

  /**
   * Logger une interaction/activité
   */
  async logInteraction(
    customerId: string,
    type: string,
    channel: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await this.db
      .prepare(`
        INSERT INTO customer_activities (id, tenant_id, prospect_id, type, channel, metadata)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .bind(activityId, this.tenantId, customerId, type, channel, JSON.stringify(metadata || {}))
      .run();

    // Mettre à jour last_contact_at
    await this.db
      .prepare(`UPDATE prospects SET last_contact_at = datetime('now') WHERE id = ?`)
      .bind(customerId)
      .run();
  }

  /**
   * Récupérer l'historique d'activités
   */
  async getCustomerActivities(customerId: string, limit = 50): Promise<CustomerActivity[]> {
    const result = await this.db
      .prepare(`
        SELECT * FROM customer_activities
        WHERE prospect_id = ? AND tenant_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(customerId, this.tenantId, limit)
      .all();

    return (result.results || []).map((row: any) => ({
      id: row.id,
      customerId: row.prospect_id,
      type: row.type,
      channel: row.channel,
      description: row.description,
      createdAt: new Date(row.created_at),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Mapper un enregistrement DB vers Customer
   */
  private mapToCustomer(row: any): Customer {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      phone: row.phone,
      preferredChannel: row.preferred_channel,
      segment: row.segment,
      totalOrders: row.total_orders || 0,
      totalSpent: {
        amount: row.total_revenue || 0,
        currency: row.currency || 'EUR',
      },
      createdAt: new Date(row.created_at),
      lastContactAt: row.last_contact_at ? new Date(row.last_contact_at) : undefined,
      lastOrderAt: row.last_order_at ? new Date(row.last_order_at) : undefined,
      tags: row.tags ? row.tags.split(',') : [],
      address: row.address,
      city: row.city,
      postalCode: row.postal_code,
      country: row.country,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }
}

/**
 * Obtenir une instance du service CRM DB
 */
export function getCRMDatabaseService(db: D1Database, tenantId: string): CRMDatabaseService {
  return new CRMDatabaseService(db, tenantId);
}
