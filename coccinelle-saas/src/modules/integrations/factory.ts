/**
 * Factory Pattern pour les Intégrations
 * Coccinelle.AI - Integration Factory
 *
 * Permet de créer les bonnes instances de systèmes selon la configuration
 */

import { InventorySystem } from './inventory/interface';
import { OrderSystem } from './orders/interface';
import { TrackingSystem } from './tracking/interface';
import { CustomerSystem } from './customers/interface';
import { IntegrationConfig } from './types';

// ============================================
// CONFIGURATION DU TENANT
// ============================================

export interface TenantIntegrationConfig {
  /**
   * ID du tenant
   */
  tenantId: string;

  /**
   * Configuration du système d'inventaire
   */
  inventory?: IntegrationConfig;

  /**
   * Configuration du système de commandes
   */
  orders?: IntegrationConfig;

  /**
   * Configuration du système de tracking
   */
  tracking?: IntegrationConfig;

  /**
   * Configuration du système CRM
   */
  customers?: IntegrationConfig;
}

// ============================================
// FACTORY PRINCIPAL
// ============================================

export class IntegrationFactory {
  /**
   * Créer une instance de InventorySystem selon le type configuré
   */
  static async createInventorySystem(
    config: IntegrationConfig
  ): Promise<InventorySystem> {
    if (!config.enabled) {
      throw new Error('Inventory system is not enabled');
    }

    switch (config.type.toLowerCase()) {
      case 'mock':
        const { MockInventory } = await import('./inventory/mock/inventory');
        return new MockInventory(config.credentials, config.settings);

      case 'shopify':
      case 'woocommerce':
      case 'prestashop':
      case 'magento':
      case 'custom':
        // Ces intégrations seront implémentées ultérieurement
        throw new Error(`Inventory integration '${config.type}' not yet implemented. Use 'mock' for testing.`);

      default:
        throw new Error(`Unknown inventory system type: ${config.type}`);
    }
  }

  /**
   * Créer une instance de OrderSystem selon le type configuré
   */
  static async createOrderSystem(config: IntegrationConfig): Promise<OrderSystem> {
    if (!config.enabled) {
      throw new Error('Order system is not enabled');
    }

    switch (config.type.toLowerCase()) {
      case 'mock':
        const { MockOrders } = await import('./orders/mock/orders');
        return new MockOrders(config.credentials, config.settings);

      case 'shopify':
      case 'woocommerce':
      case 'prestashop':
      case 'magento':
      case 'custom':
        // Ces intégrations seront implémentées ultérieurement
        throw new Error(`Orders integration '${config.type}' not yet implemented. Use 'mock' for testing.`);

      default:
        throw new Error(`Unknown order system type: ${config.type}`);
    }
  }

  /**
   * Créer une instance de TrackingSystem selon le type configuré
   */
  static async createTrackingSystem(
    config: IntegrationConfig
  ): Promise<TrackingSystem> {
    if (!config.enabled) {
      throw new Error('Tracking system is not enabled');
    }

    switch (config.type.toLowerCase()) {
      case 'mock':
        const { MockTracking } = await import('./tracking/mock/tracking');
        return new MockTracking(config.credentials, config.settings);

      case 'colissimo':
      case 'chronopost':
      case 'ups':
      case 'fedex':
      case 'dhl':
      case 'custom':
        // Ces intégrations seront implémentées ultérieurement
        throw new Error(`Tracking integration '${config.type}' not yet implemented. Use 'mock' for testing.`);

      default:
        throw new Error(`Unknown tracking system type: ${config.type}`);
    }
  }

