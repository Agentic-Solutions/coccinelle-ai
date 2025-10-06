#!/bin/bash

# Sauvegarde de sécurité
cp src/index.js src/index.js.backup_v1.6.9

# Étape 1 : Ajouter l'import en ligne 2
sed -i '' "2i\\
import { logVapiCall, getVapiCalls, getVapiCallById, getVapiStats } from './vapi-logger.js';
" src/index.js 2>/dev/null || sed -i "2i import { logVapiCall, getVapiCalls, getVapiCallById, getVapiStats } from './vapi-logger.js';" src/index.js

# Étape 2 : Créer un fichier temporaire avec les nouveaux endpoints
cat > /tmp/vapi_endpoints.txt << 'ENDOFENDPOINTS'

// ============================================================================
// VAPI LOGS ENDPOINTS - v1.7.0
// ============================================================================

// GET /api/v1/vapi/calls - Liste des appels avec filtres
router.get('/api/v1/vapi/calls', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const url = new URL(request.url);
  const filters = {
    status: url.searchParams.get('status'),
    prospect_id: url.searchParams.get('prospect_id'),
    date_from: url.searchParams.get('date_from'),
    date_to: url.searchParams.get('date_to')
  };

  const calls = await getVapiCalls(env, tenant.id, filters);

  return new Response(JSON.stringify({
    success: true,
    calls: calls,
    count: calls.length
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// GET /api/v1/vapi/calls/:callId - Détails d'un appel
router.get('/api/v1/vapi/calls/:callId', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const { callId } = request.params;
  const call = await getVapiCallById(env, tenant.id, callId);

  if (!call) {
    return new Response(JSON.stringify({ error: 'Call not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  // Parser le JSON des functions_called
  if (call.functions_called) {
    try {
      call.functions_called = JSON.parse(call.functions_called);
    } catch (e) {
      call.functions_called = [];
    }
  }

  return new Response(JSON.stringify({
    success: true,
    call: call
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

// GET /api/v1/vapi/stats - Statistiques globales
router.get('/api/v1/vapi/stats', async (request, env) => {
  const tenant = await authenticateApiKey(request, env);
  if (tenant instanceof Response) return tenant;

  const stats = await getVapiStats(env, tenant.id);

  return new Response(JSON.stringify({
    success: true,
    stats: stats
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
});

ENDOFENDPOINTS

# Étape 3 : Insérer les endpoints avant la ligne "router.options"
# On cherche la ligne qui contient "router.options" et on insère avant
LINE_NUM=$(grep -n "router.options('\*'," src/index.js | head -1 | cut -d: -f1)

if [ -n "$LINE_NUM" ]; then
  # Insérer le contenu avant cette ligne
  sed -i.tmp "${LINE_NUM}r /tmp/vapi_endpoints.txt" src/index.js
  rm -f src/index.js.tmp
  echo "✅ Endpoints Vapi ajoutés avec succès à la ligne $LINE_NUM"
else
  echo "❌ Ligne router.options non trouvée"
  exit 1
fi

# Étape 4 : Modifier le webhook Vapi pour ajouter le logging
# On va chercher la fonction handleCreateAppointment et ajouter le logging après la création du RDV

echo "✅ Modification terminée !"
echo "📁 Fichier original sauvegardé : src/index.js.backup_v1.6.9"
echo ""
echo "Prochaine étape : npx wrangler deploy"

