/**
 * Types communs pour tous les systèmes d'intégration
 * Coccinelle.AI - Intégrations Tierces
 */

// ============================================
// TYPES GÉNÉRIQUES
// ============================================

export type IntegrationStatus = 'connected' | 'disconnected' | 'error' | 'pending';

export interface IntegrationConfig {
  type: string;
  enabled: boolean;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
}

export interface IntegrationHealth {
  status: IntegrationStatus;
  lastChecked: Date;
  message?: string;
  details?: Record<string, any>;
}

// ============================================
// TYPES MÉTIER
// ============================================

export interface Money {
  amount: number;
  currency: string; // ISO 4217 (EUR, USD, etc.)
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  formatted?: string;
}

export interface ContactInfo {
  email?: string;
  phone?: string;
  preferredChannel?: 'email' | 'sms' | 'whatsapp' | 'phone';
}

// ============================================
// PRODUITS & STOCK
// ============================================

export interface Product {
  id: string;
  externalId?: string; // ID dans le système externe
  name: string;
  description?: string;
  sku?: string;

  // Prix
  price: Money;
  compareAtPrice?: Money; // Prix barré

  // Stock
  stockQuantity: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock' | 'backorder';
  lowStockThreshold?: number;

  // Variantes (tailles, couleurs, etc.)
  hasVariants: boolean;
  variants?: ProductVariant[];

  // Médias
  images?: string[];

  // Catégories & Tags
  categories?: string[];
  tags?: string[];

  // Métadonnées
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku?: string;
  price?: Money;
  stockQuantity: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock' | 'backorder';
  attributes: Record<string, string>; // { "size": "38", "color": "blue" }
  image?: string;
}

export interface StockInfo {
  available: boolean;
  quantity: number;
  status: 'in_stock' | 'out_of_stock' | 'low_stock' | 'backorder';
  location?: string; // Boutique, entrepôt, etc.
  reservedQuantity?: number;
  nextRestockDate?: Date;
}

export interface Reservation {
  id: string;
  productId: string;
  variantId?: string;
  customerId: string;
  quantity: number;
  expiresAt: Date;
  status: 'active' | 'expired' | 'fulfilled' | 'cancelled';
  createdAt: Date;
  notes?: string;
}

// ============================================
// COMMANDES
// ============================================

export interface Order {
  id: string;
  externalId?: string;
  orderNumber: string;

  // Client
  customer: Customer;

  // Articles
  items: OrderItem[];

  // Prix
  subtotal: Money;
  tax?: Money;
  shipping?: Money;
  discount?: Money;
  total: Money;

  // Statuts
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;

  // Livraison
  shippingAddress?: Address;
  billingAddress?: Address;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;

  // Dates
  createdAt: Date;
  updatedAt: Date;
  paidAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;

  // Métadonnées
  notes?: string;
  metadata?: Record<string, any>;
}

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'cancelled'
  | 'refunded'
  | 'on_hold';

export type PaymentStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type FulfillmentStatus =
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'returned'
  | 'cancelled';

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  sku?: string;
  quantity: number;
  price: Money;
  total: Money;
  image?: string;
}

// ============================================
// CLIENTS
// ============================================

export interface Customer {
  id: string;
  externalId?: string;

  // Infos personnelles
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;

  // Adresses
  defaultAddress?: Address;
  addresses?: Address[];

  // Préférences
  preferredChannel?: 'email' | 'sms' | 'whatsapp' | 'phone';
  language?: string;

  // Statistiques
  totalOrders?: number;
  totalSpent?: Money;
  averageOrderValue?: Money;

  // Segmentation
  tags?: string[];
  segment?: string;

  // Dates
  createdAt?: Date;
  lastOrderAt?: Date;

  // Métadonnées
  notes?: string;
  metadata?: Record<string, any>;
}

// ============================================
// ÉCHANGES & RETOURS
// ============================================

export interface Exchange {
  id: string;
  orderId: string;
  customerId: string;

  // Articles
  returnItems: ExchangeItem[];
  exchangeItems: ExchangeItem[];

  // Statut
  status: ExchangeStatus;
  reason: string;

  // Logistique
  returnLabel?: {
    url: string;
    trackingNumber: string;
    carrier: string;
    cost: Money;
  };

  // Dates
  createdAt: Date;
  receivedAt?: Date;
  completedAt?: Date;

  // Métadonnées
  notes?: string;
  metadata?: Record<string, any>;
}

export type ExchangeStatus =
  | 'requested'
  | 'approved'
  | 'label_generated'
  | 'in_transit'
  | 'received'
  | 'completed'
  | 'cancelled';

export interface ExchangeItem {
  productId: string;
  variantId?: string;
  name: string;
  quantity: number;
  reason?: string;
}

// ============================================
// TRACKING & LIVRAISON
// ============================================

export interface ShipmentStatus {
  trackingNumber: string;
  carrier: string;
  status: ShipmentTrackingStatus;

  // Détails
  currentLocation?: string;
  estimatedDelivery?: Date;

  // Historique
  events: ShipmentEvent[];

  // Métadonnées
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

export type ShipmentTrackingStatus =
  | 'pending'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed'
  | 'returned'
  | 'exception';

export interface ShipmentEvent {
  date: Date;
  status: ShipmentTrackingStatus;
  location?: string;
  description: string;
}

// ============================================
// WEBHOOKS
// ============================================

export interface WebhookEvent {
  id: string;
  type: WebhookEventType;
  source: string; // shopify, woocommerce, etc.
  data: any;
  receivedAt: Date;
}

export type WebhookEventType =
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  | 'product.stock_changed'
  | 'order.created'
  | 'order.updated'
  | 'order.cancelled'
  | 'order.fulfilled'
  | 'customer.created'
  | 'customer.updated'
  | 'shipment.updated';
