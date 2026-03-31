/**
 * Module Omnichannel - Point d'entrée principal
 * Version: 1.0.0
 *
 * Module indépendant pour la gestion multi-canal (Voice, SMS, WhatsApp, Email)
 * Peut être activé/désactivé via OMNICHANNEL_ENABLED=true
 */

import { OmnichannelConfig } from './config.js';
import { omniLogger } from './utils/logger.js';

// Auth helper
import { requireAuth } from '../auth/helpers.js';

// Controllers
import {
  getAgentConfig,
  updateAgentConfig,
  deleteAgentConfig
} from './controllers/agent-config.js';
import {
  getVoices,
  getVoiceDetails,
  getModels,
  getVoicePreview
} from './controllers/voices.js';
import {
  handleCloudflareCallback,
  listCloudflareZones,
  autoConfigureEmailDNS,
  getEmailConfig,
  detectDNSProvider,
  verifyEmailForwarding,
  getCloudflareInstructions
} from './controllers/email-config.js';
import { sendEmail } from './controllers/email-send.js';
import { handleOAuthCallback, getSharedWABAs } from './controllers/whatsapp-oauth.js';
import { listInboxConversations, getInboxConversation, linkConversationToProspect } from './controllers/inbox.js';

// Webhooks
import { handleIncomingCall } from './webhooks/voice.js';
import { handleCallStatus } from './webhooks/call-status.js';
import { handleFallback } from './webhooks/fallback.js';
import { handleConversationWebSocket } from './webhooks/websocket.js';
import { handleIncomingSMS } from './webhooks/sms.js';
import { handleIncomingWhatsApp } from './webhooks/whatsapp.js';
import { handleIncomingEmail } from './webhooks/email.js';

/**
 * Router principal du module Omnichannel
 */
