// Configuration CORS pour Coccinelle.ai
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3007',
  'http://localhost:5173',
  'https://coccinelle.ai',
  'https://app.coccinelle.ai',
  'https://coccinelle-saas.vercel.app',
  'https://coccinelle-saas.pages.dev'
];

// Pattern pour les previews Cloudflare Pages (ex: c6531d27.coccinelle-saas.pages.dev)
const cloudflarePreviewPattern = /^https:\/\/[a-z0-9]+\.coccinelle-saas\.pages\.dev$/;

export function getCorsHeaders(request) {
  const origin = request.headers.get('Origin') || '';

  // Vérifier si l'origine est dans la liste OU correspond au pattern Cloudflare Pages
  const isAllowed = allowedOrigins.includes(origin) || cloudflarePreviewPattern.test(origin);
  const allowedOrigin = isAllowed ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-tenant-id, x-user-id',
  };
}

// Pour compatibilité avec l'ancien code
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-tenant-id, x-user-id',
};

export function handleCORS(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(request) });
  }
  return null;
}
