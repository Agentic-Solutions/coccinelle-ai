/**
 * Service d'auto-création de profils clients
 * Coccinelle.AI - Customer Auto-Creation Service
 *
 * Gère la création automatique de profils clients lors du premier contact
 */

import { getTenantSystems } from '../../modules/integrations/factory';
import { Customer } from '../../modules/integrations/customers/interface';

// ============================================
// TYPES
// ============================================

export interface IncomingMessage {
  /**
   * Numéro de téléphone ou identifiant du contact
   */
  from: string;

  /**
   * Contenu du message
   */
  content: string;

  /**
   * Canal de communication
   */
  channel: 'sms' | 'whatsapp' | 'email' | 'phone';

  /**
   * Timestamp du message
   */
  timestamp?: Date;

  /**
   * Métadonnées additionnelles
   */
  metadata?: Record<string, any>;
}

export interface AutoCreateResult {
  /**
   * Le client (existant ou nouvellement créé)
   */
  customer: Customer;

  /**
   * Indique si le client a été créé
   */
  wasCreated: boolean;

  /**
   * Indique si c'était le premier contact
   */
  isFirstContact: boolean;
}

// ============================================
// SERVICE
// ============================================

export class CustomerAutoCreateService {
  /**
   * Gérer un message entrant et auto-créer le profil si nécessaire
   */
  static async handleIncomingMessage(
    tenantId: string,
    message: IncomingMessage
  ): Promise<AutoCreateResult> {
    // 1. Récupérer le CRM du tenant
    const systems = await getTenantSystems(tenantId);
    const crm = systems.customers;

    if (!crm) {
      throw new Error(`No CRM configured for tenant: ${tenantId}`);
    }

    // 2. Chercher le client
    let customer: Customer | null = null;
    let wasCreated = false;
    let isFirstContact = false;

    // Chercher par téléphone ou email selon le canal
    if (message.channel === 'email' && message.from.includes('@')) {
      customer = await crm.getCustomerByEmail(message.from);
    } else {
      customer = await crm.getCustomerByPhone(message.from);
    }

    // 3. Si client inconnu → auto-créer
    if (!customer) {
      console.log(`📝 [AutoCreate] Nouveau client détecté: ${message.from} via ${message.channel}`);

      const firstName = this.extractFirstName(message);
      const lastName = this.extractLastName(message);

      customer = await crm.createCustomer({
        firstName: firstName || 'Client',
        lastName: lastName || 'Inconnu',
        email: message.channel === 'email' ? message.from : undefined,
        phone: message.channel !== 'email' ? message.from : undefined,
        preferredChannel: message.channel,
        tags: ['auto-created', 'premier-contact', message.channel],
        segment: 'prospect',
        metadata: {
          source: 'auto-creation',
          firstMessage: message.content,
          firstMessageDate: message.timestamp || new Date(),
          firstChannel: message.channel,
          autoCreated: true,
          ...message.metadata,
        },
      });

      wasCreated = true;
      isFirstContact = true;

      console.log(`✅ [AutoCreate] Profil créé: ${customer.id} - ${customer.firstName} ${customer.lastName}`);
    } else {
      // Client existant - vérifier si c'est son premier message
      const activities = await crm.getCustomerActivity(customer.id, 1);
      isFirstContact = activities.length === 0;
    }

    // 4. Logger l'interaction
    await crm.logInteraction(
      customer.id,
      'message_received',
      message.channel,
      {
        message: message.content,
        timestamp: (message.timestamp || new Date()).toISOString(),
        from: message.from,
        isFirstContact,
        ...message.metadata,
      }
    );

    console.log(
      `📨 [AutoCreate] Interaction loggée: ${customer.id} - ${message.channel} - ${isFirstContact ? 'Premier contact' : 'Client existant'}`
    );

    return {
      customer,
      wasCreated,
      isFirstContact,
    };
  }

  /**
   * Tenter d'extraire le prénom du message
   * Exemples : "Bonjour, je m'appelle Marie", "C'est Sophie"
   */
  private static extractFirstName(message: IncomingMessage): string | null {
    const patterns = [
      /je\s+m[''']appelle\s+(\w+)/i,
      /c[''']est\s+(\w+)/i,
      /je\s+suis\s+(\w+)/i,
      /mon\s+nom\s+est\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.content.match(pattern);
      if (match && match[1]) {
        return this.capitalize(match[1]);
      }
    }

    return null;
  }

