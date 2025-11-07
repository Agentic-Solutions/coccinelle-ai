#!/bin/bash
set -e

echo "🔧 Ajout de la fonction handleOnboardingRoutes"

# Ajouter la fonction router à la fin du fichier
cat >> src/onboarding-routes.js << 'EOF'

/**
 * ========================================================
 * ROUTER PRINCIPAL - GÈRE TOUTES LES ROUTES ONBOARDING
 * ========================================================
 */

/**
 * Handler principal pour toutes les routes Onboarding
 * Appelé depuis index.js
 */
export async function handleOnboardingRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  try {
    // GET /api/v1/onboarding/templates
    if (path === '/api/v1/onboarding/templates' && method === 'GET') {
      const result = await getOnboardingTemplates(request, env);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/start
    if (path === '/api/v1/onboarding/start' && method === 'POST') {
      const body = await request.json();
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      const userId = request.headers.get('x-user-id') || 'anonymous';
      
      const result = await startOnboarding(request, env, tenantId, userId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 201 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /api/v1/onboarding/:id/step
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/step$/) && method === 'PUT') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await updateOnboardingStep(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/:id/agents/auto-generate
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/agents\/auto-generate$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await autoGenerateAgents(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/:id/vapi/auto-configure
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/vapi\/auto-configure$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await autoConfigureVapi(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/:id/kb/initialize
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/kb\/initialize$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await initializeKB(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /api/v1/onboarding/:id/status
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/status$/) && method === 'GET') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await getOnboardingStatus(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /api/v1/onboarding/:id/complete
    if (path.match(/^\/api\/v1\/onboarding\/[^/]+\/complete$/) && method === 'POST') {
      const sessionId = path.split('/')[4];
      const tenantId = request.headers.get('x-tenant-id') || 'default';
      
      const result = await completeOnboarding(request, env, sessionId, tenantId);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Aucune route Onboarding ne correspond
    return null;

  } catch (error) {
    console.error('Error in handleOnboardingRoutes:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Erreur serveur',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}
EOF

echo "✅ Fonction handleOnboardingRoutes ajoutée"

# Vérifier syntaxe
if node --check src/onboarding-routes.js 2>/dev/null; then
    echo "✅ Syntaxe JavaScript valide"
else
    echo "❌ Erreur de syntaxe"
    exit 1
fi

# Compter les lignes
NEW_LINES=$(wc -l < src/onboarding-routes.js | tr -d ' ')
echo "📊 Nouveau fichier: $NEW_LINES lignes"

# Vérifier l'export
echo "🔍 Export vérifié:"
grep "export async function handleOnboardingRoutes" src/onboarding-routes.js

echo ""
echo "🎉 FICHIER PRÊT POUR LE DÉPLOIEMENT !"
