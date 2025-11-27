import { handleCORS, corsHeaders } from './config/cors.js';
import { logger } from './utils/logger.js';
import { errorResponse } from './utils/response.js';
import { handlePublicRoutes } from './modules/public/routes.js';
import { handleAuthRoutes } from './modules/auth/routes.js';
import { handleKnowledgeRoutes } from './modules/knowledge/routes.js';
import { handleProspectsRoutes } from './modules/prospects/routes.js';
import { handleAgentsRoutes } from './modules/agents/routes.js';
import { handleAppointmentsRoutes } from './modules/appointments/routes.js';
import { handleVapiRoutes } from './modules/vapi/routes.js';
import { handleTwilioRoutes } from './modules/twilio/routes.js';
import { handleOnboardingRoutes } from './modules/onboarding/routes.js';
import { handleKnowledgeManualRoutes } from './modules/knowledge/manual.js';
import { handleChannelsRoutes } from './modules/channels/routes.js';

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

      if (path.startsWith('/api/v1/auth/')) {
        response = await handleAuthRoutes(request, env, ctx, corsHeaders);
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
      if (path.startsWith('/api/v1/twilio') || path.startsWith('/webhooks/twilio')) {
        response = await handleTwilioRoutes(request, env, path, method);
        if (response) return response;
      }

      if (path.startsWith('/api/v1/channels')) {
        response = await handleChannelsRoutes(request, env, path, method);
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
