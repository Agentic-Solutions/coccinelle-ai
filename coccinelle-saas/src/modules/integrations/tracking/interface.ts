/**
 * Interface Abstraite pour les Systèmes de Tracking
 * Coccinelle.AI - Tracking System Interface
 *
 * Tous les connecteurs (Colissimo, Chronopost, UPS, etc.) doivent implémenter cette interface
 */

import { ShipmentStatus, ShipmentEvent, IntegrationHealth } from '../types';

export interface TrackingSystem {
  /**
   * Nom du système (ex: "colissimo", "chronopost", "ups", "fedex")
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
  // TRACKING
  // ============================================

  /**
   * Obtenir le statut d'un colis
   */
  getShipmentStatus(trackingNumber: string): Promise<ShipmentStatus>;

  /**
   * Obtenir le statut de plusieurs colis
   */
  getBulkShipmentStatus(trackingNumbers: string[]): Promise<ShipmentStatus[]>;

  /**
   * Obtenir l'historique complet d'un colis
   */
  getShipmentHistory(trackingNumber: string): Promise<ShipmentEvent[]>;

  /**
   * Vérifier si un colis est livré
   */
  isDelivered(trackingNumber: string): Promise<boolean>;

  /**
   * Obtenir la date de livraison estimée
   */
  getEstimatedDelivery(trackingNumber: string): Promise<Date | null>;

  // ============================================
  // SUIVI INTENSIF (pour les cas urgents)
  // ============================================

  /**
   * Activer le suivi intensif (vérifications fréquentes)
   * Utile pour les commandes urgentes
   */
  enableIntensiveTracking?(params: {
    trackingNumber: string;
    checkInterval?: number; // en minutes
    until?: Date;
    onUpdate?: (status: ShipmentStatus) => void;
  }): Promise<void>;

  /**
   * Désactiver le suivi intensif
   */
  disableIntensiveTracking?(trackingNumber: string): Promise<void>;

  // ============================================
  // NOTIFICATIONS
  // ============================================

  /**
   * S'abonner aux mises à jour d'un colis
   */
  subscribeToUpdates?(params: {
    trackingNumber: string;
    callback: (status: ShipmentStatus) => void;
  }): Promise<void>;

  /**
   * Se désabonner des mises à jour
   */
  unsubscribeFromUpdates?(trackingNumber: string): Promise<void>;

  // ============================================
  // CRÉATION D'ÉTIQUETTES (si supporté)
  // ============================================

  /**
   * Créer une étiquette de retour
   */
  createReturnLabel?(params: CreateReturnLabelParams): Promise<ReturnLabel>;

  /**
   * Créer une étiquette d'expédition
   */
  createShippingLabel?(params: CreateShippingLabelParams): Promise<ShippingLabel>;

  /**
   * Annuler une étiquette
   */
  cancelLabel?(labelId: string): Promise<void>;

  // ============================================
  // TARIFICATION (si supporté)
  // ============================================

  /**
   * Obtenir les tarifs pour une expédition
   */
  getRates?(params: RateRequest): Promise<ShippingRate[]>;

  /**
   * Calculer le coût d'un retour
   */
  calculateReturnCost?(params: {
    fromPostalCode: string;
    toPostalCode: string;
    weight?: number;
    packageType?: string;
  }): Promise<{
    cost: number;
    currency: string;
  }>;
}

// ============================================
// TYPES SUPPLÉMENTAIRES
// ============================================

export interface CreateReturnLabelParams {
  /**
   * Adresse de retour (destination)
   */
  returnAddress: {
    name: string;
    company?: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };

  /**
   * Adresse d'expédition (origine - le client)
   */
  senderAddress: {
    name: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
    phone?: string;
    email?: string;
  };

  /**
   * Poids du colis (en kg)
   */
  weight?: number;

  /**
   * Type de colis
   */
  packageType?: 'envelope' | 'box' | 'tube' | 'custom';

  /**
   * Dimensions (en cm)
   */
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  /**
   * Référence de la commande
   */
  orderReference?: string;

  /**
   * Instructions spéciales
   */
  instructions?: string;
}

export interface CreateShippingLabelParams extends CreateReturnLabelParams {
  /**
   * Service de livraison souhaité
   */
  serviceType?: 'standard' | 'express' | 'overnight';

  /**
   * Assurance
   */
  insurance?: {
    amount: number;
    currency: string;
  };

  /**
   * Signature requise à la livraison
   */
  signatureRequired?: boolean;
}

export interface ReturnLabel {
  id: string;
  trackingNumber: string;
  carrier: string;
  labelUrl: string; // URL du PDF de l'étiquette
  cost: {
    amount: number;
    currency: string;
  };
  createdAt: Date;
  expiresAt?: Date;
}

export interface ShippingLabel extends ReturnLabel {
  serviceType: string;
  estimatedDelivery?: Date;
}

export interface RateRequest {
  /**
   * Adresse d'origine
   */
  from: {
    postalCode: string;
    country: string;
    city?: string;
  };

  /**
   * Adresse de destination
   */
  to: {
    postalCode: string;
    country: string;
    city?: string;
  };

  /**
   * Poids (en kg)
   */
  weight: number;

  /**
   * Dimensions (en cm)
   */
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };

  /**
   * Type de colis
   */
  packageType?: 'envelope' | 'box' | 'tube' | 'custom';
}

export interface ShippingRate {
  /**
   * Transporteur
   */
  carrier: string;

  /**
   * Type de service
   */
  serviceType: string;

  /**
   * Nom du service
   */
  serviceName: string;

  /**
   * Coût
   */
  cost: {
    amount: number;
    currency: string;
  };

  /**
   * Délai de livraison estimé (en jours)
   */
  estimatedDays?: number;

  /**
   * Date de livraison estimée
   */
  estimatedDelivery?: Date;

  /**
   * Suivi disponible
   */
  trackingAvailable: boolean;

  /**
   * Signature requise
   */
  signatureRequired?: boolean;
}

export interface TrackingAlert {
  trackingNumber: string;
  alertType: 'delay' | 'exception' | 'delivered' | 'failed';
  message: string;
  timestamp: Date;
  details?: any;
}