  /**
   * Tenter d'extraire le nom de famille du message
   */
  private static extractLastName(message: IncomingMessage): string | null {
    // Patterns pour nom complet
    const patterns = [
      /je\s+m[''']appelle\s+\w+\s+(\w+)/i,
      /je\s+suis\s+\w+\s+(\w+)/i,
      /mon\s+nom\s+est\s+\w+\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.content.match(pattern);
      if (match && match[1]) {
        return this.capitalize(match[1]);
      }
    }

    return null;
  }

  /**
   * Mettre en majuscule la première lettre
   */
  private static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Enrichir un profil client avec plus d'informations
   * (peut être appelé plus tard quand on a plus d'infos)
   */
  static async enrichCustomerProfile(
    tenantId: string,
    customerId: string,
    updates: {
      firstName?: string;
      lastName?: string;
      email?: string;
      additionalTags?: string[];
      segment?: string;
    }
  ): Promise<Customer> {
    const systems = await getTenantSystems(tenantId);
    const crm = systems.customers;

    if (!crm) {
      throw new Error(`No CRM configured for tenant: ${tenantId}`);
    }

    // Mettre à jour le client
    const customer = await crm.updateCustomer(customerId, {
      firstName: updates.firstName,
      lastName: updates.lastName,
      email: updates.email,
    });

    // Ajouter des tags si fournis
    if (updates.additionalTags && updates.additionalTags.length > 0) {
      await crm.addTags(customerId, updates.additionalTags);
    }

    // Changer de segment si fourni
    if (updates.segment) {
      await crm.addToSegment(customerId, updates.segment);
    }

    // Logger l'enrichissement
    await crm.addCustomerNote(
      customerId,
      `Profil enrichi avec: ${Object.keys(updates).join(', ')}`,
      {
        enrichmentDate: new Date(),
        updates,
      }
    );

    console.log(`📝 [AutoCreate] Profil enrichi: ${customerId}`);

    return customer;
  }

  /**
   * Détecter et fusionner les doublons
   */
  static async detectAndMergeDuplicates(
    tenantId: string,
    customerId: string
  ): Promise<Customer | null> {
    const systems = await getTenantSystems(tenantId);
    const crm = systems.customers;

    if (!crm) {
      throw new Error(`No CRM configured for tenant: ${tenantId}`);
    }

    const customer = await crm.getCustomer(customerId);

    // Chercher des doublons par email
    let duplicates: Customer[] = [];
    if (customer.email) {
      const byEmail = await crm.searchCustomers(customer.email, { limit: 10 });
      duplicates = byEmail.filter((c) => c.id !== customerId);
    }

    // Chercher des doublons par téléphone
    if (customer.phone && duplicates.length === 0) {
      const byPhone = await crm.searchCustomers(customer.phone, { limit: 10 });
      duplicates = byPhone.filter((c) => c.id !== customerId);
    }

    // S'il y a des doublons, fusionner
    if (duplicates.length > 0) {
      console.log(
        `🔍 [AutoCreate] ${duplicates.length} doublon(s) détecté(s) pour ${customerId}`
      );

      // Fusionner avec le premier doublon trouvé
      const primaryId = duplicates[0].id;
      const merged = await crm.mergeCustomers(primaryId, [customerId]);

      console.log(`🔀 [AutoCreate] Fusion effectuée: ${customerId} → ${primaryId}`);

      return merged;
    }

    return null;
  }
}

// ============================================
// HELPER FUNCTIONS (pour utilisation rapide)
// ============================================

/**
 * Helper rapide pour gérer un message entrant
 */
export async function handleIncomingMessage(
  tenantId: string,
  from: string,
  content: string,
  channel: 'sms' | 'whatsapp' | 'email' | 'phone',
  metadata?: Record<string, any>
): Promise<AutoCreateResult> {
  return CustomerAutoCreateService.handleIncomingMessage(tenantId, {
    from,
    content,
    channel,
    timestamp: new Date(),
    metadata,
  });
}

/**
 * Helper pour enrichir un profil
 */
export async function enrichCustomer(
  tenantId: string,
  customerId: string,
  firstName?: string,
  lastName?: string,
  email?: string
): Promise<Customer> {
  return CustomerAutoCreateService.enrichCustomerProfile(tenantId, customerId, {
    firstName,
    lastName,
    email,
  });
}
