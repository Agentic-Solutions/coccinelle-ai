/**
 * Mock Tracking System - Pour Tests & Développement
 * Coccinelle.AI - Mock Tracking Implementation
 */

import { TrackingSystem, ReturnLabel, ShippingLabel, RateRequest, ShippingRate } from '../interface';
import { ShipmentStatus, ShipmentEvent, IntegrationHealth } from '../../types';

export class MockTracking implements TrackingSystem {
  readonly systemName = 'mock';
  readonly apiVersion = '1.0.0';

  private shipments: Map<string, ShipmentStatus> = new Map();

  constructor(
    private credentials: Record<string, any>,
    private settings?: Record<string, any>
  ) {
    this.initializeMockData();
  }

  async checkHealth(): Promise<IntegrationHealth> {
    return {
      status: 'connected',
      lastChecked: new Date(),
      message: 'Mock tracking system is always healthy',
      details: {
        shipmentsCount: this.shipments.size,
      },
    };
  }

  async testConnection(): Promise<boolean> {
    return true;
  }

  async getShipmentStatus(trackingNumber: string): Promise<ShipmentStatus> {
    const shipment = this.shipments.get(trackingNumber);
    if (!shipment) {
      throw new Error(`Shipment not found: ${trackingNumber}`);
    }
    return shipment;
  }

  async getBulkShipmentStatus(trackingNumbers: string[]): Promise<ShipmentStatus[]> {
    return Promise.all(trackingNumbers.map((tn) => this.getShipmentStatus(tn)));
  }

  async getShipmentHistory(trackingNumber: string): Promise<ShipmentEvent[]> {
    const shipment = await this.getShipmentStatus(trackingNumber);
    return shipment.events;
  }

  async isDelivered(trackingNumber: string): Promise<boolean> {
    const shipment = await this.getShipmentStatus(trackingNumber);
    return shipment.status === 'delivered';
  }

  async getEstimatedDelivery(trackingNumber: string): Promise<Date | null> {
    const shipment = await this.getShipmentStatus(trackingNumber);
    return shipment.estimatedDelivery || null;
  }

  private initializeMockData() {
    // Colis de Léa (en transit, livraison demain)
    const shipment1: ShipmentStatus = {
      trackingNumber: 'FR987654321',
      carrier: 'Colissimo',
      status: 'in_transit',
      currentLocation: 'Centre de tri Paris',
      estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000), // Demain
      events: [
        {
          date: new Date('2025-01-14T10:00:00'),
          status: 'pending',
          location: 'Paris',
          description: 'Colis pris en charge',
        },
        {
          date: new Date('2025-01-14T15:30:00'),
          status: 'in_transit',
          location: 'Centre de tri Paris',
          description: 'En cours de traitement',
        },
        {
          date: new Date('2025-01-15T08:00:00'),
          status: 'in_transit',
          location: 'Centre de tri Paris',
          description: 'En cours d\'acheminement',
        },
      ],
      lastUpdated: new Date('2025-01-15T08:00:00'),
    };

    this.shipments.set('FR987654321', shipment1);

    // Colis d'Emma (livré)
    const shipment2: ShipmentStatus = {
      trackingNumber: 'FR123456789',
      carrier: 'Colissimo',
      status: 'delivered',
      currentLocation: 'Livré',
      estimatedDelivery: new Date('2025-01-15T14:30:00'),
      events: [
        {
          date: new Date('2025-01-14T09:00:00'),
          status: 'pending',
          location: 'Paris',
          description: 'Colis pris en charge',
        },
        {
          date: new Date('2025-01-14T16:00:00'),
          status: 'in_transit',
          location: 'Centre de tri Lyon',
          description: 'En cours de traitement',
        },
        {
          date: new Date('2025-01-15T09:00:00'),
          status: 'out_for_delivery',
          location: 'Agence Lyon 3ème',
          description: 'En cours de livraison',
        },
        {
          date: new Date('2025-01-15T14:30:00'),
          status: 'delivered',
          location: 'Lyon',
          description: 'Colis livré - Signé par destinataire',
        },
      ],
      lastUpdated: new Date('2025-01-15T14:30:00'),
    };

    this.shipments.set('FR123456789', shipment2);
  }
}
