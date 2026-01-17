export const runtime = 'edge';

/**
 * Webhook HubSpot pour recevoir les changements
 * Quand un contact est créé/modifié dans HubSpot, ce webhook est appelé
 *
 * Configuration HubSpot:
 * URL: https://votre-domaine.com/api/crm/webhooks/hubspot
 * Events: contact.creation, contact.propertyChange, contact.deletion
 */

import { NextRequest, NextResponse } from 'next/server';
// import { getCRMSyncService } from '@/services/crm/sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log('📥 [HubSpot Webhook] Event received:', body);

    // Format HubSpot webhook
    // {
    //   "subscriptionType": "contact.propertyChange",
    //   "objectId": 123456,
    //   "propertyName": "email",
    //   "propertyValue": "new@email.com",
    //   "changeSource": "CRM",
    //   "eventId": 789,
    //   "subscriptionId": 456,
    //   "portalId": 62515,
    //   "appId": 1160452,
    //   "occurredAt": 1551808228000
    // }

    const { subscriptionType, objectId, portalId } = body;

    if (!objectId) {
      return NextResponse.json({ error: 'Missing objectId' }, { status: 400 });
    }

    // Trouver le tenant associé à ce portalId
    // TODO: Requête DB pour mapper portalId -> tenantId
    const tenantId = 'demo-tenant';

    // TODO: Accéder à la DB
    // const db = env.DB;
    // const syncService = getCRMSyncService(db, tenantId);

    switch (subscriptionType) {
      case 'contact.creation':
        console.log(`✨ [HubSpot] New contact created: ${objectId}`);
        // TODO: Synchroniser depuis HubSpot vers local
        // await syncService.syncFromExternal(objectId.toString(), 'hubspot');
        break;

      case 'contact.propertyChange':
        console.log(`📝 [HubSpot] Contact ${objectId} updated`);
        // TODO: Mettre à jour le contact local
        // await syncService.syncFromExternal(objectId.toString(), 'hubspot');
        break;

      case 'contact.deletion':
        console.log(`🗑️ [HubSpot] Contact ${objectId} deleted`);
        // TODO: Optionnel - Supprimer ou marquer comme supprimé localement
        break;

      default:
        console.log(`⚠️ [HubSpot] Unknown event type: ${subscriptionType}`);
    }

    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error: any) {
    console.error('❌ [HubSpot Webhook] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Verification endpoint pour HubSpot
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    service: 'HubSpot CRM Webhook',
    version: '1.0.0',
  });
}
