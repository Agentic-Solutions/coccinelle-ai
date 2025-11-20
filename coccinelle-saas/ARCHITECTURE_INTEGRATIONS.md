# 🔌 Architecture des Intégrations - Coccinelle.AI

> Système modulaire et extensible pour connecter n'importe quel système externe (e-commerce, CRM, tracking, etc.)

**Date de création :** 16 janvier 2025
**Statut :** Architecture complète - Prête pour implémentation

---

## 📋 Table des Matières

1. [Vue d'Ensemble](#-vue-densemble)
2. [Architecture](#-architecture)
3. [Systèmes Supportés](#-systèmes-supportés)
4. [Utilisation](#-utilisation)
5. [Ajouter un Nouveau Connecteur](#-ajouter-un-nouveau-connecteur)
6. [Exemples Concrets](#-exemples-concrets)
7. [Tests](#-tests)

---

## 🎯 Vue d'Ensemble

### **Problème Résolu**

Coccinelle.AI doit pouvoir se connecter à **n'importe quel système** utilisé par les clients :
- E-commerce (Shopify, WooCommerce, PrestaShop, Magento, etc.)
- CRM (HubSpot, Salesforce, etc.)
- Tracking (Colissimo, Chronopost, UPS, FedEx, etc.)
- Systèmes custom développés sur mesure

### **Solution : Architecture Abstraite**

Au lieu de coder en dur chaque système, nous avons créé :
1. **Interfaces abstraites** - Contrat que tous les connecteurs doivent respecter
2. **Factory Pattern** - Créer automatiquement le bon connecteur selon la config
3. **Types unifiés** - Même structure de données pour tous les systèmes
4. **Implémentations Mock** - Pour développement et tests sans vraies APIs

### **Avantages**

✅ **Extensible** - Ajouter un nouveau système = implémenter une interface
✅ **Maintenable** - Code découplé, chaque connecteur isolé
✅ **Testable** - Mocks inclus pour tests sans APIs externes
✅ **Type-safe** - TypeScript garantit le respect des contrats
✅ **Agnostique** - L'IA ne sait même pas quel système est derrière !

---

## 🏗️ Architecture

### **Structure des Fichiers**

```
src/modules/integrations/
├── types.ts                      # Types communs à tous les systèmes
├── factory.ts                    # Factory pour créer les instances
│
├── inventory/                    # Systèmes de stock/inventaire
│   ├── interface.ts              # Interface InventorySystem
│   ├── shopify/
│   │   └── inventory.ts          # ShopifyInventory (à implémenter)
│   ├── woocommerce/
│   │   └── inventory.ts          # WooCommerceInventory (à implémenter)
│   ├── prestashop/
│   │   └── inventory.ts          # PrestaShopInventory (à implémenter)
│   ├── custom/
│   │   └── inventory.ts          # CustomInventory pour APIs custom
│   └── mock/
│       └── inventory.ts          # MockInventory pour tests ✅
│
├── orders/                       # Systèmes de commandes
│   ├── interface.ts              # Interface OrderSystem
│   ├── shopify/
│   │   └── orders.ts             # ShopifyOrders (à implémenter)
│   ├── woocommerce/
│   │   └── orders.ts             # WooCommerceOrders (à implémenter)
│   └── mock/
│       └── orders.ts             # MockOrders pour tests ✅
│
├── tracking/                     # Systèmes de tracking
│   ├── interface.ts              # Interface TrackingSystem
│   ├── colissimo/
│   │   └── tracking.ts           # ColissimoTracking (à implémenter)
│   ├── chronopost/
│   │   └── tracking.ts           # ChronopostTracking (à implémenter)
│   ├── ups/
│   │   └── tracking.ts           # UPSTracking (à implémenter)
│   └── mock/
│       └── tracking.ts           # MockTracking pour tests ✅
│
└── customers/                    # Systèmes CRM/Clients
    ├── interface.ts              # Interface CustomerSystem
    ├── hubspot/
    │   └── customers.ts          # HubSpotCustomers (à implémenter)
    ├── salesforce/
    │   └── customers.ts          # SalesforceCustomers (à implémenter)
    └── mock/
        └── customers.ts          # MockCustomers pour tests ✅
```

### **Flux de Fonctionnement**

```
┌─────────────────────────────────────────────────────────┐
│  IA Coccinelle reçoit un message client                │
│  "Vous avez la robe fleurie en 38 ?"                   │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  IA analyse l'intention                                 │
│  → Question disponibilité produit                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Factory récupère les systèmes du tenant                │
│  const systems = await getTenantSystems(tenantId)       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  IA appelle l'interface abstraite                       │
│  const stock = await systems.inventory                  │
│                 .checkAvailability("RF-2847", "T38")    │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Factory route vers le bon connecteur                   │
│  ├─ Shopify ? → ShopifyInventory.checkAvailability()   │
│  ├─ WooCommerce ? → WooCommerceInventory.check...()    │
│  └─ Custom ? → CustomInventory.checkAvailability()     │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Le connecteur appelle l'API externe                    │
│  GET https://shop.myshopify.com/api/products/...       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  Réponse unifiée (StockInfo)                            │
│  {                                                       │
│    available: true,                                     │
│    quantity: 2,                                         │
│    status: "in_stock"                                   │
│  }                                                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────────────────┐
│  IA génère et envoie la réponse                         │
│  "Oui, on l'a en 38 ! Il nous en reste 2 😊"           │
└─────────────────────────────────────────────────────────┘
```

**L'IA ne sait même pas quel système est utilisé ! Elle appelle juste l'interface.**

---

## 🔧 Systèmes Supportés

### **1. Inventory System (Gestion de Stock)**

**Interface :** `InventorySystem`

**Fonctionnalités :**
- ✅ Vérifier disponibilité produit
- ✅ Chercher produits
- ✅ Mettre à jour le stock
- ✅ Créer réservations (mise de côté)
- ✅ Gérer variantes (tailles, couleurs, etc.)

**Connecteurs prévus :**
- [ ] Shopify
- [ ] WooCommerce
- [ ] PrestaShop
- [ ] Magento
- [ ] Custom API
- [x] Mock (pour tests)

---

### **2. Order System (Gestion des Commandes)**

**Interface :** `OrderSystem`

**Fonctionnalités :**
- ✅ Récupérer commandes (par ID, email, client)
- ✅ Créer / modifier commandes
- ✅ Gérer les statuts (paiement, livraison)
- ✅ Créer échanges/retours
- ✅ Générer étiquettes retour
- ✅ Gérer les remboursements

**Connecteurs prévus :**
- [ ] Shopify
- [ ] WooCommerce
- [ ] PrestaShop
- [ ] Magento
- [ ] Custom API
- [x] Mock (pour tests)

---

### **3. Tracking System (Suivi Colis)**

**Interface :** `TrackingSystem`

**Fonctionnalités :**
- ✅ Obtenir statut colis
- ✅ Historique complet
- ✅ Suivi intensif (pour urgences)
- ✅ Notifications mises à jour
- ✅ Créer étiquettes (retour, expédition)
- ✅ Calculer tarifs

**Connecteurs prévus :**
- [ ] Colissimo
- [ ] Chronopost
- [ ] UPS
- [ ] FedEx
- [ ] DHL
- [ ] Custom API
- [x] Mock (pour tests)

---

### **4. Customer System (CRM / Clients)**

**Interface :** `CustomerSystem`

**Fonctionnalités :**
- ✅ Récupérer clients (par ID, email, téléphone)
- ✅ Créer / modifier clients
- ✅ Gérer préférences communication
- ✅ Ajouter notes / tags
- ✅ Segmentation clients
- ✅ Historique d'activité
- ✅ Statistiques (LTV, panier moyen, etc.)

**Connecteurs prévus :**
- [ ] HubSpot
- [ ] Salesforce
- [ ] Shopify Customers
- [ ] WooCommerce Customers
- [ ] Custom API
- [x] Mock (pour tests)

---

## 💻 Utilisation

### **1. Configuration d'un Tenant**

```typescript
import { IntegrationFactory, TenantIntegrationConfig } from '@/modules/integrations/factory';

const config: TenantIntegrationConfig = {
  tenantId: 'elegance-paris',

  // Système d'inventaire
  inventory: {
    type: 'shopify',
    enabled: true,
    credentials: {
      shopDomain: 'elegance-paris.myshopify.com',
      apiKey: 'xxx',
      apiPassword: 'xxx',
    },
    settings: {
      defaultLocation: 'Paris Store',
    },
  },

  // Système de commandes
  orders: {
    type: 'shopify',
    enabled: true,
    credentials: {
      shopDomain: 'elegance-paris.myshopify.com',
      apiKey: 'xxx',
      apiPassword: 'xxx',
    },
  },

  // Système de tracking
  tracking: {
    type: 'colissimo',
    enabled: true,
    credentials: {
      contractNumber: 'xxx',
      password: 'xxx',
    },
  },

  // CRM
  customers: {
    type: 'hubspot',
    enabled: true,
    credentials: {
      apiKey: 'xxx',
    },
  },
};

// Créer toutes les instances
const systems = await IntegrationFactory.createAllSystems(config);
```

### **2. Utilisation dans l'IA**

```typescript
// Dans le service IA qui traite les messages clients
async function handleCustomerMessage(tenantId: string, message: string, from: string) {
  // Récupérer les systèmes du tenant
  const systems = await getTenantSystems(tenantId);

  // Analyser l'intention
  const intent = await analyzeIntent(message);

  if (intent.type === 'product_availability') {
    // Chercher le produit
    const products = await systems.inventory!.searchProducts(intent.productQuery);
    const product = products[0];

    // Vérifier la disponibilité
    const stock = await systems.inventory!.checkAvailability(
      product.id,
      intent.variantId
    );

    if (stock.available) {
      // Créer une réservation automatique
      const reservation = await systems.inventory!.reserveProduct({
        productId: product.id,
        variantId: intent.variantId,
        customerId: from,
        quantity: 1,
        duration: 24 * 60, // 24h
      });

      // Envoyer la réponse
      await sendSMS(from, `Oui, on l'a ! Il nous en reste ${stock.quantity}. Je l'ai mis de côté pour vous jusqu'à demain 18h 😊`);
    } else {
      await sendSMS(from, `Désolé, il est en rupture de stock. Souhaitez-vous que je vous prévienne quand il sera de retour ?`);
    }
  }

  else if (intent.type === 'order_tracking') {
    // Récupérer la commande
    const order = await systems.orders!.getOrderByNumber(intent.orderNumber);

    // Vérifier le tracking
    if (order.trackingNumber) {
      const shipment = await systems.tracking!.getShipmentStatus(order.trackingNumber);

      if (shipment.status === 'delivered') {
        await sendSMS(from, `Votre colis a été livré le ${formatDate(shipment.estimatedDelivery!)} 📦✅`);
      } else if (shipment.status === 'in_transit') {
        await sendSMS(from, `Votre colis est en cours d'acheminement. Livraison prévue ${formatDate(shipment.estimatedDelivery!)} 🚚`);
      }
    }
  }
}
```

### **3. Utilisation dans une Route API**

```typescript
// app/api/products/check-stock/route.ts
import { getTenantSystems } from '@/modules/integrations/factory';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { tenantId, productId, variantId } = await request.json();

  try {
    // Récupérer les systèmes du tenant
    const systems = await getTenantSystems(tenantId);

    if (!systems.inventory) {
      return NextResponse.json(
        { error: 'Inventory system not configured' },
        { status: 400 }
      );
    }

    // Vérifier la disponibilité
    const stock = await systems.inventory.checkAvailability(productId, variantId);

    return NextResponse.json({
      success: true,
      stock: {
        available: stock.available,
        quantity: stock.quantity,
        status: stock.status,
        location: stock.location,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 🔨 Ajouter un Nouveau Connecteur

### **Exemple : Implémenter Shopify**

#### **Étape 1 : Créer le fichier**

`src/modules/integrations/inventory/shopify/inventory.ts`

#### **Étape 2 : Implémenter l'interface**

```typescript
import { InventorySystem } from '../interface';
import { Product, StockInfo, Reservation } from '../../types';

export class ShopifyInventory implements InventorySystem {
  readonly systemName = 'shopify';
  readonly apiVersion = '2024-01';

  private shopDomain: string;
  private apiKey: string;
  private apiPassword: string;
  private baseUrl: string;

  constructor(
    credentials: {
      shopDomain: string;
      apiKey: string;
      apiPassword: string;
    },
    settings?: Record<string, any>
  ) {
    this.shopDomain = credentials.shopDomain;
    this.apiKey = credentials.apiKey;
    this.apiPassword = credentials.apiPassword;
    this.baseUrl = `https://${this.shopDomain}/admin/api/${this.apiVersion}`;
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/shop.json`, {
        headers: this.getHeaders(),
      });

      return {
        status: response.ok ? 'connected' : 'error',
        lastChecked: new Date(),
        message: response.ok ? 'Connected to Shopify' : 'Failed to connect',
      };
    } catch (error) {
      return {
        status: 'error',
        lastChecked: new Date(),
        message: error.message,
      };
    }
  }

  async testConnection() {
    const health = await this.checkHealth();
    return health.status === 'connected';
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await fetch(`${this.baseUrl}/products/${productId}.json`, {
      headers: this.getHeaders(),
    });

    const data = await response.json();
    return this.mapShopifyProduct(data.product);
  }

  async checkAvailability(productId: string, variantId?: string): Promise<StockInfo> {
    const response = await fetch(
      `${this.baseUrl}/variants/${variantId || productId}.json`,
      { headers: this.getHeaders() }
    );

    const data = await response.json();
    const variant = data.variant;

    return {
      available: variant.inventory_quantity > 0,
      quantity: variant.inventory_quantity,
      status: variant.inventory_quantity > 0 ? 'in_stock' : 'out_of_stock',
    };
  }

  // ... implémenter toutes les autres méthodes de l'interface

  private getHeaders() {
    const auth = Buffer.from(`${this.apiKey}:${this.apiPassword}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };
  }

  private mapShopifyProduct(shopifyProduct: any): Product {
    return {
      id: shopifyProduct.id.toString(),
      externalId: shopifyProduct.id.toString(),
      name: shopifyProduct.title,
      description: shopifyProduct.body_html,
      sku: shopifyProduct.variants[0]?.sku,
      price: {
        amount: parseFloat(shopifyProduct.variants[0]?.price || '0'),
        currency: 'EUR',
      },
      stockQuantity: shopifyProduct.variants[0]?.inventory_quantity || 0,
      stockStatus: shopifyProduct.variants[0]?.inventory_quantity > 0 ? 'in_stock' : 'out_of_stock',
      hasVariants: shopifyProduct.variants.length > 1,
      variants: shopifyProduct.variants.map((v: any) => ({
        id: v.id.toString(),
        name: v.title,
        sku: v.sku,
        stockQuantity: v.inventory_quantity,
        stockStatus: v.inventory_quantity > 0 ? 'in_stock' : 'out_of_stock',
        attributes: {}, // Parse options
        price: { amount: parseFloat(v.price), currency: 'EUR' },
      })),
      // ... mapper les autres champs
    };
  }
}
```

#### **Étape 3 : Le factory le détectera automatiquement !**

Grâce au dynamic import dans `factory.ts`, dès que le fichier existe, il sera utilisé automatiquement quand `type: 'shopify'` est configuré.

---

## 📝 Exemples Concrets

Voir le fichier `EXEMPLES_USAGE_CLIENT.md` pour des scénarios complets d'utilisation avec le prêt-à-porter.

---

## ✅ Tests

### **Utiliser les Mocks**

```typescript
import { IntegrationFactory } from '@/modules/integrations/factory';

// Configuration avec Mock
const config = {
  tenantId: 'test',
  inventory: {
    type: 'mock',
    enabled: true,
    credentials: {},
  },
};

const systems = await IntegrationFactory.createAllSystems(config);

// Utiliser comme un vrai système !
const stock = await systems.inventory.checkAvailability('prod_001', 'var_001_38');
console.log(stock); // { available: true, quantity: 2, status: 'in_stock' }
```

### **Données Mock Disponibles**

Les implémentations Mock contiennent déjà des données de test cohérentes :
- **Produits :** Robe fleurie bleue, Blazer beige, Pantalon noir (avec variantes de tailles)
- **Commandes :** Commande #2847 (Emma), Commande #2901 (Léa)
- **Clients :** Julie, Emma, Léa (avec historiques)
- **Colis :** 2 colis en différents statuts (en transit, livré)

---

## 🚀 Prochaines Étapes

### **Phase 1 : Implémentations Prioritaires**
1. ✅ Architecture abstraite (FAIT)
2. ✅ Implémentations Mock (FAIT)
3. ⏳ Shopify Inventory
4. ⏳ Shopify Orders
5. ⏳ WooCommerce Inventory
6. ⏳ WooCommerce Orders

### **Phase 2 : Tracking & CRM**
7. ⏳ Colissimo Tracking
8. ⏳ Chronopost Tracking
9. ⏳ HubSpot CRM
10. ⏳ Salesforce CRM

### **Phase 3 : Connecteur Générique**
11. ⏳ Custom Inventory (webhook configurable)
12. ⏳ Custom Orders
13. ⏳ Custom Tracking

---

## 📞 Support

Pour toute question sur l'architecture des intégrations, consulter :
- Ce document
- Les interfaces dans `/src/modules/integrations/*/interface.ts`
- Les implémentations Mock dans `/src/modules/integrations/*/mock/*.ts`

---

**Créé le :** 16 janvier 2025
**Dernière mise à jour :** 16 janvier 2025
**Auteur :** Claude Code pour Coccinelle.AI
