/**
 * Service de synchronisation CRM
 * Gère la sync bidirectionnelle entre Coccinelle DB et CRM externes (HubSpot, Salesforce)
 */

import { CustomerSystem, Customer } from '@/modules/integrations/types';
import { HubSpotCustomers } from '@/modules/integrations/customers/hubspot/customers';
import { SalesforceCustomers } from '@/modules/integrations/customers/salesforce/customers';
import { getCRMDatabaseService } from '@/services/customer/db';

interface CRMIntegrationConfig {
  id: string;
  tenantId: string;
  systemType: 'hubspot' | 'salesforce';
  credentials: any;
  settings: any;
  isActive: boolean;
}

interface SyncResult {
  success: boolean;
  synced: number;
  created: number;
  updated: number;
  errors: Array<{ customerId: string; error: string }>;
}

/**
 * Service de synchronisation CRM
 */
export class CRMSyncService {
  private db: any;
  private tenantId: string;

  constructor(db: any, tenantId: string) {
    this.db = db;
    this.tenantId = tenantId;
  }

  /**
   * Obtenir un système CRM externe configuré
   */
  private async getExternalCRM(systemType: 'hubspot' | 'salesforce'): Promise<CustomerSystem | null> {
    // Récupérer la config depuis la DB
    const config = await this.db
      .prepare(`
        SELECT * FROM crm_integrations
        WHERE tenant_id = ? AND system_type = ? AND is_active = 1
      `)
      .bind(this.tenantId, systemType)
      .first();

    if (!config) return null;

    const credentials = JSON.parse(config.credentials);

    if (systemType === 'hubspot') {
      return new HubSpotCustomers(credentials, {});
    } else if (systemType === 'salesforce') {
      return new SalesforceCustomers(credentials, {});
    }

    return null;
  }

