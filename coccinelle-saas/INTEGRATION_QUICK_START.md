# 🚀 Guide de Démarrage Rapide - Intégrations

> Comment utiliser le système d'intégrations de Coccinelle.AI en 5 minutes

---

## ✅ Ce qui a été créé

### **Architecture Complète**

```
✅ src/modules/integrations/
   ├── ✅ types.ts                         # Types communs (Product, Order, Customer, etc.)
   ├── ✅ factory.ts                       # Factory pour créer les instances
   │
   ├── ✅ inventory/                       # Gestion de stock
   │   ├── ✅ interface.ts                 # Interface InventorySystem
   │   └── ✅ mock/inventory.ts            # Implémentation Mock
   │
   ├── ✅ orders/                          # Gestion des commandes
   │   ├── ✅ interface.ts                 # Interface OrderSystem
   │   └── ✅ mock/orders.ts               # Implémentation Mock
   │
   ├── ✅ tracking/                        # Suivi de colis
   │   ├── ✅ interface.ts                 # Interface TrackingSystem
   │   └── ✅ mock/tracking.ts             # Implémentation Mock
   │
   └── ✅ customers/                       # CRM/Clients
       ├── ✅ interface.ts                 # Interface CustomerSystem
       └── ✅ mock/customers.ts            # Implémentation Mock
```

### **Documentation**

```
✅ ARCHITECTURE_INTEGRATIONS.md          # Documentation complète
✅ EXEMPLES_USAGE_CLIENT.md              # Exemples concrets (prêt-à-porter)
✅ INTEGRATION_QUICK_START.md            # Ce fichier
```

---

## 🎯 Test Rapide (2 minutes)

### **1. Tester avec les Mocks**

Créer un fichier de test : `test-integrations.ts`

```typescript
import { IntegrationFactory } from './src/modules/integrations/factory';

async function testIntegrations() {
  console.log('🧪 Test des intégrations Coccinelle.AI\n');

  // Configuration avec systèmes Mock
  const config = {
    tenantId: 'test-boutique',
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

  // Créer toutes les instances
  const systems = await IntegrationFactory.createAllSystems(config);

  // ============================================
  // TEST 1 : Vérifier stock d'une robe T38
  // ============================================
  console.log('📦 TEST 1 : Vérification stock Robe Fleurie T38');
  const stock = await systems.inventory!.checkAvailability('prod_001', 'var_001_38');
  console.log(`✅ Disponible: ${stock.available}`);
  console.log(`   Quantité: ${stock.quantity}`);
  console.log(`   Statut: ${stock.status}\n`);

  // ============================================
  // TEST 2 : Créer une réservation
  // ============================================
  console.log('🔒 TEST 2 : Création réservation pour Julie');
  const reservation = await systems.inventory!.reserveProduct({
    productId: 'prod_001',
    variantId: 'var_001_38',
    customerId: 'cust_julie',
    quantity: 1,
    duration: 24 * 60, // 24h
    notes: 'Réservée suite à demande SMS',
  });
  console.log(`✅ Réservation créée: ${reservation.id}`);
  console.log(`   Expire le: ${reservation.expiresAt.toLocaleString()}\n`);

  // ============================================
  // TEST 3 : Vérifier commande #2847
  // ============================================
  console.log('📋 TEST 3 : Récupération commande #2847');
  const order = await systems.orders!.getOrderByNumber('#2847');
  console.log(`✅ Commande trouvée`);
  console.log(`   Client: ${order.customer.firstName} ${order.customer.lastName}`);
  console.log(`   Total: ${order.total.amount}€`);
  console.log(`   Statut: ${order.status}\n`);

  // ============================================
  // TEST 4 : Tracking colis
  // ============================================
  console.log('🚚 TEST 4 : Suivi colis FR987654321');
  const shipment = await systems.tracking!.getShipmentStatus('FR987654321');
  console.log(`✅ Statut: ${shipment.status}`);
  console.log(`   Localisation: ${shipment.currentLocation}`);
  console.log(`   Livraison estimée: ${shipment.estimatedDelivery?.toLocaleString()}`);
  console.log(`   Événements: ${shipment.events.length}\n`);

  // ============================================
  // TEST 5 : Récupérer client par email
  // ============================================
  console.log('👤 TEST 5 : Recherche client par email');
  const customer = await systems.customers!.getCustomerByEmail('julie.mercier@gmail.com');
  if (customer) {
    console.log(`✅ Client trouvé: ${customer.firstName} ${customer.lastName}`);
    console.log(`   Total dépensé: ${customer.totalSpent?.amount}€`);
    console.log(`   Commandes: ${customer.totalOrders}`);
    console.log(`   Segment: ${customer.segment}\n`);
  }

  // ============================================
  // TEST 6 : Santé des systèmes
  // ============================================
  console.log('🏥 TEST 6 : Vérification santé des systèmes');
  const health = {
    inventory: await systems.inventory!.checkHealth(),
    orders: await systems.orders!.checkHealth(),
    tracking: await systems.tracking!.checkHealth(),
    customers: await systems.customers!.checkHealth(),
  };

  console.log(`✅ Inventory: ${health.inventory.status}`);
  console.log(`✅ Orders: ${health.orders.status}`);
  console.log(`✅ Tracking: ${health.tracking.status}`);
  console.log(`✅ Customers: ${health.customers.status}\n`);

  console.log('🎉 Tous les tests ont réussi !');
}

// Exécuter les tests
testIntegrations().catch(console.error);
```

