/**
 * HubSpot CRM Integration
 * Coccinelle.AI - HubSpot Customer System
 *
 * Intégration avec HubSpot CRM via leur API v3
 * Documentation: https://developers.hubspot.com/docs/api/crm/contacts
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
// TYPES HUBSPOT
// ============================================

interface HubSpotCredentials {
  /**
   * API Key privée HubSpot
   */
  apiKey?: string;

  /**
   * Token d'accès OAuth (préféré)
   */
  accessToken?: string;

  /**
   * Portal ID HubSpot
   */
  portalId: string;
}

interface HubSpotSettings {
  /**
   * URL de base de l'API (par défaut: https://api.hubapi.com)
   */
  apiUrl?: string;

  /**
   * Timeout pour les requêtes (ms)
   */
  timeout?: number;

  /**
   * Pipeline ID pour les deals (optionnel)
   */
  pipelineId?: string;

  /**
   * Custom properties mapping
   */
  customFieldMapping?: Record<string, string>;
}

interface HubSpotContact {
  id: string;
  properties: {
    email?: string;
    firstname?: string;
    lastname?: string;
    phone?: string;
    mobilephone?: string;
    lifecyclestage?: string;
    hs_lead_status?: string;
    createdate?: string;
    lastmodifieddate?: string;
    notes_last_updated?: string;
    num_associated_deals?: string;
    total_revenue?: string;
    // Custom properties
    [key: string]: any;
  };
  createdAt?: string;
  updatedAt?: string;
  archived?: boolean;
}

// ============================================
// HUBSPOT CUSTOMER SYSTEM
// ============================================

export class HubSpotCustomers implements CustomerSystem {
  readonly systemName = 'hubspot';
  readonly apiVersion = 'v3';

  private credentials: HubSpotCredentials;
  private settings: HubSpotSettings;
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(credentials: HubSpotCredentials, settings: HubSpotSettings = {}) {
    this.credentials = credentials;
    this.settings = {
      apiUrl: 'https://api.hubapi.com',
      timeout: 30000,
      ...settings,
    };

    this.baseUrl = this.settings.apiUrl!;

    // Configure headers
    this.headers = {
      'Content-Type': 'application/json',
    };

    if (credentials.accessToken) {
      this.headers['Authorization'] = `Bearer ${credentials.accessToken}`;
    } else if (credentials.apiKey) {
      // Deprecated but still supported
      this.headers['Authorization'] = `Bearer ${credentials.apiKey}`;
    } else {
      throw new Error('HubSpot API Key or Access Token is required');
    }
  }

  // ============================================
  // SYSTEM HEALTH
  // ============================================