  /**
   * Synchroniser un client local vers CRM externe
   */
  async syncToExternal(
    customerId: string,
    externalSystem: 'hubspot' | 'salesforce'
  ): Promise<{ success: boolean; externalId?: string; error?: string }> {
    try {
      const crmDB = getCRMDatabaseService(this.db, this.tenantId);
      const externalCRM = await this.getExternalCRM(externalSystem);

      if (!externalCRM) {
        return { success: false, error: `${externalSystem} not configured` };
      }

      // Récupérer le client local
      const localCustomer = await crmDB.getCustomer(customerId);

      // Vérifier si déjà mappé
      const existingMapping = await this.db
        .prepare(`
          SELECT external_id FROM crm_sync_mappings
          WHERE prospect_id = ? AND external_system = ? AND tenant_id = ?
        `)
        .bind(customerId, externalSystem, this.tenantId)
        .first();

      let externalId: string;

      if (existingMapping) {
        // Update dans le CRM externe
        externalId = existingMapping.external_id;
        await externalCRM.updateCustomer(externalId, this.mapToExternalFormat(localCustomer));

        // Mettre à jour le statut de sync
        await this.db
          .prepare(`
            UPDATE crm_sync_mappings
            SET last_synced_at = datetime('now'), sync_status = 'synced'
            WHERE prospect_id = ? AND external_system = ?
          `)
          .bind(customerId, externalSystem)
          .run();
      } else {
        // Créer dans le CRM externe
        const externalCustomer = await externalCRM.createCustomer(
          this.mapToExternalFormat(localCustomer)
        );
        externalId = externalCustomer.id;

        // Créer le mapping
        await this.createSyncMapping(customerId, externalId, externalSystem);
      }

      console.log(`✅ Synced customer ${customerId} to ${externalSystem} (${externalId})`);

      return { success: true, externalId };
    } catch (error: any) {
      console.error(`❌ Sync error for customer ${customerId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Synchroniser depuis CRM externe vers local
   */
  async syncFromExternal(
    externalId: string,
    externalSystem: 'hubspot' | 'salesforce'
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    try {
      const crmDB = getCRMDatabaseService(this.db, this.tenantId);
      const externalCRM = await this.getExternalCRM(externalSystem);

      if (!externalCRM) {
        return { success: false, error: `${externalSystem} not configured` };
      }

      // Récupérer depuis le CRM externe
      const externalCustomer = await externalCRM.getCustomer(externalId);

      // Vérifier si déjà mappé
      const existingMapping = await this.db
        .prepare(`
          SELECT prospect_id FROM crm_sync_mappings
          WHERE external_id = ? AND external_system = ? AND tenant_id = ?
        `)
        .bind(externalId, externalSystem, this.tenantId)
        .first();

      let customerId: string;

      if (existingMapping) {
        // Update local
        customerId = existingMapping.prospect_id;
        // TODO: Implémenter updateCustomer dans CRMDatabaseService
        console.log(`Updating local customer ${customerId} from ${externalSystem}`);
      } else {
        // Créer localement
        const localCustomer = await crmDB.createCustomer(
          this.mapFromExternalFormat(externalCustomer)
        );
        customerId = localCustomer.id;

        // Créer le mapping
        await this.createSyncMapping(customerId, externalId, externalSystem);
      }

      return { success: true, customerId };
    } catch (error: any) {
      console.error(`❌ Sync error from ${externalSystem}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Synchronisation complète (tous les clients)
   */
  async syncAll(externalSystem: 'hubspot' | 'salesforce'): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      created: 0,
      updated: 0,
      errors: [],
    };

    try {
      const crmDB = getCRMDatabaseService(this.db, this.tenantId);
      const localCustomers = await crmDB.listCustomers({ limit: 1000 });

      console.log(`🔄 Syncing ${localCustomers.length} customers to ${externalSystem}...`);

      for (const customer of localCustomers) {
        const syncResult = await this.syncToExternal(customer.id, externalSystem);

        if (syncResult.success) {
          result.synced++;
        } else {
          result.errors.push({
            customerId: customer.id,
            error: syncResult.error || 'Unknown error',
          });
        }
      }

      // Mettre à jour le statut global de l'intégration
      await this.db
        .prepare(`
          UPDATE crm_integrations
          SET last_sync_at = datetime('now'), sync_status = 'idle'
          WHERE tenant_id = ? AND system_type = ?
        `)
        .bind(this.tenantId, externalSystem)
        .run();

      console.log(
        `✅ Sync complete: ${result.synced} synced, ${result.errors.length} errors`
      );
    } catch (error: any) {
      result.success = false;
      console.error(`❌ Sync failed:`, error);
    }

    return result;
  }

  /**
   * Créer un mapping de synchronisation
   */
  private async createSyncMapping(
    customerId: string,
    externalId: string,
    externalSystem: string
  ): Promise<void> {
    const mappingId = `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Récupérer l'ID de l'intégration
    const integration = await this.db
      .prepare(`SELECT id FROM crm_integrations WHERE tenant_id = ? AND system_type = ?`)
      .bind(this.tenantId, externalSystem)
      .first();

    if (!integration) {
      throw new Error(`No integration found for ${externalSystem}`);
    }

    await this.db
      .prepare(`
        INSERT INTO crm_sync_mappings (
          id, tenant_id, integration_id, prospect_id, external_id, external_system, last_synced_at, sync_status
        ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 'synced')
      `)
      .bind(mappingId, this.tenantId, integration.id, customerId, externalId, externalSystem)
      .run();
  }

  /**
   * Mapper format local vers format externe
   */
  private mapToExternalFormat(customer: Customer): any {
    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      postalCode: customer.postalCode,
      country: customer.country,
      tags: customer.tags,
      segment: customer.segment,
      communicationPreferences: {
        preferredChannel: customer.preferredChannel,
      },
      metadata: customer.metadata,
    };
  }

  /**
   * Mapper format externe vers format local
   */
  private mapFromExternalFormat(externalCustomer: Customer): any {
    return {
      firstName: externalCustomer.firstName,
      lastName: externalCustomer.lastName,
      email: externalCustomer.email,
      phone: externalCustomer.phone,
      address: externalCustomer.address,
      city: externalCustomer.city,
      postalCode: externalCustomer.postalCode,
      country: externalCustomer.country,
      tags: externalCustomer.tags || [],
      segment: externalCustomer.segment || 'prospect',
      communicationPreferences: {
        preferredChannel: externalCustomer.preferredChannel || 'email',
      },
      metadata: {
        ...externalCustomer.metadata,
        importedFrom: 'external-crm',
      },
    };
  }
}

/**
 * Obtenir une instance du service de sync
 */
export function getCRMSyncService(db: any, tenantId: string): CRMSyncService {
  return new CRMSyncService(db, tenantId);
}
