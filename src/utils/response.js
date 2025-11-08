// Utilitaires pour les réponses HTTP
import { corsHeaders } from '../config/cors.js';

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

export function successResponse(data) {
  return jsonResponse({ success: true, ...data });
}
