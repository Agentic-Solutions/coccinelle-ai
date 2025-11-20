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
      case 'shopify':
        const { ShopifyInventory } = await import('./inventory/shopify/inventory');
        return new ShopifyInventory(config.credentials, config.settings);

      case 'woocommerce':
        const { WooCommerceInventory } = await import('./inventory/woocommerce/inventory');
        return new WooCommerceInventory(config.credentials, config.settings);

      case 'prestashop':
        const { PrestaShopInventory } = await import('./inventory/prestashop/inventory');
        return new PrestaShopInventory(config.credentials, config.settings);

      case 'magento':
        const { MagentoInventory } = await import('./inventory/magento/inventory');
        return new MagentoInventory(config.credentials, config.settings);

      case 'custom':
        const { CustomInventory } = await import('./inventory/custom/inventory');
        return new CustomInventory(config.credentials, config.settings);

      case 'mock':
        const { MockInventory } = await import('./inventory/mock/inventory');
        return new MockInventory(config.credentials, config.settings);

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
      case 'shopify':
        const { ShopifyOrders } = await import('./orders/shopify/orders');
        return new ShopifyOrders(config.credentials, config.settings);

      case 'woocommerce':
        const { WooCommerceOrders } = await import('./orders/woocommerce/orders');
        return new WooCommerceOrders(config.credentials, config.settings);

      case 'prestashop':
        const { PrestaShopOrders } = await import('./orders/prestashop/orders');
        return new PrestaShopOrders(config.credentials, config.settings);

      case 'magento':
        const { MagentoOrders } = await import('./orders/magento/orders');
        return new MagentoOrders(config.credentials, config.settings);

      case 'custom':
        const { CustomOrders } = await import('./orders/custom/orders');
        return new CustomOrders(config.credentials, config.settings);

      case 'mock':
        const { MockOrders } = await import('./orders/mock/orders');
        return new MockOrders(config.credentials, config.settings);

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
      case 'colissimo':
        const { ColissimoTracking } = await import('./tracking/colissimo/tracking');
        return new ColissimoTracking(config.credentials, config.settings);

      case 'chronopost':
        const { ChronopostTracking } = await import('./tracking/chronopost/tracking');
        return new ChronopostTracking(config.credentials, config.settings);

      case 'ups':
        const { UPSTracking } = await import('./tracking/ups/tracking');
        return new UPSTracking(config.credentials, config.settings);

      case 'fedex':
        const { FedExTracking } = await import('./tracking/fedex/tracking');
        return new FedExTracking(config.credentials, config.settings);

      case 'dhl':
        const { DHLTracking } = await import('./tracking/dhl/tracking');
        return new DHLTracking(config.credentials, config.settings);

      case 'custom':
        const { CustomTracking } = await import('./tracking/custom/tracking');
        return new CustomTracking(config.credentials, config.settings);

      case 'mock':
        const { MockTracking } = await import('./tracking/mock/tracking');
        return new MockTracking(config.credentials, config.settings);

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

      case 'shopify':
        const { ShopifyCustomers } = await import('./customers/shopify/customers');
        return new ShopifyCustomers(config.credentials, config.settings);

      case 'woocommerce':
        const { WooCommerceCustomers } = await import('./customers/woocommerce/customers');
        return new WooCommerceCustomers(config.credentials, config.settings);

      case 'custom':
        const { CustomCustomers } = await import('./customers/custom/customers');
        return new CustomCustomers(config.credentials, config.settings);

      case 'mock':
        const { MockCustomers } = await import('./customers/mock/customers');
        return new MockCustomers(config.credentials, config.settings);

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
