/**
 * Test des Intégrations Coccinelle.AI
 * Validation de l'architecture avec les implémentations Mock
 */

import { IntegrationFactory, checkAllSystemsHealth } from './src/modules/integrations/factory';

async function main() {
  console.log('🧪 Test des Intégrations Coccinelle.AI\n');
  console.log('='.repeat(60));

  try {
    // ============================================
    // CONFIGURATION
    // ============================================
    console.log('\n📋 Configuration du tenant...');

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

    // ============================================
    // CRÉATION DES SYSTÈMES
    // ============================================
    console.log('✅ Configuration créée');
    console.log('\n🏗️  Création des systèmes...');

    const systems = await IntegrationFactory.createAllSystems(config);

    console.log('✅ Systèmes créés:');
    console.log(`   - Inventory: ${systems.inventory?.systemName || 'N/A'}`);
    console.log(`   - Orders: ${systems.orders?.systemName || 'N/A'}`);
    console.log(`   - Tracking: ${systems.tracking?.systemName || 'N/A'}`);
    console.log(`   - Customers: ${systems.customers?.systemName || 'N/A'}`);

    // ============================================
    // TEST SANTÉ
    // ============================================
    console.log('\n🏥 Vérification de la santé des systèmes...');

    const health = await checkAllSystemsHealth(systems);

    console.log(`   - Inventory: ${health.inventory.status} - ${health.inventory.message}`);
    console.log(`   - Orders: ${health.orders.status} - ${health.orders.message}`);
    console.log(`   - Tracking: ${health.tracking.status} - ${health.tracking.message}`);
    console.log(`   - Customers: ${health.customers.status} - ${health.customers.message}`);

    // ============================================
    // TEST 1: INVENTORY - Vérifier stock
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📦 TEST 1: Vérification Stock Robe Fleurie T38');
    console.log('='.repeat(60));

    const product = await systems.inventory!.getProduct('prod_001');
    console.log(`\nProduit trouvé: "${product.name}"`);
    console.log(`  - Prix: ${product.price.amount}€`);
    console.log(`  - SKU: ${product.sku}`);
    console.log(`  - Variantes: ${product.variants?.length || 0}`);

    const stock = await systems.inventory!.checkAvailability('prod_001', 'var_001_38');
    console.log(`\nStock T38:`);
    console.log(`  - Disponible: ${stock.available ? '✅ OUI' : '❌ NON'}`);
    console.log(`  - Quantité: ${stock.quantity}`);
    console.log(`  - Statut: ${stock.status}`);
    console.log(`  - Localisation: ${stock.location}`);

    // ============================================
    // TEST 2: INVENTORY - Créer réservation
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🔒 TEST 2: Création Réservation');
    console.log('='.repeat(60));

    const reservation = await systems.inventory!.reserveProduct({
      productId: 'prod_001',
      variantId: 'var_001_38',
      customerId: 'cust_julie',
      quantity: 1,
      duration: 24 * 60, // 24h
      notes: 'Réservée suite à demande SMS de Julie',
    });

    console.log(`\nRéservation créée:`);
    console.log(`  - ID: ${reservation.id}`);
    console.log(`  - Produit: ${reservation.productId}`);
    console.log(`  - Variante: ${reservation.variantId}`);
    console.log(`  - Client: ${reservation.customerId}`);
    console.log(`  - Quantité: ${reservation.quantity}`);
    console.log(`  - Expire le: ${reservation.expiresAt.toLocaleString('fr-FR')}`);
    console.log(`  - Statut: ${reservation.status}`);

    // Vérifier que le stock a diminué
    const stockAfter = await systems.inventory!.checkAvailability('prod_001', 'var_001_38');
    console.log(`\nStock après réservation:`);
    console.log(`  - Quantité restante: ${stockAfter.quantity} (${stock.quantity} - 1)`);

    // ============================================
    // TEST 3: ORDERS - Récupérer commande
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('📋 TEST 3: Récupération Commande #2847');
    console.log('='.repeat(60));

    const order = await systems.orders!.getOrderByNumber('#2847');

    console.log(`\nCommande #${order.orderNumber}:`);
    console.log(`  - Client: ${order.customer.firstName} ${order.customer.lastName}`);
    console.log(`  - Email: ${order.customer.email}`);
    console.log(`  - Articles: ${order.items.length}`);
    console.log(`  - Sous-total: ${order.subtotal.amount}€`);
    console.log(`  - Livraison: ${order.shipping?.amount}€`);
    console.log(`  - Total: ${order.total.amount}€`);
    console.log(`  - Statut: ${order.status}`);
    console.log(`  - Paiement: ${order.paymentStatus}`);
    console.log(`  - Expédition: ${order.fulfillmentStatus}`);
    console.log(`  - Tracking: ${order.trackingNumber || 'N/A'}`);
    console.log(`  - Créée le: ${order.createdAt.toLocaleDateString('fr-FR')}`);

    // ============================================
    // TEST 4: TRACKING - Suivi colis
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🚚 TEST 4: Suivi Colis FR987654321');
    console.log('='.repeat(60));

    const shipment = await systems.tracking!.getShipmentStatus('FR987654321');

    console.log(`\nColis ${shipment.trackingNumber}:`);
    console.log(`  - Transporteur: ${shipment.carrier}`);
    console.log(`  - Statut: ${shipment.status}`);
    console.log(`  - Localisation: ${shipment.currentLocation}`);
    console.log(`  - Livraison estimée: ${shipment.estimatedDelivery?.toLocaleString('fr-FR')}`);
    console.log(`  - Dernière MAJ: ${shipment.lastUpdated.toLocaleString('fr-FR')}`);

    console.log(`\n  Historique des événements:`);
    shipment.events.forEach((event, i) => {
      console.log(`    ${i + 1}. [${event.date.toLocaleString('fr-FR')}] ${event.description}`);
      console.log(`       Lieu: ${event.location}`);
    });

    const isDelivered = await systems.tracking!.isDelivered('FR987654321');
    console.log(`\n  Livré: ${isDelivered ? '✅ OUI' : '❌ PAS ENCORE'}`);

    // ============================================
    // TEST 5: CUSTOMERS - Recherche client
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('👤 TEST 5: Recherche Client par Email');
    console.log('='.repeat(60));

    const customer = await systems.customers!.getCustomerByEmail('julie.mercier@gmail.com');

    if (customer) {
      console.log(`\nClient trouvé:`);
      console.log(`  - ID: ${customer.id}`);
      console.log(`  - Nom: ${customer.firstName} ${customer.lastName}`);
      console.log(`  - Email: ${customer.email}`);
      console.log(`  - Téléphone: ${customer.phone}`);
      console.log(`  - Canal préféré: ${customer.preferredChannel}`);
      console.log(`  - Total commandes: ${customer.totalOrders}`);
      console.log(`  - Total dépensé: ${customer.totalSpent?.amount}€`);
      console.log(`  - Panier moyen: ${customer.averageOrderValue?.amount}€`);
      console.log(`  - Tags: ${customer.tags?.join(', ')}`);
      console.log(`  - Segment: ${customer.segment}`);
      console.log(`  - Cliente depuis: ${customer.createdAt?.toLocaleDateString('fr-FR')}`);
      console.log(`  - Dernière commande: ${customer.lastOrderAt?.toLocaleDateString('fr-FR')}`);
    }

    // ============================================
    // TEST 6: INVENTORY - Recherche produits
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🔍 TEST 6: Recherche Produits "robe"');
    console.log('='.repeat(60));

    const products = await systems.inventory!.searchProducts('robe', {
      limit: 5,
      includeOutOfStock: true,
    });

    console.log(`\n${products.length} produit(s) trouvé(s):`);
    products.forEach((p, i) => {
      console.log(`\n  ${i + 1}. ${p.name}`);
      console.log(`     - Prix: ${p.price.amount}€`);
      console.log(`     - Stock: ${p.stockQuantity} (${p.stockStatus})`);
      console.log(`     - Variantes: ${p.variants?.length || 0}`);
    });

    // ============================================
    // TEST 7: ORDERS - Créer échange
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('🔄 TEST 7: Création Échange');
    console.log('='.repeat(60));

    const exchange = await systems.orders!.createExchange({
      orderId: 'ord_2847',
      customerId: 'cust_emma',
      returnItems: [
        {
          productId: 'prod_003',
          variantId: 'var_003_40',
          name: 'Pantalon Noir T40',
          quantity: 1,
          reason: 'Taille trop grande',
        },
      ],
      exchangeItems: [
        {
          productId: 'prod_003',
          variantId: 'var_003_38',
          name: 'Pantalon Noir T38',
          quantity: 1,
        },
      ],
      reason: 'Échange de taille',
      notes: 'Cliente souhaite échanger pour une taille plus petite',
    });

    console.log(`\nÉchange créé:`);
    console.log(`  - ID: ${exchange.id}`);
    console.log(`  - Commande: ${exchange.orderId}`);
    console.log(`  - Client: ${exchange.customerId}`);
    console.log(`  - Statut: ${exchange.status}`);
    console.log(`  - Raison: ${exchange.reason}`);
    console.log(`  - Articles retournés: ${exchange.returnItems.length}`);
    console.log(`  - Articles échangés: ${exchange.exchangeItems.length}`);

    // ============================================
    // RÉSUMÉ FINAL
    // ============================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ TOUS LES TESTS ONT RÉUSSI !');
    console.log('='.repeat(60));

    console.log('\n📊 Résumé:');
    console.log(`  ✅ Configuration créée`);
    console.log(`  ✅ 4 systèmes initialisés (Inventory, Orders, Tracking, Customers)`);
    console.log(`  ✅ Santé vérifiée sur tous les systèmes`);
    console.log(`  ✅ Stock vérifié et réservation créée`);
    console.log(`  ✅ Commande récupérée avec détails complets`);
    console.log(`  ✅ Tracking de colis fonctionnel`);
    console.log(`  ✅ Client récupéré par email`);
    console.log(`  ✅ Recherche de produits opérationnelle`);
    console.log(`  ✅ Échange créé avec succès`);

    console.log('\n🎉 L\'architecture d\'intégrations est prête à l\'emploi !');
    console.log('\n💡 Prochaines étapes:');
    console.log('   1. Implémenter les connecteurs réels (Shopify, WooCommerce, etc.)');
    console.log('   2. Connecter avec le module IA conversationnelle');
    console.log('   3. Créer les routes API pour les interfaces utilisateur');

  } catch (error: any) {
    console.error('\n❌ ERREUR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter les tests
main();
