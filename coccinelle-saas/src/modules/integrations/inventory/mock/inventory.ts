/**
 * Mock Inventory System - Pour Tests & Développement
 * Coccinelle.AI - Mock Inventory Implementation
 */

import {
  InventorySystem,
  SearchOptions,
  ListOptions,
  PaginatedResult,
  StockChangeEvent,
} from '../interface';
import {
  Product,
  ProductVariant,
  StockInfo,
  Reservation,
  IntegrationHealth,
} from '../../types';

export class MockInventory implements InventorySystem {
  readonly systemName = 'mock';
  readonly apiVersion = '1.0.0';

  private products: Map<string, Product> = new Map();
  private reservations: Map<string, Reservation> = new Map();

  constructor(
    private credentials: Record<string, any>,
    private settings?: Record<string, any>
  ) {
    // Initialiser avec des données de test
    this.initializeMockData();
  }

  // ============================================
  // SANTÉ & CONNEXION
  // ============================================

  async checkHealth(): Promise<IntegrationHealth> {
    return {
      status: 'connected',
      lastChecked: new Date(),
      message: 'Mock inventory system is always healthy',
      details: {
        productsCount: this.products.size,
        reservationsCount: this.reservations.size,
      },
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  // ============================================
  // PRODUITS
  // ============================================

  async getProduct(productId: string): Promise<Product> {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }
    return product;
  }

  async getProductVariant(
    productId: string,
    variantId: string
  ): Promise<ProductVariant> {
    const product = await this.getProduct(productId);
    if (!product.hasVariants || !product.variants) {
      throw new Error(`Product ${productId} has no variants`);
    }
    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new Error(`Variant not found: ${variantId}`);
    }
    return variant;
  }

