/**
 * Salesforce CRM Integration
 * Coccinelle.AI - Salesforce Customer System
 *
 * Intégration avec Salesforce CRM via leur API REST
 * Documentation: https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/
 */

import {
  CustomerSystem,
  Customer,
  CreateCustomerParams,
  CustomerUpdateParams,
  CustomerNote,
  CustomerActivity,
  CustomerSegment,
  CustomerStats,
  CommunicationPreferences,
  SearchCustomersParams,
} from '../interface';
import { Money } from '../../types';

// ============================================
// TYPES SALESFORCE
// ============================================

interface SalesforceCredentials {
  /**
   * Instance URL (e.g., https://yourinstance.salesforce.com)
   */
  instanceUrl: string;

  /**
   * Access Token OAuth2
   */
  accessToken: string;

  /**
   * Refresh Token (optionnel)
   */
  refreshToken?: string;

  /**
   * Client ID OAuth
   */
  clientId?: string;

  /**
   * Client Secret OAuth
   */
  clientSecret?: string;
}

interface SalesforceSettings {
  /**
   * API Version (par défaut: v58.0)
   */
  apiVersion?: string;

  /**
   * Timeout pour les requêtes (ms)
   */
  timeout?: number;

  /**
   * Custom field mapping
   */
  customFieldMapping?: Record<string, string>;

  /**
   * Record Type ID pour les Contacts
   */
  recordTypeId?: string;
}

interface SalesforceContact {
  Id: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  AccountId?: string;
  OwnerId?: string;
  LeadSource?: string;
  CreatedDate?: string;
  LastModifiedDate?: string;
  LastActivityDate?: string;
  // Custom fields
  Total_Orders__c?: number;
  Total_Revenue__c?: number;
  Preferred_Channel__c?: string;
  Customer_Segment__c?: string;
  [key: string]: any;
}

interface SalesforceTask {
  Id: string;
  WhoId?: string;
  Subject?: string;
  Description?: string;
  ActivityDate?: string;
  Status?: string;
  CreatedDate?: string;
}

// ============================================
// SALESFORCE CUSTOMER SYSTEM
// ============================================

export class SalesforceCustomers implements CustomerSystem {
  readonly systemName = 'salesforce';
  readonly apiVersion: string;

