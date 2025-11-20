/**
 * Interface Abstraite pour les Systèmes CRM / Clients
 * Coccinelle.AI - Customer System Interface
 *
 * Tous les connecteurs (HubSpot, Salesforce, etc.) doivent implémenter cette interface
 */

import { Customer, IntegrationHealth, Money } from '../types';

export interface CustomerSystem {
  /**
   * Nom du système (ex: "hubspot", "salesforce", "custom")
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
  // RÉCUPÉRATION CLIENTS
  // ============================================

  /**
   * Récupérer un client par ID
   */
  getCustomer(customerId: string): Promise<Customer>;

  /**
   * Récupérer un client par email
   */
  getCustomerByEmail(email: string): Promise<Customer | null>;

  /**
   * Récupérer un client par téléphone
   */
  getCustomerByPhone(phone: string): Promise<Customer | null>;

  /**
   * Lister tous les clients (avec pagination)
   */
  listCustomers(options?: CustomerListOptions): Promise<PaginatedCustomerResult>;

  /**
   * Chercher des clients
   */
  searchCustomers(query: string, options?: CustomerSearchOptions): Promise<Customer[]>;

  // ============================================
  // CRÉATION & MODIFICATION
  // ============================================

  /**
   * Créer un client
   */
  createCustomer(params: CreateCustomerParams): Promise<Customer>;

  /**
   * Mettre à jour un client
   */
  updateCustomer(customerId: string, updates: CustomerUpdateParams): Promise<Customer>;

  /**
   * Supprimer un client (soft delete généralement)
   */
  deleteCustomer?(customerId: string): Promise<void>;

  /**
   * Fusionner deux clients (dédupliquer)
   */
  mergeCustomers?(primaryId: string, secondaryId: string): Promise<Customer>;

  // ============================================
  // PROFIL & PRÉFÉRENCES
  // ============================================

  /**
   * Mettre à jour les préférences de communication
   */
  updateCommunicationPreferences(
    customerId: string,
    preferences: CommunicationPreferences
  ): Promise<Customer>;

  /**
   * Ajouter une note à un client
   */
  addCustomerNote(customerId: string, note: string): Promise<void>;

  /**
   * Récupérer les notes d'un client
   */
  getCustomerNotes?(customerId: string): Promise<CustomerNote[]>;

  /**
   * Ajouter des tags à un client
   */
  addTags(customerId: string, tags: string[]): Promise<Customer>;

  /**
   * Retirer des tags d'un client
   */
  removeTags(customerId: string, tags: string[]): Promise<Customer>;

  // ============================================
  // SEGMENTATION
  // ============================================

  /**
   * Ajouter un client à un segment
   */
  addToSegment?(customerId: string, segmentId: string): Promise<void>;

  /**
   * Retirer un client d'un segment
   */
  removeFromSegment?(customerId: string, segmentId: string): Promise<void>;

  /**
   * Récupérer les segments d'un client
   */
  getCustomerSegments?(customerId: string): Promise<CustomerSegment[]>;

  /**
   * Lister tous les segments disponibles
   */
  listSegments?(): Promise<CustomerSegment[]>;

  // ============================================
  // HISTORIQUE & ACTIVITÉ
  // ============================================

  /**
   * Récupérer l'historique d'activité d'un client
   */
  getCustomerActivity?(
    customerId: string,
    options?: ActivityOptions
  ): Promise<CustomerActivity[]>;

  /**
   * Enregistrer une interaction avec un client
   */
  logInteraction?(params: {
    customerId: string;
    type: 'call' | 'email' | 'sms' | 'whatsapp' | 'visit' | 'note';
    subject?: string;
    content?: string;
    metadata?: Record<string, any>;
  }): Promise<void>;

  /**
   * Récupérer les statistiques d'un client
   */
  getCustomerStats?(customerId: string): Promise<CustomerStats>;

  // ============================================
  // NOTIFICATIONS & WEBHOOKS
  // ============================================

  /**
   * S'abonner aux changements de clients
   */
  subscribeToCustomerChanges?(
    callback: (event: CustomerChangeEvent) => void
  ): Promise<void>;

  /**
   * Se désabonner des changements
   */
  unsubscribeFromCustomerChanges?(): Promise<void>;
}

// ============================================
// TYPES SUPPLÉMENTAIRES
// ============================================

export interface CustomerListOptions {
  /**
   * Numéro de page
   */
  page?: number;

  /**
   * Nombre d'éléments par page
   */
  perPage?: number;

  /**
   * Filtrer par segment
   */
  segment?: string;

  /**
   * Filtrer par tags
   */
  tags?: string[];

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
  sortBy?: 'name' | 'email' | 'created_at' | 'total_spent' | 'last_order';