  async searchProducts(query: string, options?: SearchOptions): Promise<Product[]> {
    const lowerQuery = query.toLowerCase();
    let results = Array.from(this.products.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.description?.toLowerCase().includes(lowerQuery) ||
        p.sku?.toLowerCase().includes(lowerQuery)
    );

    // Filtrer par catégorie
    if (options?.category) {
      results = results.filter((p) => p.categories?.includes(options.category!));
    }

    // Filtrer par tags
    if (options?.tags && options.tags.length > 0) {
      results = results.filter((p) =>
        options.tags!.some((tag) => p.tags?.includes(tag))
      );
    }

    // Filtrer stock
    if (!options?.includeOutOfStock) {
      results = results.filter((p) => p.stockStatus !== 'out_of_stock');
    }

    // Limiter résultats
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getProducts(productIds: string[]): Promise<Product[]> {
    return productIds
      .map((id) => this.products.get(id))
      .filter((p) => p !== undefined) as Product[];
  }

  async listProducts(options?: ListOptions): Promise<PaginatedResult<Product>> {
    let products = Array.from(this.products.values());

    // Filtrer par statut de stock
    if (options?.stockStatus && options.stockStatus !== 'all') {
      products = products.filter((p) => p.stockStatus === options.stockStatus);
    }

    // Pagination
    const page = options?.page || 1;
    const perPage = options?.perPage || 20;
    const total = products.length;
    const totalPages = Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const data = products.slice(start, end);

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

  // ============================================
  // STOCK
  // ============================================

  async checkAvailability(
    productId: string,
    variantId?: string
  ): Promise<StockInfo> {
    const product = await this.getProduct(productId);

    if (variantId && product.hasVariants) {
      const variant = await this.getProductVariant(productId, variantId);
      return {
        available: variant.stockQuantity > 0,
        quantity: variant.stockQuantity,
        status: variant.stockStatus,
        location: 'Mock Store',
      };
    }

    return {
      available: product.stockQuantity > 0,
      quantity: product.stockQuantity,
      status: product.stockStatus,
      location: 'Mock Store',
    };
  }

  async checkAvailabilityBySku(sku: string): Promise<StockInfo> {
    const product = Array.from(this.products.values()).find((p) => p.sku === sku);
    if (!product) {
      throw new Error(`Product not found with SKU: ${sku}`);
    }
    return this.checkAvailability(product.id);
  }

  async checkBulkAvailability(
    items: Array<{ productId: string; variantId?: string }>
  ): Promise<StockInfo[]> {
    return Promise.all(
      items.map((item) => this.checkAvailability(item.productId, item.variantId))
    );
  }

  async updateStock(
    productId: string,
    quantity: number,
    options?: { variantId?: string; mode?: 'set' | 'adjust'; reason?: string }
  ): Promise<StockInfo> {
    const product = await this.getProduct(productId);
    const mode = options?.mode || 'set';

    if (options?.variantId && product.hasVariants && product.variants) {
      const variant = product.variants.find((v) => v.id === options.variantId);
      if (!variant) {
        throw new Error(`Variant not found: ${options.variantId}`);
      }

      if (mode === 'set') {
        variant.stockQuantity = quantity;
      } else {
        variant.stockQuantity += quantity;
      }

      variant.stockStatus =
        variant.stockQuantity > 0
          ? variant.stockQuantity <= 5
            ? 'low_stock'
            : 'in_stock'
          : 'out_of_stock';

      return {
        available: variant.stockQuantity > 0,
        quantity: variant.stockQuantity,
        status: variant.stockStatus,
        location: 'Mock Store',
      };
    }

    if (mode === 'set') {
      product.stockQuantity = quantity;
    } else {
      product.stockQuantity += quantity;
    }

    product.stockStatus =
      product.stockQuantity > 0
        ? product.stockQuantity <= 5
          ? 'low_stock'
          : 'in_stock'
        : 'out_of_stock';

    return {
      available: product.stockQuantity > 0,
      quantity: product.stockQuantity,
      status: product.stockStatus,
      location: 'Mock Store',
    };
  }

  // ============================================
  // RÉSERVATIONS
  // ============================================

  async reserveProduct(params: {
    productId: string;
    variantId?: string;
    customerId: string;
    quantity: number;
    duration: number;
    notes?: string;
  }): Promise<Reservation> {
    const stock = await this.checkAvailability(params.productId, params.variantId);

    if (!stock.available || stock.quantity < params.quantity) {
      throw new Error('Insufficient stock for reservation');
    }

    const reservation: Reservation = {
      id: `res_${Date.now()}`,
      productId: params.productId,
      variantId: params.variantId,
      customerId: params.customerId,
      quantity: params.quantity,
      expiresAt: new Date(Date.now() + params.duration * 60 * 1000),
      status: 'active',
      createdAt: new Date(),
      notes: params.notes,
    };

    this.reservations.set(reservation.id, reservation);

    // Mettre à jour le stock (décrémenter)
    await this.updateStock(params.productId, -params.quantity, {
      variantId: params.variantId,
      mode: 'adjust',
      reason: `Reservation ${reservation.id}`,
    });

    return reservation;
  }

  async cancelReservation(reservationId: string): Promise<void> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new Error(`Reservation not found: ${reservationId}`);
    }

    // Remettre le stock
    await this.updateStock(reservation.productId, reservation.quantity, {
      variantId: reservation.variantId,
      mode: 'adjust',
      reason: `Cancelled reservation ${reservationId}`,
    });

    reservation.status = 'cancelled';
    this.reservations.set(reservationId, reservation);
  }

  async getCustomerReservations(customerId: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(
      (r) => r.customerId === customerId && r.status === 'active'
    );
  }

  async extendReservation(
    reservationId: string,
    additionalMinutes: number
  ): Promise<Reservation> {
    const reservation = this.reservations.get(reservationId);
    if (!reservation) {
      throw new Error(`Reservation not found: ${reservationId}`);
    }

    reservation.expiresAt = new Date(
      reservation.expiresAt.getTime() + additionalMinutes * 60 * 1000
    );
    this.reservations.set(reservationId, reservation);

    return reservation;
  }

  // ============================================
  // DONNÉES DE TEST
  // ============================================

