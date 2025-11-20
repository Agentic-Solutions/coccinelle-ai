/**
 * API pour déclencher une synchronisation manuelle
 * POST: Synchroniser tous les clients vers un CRM externe
 */

import { NextRequest, NextResponse } from 'next/server';
// import { getCRMSyncService } from '@/services/crm/sync';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { systemType, direction } = body; // 'to-external' ou 'from-external'

    // TODO: Récupérer tenantId depuis session/auth
    const tenantId = 'demo-tenant';

    // TODO: Accéder à la DB
    // const db = env.DB;
    // const syncService = getCRMSyncService(db, tenantId);

    console.log(`🔄 Starting ${direction} sync for ${systemType}...`);

    // TODO: Exécuter la synchronisation
    // const result = await syncService.syncAll(systemType);

    // Simuler la sync pour l'instant
    const mockResult = {
      success: true,
      synced: 42,
      created: 5,
      updated: 37,
      errors: [],
      duration: 2.5,
    };

    return NextResponse.json({
      success: true,
      message: `Synchronization with ${systemType} completed`,
      result: mockResult,
    });
  } catch (error: any) {
    console.error('❌ Sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
