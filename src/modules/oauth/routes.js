/**
 * Routes OAuth pour Coccinelle.ai
 * Gère l'authentification OAuth pour Google, Outlook et Yahoo
 */

import { logger } from '../../utils/logger.js';
import { requireAuth } from '../auth/helpers.js';
import { getCorsHeaders } from '../../config/cors.js';

// Import des handlers Google
import {
  handleGoogleAuthorize,
  handleGoogleCallback,
  handleGoogleStatus,
  handleGoogleDisconnect
} from './google.js';

// Import des handlers Outlook
import {
  handleOutlookAuthorize,
  handleOutlookCallback,
  handleOutlookStatus,
  handleOutlookDisconnect
} from './outlook.js';

// Import des handlers Yahoo
import {
  handleYahooAuthorize,
  handleYahooCallback,
  handleYahooStatus,
  handleYahooDisconnect
} from './yahoo.js';

// Helper pour réponses JSON avec CORS
function jsonResponse(data, status = 200, request) {
  const corsHeaders = getCorsHeaders(request);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}

function errorResponse(message, status = 400, request) {
  return jsonResponse({ error: message }, status, request);
}

export async function handleOAuthRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  logger.info('OAuth route', { path, method });

  try {
    // ===================================
    // GOOGLE OAUTH ROUTES
    // ===================================

    if (path === '/api/v1/oauth/google/authorize' && method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) {
        return errorResponse('Token requis', 401, request);
      }
      const authRequest = new Request(request.url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const authResult = await requireAuth(authRequest, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      return handleGoogleAuthorize(request, env, ctx, authResult.tenant.id);
    }

    if (path === '/api/v1/oauth/google/callback' && method === 'GET') {
      return handleGoogleCallback(request, env, ctx);
    }

    if (path === '/api/v1/oauth/google/status' && method === 'GET') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      const result = await handleGoogleStatus(request, env, ctx, authResult.tenant.id);
      const data = await result.json();
      return jsonResponse(data, result.status, request);
    }

    if (path === '/api/v1/oauth/google/disconnect' && method === 'DELETE') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      const result = await handleGoogleDisconnect(request, env, ctx, authResult.tenant.id);
      const data = await result.json();
      return jsonResponse(data, result.status, request);
    }

    // ===================================
    // OUTLOOK OAUTH ROUTES
    // ===================================

    if (path === '/api/v1/oauth/outlook/authorize' && method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) {
        return errorResponse('Token requis', 401, request);
      }
      const authRequest = new Request(request.url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const authResult = await requireAuth(authRequest, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      return handleOutlookAuthorize(request, env, ctx, authResult.tenant.id);
    }

    if (path === '/api/v1/oauth/outlook/callback' && method === 'GET') {
      return handleOutlookCallback(request, env, ctx);
    }

    if (path === '/api/v1/oauth/outlook/status' && method === 'GET') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      const result = await handleOutlookStatus(request, env, ctx, authResult.tenant.id);
      const data = await result.json();
      return jsonResponse(data, result.status, request);
    }

    if (path === '/api/v1/oauth/outlook/disconnect' && method === 'DELETE') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      const result = await handleOutlookDisconnect(request, env, ctx, authResult.tenant.id);
      const data = await result.json();
      return jsonResponse(data, result.status, request);
    }

    // ===================================
    // YAHOO OAUTH ROUTES
    // ===================================

    if (path === '/api/v1/oauth/yahoo/authorize' && method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) {
        return errorResponse('Token requis', 401, request);
      }
      const authRequest = new Request(request.url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const authResult = await requireAuth(authRequest, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      return handleYahooAuthorize(request, env, ctx, authResult.tenant.id);
    }

    if (path === '/api/v1/oauth/yahoo/callback' && method === 'GET') {
      return handleYahooCallback(request, env, ctx);
    }

    if (path === '/api/v1/oauth/yahoo/status' && method === 'GET') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      const result = await handleYahooStatus(request, env, ctx, authResult.tenant.id);
      const data = await result.json();
      return jsonResponse(data, result.status, request);
    }

    if (path === '/api/v1/oauth/yahoo/disconnect' && method === 'DELETE') {
      const authResult = await requireAuth(request, env);
      if (authResult.error) {
        return errorResponse(authResult.error, authResult.status, request);
      }
      const result = await handleYahooDisconnect(request, env, ctx, authResult.tenant.id);
      const data = await result.json();
      return jsonResponse(data, result.status, request);
    }

    return null;

  } catch (error) {
    logger.error('OAuth route error', { error: error.message, path });
    return errorResponse(error.message, 500, request);
  }
}