  async checkHealth(): Promise<{ status: string; message: string }> {
    try {
      await this.testConnection();
      return { status: 'healthy', message: 'HubSpot API is reachable' };
    } catch (error: any) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts?limit=1`, {
        method: 'GET',
        headers: this.headers,
      });

      if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status} ${response.statusText}`);
      }

      return true;
    } catch (error: any) {
      throw new Error(`Failed to connect to HubSpot: ${error.message}`);
    }
  }

  // ============================================
  // CUSTOMER CRUD
  // ============================================

  async getCustomer(customerId: string): Promise<Customer> {
    try {
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/contacts/${customerId}?properties=email,firstname,lastname,phone,mobilephone,lifecyclestage,hs_lead_status,createdate,lastmodifieddate,num_associated_deals,total_revenue`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Customer not found: ${customerId}`);
        }
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const contact: HubSpotContact = await response.json();
      return this.mapHubSpotToCustomer(contact);
    } catch (error: any) {
      throw new Error(`Failed to get customer from HubSpot: ${error.message}`);
    }
  }

  async getCustomerByEmail(email: string): Promise<Customer | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/contacts/${email}?idProperty=email&properties=email,firstname,lastname,phone,mobilephone,lifecyclestage,hs_lead_status,createdate,lastmodifieddate,num_associated_deals,total_revenue`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const contact: HubSpotContact = await response.json();
      return this.mapHubSpotToCustomer(contact);
    } catch (error: any) {
      if (error.message.includes('not found')) {
        return null;
      }
      throw new Error(`Failed to get customer by email from HubSpot: ${error.message}`);
    }
  }

  async getCustomerByPhone(phone: string): Promise<Customer | null> {
    try {
      // HubSpot doesn't support lookup by phone directly, use search
      const results = await this.searchCustomers({ phone });
      return results.length > 0 ? results[0] : null;
    } catch (error: any) {
      throw new Error(`Failed to get customer by phone from HubSpot: ${error.message}`);
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

      const properties: Record<string, any> = {
        firstname: params.firstName,
        lastname: params.lastName,
        email: params.email,
      };

      if (params.phone) {
        properties.phone = params.phone;
      }

      if (params.tags && params.tags.length > 0) {
        properties.hs_lead_status = params.tags[0]; // Use first tag as lead status
      }

      if (params.preferredChannel) {
        properties.preferred_communication_channel = params.preferredChannel;
      }

      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ properties }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`HubSpot API error: ${error.message || response.statusText}`);
      }

      const contact: HubSpotContact = await response.json();
      return this.mapHubSpotToCustomer(contact);
    } catch (error: any) {
      throw new Error(`Failed to create customer in HubSpot: ${error.message}`);
    }
  }

  async updateCustomer(customerId: string, updates: CustomerUpdateParams): Promise<Customer> {
    try {
      const properties: Record<string, any> = {};

      if (updates.firstName !== undefined) properties.firstname = updates.firstName;
      if (updates.lastName !== undefined) properties.lastname = updates.lastName;
      if (updates.email !== undefined) properties.email = updates.email;
      if (updates.phone !== undefined) properties.phone = updates.phone;
      if (updates.preferredChannel !== undefined)
        properties.preferred_communication_channel = updates.preferredChannel;

      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ properties }),
      });

      if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const contact: HubSpotContact = await response.json();
      return this.mapHubSpotToCustomer(contact);
    } catch (error: any) {
      throw new Error(`Failed to update customer in HubSpot: ${error.message}`);
    }
  }

  async deleteCustomer(customerId: string, soft: boolean = true): Promise<boolean> {
    try {
      if (soft) {
        // Soft delete: archive in HubSpot
        const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${customerId}`, {
          method: 'DELETE',
          headers: this.headers,
        });

        if (!response.ok && response.status !== 404) {
          throw new Error(`HubSpot API error: ${response.status}`);
        }
      } else {
        // Hard delete would require additional permissions
        throw new Error('Hard delete not supported in HubSpot integration');
      }

      return true;
    } catch (error: any) {
      throw new Error(`Failed to delete customer in HubSpot: ${error.message}`);
    }
  }

  async searchCustomers(params: SearchCustomersParams): Promise<Customer[]> {
    try {
      const filters: any[] = [];

      if (params.email) {
        filters.push({
          propertyName: 'email',
          operator: 'CONTAINS_TOKEN',
          value: params.email,
        });
      }

      if (params.phone) {
        filters.push({
          propertyName: 'phone',
          operator: 'CONTAINS_TOKEN',
          value: params.phone,
        });
      }

      if (params.query) {
        filters.push({
          propertyName: 'firstname',
          operator: 'CONTAINS_TOKEN',
          value: params.query,
        });
      }

      if (params.tags && params.tags.length > 0) {
        filters.push({
          propertyName: 'hs_lead_status',
          operator: 'EQ',
          value: params.tags[0],
        });
      }

      const searchBody = {
        filterGroups: filters.length > 0 ? [{ filters }] : [],
        properties: [
          'email',
          'firstname',
          'lastname',
          'phone',
          'mobilephone',
          'lifecyclestage',
          'hs_lead_status',
          'createdate',
          'lastmodifieddate',
          'num_associated_deals',
          'total_revenue',
        ],
        limit: params.limit || 100,
        after: params.offset || 0,
      };

      const response = await fetch(`${this.baseUrl}/crm/v3/objects/contacts/search`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(searchBody),
      });

      if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const data = await response.json();
      return data.results.map((contact: HubSpotContact) => this.mapHubSpotToCustomer(contact));
    } catch (error: any) {
      throw new Error(`Failed to search customers in HubSpot: ${error.message}`);
    }
  }

  async mergeCustomers(primaryId: string, duplicateIds: string[]): Promise<Customer> {
    // HubSpot has a specific merge API
    try {
      // Note: HubSpot merge API is limited, this is simplified
      const primary = await this.getCustomer(primaryId);

      // Archive duplicates
      for (const duplicateId of duplicateIds) {
        await this.deleteCustomer(duplicateId, true);
      }

      return primary;
    } catch (error: any) {
      throw new Error(`Failed to merge customers in HubSpot: ${error.message}`);
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
      const properties: Record<string, any> = {};

      if (preferences.email !== undefined) {
        properties.email_opt_in = preferences.email;
      }

      if (preferences.sms !== undefined) {
        properties.sms_opt_in = preferences.sms;
      }

      if (preferences.whatsapp !== undefined) {
        properties.whatsapp_opt_in = preferences.whatsapp;
      }

      if (preferences.phone !== undefined) {
        properties.phone_opt_in = preferences.phone;
      }

      await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ properties }),
      });
    } catch (error: any) {
      throw new Error(
        `Failed to update communication preferences in HubSpot: ${error.message}`
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
      // Create engagement (note) in HubSpot
      const noteBody = {
        properties: {
          hs_note_body: content,
          hs_timestamp: new Date().toISOString(),
        },
        associations: [
          {
            to: { id: customerId },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 202, // Contact to Note association
              },
            ],
          },
        ],
      };

      const response = await fetch(`${this.baseUrl}/crm/v3/objects/notes`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(noteBody),
      });

      if (!response.ok) {
        throw new Error(`HubSpot API error: ${response.status}`);
      }

      const note = await response.json();

      return {
        id: note.id,
        customerId,
        content,
        createdBy: 'coccinelle-ai',
        createdAt: new Date(),
        metadata,
      };
    } catch (error: any) {
      throw new Error(`Failed to add note in HubSpot: ${error.message}`);
    }
  }

  async getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
    try {
      // Get associated notes from HubSpot
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/contacts/${customerId}/associations/notes`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      const noteIds = data.results.map((r: any) => r.id);

      // Fetch note details
      const notes: CustomerNote[] = [];
      for (const noteId of noteIds) {
        const noteResponse = await fetch(`${this.baseUrl}/crm/v3/objects/notes/${noteId}`, {
          method: 'GET',
          headers: this.headers,
        });

        if (noteResponse.ok) {
          const noteData = await noteResponse.json();
          notes.push({
            id: noteData.id,
            customerId,
            content: noteData.properties.hs_note_body || '',
            createdBy: 'hubspot',
            createdAt: new Date(noteData.createdAt),
          });
        }
      }

      return notes;
    } catch (error: any) {
      return [];
    }
  }

  // ============================================
  // TAGS & SEGMENTS
  // ============================================

  async addTags(customerId: string, tags: string[]): Promise<void> {
    try {
      // HubSpot doesn't have tags, use lists instead
      // This is a simplified implementation
      const existingCustomer = await this.getCustomer(customerId);
      const currentStatus = existingCustomer.tags?.[0] || '';
      const newStatus = tags[0] || currentStatus;

      await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({
          properties: {
            hs_lead_status: newStatus,
          },
        }),
      });
    } catch (error: any) {
      throw new Error(`Failed to add tags in HubSpot: ${error.message}`);
    }
  }

  async removeTags(customerId: string, tags: string[]): Promise<void> {
    // Simplified: clear lead status
    try {
      await fetch(`${this.baseUrl}/crm/v3/objects/contacts/${customerId}`, {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({
          properties: {
            hs_lead_status: '',
          },
        }),
      });
    } catch (error: any) {
      throw new Error(`Failed to remove tags in HubSpot: ${error.message}`);
    }
  }

  async addToSegment(customerId: string, segmentId: string): Promise<void> {
    // HubSpot uses Lists for segmentation
    // This requires the Lists API
    throw new Error('Segment management requires HubSpot Lists API - not implemented yet');
  }

  async removeFromSegment(customerId: string, segmentId: string): Promise<void> {
    throw new Error('Segment management requires HubSpot Lists API - not implemented yet');
  }

  async getCustomerSegments(customerId: string): Promise<CustomerSegment[]> {
    // Would require Lists API integration
    return [];
  }

  async listSegments(): Promise<CustomerSegment[]> {
    // Would require Lists API integration
    return [];
  }

  // ============================================
  // ACTIVITY TRACKING
  // ============================================

  async getCustomerActivity(
    customerId: string,
    limit: number = 50
  ): Promise<CustomerActivity[]> {
    try {
      // Get engagements (calls, emails, meetings, notes, tasks)
      const response = await fetch(
        `${this.baseUrl}/crm/v3/objects/contacts/${customerId}/associations/engagements`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        return [];
      }

      const data = await response.json();

      // Map to activities (simplified)
      const activities: CustomerActivity[] = data.results.slice(0, limit).map((eng: any) => ({
        id: eng.id,
        customerId,
        type: 'interaction',
        channel: 'hubspot',
        description: `HubSpot engagement ${eng.type || 'activity'}`,
        timestamp: new Date(),
        metadata: eng,
      }));

      return activities;
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
      // Create note as interaction log
      await this.addCustomerNote(
        customerId,
        `${type} via ${channel}`,
        metadata
      );
    } catch (error: any) {
      throw new Error(`Failed to log interaction in HubSpot: ${error.message}`);
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
      throw new Error(`Failed to get customer stats from HubSpot: ${error.message}`);
    }
  }

  // ============================================
  // MAPPING HELPERS
  // ============================================

  private mapHubSpotToCustomer(contact: HubSpotContact): Customer {
    const props = contact.properties;

    return {
      id: contact.id,
      externalId: contact.id,
      firstName: props.firstname || '',
      lastName: props.lastname || '',
      email: props.email,
      phone: props.phone || props.mobilephone,
      preferredChannel: (props.preferred_communication_channel as any) || 'email',
      tags: props.hs_lead_status ? [props.hs_lead_status] : [],
      segment: this.mapLifecycleStageToSegment(props.lifecyclestage),
      totalOrders: parseInt(props.num_associated_deals || '0'),
      totalSpent: {
        amount: parseFloat(props.total_revenue || '0'),
        currency: 'EUR',
      },
      averageOrderValue: {
        amount:
          parseInt(props.num_associated_deals || '0') > 0
            ? parseFloat(props.total_revenue || '0') /
              parseInt(props.num_associated_deals || '1')
            : 0,
        currency: 'EUR',
      },
      createdAt: props.createdate ? new Date(props.createdate) : undefined,
      lastOrderAt: props.lastmodifieddate ? new Date(props.lastmodifieddate) : undefined,
    };
  }

  private mapLifecycleStageToSegment(stage?: string): string {
    const mapping: Record<string, string> = {
      lead: 'prospect',
      marketingqualifiedlead: 'prospect',
      salesqualifiedlead: 'qualified',
      opportunity: 'active',
      customer: 'vip',
      evangelist: 'vip',
      other: 'standard',
    };

    return mapping[stage?.toLowerCase() || 'other'] || 'standard';
  }
}