  /**
   * Ordre de tri
   */
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerSearchOptions extends CustomerListOptions {
  /**
   * Chercher dans les noms
   */
  searchInName?: boolean;

  /**
   * Chercher dans les emails
   */
  searchInEmail?: boolean;

  /**
   * Chercher dans les téléphones
   */
  searchInPhone?: boolean;

  /**
   * Chercher dans les notes
   */
  searchInNotes?: boolean;
}

export interface CreateCustomerParams {
  /**
   * Prénom
   */
  firstName: string;

  /**
   * Nom
   */
  lastName: string;

  /**
   * Email
   */
  email?: string;

  /**
   * Téléphone
   */
  phone?: string;

  /**
   * Adresse par défaut
   */
  defaultAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  /**
   * Préférences de communication
   */
  communicationPreferences?: CommunicationPreferences;

  /**
   * Langue
   */
  language?: string;

  /**
   * Tags
   */
  tags?: string[];

  /**
   * Segment
   */
  segment?: string;

  /**
   * Notes
   */
  notes?: string;

  /**
   * Métadonnées
   */
  metadata?: Record<string, any>;
}

export interface CustomerUpdateParams {
  /**
   * Prénom
   */
  firstName?: string;

  /**
   * Nom
   */
  lastName?: string;

  /**
   * Email
   */
  email?: string;

  /**
   * Téléphone
   */
  phone?: string;

  /**
   * Adresse par défaut
   */
  defaultAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  /**
   * Préférences de communication
   */
  communicationPreferences?: CommunicationPreferences;

  /**
   * Langue
   */
  language?: string;

  /**
   * Tags (remplace tous les tags existants)
   */
  tags?: string[];

  /**
   * Segment
   */
  segment?: string;

  /**
   * Métadonnées
   */
  metadata?: Record<string, any>;
}

export interface CommunicationPreferences {
  /**
   * Canal préféré
   */
  preferredChannel?: 'email' | 'sms' | 'whatsapp' | 'phone';

  /**
   * Accepte les emails marketing
   */
  marketingEmails?: boolean;

  /**
   * Accepte les SMS marketing
   */
  marketingSms?: boolean;

  /**
   * Accepte les notifications WhatsApp
   */
  marketingWhatsapp?: boolean;

  /**
   * Accepte les appels marketing
   */
  marketingCalls?: boolean;

  /**
   * Fréquence de communication souhaitée
   */
  frequency?: 'daily' | 'weekly' | 'monthly' | 'never';

  /**
   * Heures préférées pour être contacté
   */
  preferredHours?: {
    start: string; // "09:00"
    end: string; // "18:00"
  };

  /**
   * Jours préférés (0 = dimanche, 6 = samedi)
   */
  preferredDays?: number[];

  /**
   * Fuseau horaire
   */
  timezone?: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  content: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description?: string;
  criteria?: Record<string, any>;
  customerCount?: number;
}

export interface CustomerActivity {
  id: string;
  customerId: string;
  type: 'order' | 'interaction' | 'note' | 'email' | 'sms' | 'call' | 'visit';
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ActivityOptions {
  /**
   * Type d'activité
   */
  type?: 'order' | 'interaction' | 'note' | 'email' | 'sms' | 'call' | 'visit';

  /**
   * Nombre maximum de résultats
   */
  limit?: number;

  /**
   * Date de début
   */
  startDate?: Date;

  /**
   * Date de fin
   */
  endDate?: Date;
}

export interface CustomerStats {
  /**
   * Nombre total de commandes
   */
  totalOrders: number;

  /**
   * Montant total dépensé
   */
  totalSpent: Money;

  /**
   * Panier moyen
   */
  averageOrderValue: Money;

  /**
   * Date de première commande
   */
  firstOrderDate?: Date;

  /**
   * Date de dernière commande
   */
  lastOrderDate?: Date;

  /**
   * Nombre de jours depuis la dernière commande
   */
  daysSinceLastOrder?: number;

  /**
   * Fréquence d'achat (jours entre les commandes)
   */
  purchaseFrequency?: number;

  /**
   * Taux de retour (%
   */
  returnRate?: number;

  /**
   * Lifetime Value estimée
   */
  estimatedLifetimeValue?: Money;

  /**
   * Score de fidélité (0-100)
   */
  loyaltyScore?: number;
}

export interface PaginatedCustomerResult {
  data: Customer[];
  pagination: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface CustomerChangeEvent {
  customerId: string;
  changeType: 'created' | 'updated' | 'deleted';
  previousData?: Partial<Customer>;
  newData?: Partial<Customer>;
  timestamp: Date;
}
