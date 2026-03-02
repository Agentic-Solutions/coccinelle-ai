// Utilitaires pour les réponses HTTP
import { getCorsHeaders } from '../config/cors.js';

const defaultCorsHeaders = {
  'Access-Control-Allow-Origin': 'https://coccinelle-saas.pages.dev',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-tenant-id, x-user-id',
};

export function jsonResponse(data, status = 200, request) {
  const cors = request ? getCorsHeaders(request) : defaultCorsHeaders;
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

export function errorResponse(message, status = 500, request) {
  return jsonResponse({ error: message }, status, request);
}

export function successResponse(data, status = 200, request) {
  return jsonResponse({ success: true, ...data }, status, request);
}
