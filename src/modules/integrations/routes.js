// Module Integrations - Routes API pour les intégrations CRM/e-commerce
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import { requireAuth } from '../auth/helpers.js';

export async function handleIntegrationsRoutes(request, env, path, method) {
  try {
    // Vérifier l'authentification
    const authResult = await requireAuth(request, env);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }
    const { user, tenant } = authResult;
    const tenantId = tenant.id;

    // GET /api/v1/integrations - Liste toutes les intégrations disponibles
    if (path === '/api/v1/integrations' && method === 'GET') {
      return await listAvailableIntegrations(env);
    }

    // GET /api/v1/integrations/configured - Liste les intégrations configurées par le tenant
    if (path === '/api/v1/integrations/configured' && method === 'GET') {
      return await listConfiguredIntegrations(env, tenantId);
    }

    // GET /api/v1/integrations/:id - Récupère une intégration spécifique
    const getMatch = path.match(/^\/api\/v1\/integrations\/([^\/]+)$/);
    if (getMatch && method === 'GET') {
      return await getIntegration(env, tenantId, getMatch[1]);
    }

    // POST /api/v1/integrations - Créer une nouvelle intégration
    if (path === '/api/v1/integrations' && method === 'POST') {
      return await createIntegration(request, env, tenantId, user.id);
    }

    // PUT /api/v1/integrations/:id - Mettre à jour une intégration
    const updateMatch = path.match(/^\/api\/v1\/integrations\/([^\/]+)$/);
    if (updateMatch && method === 'PUT') {
      return await updateIntegration(request, env, tenantId, updateMatch[1]);
    }

    // DELETE /api/v1/integrations/:id - Supprimer une intégration
    const deleteMatch = path.match(/^\/api\/v1\/integrations\/([^\/]+)$/);
    if (deleteMatch && method === 'DELETE') {
      return await deleteIntegration(env, tenantId, deleteMatch[1]);
    }

    // POST /api/v1/integrations/:id/enable - Activer une intégration
    const enableMatch = path.match(/^\/api\/v1\/integrations\/([^\/]+)\/enable$/);
    if (enableMatch && method === 'POST') {
      return await enableIntegration(env, tenantId, enableMatch[1]);
    }

    // POST /api/v1/integrations/:id/disable - Désactiver une intégration
    const disableMatch = path.match(/^\/api\/v1\/integrations\/([^\/]+)\/disable$/);
    if (disableMatch && method === 'POST') {
      return await disableIntegration(env, tenantId, disableMatch[1]);
    }

    // POST /api/v1/integrations/:id/sync - Déclencher une synchronisation manuelle
    const syncMatch = path.match(/^\/api\/v1\/integrations\/([^\/]+)\/sync$/);
    if (syncMatch && method === 'POST') {
      return await triggerSync(request, env, tenantId, syncMatch[1]);
    }

    // GET /api/v1/integrations/:id/logs - Récupérer les logs de sync
    const logsMatch = path.match(/^\/api\/v1\/integrations\/([^\/]+)\/logs$/);
    if (logsMatch && method === 'GET') {
      return await getSyncLogs(env, tenantId, logsMatch[1]);
    }

    // POST /api/v1/integrations/:id/test - Tester la connexion
    const testMatch = path.match(/^\/api\/v1\/integrations\/([^\/]+)\/test$/);
    if (testMatch && method === 'POST') {
      return await testIntegration(env, tenantId, testMatch[1]);
    }

    // Webhooks entrants depuis les plateformes
    // POST /webhooks/integrations/:platform
    const webhookMatch = path.match(/^\/webhooks\/integrations\/([^\/]+)$/);
    if (webhookMatch && method === 'POST') {
      return await handleIncomingWebhook(request, env, webhookMatch[1]);
    }

    return null;

  } catch (error) {
    logger.error('Integrations route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// ============================================
// HANDLERS
// ============================================

// Liste toutes les intégrations disponibles
async function listAvailableIntegrations(env) {
  const integrations = await env.DB.prepare(`
    SELECT id, name, slug, category, description, logo_url, auth_type,
           supports_contacts, supports_deals, supports_products, supports_orders,
           supports_webhooks, beta
    FROM available_integrations
    WHERE enabled = 1
    ORDER BY category, name
  `).all();

  return successResponse({ integrations: integrations.results });
}

// Liste les intégrations configurées par le tenant
async function listConfiguredIntegrations(env, tenantId) {
  const integrations = await env.DB.prepare(`
    SELECT
      ti.id,
      ti.integration_type,
      ti.integration_name,
      ti.enabled,
      ti.config_public,
      ti.sync_direction,
      ti.sync_frequency,
      ti.last_sync_at,
      ti.last_sync_status,
      ti.created_at,
      ti.updated_at,
      ai.name as platform_name,
      ai.slug as platform_slug,
      ai.logo_url,
      ai.category
    FROM tenant_integrations ti
    LEFT JOIN available_integrations ai ON ti.integration_type = ai.slug
    WHERE ti.tenant_id = ?
    ORDER BY ti.created_at DESC
  `).bind(tenantId).all();

  return successResponse({
    integrations: integrations.results.map(i => ({
      ...i,
      config_public: i.config_public ? JSON.parse(i.config_public) : {}
    }))
  });
}

// Récupère une intégration spécifique
async function getIntegration(env, tenantId, integrationId) {
  const integration = await env.DB.prepare(`
    SELECT
      ti.*,
      ai.name as platform_name,
      ai.slug as platform_slug,
      ai.logo_url,
      ai.category,
      ai.auth_type
    FROM tenant_integrations ti
    LEFT JOIN available_integrations ai ON ti.integration_type = ai.slug
    WHERE ti.id = ? AND ti.tenant_id = ?
  `).bind(integrationId, tenantId).first();

  if (!integration) {
    return errorResponse('Intégration non trouvée', 404);
  }

  // Parse JSON fields
  return successResponse({
    integration: {
      ...integration,
      config_public: integration.config_public ? JSON.parse(integration.config_public) : {},
      // Ne jamais retourner config_encrypted pour la sécurité
      config_encrypted: undefined
    }
  });
}

// Créer une nouvelle intégration
async function createIntegration(request, env, tenantId, userId) {
  const body = await request.json();
  const {
    integration_type,
    integration_name,
    config_public,
    config_encrypted,
    oauth_data,
    sync_direction,
    sync_frequency
  } = body;

  // Validation
  if (!integration_type) {
    return errorResponse('integration_type requis', 400);
  }

  // Vérifier que l'intégration existe
  const available = await env.DB.prepare(`
    SELECT id FROM available_integrations WHERE slug = ? AND enabled = 1
  `).bind(integration_type).first();

  if (!available) {
    return errorResponse(`Intégration ${integration_type} non disponible`, 400);
  }

  const integrationId = `int_${integration_type}_${tenantId}_${Date.now()}`;
  const now = new Date().toISOString();

  // Créer l'intégration
  await env.DB.prepare(`
    INSERT INTO tenant_integrations (
      id, tenant_id, integration_type, integration_name, enabled,
      config_public, config_encrypted,
      oauth_access_token, oauth_refresh_token, oauth_expires_at,
      sync_direction, sync_frequency,
      created_at, updated_at, created_by
    ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    integrationId,
    tenantId,
    integration_type,
    integration_name || `${integration_type} Integration`,
    JSON.stringify(config_public || {}),
    JSON.stringify(config_encrypted || {}),
    oauth_data?.access_token || null,
    oauth_data?.refresh_token || null,
    oauth_data?.expires_at || null,
    sync_direction || 'bidirectional',
    sync_frequency || 'realtime',
    now,
    now,
    userId
  ).run();

  logger.info('Integration created', { integrationId, tenantId, integration_type });

  return successResponse({
    message: 'Intégration créée avec succès',
    integrationId
  }, 201);
}

// Mettre à jour une intégration
async function updateIntegration(request, env, tenantId, integrationId) {
  const body = await request.json();
  const {
    integration_name,
    config_public,
    config_encrypted,
    oauth_data,
    sync_direction,
    sync_frequency
  } = body;

  // Vérifier que l'intégration existe et appartient au tenant
  const existing = await env.DB.prepare(`
    SELECT id FROM tenant_integrations WHERE id = ? AND tenant_id = ?
  `).bind(integrationId, tenantId).first();

  if (!existing) {
    return errorResponse('Intégration non trouvée', 404);
  }

  const now = new Date().toISOString();

  // Update
  await env.DB.prepare(`
    UPDATE tenant_integrations
    SET
      integration_name = COALESCE(?, integration_name),
      config_public = COALESCE(?, config_public),
      config_encrypted = COALESCE(?, config_encrypted),
      oauth_access_token = COALESCE(?, oauth_access_token),
      oauth_refresh_token = COALESCE(?, oauth_refresh_token),
      oauth_expires_at = COALESCE(?, oauth_expires_at),
      sync_direction = COALESCE(?, sync_direction),
      sync_frequency = COALESCE(?, sync_frequency),
      updated_at = ?
    WHERE id = ?
  `).bind(
    integration_name || null,
    config_public ? JSON.stringify(config_public) : null,
    config_encrypted ? JSON.stringify(config_encrypted) : null,
    oauth_data?.access_token || null,
    oauth_data?.refresh_token || null,
    oauth_data?.expires_at || null,
    sync_direction || null,
    sync_frequency || null,
    now,
    integrationId
  ).run();

  logger.info('Integration updated', { integrationId, tenantId });

  return successResponse({ message: 'Intégration mise à jour' });
}

// Supprimer une intégration
async function deleteIntegration(env, tenantId, integrationId) {
  const existing = await env.DB.prepare(`
    SELECT id FROM tenant_integrations WHERE id = ? AND tenant_id = ?
  `).bind(integrationId, tenantId).first();

  if (!existing) {
    return errorResponse('Intégration non trouvée', 404);
  }

  await env.DB.prepare(`
    DELETE FROM tenant_integrations WHERE id = ?
  `).bind(integrationId).run();

  logger.info('Integration deleted', { integrationId, tenantId });

  return successResponse({ message: 'Intégration supprimée' });
}

// Activer une intégration
async function enableIntegration(env, tenantId, integrationId) {
  await env.DB.prepare(`
    UPDATE tenant_integrations
    SET enabled = 1, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(new Date().toISOString(), integrationId, tenantId).run();

  logger.info('Integration enabled', { integrationId, tenantId });

  return successResponse({ message: 'Intégration activée' });
}

// Désactiver une intégration
async function disableIntegration(env, tenantId, integrationId) {
  await env.DB.prepare(`
    UPDATE tenant_integrations
    SET enabled = 0, updated_at = ?
    WHERE id = ? AND tenant_id = ?
  `).bind(new Date().toISOString(), integrationId, tenantId).run();

  logger.info('Integration disabled', { integrationId, tenantId });

  return successResponse({ message: 'Intégration désactivée' });
}

// Déclencher une synchronisation manuelle
async function triggerSync(request, env, tenantId, integrationId) {
  const body = await request.json();
  const { sync_type, entity_type, entity_id } = body;

  // Récupérer l'intégration
  const integration = await env.DB.prepare(`
    SELECT * FROM tenant_integrations WHERE id = ? AND tenant_id = ? AND enabled = 1
  `).bind(integrationId, tenantId).first();

  if (!integration) {
    return errorResponse('Intégration non trouvée ou désactivée', 404);
  }

  // Appeler n8n webhook
  const n8nUrl = integration.n8n_webhook_url || `${env.N8N_WEBHOOK_URL}/webhook/coccinelle/${integration.integration_type}`;

  const payload = {
    action: sync_type || 'manual_sync',
    tenant_id: tenantId,
    integration_id: integrationId,
    data: {
      entity_type,
      entity_id
    },
    callback_url: `${env.API_URL}/api/v1/integrations/${integrationId}/sync-callback`
  };

  try {
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    // Log la sync
    const logId = `synclog_${Date.now()}`;
    await env.DB.prepare(`
      INSERT INTO integration_sync_logs (
        id, integration_id, tenant_id, sync_type, sync_direction,
        source_entity_type, source_entity_id, status,
        request_payload, response_payload,
        started_at, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      logId,
      integrationId,
      tenantId,
      sync_type || 'manual_sync',
      'to_platform',
      entity_type,
      entity_id,
      response.ok ? 'success' : 'failed',
      JSON.stringify(payload),
      JSON.stringify(result),
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    return successResponse({
      message: 'Synchronisation déclenchée',
      sync_log_id: logId,
      result
    });

  } catch (error) {
    logger.error('Sync trigger failed', { error: error.message, integrationId });
    return errorResponse('Erreur lors de la synchronisation: ' + error.message, 500);
  }
}

// Récupérer les logs de sync
async function getSyncLogs(env, tenantId, integrationId) {
  const logs = await env.DB.prepare(`
    SELECT
      id, sync_type, sync_direction, source_entity_type, source_entity_id,
      destination_entity_type, destination_entity_id,
      status, error_message,
      started_at, completed_at, duration_ms, retry_count,
      created_at
    FROM integration_sync_logs
    WHERE integration_id = ? AND tenant_id = ?
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(integrationId, tenantId).all();

  return successResponse({ logs: logs.results });
}

// Tester la connexion à une intégration
async function testIntegration(env, tenantId, integrationId) {
  const integration = await env.DB.prepare(`
    SELECT * FROM tenant_integrations WHERE id = ? AND tenant_id = ?
  `).bind(integrationId, tenantId).first();

  if (!integration) {
    return errorResponse('Intégration non trouvée', 404);
  }

  // TODO: Implémenter les tests spécifiques par plateforme
  // Pour l'instant, juste vérifier que n8n répond

  const n8nUrl = integration.n8n_webhook_url || `${env.N8N_WEBHOOK_URL}/webhook/test`;

  try {
    const response = await fetch(n8nUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, integration_type: integration.integration_type })
    });

    if (response.ok) {
      return successResponse({
        success: true,
        message: 'Connexion réussie',
        status: response.status
      });
    } else {
      return errorResponse('Échec du test de connexion', response.status);
    }
  } catch (error) {
    return errorResponse('Erreur: ' + error.message, 500);
  }
}

// Gérer les webhooks entrants depuis les plateformes
async function handleIncomingWebhook(request, env, platform) {
  const body = await request.json();
  const headers = Object.fromEntries(request.headers.entries());

  // Logger le webhook
  const logId = `webhook_${Date.now()}`;
  const now = new Date().toISOString();

  await env.DB.prepare(`
    INSERT INTO integration_webhook_logs (
      id, source_platform, event_type,
      request_method, request_headers, request_body,
      request_ip, processed, received_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).bind(
    logId,
    platform,
    body.event_type || body.type || 'unknown',
    request.method,
    JSON.stringify(headers),
    JSON.stringify(body),
    request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For'),
    now
  ).run();

  // TODO: Traiter le webhook selon la plateforme
  logger.info('Webhook received', { platform, event: body.event_type || body.type });

  return successResponse({
    message: 'Webhook reçu',
    webhook_id: logId
  });
}