  private initializeMockData() {
    // Robe fleurie bleue (exemple du prêt-à-porter)
    const robe: Product = {
      id: 'prod_001',
      externalId: 'RF-2847',
      name: 'Robe Fleurie Bleue',
      description: 'Magnifique robe fleurie bleu ciel, parfaite pour l\'été',
      sku: 'RF-2847',
      price: { amount: 89.0, currency: 'EUR' },
      compareAtPrice: { amount: 129.0, currency: 'EUR' },
      stockQuantity: 0,
      stockStatus: 'in_stock',
      hasVariants: true,
      variants: [
        {
          id: 'var_001_36',
          name: 'T36',
          sku: 'RF-2847-T36',
          stockQuantity: 1,
          stockStatus: 'low_stock',
          attributes: { size: '36' },
        },
        {
          id: 'var_001_38',
          name: 'T38',
          sku: 'RF-2847-T38',
          stockQuantity: 2,
          stockStatus: 'in_stock',
          attributes: { size: '38' },
        },
        {
          id: 'var_001_40',
          name: 'T40',
          sku: 'RF-2847-T40',
          stockQuantity: 3,
          stockStatus: 'in_stock',
          attributes: { size: '40' },
        },
      ],
      images: ['https://example.com/robe-fleurie-bleue.jpg'],
      categories: ['Robes', 'Nouveautés'],
      tags: ['été', 'floral', 'bleu'],
      createdAt: new Date('2025-01-10'),
      updatedAt: new Date('2025-01-16'),
    };

    this.products.set(robe.id, robe);

    // Blazer beige
    const blazer: Product = {
      id: 'prod_002',
      name: 'Blazer Beige Élégant',
      description: 'Blazer beige chic, coupe cintrée',
      sku: 'BL-445',
      price: { amount: 129.0, currency: 'EUR' },
      stockQuantity: 0,
      stockStatus: 'in_stock',
      hasVariants: true,
      variants: [
        {
          id: 'var_002_36',
          name: 'T36',
          sku: 'BL-445-T36',
          stockQuantity: 0,
          stockStatus: 'out_of_stock',
          attributes: { size: '36' },
        },
        {
          id: 'var_002_38',
          name: 'T38',
          sku: 'BL-445-T38',
          stockQuantity: 4,
          stockStatus: 'in_stock',
          attributes: { size: '38' },
        },
        {
          id: 'var_002_40',
          name: 'T40',
          sku: 'BL-445-T40',
          stockQuantity: 5,
          stockStatus: 'in_stock',
          attributes: { size: '40' },
        },
      ],
      categories: ['Vestes', 'Élégance'],
      tags: ['blazer', 'beige', 'chic'],
      createdAt: new Date('2025-01-05'),
      updatedAt: new Date('2025-01-15'),
    };

    this.products.set(blazer.id, blazer);

    // Pantalon noir
    const pantalon: Product = {
      id: 'prod_003',
      name: 'Pantalon Noir Taille Haute',
      description: 'Pantalon noir élégant, taille haute',
      sku: 'PT-2847',
      price: { amount: 79.0, currency: 'EUR' },
      stockQuantity: 0,
      stockStatus: 'in_stock',
      hasVariants: true,
      variants: [
        {
          id: 'var_003_36',
          name: 'T36',
          sku: 'PT-2847-T36',
          stockQuantity: 2,
          stockStatus: 'in_stock',
          attributes: { size: '36' },
        },
        {
          id: 'var_003_38',
          name: 'T38',
          sku: 'PT-2847-T38',
          stockQuantity: 3,
          stockStatus: 'in_stock',
          attributes: { size: '38' },
        },
        {
          id: 'var_003_40',
          name: 'T40',
          sku: 'PT-2847-T40',
          stockQuantity: 1,
          stockStatus: 'low_stock',
          attributes: { size: '40' },
        },
      ],
      categories: ['Pantalons'],
      tags: ['noir', 'taille-haute', 'élégant'],
      createdAt: new Date('2025-01-08'),
      updatedAt: new Date('2025-01-16'),
    };

    this.products.set(pantalon.id, pantalon);
  }
}
