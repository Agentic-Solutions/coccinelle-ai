/**
 * Interface Abstraite pour les Systèmes d'Inventaire
 * Coccinelle.AI - Inventory System Interface
 *
 * Tous les connecteurs (Shopify, WooCommerce, etc.) doivent implémenter cette interface
 */

import {
  Product,
  ProductVariant,
  StockInfo,
  Reservation,
  IntegrationHealth,
} from '../types';

export interface InventorySystem {
  /**
   * Nom du système (ex: "shopify", "woocommerce", "custom")
   */
  readonly systemName: string;

  /**
   * Version de l'API du système
   */
  readonly apiVersion?: string;

  // ============================================
  // SANTÉ & CONNEXION
  // ============================================

  /**
   * Vérifier la santé de la connexion
   */
  checkHealth(): Promise<IntegrationHealth>;

  /**
   * Tester la connexion
   */
  testConnection(): Promise<boolean>;

  // ============================================
  // PRODUITS
  // ============================================

  /**
   * Récupérer un produit par ID
   */
  getProduct(productId: string): Promise<Product>;

  /**
   * Récupérer une variante spécifique
   */
  getProductVariant(productId: string, variantId: string): Promise<ProductVariant>;

  /**
   * Chercher des produits par nom, SKU, etc.
   */
  searchProducts(query: string, options?: SearchOptions): Promise<Product[]>;

  /**
   * Récupérer plusieurs produits par IDs
   */
  getProducts(productIds: string[]): Promise<Product[]>;

  /**
   * Lister tous les produits (avec pagination)
   */
  listProducts(options?: ListOptions): Promise<PaginatedResult<Product>>;

  // ============================================
  // STOCK
  // ============================================

  /**
   * Vérifier la disponibilité d'un produit
   * @param productId - ID du produit
   * @param variantId - ID de la variante (optionnel, pour les produits avec variantes)
   */
  checkAvailability(productId: string, variantId?: string): Promise<StockInfo>;

  /**
   * Vérifier la disponibilité par SKU
   */
  checkAvailabilityBySku(sku: string): Promise<StockInfo>;

  /**
   * Vérifier la disponibilité de plusieurs produits
   */
  checkBulkAvailability(
    items: Array<{ productId: string; variantId?: string }>
  ): Promise<StockInfo[]>;

  /**
   * Mettre à jour le stock d'un produit
   * @param productId - ID du produit
   * @param variantId - ID de la variante (optionnel)
   * @param quantity - Nouvelle quantité (peut être négative pour décrémenter)
   * @param mode - 'set' pour définir, 'adjust' pour ajuster
   */
  updateStock(
    productId: string,
    quantity: number,
    options?: {
      variantId?: string;
      mode?: 'set' | 'adjust';
      reason?: string;
    }
  ): Promise<StockInfo>;

  // ============================================
  // RÉSERVATIONS
  // ============================================

  /**
   * Créer une réservation temporaire (mettre de côté)
   */
  reserveProduct(params: {
    productId: string;
    variantId?: string;
    customerId: string;
    quantity: number;
    duration: number; // en minutes
    notes?: string;
  }): Promise<Reservation>;

  /**
   * Annuler une réservation
   */
  cancelReservation(reservationId: string): Promise<void>;

  /**
   * Récupérer les réservations actives d'un client
   */
  getCustomerReservations(customerId: string): Promise<Reservation[]>;

  /**
   * Prolonger une réservation
   */
  extendReservation(
    reservationId: string,
    additionalMinutes: number
  ): Promise<Reservation>;

  // ============================================
  // NOTIFICATIONS & WEBHOOKS
  // ============================================

  /**
   * S'abonner aux changements de stock
   * @param callback - Fonction appelée quand le stock change
   */
  subscribeToStockChanges?(
    callback: (event: StockChangeEvent) => void
  ): Promise<void>;

  /**
   * Se désabonner des changements de stock
   */
  unsubscribeFromStockChanges?(): Promise<void>;
}

// ============================================
// TYPES SUPPLÉMENTAIRES
// ============================================

export interface SearchOptions {
  /**
   * Nombre maximum de résultats
   */
  limit?: number;

  /**
   * Inclure les produits en rupture de stock
   */
  includeOutOfStock?: boolean;

  /**
   * Filtrer par catégorie
   */
  category?: string;

  /**
   * Filtrer par tags
   */
  tags?: string[];

  /**
   * Trier par
   */
  sortBy?: 'name' | 'price' | 'stock' | 'created_at' | 'updated_at';

  /**
   * Ordre de tri
   */
  sortOrder?: 'asc' | 'desc';
}

export interface ListOptions {
  /**
   * Numéro de page (pour pagination)
   */
  page?: number;

  /**
   * Nombre d'éléments par page
   */
  perPage?: number;

  /**
   * Filtrer par statut de stock
   */
  stockStatus?: 'in_stock' | 'out_of_stock' | 'low_stock' | 'all';

  /**
   * Filtrer par catégorie
   */
  category?: string;

  /**
   * Trier par
   */
  sortBy?: 'name' | 'price' | 'stock' | 'created_at' | 'updated_at';

  /**
   * Ordre de tri
   */
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  /**
   * Données de la page courante
   */
  data: T[];

  /**
   * Métadonnées de pagination
   */
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface StockChangeEvent {
  /**
   * ID du produit
   */
  productId: string;

  /**
   * ID de la variante (si applicable)
   */
  variantId?: string;

  /**
   * Ancienne quantité
   */
  previousQuantity: number;

  /**
   * Nouvelle quantité
   */
  newQuantity: number;

  /**
   * Raison du changement
   */
  reason?: string;

  /**
   * Date du changement
   */
  timestamp: Date;
}