  private credentials: SalesforceCredentials;
  private settings: SalesforceSettings;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(credentials: SalesforceCredentials, settings: SalesforceSettings = {}) {
    this.credentials = credentials;
    this.settings = {
      apiVersion: 'v58.0',
      timeout: 30000,
      ...settings,
    };

    this.apiVersion = this.settings.apiVersion!;
    this.baseUrl = `${credentials.instanceUrl}/services/data/${this.apiVersion}`;

    // Configure headers
    this.headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${credentials.accessToken}`,
    };
  }

  // ============================================
  // SYSTEM HEALTH
  // ============================================

  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      await this.testConnection();
      return { status: 'healthy', message: 'Salesforce API is reachable' };
    } catch (error: any) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/sobjects/Contact/describe`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`Salesforce API error: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Failed to connect to Salesforce: ${error.message}`);
    }
  }

  // ============================================
  // CUSTOMER CRUD
  // ============================================

  async getCustomer(customerId: string): Promise<Customer> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sobjects/Contact/${customerId}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Customer not found: ${customerId}`);
        }
        throw new Error(`Salesforce API error: ${response.status}`);
      }

      const contact: SalesforceContact = await response.json();
      return this.mapSalesforceToCustomer(contact);
    } catch (error: any) {
      throw new Error(`Failed to get customer from Salesforce: ${error.message}`);
    }
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    try {
      const query = `SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, LeadSource, CreatedDate, LastModifiedDate, Total_Orders__c, Total_Revenue__c, Preferred_Channel__c, Customer_Segment__c FROM Contact WHERE Email = '${email}' LIMIT 1`;

      const response = await fetch(
        `${this.baseUrl}/query?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Salesforce API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.totalSize === 0) {
        return null;
      }

      return this.mapSalesforceToCustomer(data.records[0]);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return null;
      }
      throw new Error(`Failed to get customer by email from Salesforce: ${error.message}`);
    }
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    try {
      const cleanPhone = this.cleanPhoneNumber(phone);
      const query = `SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, LeadSource, CreatedDate, LastModifiedDate, Total_Orders__c, Total_Revenue__c, Preferred_Channel__c, Customer_Segment__c FROM Contact WHERE Phone LIKE '%${cleanPhone}%' OR MobilePhone LIKE '%${cleanPhone}%' LIMIT 1`;

      const response = await fetch(
        `${this.baseUrl}/query?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Salesforce API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.totalSize === 0) {
        return null;
      }

      return this.mapSalesforceToCustomer(data.records[0]);
    } catch (error: any) {
      throw new Error(`Failed to get customer by phone from Salesforce: ${error.message}`);
    }
  }

  async createCustomer(params: CreateCustomerParams): Promise<Customer> {
    try {
      // Check if customer already exists
      if (params.email) {
        const existing = await this.getCustomerByEmail(params.email);
        if (existing) {
          throw new Error(`Customer with email ${params.email} already exists`);
        }
      }

      const contactData: Partial<SalesforceContact> = {
        FirstName: params.firstName,
        LastName: params.lastName,
        Email: params.email,
      };

      if (params.phone) {
        contactData.Phone = params.phone;
      }

      if (params.preferredChannel) {
        contactData.Preferred_Channel__c = params.preferredChannel;
      }

      if (params.tags && params.tags.length > 0) {
        contactData.LeadSource = params.tags[0];
      }

      const response = await fetch(`${this.baseUrl}/sobjects/Contact`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Salesforce API error: ${error[0]?.message || response.statusText}`);
      }

      const result = await response.json();
      return await this.getCustomer(result.id);
    } catch (error: any) {
      throw new Error(`Failed to create customer in Salesforce: ${error.message}`);
    }
  }

  async updateCustomer(customerId: string, updates: CustomerUpdateParams): Promise<Customer> {
    try {
      const contactData: Partial<SalesforceContact> = {};

      if (updates.firstName !== undefined) contactData.FirstName = updates.firstName;
      if (updates.lastName !== undefined) contactData.LastName = updates.lastName;
      if (updates.email !== undefined) contactData.Email = updates.email;
      if (updates.phone !== undefined) contactData.Phone = updates.phone;
      if (updates.preferredChannel !== undefined)
        contactData.Preferred_Channel__c = updates.preferredChannel;

      const response = await fetch(`${this.baseUrl}/sobjects/Contact/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(contactData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Salesforce API error: ${error[0]?.message || response.statusText}`);
      }

      return await this.getCustomer(customerId);
    } catch (error: any) {
      throw new Error(`Failed to update customer in Salesforce: ${error.message}`);
    }
  }

  async deleteCustomer(customerId: string, soft: boolean = true): Promise<boolean> {
    try {
      if (soft) {
        // Salesforce doesn't have soft delete by default, use IsDeleted flag or custom field
        // For now, just deactivate
        await fetch(`${this.baseUrl}/sobjects/Contact/${customerId}`, {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({ IsDeleted: true }),
        });
      } else {
        // Hard delete
        const response = await fetch(`${this.baseUrl}/sobjects/Contact/${customerId}`, {
          method: 'DELETE',
          headers: this.headers,
        });

        if (!response.ok && response.status !== 204) {
          throw new Error(`Salesforce API error: ${response.status}`);
        }
      }

      return true;
    } catch (error: any) {
      throw new Error(`Failed to delete customer in Salesforce: ${error.message}`);
    }
  }

  async searchCustomers(params: SearchCustomersParams): Promise<Customer[]> {
    try {
      let whereClauses: string[] = [];

      if (params.email) {
        whereClauses.push(`Email LIKE '%${params.email}%'`);
      }

      if (params.phone) {
        const cleanPhone = this.cleanPhoneNumber(params.phone);
        whereClauses.push(`(Phone LIKE '%${cleanPhone}%' OR MobilePhone LIKE '%${cleanPhone}%')`);
      }

      if (params.query) {
        whereClauses.push(
          `(FirstName LIKE '%${params.query}%' OR LastName LIKE '%${params.query}%')`
        );
      }

      if (params.tags && params.tags.length > 0) {
        whereClauses.push(`LeadSource = '${params.tags[0]}'`);
      }

      const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
      const limit = params.limit || 100;
      const offset = params.offset || 0;

      const query = `SELECT Id, FirstName, LastName, Email, Phone, MobilePhone, LeadSource, CreatedDate, LastModifiedDate, Total_Orders__c, Total_Revenue__c, Preferred_Channel__c, Customer_Segment__c FROM Contact ${whereClause} ORDER BY CreatedDate DESC LIMIT ${limit} OFFSET ${offset}`;

      const response = await fetch(
        `${this.baseUrl}/query?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Salesforce API error: ${response.status}`);
      }

      const data = await response.json();
      return data.records.map((contact: SalesforceContact) =>
        this.mapSalesforceToCustomer(contact)
      );
    } catch (error: any) {
      throw new Error(`Failed to search customers in Salesforce: ${error.message}`);
    }
  }

  async mergeCustomers(primaryId: string, duplicateIds: string[]): Promise<Customer> {
    try {
      // Salesforce has a merge API but it's complex
      // Simplified: just delete duplicates
      const primary = await this.getCustomer(primaryId);

      for (const duplicateId of duplicateIds) {
        await this.deleteCustomer(duplicateId, true);
      }

      return primary;
    } catch (error: any) {
      throw new Error(`Failed to merge customers in Salesforce: ${error.message}`);
    }
  }

  // ============================================
  // COMMUNICATION PREFERENCES
  // ============================================

  async updateCommunicationPreferences(
    customerId: string,
    preferences: Partial<CommunicationPreferences>
  ): Promise<void> {
    try {
      const contactData: Record<string, any> = {};

      if (preferences.email !== undefined) {
        contactData.Email_Opt_In__c = preferences.email;
      }

      if (preferences.sms !== undefined) {
        contactData.SMS_Opt_In__c = preferences.sms;
      }

      if (preferences.whatsapp !== undefined) {
        contactData.WhatsApp_Opt_In__c = preferences.whatsapp;
      }

      if (preferences.phone !== undefined) {
        contactData.Phone_Opt_In__c = preferences.phone;
      }

      await fetch(`${this.baseUrl}/sobjects/Contact/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify(contactData),
      });
    } catch (error: any) {
      throw new Error(
        `Failed to update communication preferences in Salesforce: ${error.message}`
      );
    }
  }

  // ============================================
  // NOTES
  // ============================================

  async addCustomerNote(
    customerId: string,
    content: string,
    metadata?: Record<string, any>
  ): Promise<CustomerNote> {
    try {
      // Create Task in Salesforce as note
      const taskData = {
        WhoId: customerId,
        Subject: 'Note from Coccinelle.AI',
        Description: content,
        Status: 'Completed',
        ActivityDate: new Date().toISOString().split('T')[0],
      };

      const response = await fetch(`${this.baseUrl}/sobjects/Task`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(taskData),
      });

      if (!response.ok) {
        throw new Error(`Salesforce API error: ${response.status}`);
      }

      const result = await response.json();

      return {
        id: result.id,
        customerId,
        content,
        createdBy: 'coccinelle-ai',
        createdAt: new Date(),
        metadata,
      };
    } catch (error: any) {
      throw new Error(`Failed to add note in Salesforce: ${error.message}`);
    }
  }

  async getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    try {
      const query = `SELECT Id, Subject, Description, CreatedDate FROM Task WHERE WhoId = '${customerId}' ORDER BY CreatedDate DESC LIMIT 100`;

      const response = await fetch(
        `${this.baseUrl}/query?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return data.records.map((task: SalesforceTask) => ({
        id: task.Id,
        customerId,
        content: task.Description || task.Subject || '',
        createdBy: 'salesforce',
        createdAt: task.CreatedDate ? new Date(task.CreatedDate) : new Date(),
      }));
    } catch (error: any) {
      return [];
    }
  }

  // ============================================
  // TAGS & SEGMENTS
  // ============================================

  async addTags(customerId: string, tags: string[]): Promise<void> {
    try {
      // Use LeadSource as tag
      if (tags.length > 0) {
        await fetch(`${this.baseUrl}/sobjects/Contact/${customerId}`, {
          method: 'PATCH',
          headers: this.headers,
          body: JSON.stringify({
            LeadSource: tags[0],
          }),
        });
      }
    } catch (error: any) {
      throw new Error(`Failed to add tags in Salesforce: ${error.message}`);
    }
  }

  async removeTags(customerId: string, tags: string[]): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/sobjects/Contact/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({
          LeadSource: null,
        }),
      });
    } catch (error: any) {
      throw new Error(`Failed to remove tags in Salesforce: ${error.message}`);
    }
  }

  async addToSegment(customerId: string, segmentId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/sobjects/Contact/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({
          Customer_Segment__c: segmentId,
        }),
      });
    } catch (error: any) {
      throw new Error(`Failed to add to segment in Salesforce: ${error.message}`);
    }
  }

  async removeFromSegment(customerId: string, segmentId: string): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/sobjects/Contact/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({
          Customer_Segment__c: null,
        }),
      });
    } catch (error: any) {
      throw new Error(`Failed to remove from segment in Salesforce: ${error.message}`);
    }
  }

  async getCustomerSegments(customerId: string): Promise<CustomerSegment[]> {
    try {
      const customer = await this.getCustomer(customerId);
      if (customer.segment) {
        return [
          {
            id: customer.segment,
            name: customer.segment,
            description: `Customer segment: ${customer.segment}`,
          },
        ];
      }
      return [];
    } catch (error: any) {
      return [];
    }
  }

  async listSegments(): Promise<CustomerSegment[]> {
    // Would require custom implementation based on Salesforce setup
    return [
      { id: 'vip', name: 'VIP', description: 'VIP customers' },
      { id: 'active', name: 'Active', description: 'Active customers' },
      { id: 'prospect', name: 'Prospect', description: 'Prospects' },
      { id: 'standard', name: 'Standard', description: 'Standard customers' },
    ];
  }

  // ============================================
  // ACTIVITY TRACKING
  // ============================================

  async getCustomerActivity(
    customerId: string,
    limit: number = 50
  ): Promise<CustomerActivity[]> {
    try {
      const query = `SELECT Id, Subject, Description, CreatedDate, Status FROM Task WHERE WhoId = '${customerId}' ORDER BY CreatedDate DESC LIMIT ${limit}`;

      const response = await fetch(
        `${this.baseUrl}/query?q=${encodeURIComponent(query)}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      return data.records.map((task: SalesforceTask) => ({
        id: task.Id,
        customerId,
        type: 'interaction',
        channel: 'salesforce',
        description: task.Subject || task.Description || 'Activity',
        timestamp: task.CreatedDate ? new Date(task.CreatedDate) : new Date(),
        metadata: task,
      }));
    } catch (error: any) {
      return [];
    }
  }

  async logInteraction(
    customerId: string,
    type: string,
    channel: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.addCustomerNote(customerId, `${type} via ${channel}`, metadata);
    } catch (error: any) {
      throw new Error(`Failed to log interaction in Salesforce: ${error.message}`);
    }
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getCustomerStats(customerId: string): Promise<CustomerStats> {
    try {
      const customer = await this.getCustomer(customerId);

      return {
        totalOrders: customer.totalOrders || 0,
        totalSpent: customer.totalSpent || { amount: 0, currency: 'EUR' },
        averageOrderValue: customer.averageOrderValue || { amount: 0, currency: 'EUR' },
        lastOrderDate: customer.lastOrderAt,
        lifetimeValue: customer.totalSpent || { amount: 0, currency: 'EUR' },
      };
    } catch (error: any) {
      throw new Error(`Failed to get customer stats from Salesforce: ${error.message}`);
    }
  }

  // ============================================
  // MAPPING HELPERS
  // ============================================

  private mapSalesforceToCustomer(contact: SalesforceContact): Customer {
    return {
      id: contact.Id,
      externalId: contact.Id,
      firstName: contact.FirstName || '',
      lastName: contact.LastName || '',
      email: contact.Email,
      phone: contact.Phone || contact.MobilePhone,
      preferredChannel: (contact.Preferred_Channel__c as any) || 'email',
      tags: contact.LeadSource ? [contact.LeadSource] : [],
      segment: contact.Customer_Segment__c || 'standard',
      totalOrders: contact.Total_Orders__c || 0,
      totalSpent: {
        amount: contact.Total_Revenue__c || 0,
        currency: 'EUR',
      },
      averageOrderValue: {
        amount:
          contact.Total_Orders__c && contact.Total_Orders__c > 0
            ? (contact.Total_Revenue__c || 0) / contact.Total_Orders__c
            : 0,
        currency: 'EUR',
      },
      createdAt: contact.CreatedDate ? new Date(contact.CreatedDate) : undefined,
      lastOrderAt: contact.LastModifiedDate ? new Date(contact.LastModifiedDate) : undefined,
    };
  }

  private cleanPhoneNumber(phone: string): string {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }
}