export async function handleOmnichannelRoutes(request, env, path, method) {
  // Vérifier si le module est activé
  if (!OmnichannelConfig.isEnabled(env)) {
    return new Response(JSON.stringify({
      error: 'Omnichannel module is disabled',
      message: 'Set OMNICHANNEL_ENABLED=true in wrangler.toml to enable this module'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // ============================================
    // API ROUTES - /api/v1/omnichannel/*
    // ============================================

    // GET /api/v1/omnichannel/agent/config?tenantId=xxx
    if (path === '/api/v1/omnichannel/agent/config' && method === 'GET') {
      return await getAgentConfig(request, env);
    }

    // PUT /api/v1/omnichannel/agent/config
    if (path === '/api/v1/omnichannel/agent/config' && method === 'PUT') {
      return await updateAgentConfig(request, env);
    }

    // DELETE /api/v1/omnichannel/agent/config?tenantId=xxx
    if (path === '/api/v1/omnichannel/agent/config' && method === 'DELETE') {
      return await deleteAgentConfig(request, env);
    }

    // GET /api/v1/omnichannel/agent/voices?language=fr
    if (path === '/api/v1/omnichannel/agent/voices' && method === 'GET') {
      return await getVoices(request, env);
    }

    // GET /api/v1/omnichannel/agent/voices/:voiceId/preview
    // GET /api/v1/omnichannel/agent/voices/:voiceId
    if (path.startsWith('/api/v1/omnichannel/agent/voices/') && method === 'GET') {
      const pathParts = path.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      // Check for preview endpoint
      if (lastPart === 'preview') {
        const voiceId = pathParts[pathParts.length - 2];
        return await getVoicePreview(request, env, voiceId);
      }

      // Check for models endpoint
      if (lastPart === 'models') {
        return await getModels(request, env);
      }

      // Default: voice details
      return await getVoiceDetails(request, env, lastPart);
    }

    // GET /api/v1/omnichannel/audio/:audioId
    // Sert les fichiers audio depuis R2 pour ConversationRelay
    if (path.startsWith('/api/v1/omnichannel/audio/') && method === 'GET') {
      const audioId = path.split('/').pop();

      try {
        const audioFile = await env.AUDIO_BUCKET.get(audioId);

        if (!audioFile) {
          return new Response('Audio not found', { status: 404 });
        }

        return new Response(audioFile.body, {
          headers: {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=60',
            'Access-Control-Allow-Origin': '*'
          }
        });
      } catch (error) {
        omniLogger.error('Failed to serve audio', { audioId, error: error.message });
        return new Response('Internal error', { status: 500 });
      }
    }

    // GET /api/v1/omnichannel/email/cloudflare/instructions
    if (path === '/api/v1/omnichannel/email/cloudflare/instructions' && method === 'GET') {
      return await getCloudflareInstructions(request, env);
    }

    // POST /api/v1/omnichannel/email/cloudflare/connect
    if (path === '/api/v1/omnichannel/email/cloudflare/connect' && method === 'POST') {
      return await handleCloudflareCallback(request, env);
    }

    // GET /api/v1/omnichannel/email/cloudflare/zones
    if (path === '/api/v1/omnichannel/email/cloudflare/zones' && method === 'GET') {
      return await listCloudflareZones(request, env);
    }

    // POST /api/v1/omnichannel/email/auto-configure
    if (path === '/api/v1/omnichannel/email/auto-configure' && method === 'POST') {
      return await autoConfigureEmailDNS(request, env);
    }

    // GET /api/v1/omnichannel/email/config
    if (path === '/api/v1/omnichannel/email/config' && method === 'GET') {
      return await getEmailConfig(request, env);
    }

    // POST /api/v1/omnichannel/email/detect-provider
    if (path === '/api/v1/omnichannel/email/detect-provider' && method === 'POST') {
      return await detectDNSProvider(request, env);
    }

    // POST /api/v1/omnichannel/email/verify-forwarding
    if (path === '/api/v1/omnichannel/email/verify-forwarding' && method === 'POST') {
      return await verifyEmailForwarding(request, env);
    }

    // GET /api/v1/omnichannel/whatsapp/oauth/callback
    if (path === '/api/v1/omnichannel/whatsapp/oauth/callback' && method === 'GET') {
      return await handleOAuthCallback(request, env);
    }

    // GET /api/v1/omnichannel/whatsapp/wabas
    if (path === '/api/v1/omnichannel/whatsapp/wabas' && method === 'GET') {
      return await getSharedWABAs(request, env);
    }
    // POST /api/v1/omnichannel/email/send
    if (path === '/api/v1/omnichannel/email/send' && method === 'POST') {
      return await sendEmail(request, env);
    }

    // ============================================
    // INBOX ROUTES — N7 Lien Inbox <-> Prospect
    // ============================================

    // GET /api/v1/omnichannel/inbox/conversations
    // Also support shorthand: GET /api/v1/omnichannel/conversations
    if ((path === '/api/v1/omnichannel/inbox/conversations' || path === '/api/v1/omnichannel/conversations') && method === 'GET') {
      return await listInboxConversations(request, env);
    }

    // GET /api/v1/omnichannel/inbox/conversations/:id
    // Also support shorthand: GET /api/v1/omnichannel/conversations/:id
    const inboxDetailMatch = path.match(/^\/api\/v1\/omnichannel\/(?:inbox\/)?conversations\/([^\/]+)$/);
    if (inboxDetailMatch && method === 'GET') {
      return await getInboxConversation(request, env, inboxDetailMatch[1]);
    }

    // POST /api/v1/omnichannel/inbox/conversations/:id/link
    // Also support shorthand: POST /api/v1/omnichannel/conversations/:id/link
    const inboxLinkMatch = path.match(/^\/api\/v1\/omnichannel\/(?:inbox\/)?conversations\/([^\/]+)\/link$/);
    if (inboxLinkMatch && method === 'POST') {
      return await linkConversationToProspect(request, env, inboxLinkMatch[1]);
    }

    // ============================================
    // SHORTHAND ROUTES — Convenience aliases
    // ============================================

    // GET /api/v1/omnichannel/agent-config -> alias for /agent/config
    if (path === '/api/v1/omnichannel/agent-config' && method === 'GET') {
      return await getAgentConfig(request, env);
    }

    // PUT /api/v1/omnichannel/agent-config -> alias for /agent/config
    if (path === '/api/v1/omnichannel/agent-config' && method === 'PUT') {
      return await updateAgentConfig(request, env);
    }

    // DELETE /api/v1/omnichannel/agent-config -> alias for /agent/config
    if (path === '/api/v1/omnichannel/agent-config' && method === 'DELETE') {
      return await deleteAgentConfig(request, env);
    }

    // ============================================
    // PHONE MAPPINGS ROUTES
    // ============================================

    // GET /api/v1/omnichannel/phone-mappings — list phone mappings for tenant
    if (path === '/api/v1/omnichannel/phone-mappings' && method === 'GET') {
      return await listPhoneMappings(request, env);
    }

    // POST /api/v1/omnichannel/phone-mappings — create phone mapping
    if (path === '/api/v1/omnichannel/phone-mappings' && method === 'POST') {
      return await createPhoneMapping(request, env);
    }

    // DELETE /api/v1/omnichannel/phone-mappings/:id — delete phone mapping
    const phoneMappingDeleteMatch = path.match(/^\/api\/v1\/omnichannel\/phone-mappings\/([^\/]+)$/);
    if (phoneMappingDeleteMatch && method === 'DELETE') {
      return await deletePhoneMapping(request, env, phoneMappingDeleteMatch[1]);
    }

    // ============================================
    // WEBHOOK ROUTES - /webhooks/omnichannel/*
    // ============================================

    // POST /webhooks/omnichannel/voice
    if (path === '/webhooks/omnichannel/voice' && method === 'POST') {
      return await handleIncomingCall(request, env);
    }

    // POST /webhooks/omnichannel/call-status
    if (path === '/webhooks/omnichannel/call-status' && method === 'POST') {
      return await handleCallStatus(request, env);
    }

    // POST /webhooks/omnichannel/fallback
    if (path === '/webhooks/omnichannel/fallback' && method === 'POST') {
      return await handleFallback(request, env);
    }

    // GET /webhooks/omnichannel/conversation (WebSocket)
    if (path.startsWith('/webhooks/omnichannel/conversation') && method === 'GET') {
      return await handleConversationWebSocket(request, env);
    }

    // POST /webhooks/omnichannel/sms
    if (path === '/webhooks/omnichannel/sms' && method === 'POST') {
      return await handleIncomingSMS(request, env);
    }

    // POST /webhooks/omnichannel/whatsapp
    if (path === '/webhooks/omnichannel/whatsapp' && method === 'POST') {
      return await handleIncomingWhatsApp(request, env);
    }

    // POST /webhooks/omnichannel/email
    if (path === '/webhooks/omnichannel/email' && method === 'POST') {
      return await handleIncomingEmail(request, env);
    }

    // ============================================
    // HEALTH CHECK
    // ============================================

    // GET /api/v1/omnichannel/health
    if (path === '/api/v1/omnichannel/health' && method === 'GET') {
      return new Response(JSON.stringify({
        status: 'healthy',
        module: 'omnichannel',
        version: '1.0.0',
        enabled: true,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route non trouvée
    return null;

  } catch (error) {
    omniLogger.error('Omnichannel route error', {
      path,
      method,
      error: error.message
    });

    return new Response(JSON.stringify({
      error: 'Internal error',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================
// PHONE MAPPINGS HANDLERS
// ============================================

/**
 * GET /api/v1/omnichannel/phone-mappings
 * List phone mappings for the authenticated tenant
 */
async function listPhoneMappings(request, env) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tenantId = authResult.tenant.id;

  try {
    const result = await env.DB.prepare(`
      SELECT id, phone_number, tenant_id, prompt_type, is_active, created_at, updated_at
      FROM omni_phone_mappings
      WHERE tenant_id = ?
      ORDER BY created_at DESC
    `).bind(tenantId).all();

    return new Response(JSON.stringify({
      success: true,
      phone_mappings: result.results || [],
      count: result.results?.length || 0
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    omniLogger.error('listPhoneMappings error', { error: error.message, tenantId });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * POST /api/v1/omnichannel/phone-mappings
 * Créer un mapping téléphone → tenant avec prompt_type optionnel
 * Body: { phone_number: string, prompt_type?: string }
 */
async function createPhoneMapping(request, env) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tenantId = authResult.tenant.id;

  try {
    const body = await request.json();
    const { phone_number, prompt_type } = body;

    if (!phone_number) {
      return new Response(JSON.stringify({ error: 'phone_number is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // prompt_type par défaut : generaliste
    const resolvedPromptType = prompt_type || 'generaliste';
    const id = `mapping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await env.DB.prepare(`
      INSERT INTO omni_phone_mappings (id, phone_number, tenant_id, prompt_type, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `).bind(id, phone_number, tenantId, resolvedPromptType).run();

    omniLogger.info('Phone mapping created', { tenantId, phone_number, prompt_type: resolvedPromptType, id });

    return new Response(JSON.stringify({
      success: true,
      message: 'Phone mapping created',
      phone_mapping: { id, phone_number, tenant_id: tenantId, prompt_type: resolvedPromptType, is_active: 1 }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    // Gestion de la contrainte UNIQUE sur phone_number
    if (error.message?.includes('UNIQUE')) {
      return new Response(JSON.stringify({ error: 'Ce numéro de téléphone est déjà associé à un tenant' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    omniLogger.error('createPhoneMapping error', { error: error.message, tenantId });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * DELETE /api/v1/omnichannel/phone-mappings/:id
 * Delete a phone mapping (must belong to authenticated tenant)
 */
async function deletePhoneMapping(request, env, mappingId) {
  const authResult = await requireAuth(request, env);
  if (authResult.error) {
    return new Response(JSON.stringify({ error: authResult.error }), {
      status: authResult.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const tenantId = authResult.tenant.id;

  try {
    // Ensure the mapping belongs to this tenant
    const existing = await env.DB.prepare(
      'SELECT id FROM omni_phone_mappings WHERE id = ? AND tenant_id = ?'
    ).bind(mappingId, tenantId).first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Phone mapping not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await env.DB.prepare(
      'DELETE FROM omni_phone_mappings WHERE id = ? AND tenant_id = ?'
    ).bind(mappingId, tenantId).run();

    omniLogger.info('Phone mapping deleted', { tenantId, mappingId });

    return new Response(JSON.stringify({
      success: true,
      message: 'Phone mapping deleted'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    omniLogger.error('deletePhoneMapping error', { error: error.message, tenantId });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export { OmnichannelConfig };
