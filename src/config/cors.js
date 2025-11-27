// Configuration CORS pour Coccinelle.ai
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://coccinelle.ai',
  'https://app.coccinelle.ai',
  'https://coccinelle-saas.vercel.app'
];

export function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  };
}

// Pour compatibilité avec l'ancien code
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
};

export function handleCORS(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(request) });
  }
  return null;
}
