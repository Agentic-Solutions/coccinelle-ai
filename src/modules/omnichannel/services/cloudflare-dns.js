/**
 * Service Cloudflare DNS - Configuration automatique DNS pour email
 */

import { omniLogger } from '../utils/logger.js';

export class CloudflareDNSService {
  constructor(accessToken) {
    this.accessToken = accessToken;
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
  }

  /**
   * Lister les zones (domaines) disponibles
   */
  async listZones() {
    try {
      const response = await fetch(`${this.baseUrl}/zones`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.result || [];
    } catch (error) {
      omniLogger.error('Failed to list Cloudflare zones', { error: error.message });
      throw error;
    }
  }

  /**
   * Obtenir une zone spécifique
   */
  async getZone(zoneId) {
    try {
      const response = await fetch(`${this.baseUrl}/zones/${zoneId}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      omniLogger.error('Failed to get Cloudflare zone', { zoneId, error: error.message });
      throw error;
    }
  }

  /**
   * Créer un enregistrement DNS
   */
  async createDNSRecord(zoneId, record) {
    try {
      const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      omniLogger.info('DNS record created', { zoneId, type: record.type, name: record.name });
      return data.result;
    } catch (error) {
      omniLogger.error('Failed to create DNS record', {
        zoneId,
        record,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Lister les enregistrements DNS existants
   */
  async listDNSRecords(zoneId, type = null, name = null) {
    try {
      const params = new URLSearchParams();
      if (type) params.append('type', type);
      if (name) params.append('name', name);

      const url = `${this.baseUrl}/zones/${zoneId}/dns_records?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
      }

      const data = await response.json();
      return data.result || [];
    } catch (error) {
      omniLogger.error('Failed to list DNS records', { zoneId, error: error.message });
      throw error;
    }
  }

  /**
   * Supprimer un enregistrement DNS
   */
  async deleteDNSRecord(zoneId, recordId) {
    try {
      const response = await fetch(`${this.baseUrl}/zones/${zoneId}/dns_records/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} - ${error}`);
      }

      omniLogger.info('DNS record deleted', { zoneId, recordId });
      return true;
    } catch (error) {
      omniLogger.error('Failed to delete DNS record', { zoneId, recordId, error: error.message });
      throw error;
    }
  }

  /**
   * Configuration automatique des DNS records pour Resend Email
   */
  async setupEmailDNSRecords(zoneId, domain, resendRegion = 'eu-west-1') {
    try {
      omniLogger.info('Starting email DNS setup', { zoneId, domain, resendRegion });

      const records = [
        // MX pour réception emails
        {
          type: 'MX',
          name: '@',
          content: `inbound-smtp.${resendRegion}.amazonaws.com`,
          priority: 9,
          ttl: 3600
        },
        // DKIM pour signature
        {
          type: 'TXT',
          name: 'resend._domainkey',
          content: 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDiNKOeBkaASTnBtCzD3bdnXhYTtFs+egvuUGsOfExb8mRVoBqQfz4O9vWxCMLbdLEo5FznYSmmoe7kVSYBb/M5Ewa8OtjyaH07ZqWig3X9uLvsESlJfwVaAy7ZflBpEdJ7a7iBZiB8+vahncvWCQsh8jrIrB/Iu2tBjbQXR1XsFwIDAQAB',
          ttl: 3600
        },
        // MX subdomain send pour envoi
        {
          type: 'MX',
          name: 'send',
          content: `feedback-smtp.${resendRegion}.amazonses.com`,
          priority: 10,
          ttl: 3600
        },
        // SPF pour subdomain send
        {
          type: 'TXT',
          name: 'send',
          content: 'v=spf1 include:amazonses.com ~all',
          ttl: 3600
        }
      ];

      const createdRecords = [];

      for (const record of records) {
        try {
          // Vérifier si le record existe déjà
          const fullName = record.name === '@' ? domain : `${record.name}.${domain}`;
          const existing = await this.listDNSRecords(zoneId, record.type, fullName);

          if (existing.length > 0) {
            omniLogger.info('DNS record already exists, skipping', {
              type: record.type,
              name: record.name
            });
            createdRecords.push({ ...record, id: existing[0].id, existed: true });
          } else {
            const created = await this.createDNSRecord(zoneId, record);
            createdRecords.push({ ...record, id: created.id, existed: false });
          }
        } catch (error) {
          omniLogger.error('Failed to create specific DNS record', {
            record,
            error: error.message
          });
          throw error;
        }
      }

      omniLogger.info('Email DNS setup completed', {
        zoneId,
        domain,
        recordsCreated: createdRecords.filter(r => !r.existed).length,
        recordsExisted: createdRecords.filter(r => r.existed).length
      });

      return {
        success: true,
        records: createdRecords
      };
    } catch (error) {
      omniLogger.error('Failed to setup email DNS', { zoneId, domain, error: error.message });
      throw error;
    }
  }

  /**
   * Vérifier si les DNS records email sont correctement configurés
   */
  async verifyEmailDNSRecords(zoneId, domain) {
    try {
      const requiredRecords = [
        { type: 'MX', name: '@' },
        { type: 'TXT', name: 'resend._domainkey' },
        { type: 'MX', name: 'send' },
        { type: 'TXT', name: 'send' }
      ];

      const verification = {
        verified: true,
        records: []
      };

      for (const record of requiredRecords) {
        const fullName = record.name === '@' ? domain : `${record.name}.${domain}`;
        const existing = await this.listDNSRecords(zoneId, record.type, fullName);

        const recordVerification = {
          type: record.type,
          name: record.name,
          exists: existing.length > 0,
          record: existing[0] || null
        };

        verification.records.push(recordVerification);

        if (!recordVerification.exists) {
          verification.verified = false;
        }
      }

      omniLogger.info('Email DNS verification completed', {
        zoneId,
        domain,
        verified: verification.verified
      });

      return verification;
    } catch (error) {
      omniLogger.error('Failed to verify email DNS', { zoneId, domain, error: error.message });
      throw error;
    }
  }
}
