import { handleCORS, corsHeaders, getCorsHeaders } from './config/cors.js';
import { logger } from './utils/logger.js';
import { errorResponse } from './utils/response.js';
import { handlePublicRoutes } from './modules/public/routes.js';
import { handleAuthRoutes } from './modules/auth/routes.js';
import { handleKnowledgeRoutes } from './modules/knowledge/routes.js';
import { handleProspectsRoutes } from './modules/prospects/routes.js';
import { handleAgentsRoutes } from './modules/agents/routes.js';
import { handleAppointmentsRoutes } from './modules/appointments/routes.js';
import { handleProductsRoutes } from './modules/products/routes.js';
import { handleVapiRoutes } from './modules/vapi/routes.js';
import { handleTwilioRoutes } from './modules/twilio/routes.js';
import { handleOnboardingRoutes } from './modules/onboarding/routes.js';
import { handleKnowledgeManualRoutes } from './modules/knowledge/manual.js';
import { handleChannelsRoutes } from './modules/channels/routes.js';
import { handleIntegrationsRoutes } from './modules/integrations/routes.js';
// Module Omnichannel (indépendant, activable via OMNICHANNEL_ENABLED)
import { handleOmnichannelRoutes } from './modules/omnichannel/index.js';
import { handleMetaWebhookVerification, handleMetaWhatsAppWebhook } from "./modules/omnichannel/webhooks/meta-whatsapp.js";
import { handleRetellRoutes } from './modules/retell/routes.js';
import { handlePermissionsRoutes } from './modules/permissions/routes.js';
import { handleTeamsRoutes } from './modules/teams/routes.js';
import { handleCustomersRoutes } from './modules/customers/routes.js';
import { handleOAuthRoutes } from './modules/oauth/routes.js';

export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    logger.info('Request received', { method, path });

    try {
      const corsResponse = handleCORS(request);
      if (corsResponse) return corsResponse;

      let response;

      // Routes publiques (sans auth) - à traiter en premier
      if (path.startsWith('/api/v1/public/')) {
        response = await handlePublicRoutes(request, env, path, method);
        if (response) return response;
      }

      if (path.startsWith("/api/v1/teams")) {
      response = await handleTeamsRoutes(request, env, ctx, corsHeaders);
      if (response) return response;
    }

    if (path.startsWith("/api/v1/permissions")) {
      response = await handlePermissionsRoutes(request, env, ctx, corsHeaders);
      if (response) return response;
      if (response) return response;
    }
    if (path.startsWith("/api/v1/auth/")) {
        response = await handleAuthRoutes(request, env, ctx, corsHeaders);
        if (response) return response;
      }

      // Routes OAuth (Google, Outlook, Yahoo)
      if (path.startsWith('/api/v1/oauth/')) {
        response = await handleOAuthRoutes(request, env, ctx, corsHeaders);
        if (response) return response;
      }
      
      if (path.startsWith('/api/v1/onboarding/')) {
        response = await handleOnboardingRoutes(request, env, ctx, corsHeaders);
        if (response) return response;
      }
      
      if (path.startsWith('/api/v1/knowledge/')) {
        if (path.includes('/faq') || path.includes('/snippets')) {
          response = await handleKnowledgeManualRoutes(request, env, ctx, corsHeaders);
          if (response) return response;
        }
        response = await handleKnowledgeRoutes(request, env, path, method);
        if (response) return response;
      }
      
      if (path.startsWith('/api/v1/prospects')) {
        response = await handleProspectsRoutes(request, env, path, method);
        if (response) return response;
      }
      
      if (path.startsWith('/api/v1/products')) {
        response = await handleProductsRoutes(request, env, path, method);
        if (response) return response;
      }
      if (path.startsWith('/api/v1/customers')) {
        response = await handleCustomersRoutes(request, env, path, method);
        if (response) {
          const corsHeaders = getCorsHeaders(request);
          const headers = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            headers.set(key, value);
          });
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
          });
        }
      }

      if (path.startsWith('/api/v1/agents')) {
        response = await handleAgentsRoutes(request, env, path, method);
        if (response) return response;
      }
      
      if (path.startsWith('/api/v1/appointments')) {
        response = await handleAppointmentsRoutes(request, env, path, method);
        if (response) return response;
      }
      
      if (path.startsWith('/api/v1/vapi') || path.startsWith('/webhooks/vapi')) {
        response = await handleVapiRoutes(request, env, path, method);
        if (response) return response;
      }

      // Twilio ConversationRelay routes
    if (path.startsWith('/api/v1/twilio') || path.startsWith('/webhooks/twilio') || path.startsWith('/api/v1/sms')) {
        response = await handleTwilioRoutes(request, env, path, method);
        if (response) return response;
      }

      // Routes Retell (Agent vocal IA)
      if (path.startsWith('/api/v1/retell') || path.startsWith('/webhooks/retell')) {
        response = await handleRetellRoutes(request, env, path, method);
        if (response) return response;
      }
      // META WHATSAPP WEBHOOK
      if (path.startsWith("/webhooks/meta/whatsapp")) {
        if (method === "GET") {
          return await handleMetaWebhookVerification(request, env);
        }
        if (method === "POST") {
          return await handleMetaWhatsAppWebhook(request, env);
        }
      }
      // MODULE OMNICHANNEL (indépendant, plug-and-play)
      // Activer avec OMNICHANNEL_ENABLED=true dans wrangler.toml
      if (path.startsWith('/api/v1/omnichannel') || path.startsWith('/webhooks/omnichannel')) {
        response = await handleOmnichannelRoutes(request, env, path, method);
        if (response) {
          // Ajouter les en-têtes CORS à la réponse
          const corsHeaders = getCorsHeaders(request);
          const headers = new Headers(response.headers);
          Object.entries(corsHeaders).forEach(([key, value]) => {
            headers.set(key, value);
          });
          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers
          });
        }
      }

      if (path.startsWith('/api/v1/channels')) {
        response = await handleChannelsRoutes(request, env, path, method);
        if (response) return response;
      }

      if (path.startsWith('/api/v1/integrations') || path.startsWith('/webhooks/integrations')) {
        response = await handleIntegrationsRoutes(request, env, path, method);
        if (response) return response;
      }

      response = errorResponse('Route not found', 404);

      const duration = Date.now() - startTime;
      logger.info('Request completed', { method, path, status: response?.status || 200, duration: `${duration}ms` });

      return response;

    } catch (error) {
      logger.error('Unhandled error', { method, path, error: error.message, stack: error.stack });
      return errorResponse('Internal server error', 500);
    }
  }
};
