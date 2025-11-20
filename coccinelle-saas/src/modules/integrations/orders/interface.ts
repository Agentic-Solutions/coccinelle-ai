/**
 * Interface Abstraite pour les Systèmes de Commandes
 * Coccinelle.AI - Order System Interface
 *
 * Tous les connecteurs doivent implémenter cette interface
 */

import {
  Order,
  Exchange,
  ExchangeItem,
  IntegrationHealth,
  Money,
  Address,
} from '../types';

export interface OrderSystem {
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
  // RÉCUPÉRATION COMMANDES
  // ============================================

  /**
   * Récupérer une commande par ID
   */
  getOrder(orderId: string): Promise<Order>;

  /**
   * Récupérer une commande par numéro de commande
   */
  getOrderByNumber(orderNumber: string): Promise<Order>;

  /**
   * Récupérer les commandes d'un client
   */
  getCustomerOrders(customerId: string, options?: OrderListOptions): Promise<Order[]>;

  /**
   * Récupérer les commandes par email client
   */
  getOrdersByEmail(email: string, options?: OrderListOptions): Promise<Order[]>;

  /**
   * Lister toutes les commandes (avec pagination)
   */
  listOrders(options?: OrderListOptions): Promise<PaginatedOrderResult>;

  /**
   * Chercher des commandes
   */
  searchOrders(query: string, options?: OrderSearchOptions): Promise<Order[]>;

  // ============================================
  // CRÉATION & MODIFICATION
  // ============================================

  /**
   * Créer une commande
   */
  createOrder(params: CreateOrderParams): Promise<Order>;

  /**
   * Mettre à jour une commande
   */
  updateOrder(orderId: string, updates: OrderUpdateParams): Promise<Order>;

  /**
   * Annuler une commande
   */
  cancelOrder(orderId: string, reason?: string): Promise<Order>;

  /**
   * Ajouter une note à une commande
   */
  addOrderNote(orderId: string, note: string): Promise<void>;

  // ============================================
  // STATUTS
  // ============================================

  /**
   * Mettre à jour le statut de paiement
   */
  updatePaymentStatus(
    orderId: string,
    status: 'pending' | 'paid' | 'failed' | 'refunded'
  ): Promise<Order>;

  /**
   * Mettre à jour le statut de livraison
   */
  updateFulfillmentStatus(
    orderId: string,
    status: 'unfulfilled' | 'fulfilled' | 'partially_fulfilled'
  ): Promise<Order>;

  /**
   * Marquer une commande comme expédiée
   */
  markAsShipped(params: {
    orderId: string;
    trackingNumber?: string;
    carrier?: string;
    trackingUrl?: string;
    shippedAt?: Date;
  }): Promise<Order>;

  /**
   * Marquer une commande comme livrée
   */
  markAsDelivered(orderId: string, deliveredAt?: Date): Promise<Order>;

  // ============================================
  // ÉCHANGES & RETOURS
  // ============================================

  /**
   * Créer une demande d'échange
   */
  createExchange(params: {
    orderId: string;
    customerId: string;
    returnItems: ExchangeItem[];
    exchangeItems: ExchangeItem[];
    reason: string;
    notes?: string;
  }): Promise<Exchange>;

  /**
   * Récupérer un échange par ID
   */
  getExchange(exchangeId: string): Promise<Exchange>;

  /**
   * Récupérer les échanges d'une commande
   */
  getOrderExchanges(orderId: string): Promise<Exchange[]>;

  /**
   * Mettre à jour le statut d'un échange
   */
  updateExchangeStatus(
    exchangeId: string,
    status: 'approved' | 'received' | 'completed' | 'cancelled'
  ): Promise<Exchange>;

  /**
   * Générer une étiquette de retour
   */
  generateReturnLabel(params: {
    exchangeId: string;
    returnAddress: Address;
    carrier?: string;
  }): Promise<{
    url: string;
    trackingNumber: string;
    carrier: string;
    cost: Money;
  }>;

  // ============================================
  // REMBOURSEMENTS
  // ============================================

  /**
   * Créer un remboursement
   */
  createRefund?(params: {
    orderId: string;
    amount?: Money; // Si non fourni, remboursement total
    items?: Array<{ orderItemId: string; quantity: number }>;
    reason?: string;
    notify?: boolean; // Notifier le client ?
  }): Promise<Refund>;

  /**
   * Récupérer les remboursements d'une commande
   */
  getOrderRefunds?(orderId: string): Promise<Refund[]>;

  // ============================================
  // NOTIFICATIONS & WEBHOOKS
  // ============================================

  /**
   * S'abonner aux changements de commandes
   */
  subscribeToOrderChanges?(
    callback: (event: OrderChangeEvent) => void
  ): Promise<void>;

  /**
   * Se désabonner des changements de commandes
   */
  unsubscribeFromOrderChanges?(): Promise<void>;
}

// ============================================
// TYPES SUPPLÉMENTAIRES
// ============================================

export interface OrderListOptions {
  /**
   * Numéro de page
   */
  page?: number;

  /**
   * Nombre d'éléments par page
   */
  perPage?: number;

  /**
   * Filtrer par statut
   */
  status?: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';

  /**
   * Filtrer par statut de paiement
   */
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';

  /**
   * Filtrer par statut de livraison
   */
  fulfillmentStatus?: 'unfulfilled' | 'partially_fulfilled' | 'fulfilled';

  /**
   * Filtrer par date de création (après)
   */
  createdAfter?: Date;

  /**
   * Filtrer par date de création (avant)
   */
  createdBefore?: Date;

  /**
   * Trier par
   */
  sortBy?: 'created_at' | 'updated_at' | 'total' | 'order_number';

  /**
   * Ordre de tri
   */
  sortOrder?: 'asc' | 'desc';
}

export interface OrderSearchOptions extends OrderListOptions {
  /**
   * Chercher dans les numéros de commande
   */
  searchInOrderNumber?: boolean;

  /**
   * Chercher dans les emails clients
   */
  searchInEmail?: boolean;

  /**
   * Chercher dans les noms de produits
   */
  searchInProducts?: boolean;
}

export interface CreateOrderParams {
  /**
   * ID du client
   */
  customerId?: string;

  /**
   * Email du client (si pas de customerId)
   */
  customerEmail?: string;

  /**
   * Articles de la commande
   */
  items: Array<{
    productId: string;
    variantId?: string;
    quantity: number;
    price?: Money;
  }>;

  /**
   * Adresse de livraison
   */
  shippingAddress?: Address;

  /**
   * Adresse de facturation
   */
  billingAddress?: Address;

  /**
   * Code promo / réduction
   */
  discountCode?: string;

  /**
   * Notes
   */
  notes?: string;

  /**
   * Métadonnées
   */
  metadata?: Record<string, any>;
}

export interface OrderUpdateParams {
  /**
   * Nouveau statut
   */
  status?: 'pending' | 'processing' | 'completed' | 'cancelled';

  /**
   * Adresse de livraison
   */
  shippingAddress?: Address;

  /**
   * Adresse de facturation
   */
  billingAddress?: Address;

  /**
   * Notes
   */
  notes?: string;

  /**
   * Métadonnées
   */
  metadata?: Record<string, any>;
}

export interface PaginatedOrderResult {
  data: Order[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface Refund {
  id: string;
  orderId: string;
  amount: Money;
  reason?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

export interface OrderChangeEvent {
  orderId: string;
  changeType: 'created' | 'updated' | 'cancelled' | 'shipped' | 'delivered';
  previousStatus?: string;
  newStatus?: string;
  timestamp: Date;
  data?: any;
}