### **2. Exécuter le test**

```bash
npx tsx test-integrations.ts
```

### **3. Résultat Attendu**

```
🧪 Test des intégrations Coccinelle.AI

📦 TEST 1 : Vérification stock Robe Fleurie T38
✅ Disponible: true
   Quantité: 2
   Statut: in_stock

🔒 TEST 2 : Création réservation pour Julie
✅ Réservation créée: res_1737032400000
   Expire le: 17/01/2025 18:47:12

📋 TEST 3 : Récupération commande #2847
✅ Commande trouvée
   Client: Emma Rousseau
   Total: 84.9€
   Statut: completed

🚚 TEST 4 : Suivi colis FR987654321
✅ Statut: in_transit
   Localisation: Centre de tri Paris
   Livraison estimée: 17/01/2025 12:00:00
   Événements: 3

👤 TEST 5 : Recherche client par email
✅ Client trouvé: Julie Mercier
   Total dépensé: 720€
   Commandes: 8
   Segment: high_value

🏥 TEST 6 : Vérification santé des systèmes
✅ Inventory: connected
✅ Orders: connected
✅ Tracking: connected
✅ Customers: connected

🎉 Tous les tests ont réussi !
```

---

## 🎯 Utilisation dans l'IA

### **Scénario : Client demande "Vous avez la robe bleue en 38 ?"**

```typescript
import { getTenantSystems } from '@/modules/integrations/factory';
import { sendSMS } from '@/modules/channels/sms/smsService';

async function handleClientMessage(
  tenantId: string,
  clientPhone: string,
  message: string
) {
  // 1. Récupérer les systèmes du tenant
  const systems = await getTenantSystems(tenantId);

  // 2. L'IA analyse le message (simplifié ici)
  const productQuery = 'robe bleue';
  const sizeQuery = '38';

  // 3. Chercher le produit
  const products = await systems.inventory!.searchProducts(productQuery);
  if (products.length === 0) {
    await sendSMS(clientPhone, "Désolé, je ne trouve pas ce produit 😕");
    return;
  }

  const product = products[0]; // Prendre le premier résultat

  // 4. Trouver la variante T38
  const variant = product.variants?.find(
    v => v.attributes.size === sizeQuery
  );

  if (!variant) {
    await sendSMS(clientPhone, "Cette taille n'est pas disponible pour ce produit.");
    return;
  }

  // 5. Vérifier le stock
  const stock = await systems.inventory!.checkAvailability(product.id, variant.id);

  if (stock.available) {
    // 6. Créer une réservation automatique
    const reservation = await systems.inventory!.reserveProduct({
      productId: product.id,
      variantId: variant.id,
      customerId: clientPhone,
      quantity: 1,
      duration: 24 * 60, // 24h
    });

    // 7. Envoyer la réponse
    await sendSMS(
      clientPhone,
      `Oui ! On a la ${product.name} en ${sizeQuery} 😊\n\nIl nous en reste ${stock.quantity}. Je l'ai mise de côté pour vous jusqu'à demain 18h !`
    );
  } else {
    await sendSMS(
      clientPhone,
      `Désolé, la ${product.name} en ${sizeQuery} est en rupture de stock 😕\n\nVoulez-vous que je vous prévienne quand elle sera de retour ?`
    );
  }
}
```