  /**
   * Créer une instance de CustomerSystem selon le type configuré
   */
  static async createCustomerSystem(
    config: IntegrationConfig
  ): Promise<CustomerSystem> {
    if (!config.enabled) {
      throw new Error('Customer system is not enabled');
    }

    switch (config.type.toLowerCase()) {
      case 'coccinelle-native':
      case 'native':
        const { NativeCRM } = await import('./customers/native/nativeCRM');
        return new NativeCRM(config.credentials, config.settings);

      case 'hubspot':
        const { HubSpotCustomers } = await import('./customers/hubspot/customers');
        return new HubSpotCustomers(config.credentials, config.settings);

      case 'salesforce':
        const { SalesforceCustomers } = await import('./customers/salesforce/customers');
        return new SalesforceCustomers(config.credentials, config.settings);

      case 'mock':
        const { MockCustomers } = await import('./customers/mock/customers');
        return new MockCustomers(config.credentials, config.settings);

      case 'shopify':
      case 'woocommerce':
      case 'custom':
        // Ces intégrations seront implémentées ultérieurement
        throw new Error(`Customer integration '${config.type}' not yet implemented. Use 'mock', 'native', 'hubspot', or 'salesforce'.`);

      default:
        throw new Error(`Unknown customer system type: ${config.type}`);
    }
  }

  /**
   * Créer toutes les instances pour un tenant
   */
  static async createAllSystems(
    tenantConfig: TenantIntegrationConfig
  ): Promise<IntegrationSystems> {
    const systems: IntegrationSystems = {};

    // Inventory System
    if (tenantConfig.inventory?.enabled) {
      try {
        systems.inventory = await this.createInventorySystem(tenantConfig.inventory);
      } catch (error) {
        console.error('Failed to create inventory system:', error);
      }
    }

    // Order System
    if (tenantConfig.orders?.enabled) {
      try {
        systems.orders = await this.createOrderSystem(tenantConfig.orders);
      } catch (error) {
        console.error('Failed to create order system:', error);
      }
    }

    // Tracking System
    if (tenantConfig.tracking?.enabled) {
      try {
        systems.tracking = await this.createTrackingSystem(tenantConfig.tracking);
      } catch (error) {
        console.error('Failed to create tracking system:', error);
      }
    }

    // Customer System
    if (tenantConfig.customers?.enabled) {
      try {
        systems.customers = await this.createCustomerSystem(tenantConfig.customers);
      } catch (error) {
        console.error('Failed to create customer system:', error);
      }
    }

    return systems;
  }
}

// ============================================
// TYPES
// ============================================

export interface IntegrationSystems {
  inventory?: InventorySystem;
  orders?: OrderSystem;
  tracking?: TrackingSystem;
  customers?: CustomerSystem;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Vérifier la santé de tous les systèmes d'un tenant
 */
export async function checkAllSystemsHealth(
  systems: IntegrationSystems
): Promise<Record<string, any>> {
  const health: Record<string, any> = {};

  if (systems.inventory) {
    try {
      health.inventory = await systems.inventory.checkHealth();
    } catch (error) {
      health.inventory = { status: 'error', message: error.message };
    }
  }

  if (systems.orders) {
    try {
      health.orders = await systems.orders.checkHealth();
    } catch (error) {
      health.orders = { status: 'error', message: error.message };
    }
  }

  if (systems.tracking) {
    try {
      health.tracking = await systems.tracking.checkHealth();
    } catch (error) {
      health.tracking = { status: 'error', message: error.message };
    }
  }

  if (systems.customers) {
    try {
      health.customers = await systems.customers.checkHealth();
    } catch (error) {
      health.customers = { status: 'error', message: error.message };
    }
  }

  return health;
}

/**
 * Obtenir les systèmes d'un tenant (à implémenter avec la base de données)
 */
export async function getTenantSystems(tenantId: string): Promise<IntegrationSystems> {
  // TODO: Récupérer la configuration du tenant depuis la base de données
  // Pour l'instant, retourner un mock
  const config: TenantIntegrationConfig = {
    tenantId,
    inventory: {
      type: 'mock',
      enabled: true,
      credentials: {},
    },
    orders: {
      type: 'mock',
      enabled: true,
      credentials: {},
    },
    tracking: {
      type: 'mock',
      enabled: true,
      credentials: {},
    },
    customers: {
      type: 'mock',
      enabled: true,
      credentials: {},
    },
  };

  return IntegrationFactory.createAllSystems(config);
}
