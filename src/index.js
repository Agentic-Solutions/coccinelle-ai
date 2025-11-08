// Coccinelle.ai - Backend API v3.0.0 MODULAIRE
// Architecture refactorée - Entry point principal

// ========================================
// IMPORTS DES MODULES
// ========================================
import { handleCORS, corsHeaders } from './config/cors.js';
import { logger } from './utils/logger.js';
import { errorResponse } from './utils/response.js';

// Modules métier
import { handleAuthRoutes } from './modules/auth/routes.js';
import { handleKnowledgeRoutes } from './modules/knowledge/routes.js';
import { handleProspectsRoutes } from './modules/prospects/routes.js';
import { handleAgentsRoutes } from './modules/agents/routes.js';
import { handleAppointmentsRoutes } from './modules/appointments/routes.js';
import { handleVapiRoutes } from './modules/vapi/routes.js';

// Modules temporaires (à modulariser)
import { handleOnboardingRoutes } from './onboarding-routes.js';
import { handleKnowledgeManualRoutes } from './knowledge-manual-routes.js';

// ========================================
// WORKER PRINCIPAL
// ========================================
export default {
  async fetch(request, env, ctx) {
    const startTime = Date.now();
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    logger.info('Request received', { method, path });

    try {
      // 1. Gérer CORS (OPTIONS preflight)
      const corsResponse = handleCORS(request);
      if (corsResponse) return corsResponse;

      // 2. Router les requêtes vers les modules appropriés
      let response;

      // Module Auth (signature spéciale avec corsHeaders)
      if (path.startsWith('/api/v1/auth/')) {
        response = await handleAuthRoutes(request, env, ctx, corsHeaders);
        if (response) return response;
      }
      
      // Module Onboarding (temporaire)
      if (path.startsWith('/api/v1/onboarding/')) {
        response = await handleOnboardingRoutes(request, env, ctx, corsHeaders);
        if (response) return response;
      }
      
      // Module Knowledge
      if (path.startsWith('/api/v1/knowledge/')) {
        // Vérifier d'abord les routes manuelles (FAQ/Snippets)
        if (path.includes('/faq') || path.includes('/snippets')) {
          response = await handleKnowledgeManualRoutes(request, env, ctx, corsHeaders);
          if (response) return response;
        }
        // Sinon routes normales
        response = await handleKnowledgeRoutes(request, env, path, method);
        if (response) return response;
      }
      
      // Module Prospects
      if (path.startsWith('/api/v1/prospects')) {
        response = await handleProspectsRoutes(request, env, path, method);
        if (response) return response;
      }
      
      // Module Agents
      if (path.startsWith('/api/v1/agents')) {
        response = await handleAgentsRoutes(request, env, path, method);
        if (response) return response;
      }
      
      // Module Appointments
      if (path.startsWith('/api/v1/appointments')) {
        response = await handleAppointmentsRoutes(request, env, path, method);
        if (response) return response;
      }
      
      // Module VAPI
      if (path.startsWith('/api/v1/vapi') || path.startsWith('/webhooks/vapi')) {
        response = await handleVapiRoutes(request, env, path, method);
        if (response) return response;
      }
      
      // Route non trouvée
      response = errorResponse('Route not found', 404);

      // 3. Logger la réponse
      const duration = Date.now() - startTime;
      logger.info('Request completed', {
        method,
        path,
        status: response?.status || 200,
        duration: `${duration}ms`
      });

      return response;

    } catch (error) {
      // Gestion globale des erreurs
      logger.error('Unhandled error', {
        method,
        path,
        error: error.message,
        stack: error.stack
      });

      return errorResponse('Internal server error', 500);
    }
  }
};