**L'IA ne sait même pas si c'est Shopify, WooCommerce ou un système custom !**

---

## 📝 Prochaines Étapes

### **Phase 1 : Tests Unitaires**

Créer des tests automatisés :

```typescript
// tests/integrations/inventory.test.ts
import { MockInventory } from '@/modules/integrations/inventory/mock/inventory';

describe('Inventory System', () => {
  let inventory: MockInventory;

  beforeEach(() => {
    inventory = new MockInventory({}, {});
  });

  test('should check product availability', async () => {
    const stock = await inventory.checkAvailability('prod_001', 'var_001_38');
    expect(stock.available).toBe(true);
    expect(stock.quantity).toBe(2);
  });

  test('should create reservation', async () => {
    const reservation = await inventory.reserveProduct({
      productId: 'prod_001',
      variantId: 'var_001_38',
      customerId: 'test',
      quantity: 1,
      duration: 60,
    });

    expect(reservation.status).toBe('active');
    expect(reservation.quantity).toBe(1);

    // Vérifier que le stock a diminué
    const stock = await inventory.checkAvailability('prod_001', 'var_001_38');
    expect(stock.quantity).toBe(1); // 2 - 1 = 1
  });
});
```

### **Phase 2 : Implémenter Shopify**

1. Créer `src/modules/integrations/inventory/shopify/inventory.ts`
2. Implémenter toutes les méthodes de `InventorySystem`
3. Mapper les réponses Shopify vers les types unifiés
4. Tester avec un vrai store Shopify

### **Phase 3 : Implémenter WooCommerce**

Même processus que Shopify.

### **Phase 4 : Intégrer avec l'IA**

Connecter le système d'intégrations avec le module IA conversationnelle.

---

## 🔍 Debugging

### **Vérifier qu'un système est bien configuré**

```typescript
const systems = await getTenantSystems('tenant-id');

console.log('Systèmes disponibles :');
console.log('- Inventory:', systems.inventory ? '✅' : '❌');
console.log('- Orders:', systems.orders ? '✅' : '❌');
console.log('- Tracking:', systems.tracking ? '✅' : '❌');
console.log('- Customers:', systems.customers ? '✅' : '❌');

if (systems.inventory) {
  const health = await systems.inventory.checkHealth();
  console.log('Inventory health:', health);
}
```

### **Tester une connexion API**

```typescript
const systems = await getTenantSystems('tenant-id');

if (systems.inventory) {
  try {
    const connected = await systems.inventory.testConnection();
    console.log('Connexion:', connected ? '✅ OK' : '❌ ÉCHEC');
  } catch (error) {
    console.error('Erreur de connexion:', error.message);
  }
}
```

---

## 📚 Ressources

- **Documentation complète :** `ARCHITECTURE_INTEGRATIONS.md`
- **Exemples concrets :** `EXEMPLES_USAGE_CLIENT.md`
- **Interfaces TypeScript :** `src/modules/integrations/*/interface.ts`
- **Implémentations Mock :** `src/modules/integrations/*/mock/*.ts`

---

## 💡 Conseils

1. **Toujours commencer avec les Mocks** - Développer et tester sans APIs externes
2. **Respecter les interfaces** - TypeScript garantit la compatibilité
3. **Gérer les erreurs** - Toujours envelopper dans try/catch
4. **Vérifier la santé** - Utiliser `checkHealth()` régulièrement
5. **Logger les appels** - Pour debugging et monitoring

---

**Créé le :** 16 janvier 2025
**Prêt à l'emploi :** ✅ OUI (avec Mocks)
**Production-ready :** ⏳ Après implémentation connecteurs réels
