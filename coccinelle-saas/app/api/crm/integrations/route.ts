export const runtime = 'edge';

/**
 * API pour gérer les intégrations CRM
 * GET: Lister toutes les intégrations
 * POST: Créer/Activer une intégration
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // TODO: Récupérer tenantId depuis session/auth
    const tenantId = 'demo-tenant';

    // TODO: Accéder à la DB Cloudflare D1
    // const db = env.DB;

    // Pour l'instant, retourner des données mockées
    const integrations = [
      {
        id: 'crm-native',
        systemType: 'native',
        name: 'CRM Natif Coccinelle',
        isActive: true,
        status: 'connected',
        lastSyncAt: new Date().toISOString(),
      },
      {
        id: 'crm-hubspot',
        systemType: 'hubspot',
        name: 'HubSpot CRM',
        isActive: false,
        status: 'disconnected',
        lastSyncAt: null,
      },
      {
        id: 'crm-salesforce',
        systemType: 'salesforce',
        name: 'Salesforce CRM',
        isActive: false,
        status: 'disconnected',
        lastSyncAt: null,
      },
    ];

    return NextResponse.json({ integrations });
  } catch (error: any) {
    console.error('❌ Error fetching integrations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { systemType, credentials, settings } = body;

    // TODO: Récupérer tenantId depuis session/auth
    const tenantId = 'demo-tenant';

    // TODO: Valider les credentials en testant la connexion
    // const testConnection = await testCRMConnection(systemType, credentials);

    // TODO: Insérer dans la DB
    // const integrationId = `crm-${systemType}-${Date.now()}`;
    // await db.prepare(`
    //   INSERT INTO crm_integrations (id, tenant_id, system_type, credentials, settings, is_active)
    //   VALUES (?, ?, ?, ?, ?, 1)
    // `).bind(integrationId, tenantId, systemType, JSON.stringify(credentials), JSON.stringify(settings)).run();

    return NextResponse.json({
      success: true,
      message: `${systemType} integration activated`,
      integrationId: `crm-${systemType}-demo`,
    });
  } catch (error: any) {
    console.error('❌ Error creating integration:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
