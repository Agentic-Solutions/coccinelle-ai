/**
 * Module Omnichannel - Point d'entrée principal
 * Version: 1.0.0
 *
 * Module indépendant pour la gestion multi-canal (Voice, SMS, WhatsApp, Email)
 * Peut être activé/désactivé via OMNICHANNEL_ENABLED=true
 */

import { OmnichannelConfig } from './config.js';
import { omniLogger } from './utils/logger.js';

// Controllers
import {
  getAgentConfig,
  updateAgentConfig,
  deleteAgentConfig
} from './controllers/agent-config.js';
import {
  getVoices,
  getVoiceDetails,
  getModels
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

    // GET /api/v1/omnichannel/agent/voices/:voiceId
    if (path.startsWith('/api/v1/omnichannel/agent/voices/') && method === 'GET') {
      const voiceId = path.split('/').pop();
      if (voiceId === 'models') {
        return await getModels(request, env);
      }
      return await getVoiceDetails(request, env, voiceId);
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

export { OmnichannelConfig };
