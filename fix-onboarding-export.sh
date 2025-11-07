#!/bin/bash
set -e

echo "🔧 Ajout de l'export à onboarding-routes.js"

# Créer un nouveau fichier avec l'export
cat > src/onboarding-routes.js.new << 'EOF'
/**
 * ========================================================
 * COCCINELLE.AI - AUTOPILOT ONBOARDING ROUTES
 * Version : v2.8.0
 * Date : 24 octobre 2025
 * Description : Routes API pour le système d'onboarding automatisé
 * ========================================================
 */

/**
 * Handler principal pour toutes les routes Onboarding
 */
export async function handleOnboardingRoutes(request, env, ctx, corsHeaders) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

EOF

# Ajouter tout le contenu du fichier original (sauf les 8 premières lignes de commentaires)
tail -n +9 src/onboarding-routes.js >> src/onboarding-routes.js.new

# Ajouter le return null à la fin (avant le dernier })
# Supprimer le dernier } et ajouter return null + }
head -n -1 src/onboarding-routes.js.new > src/onboarding-routes.js.temp
cat >> src/onboarding-routes.js.temp << 'EOF'

  // Aucune route Onboarding ne correspond
  return null;
}
EOF

# Remplacer le fichier
mv src/onboarding-routes.js.temp src/onboarding-routes.js.new
mv src/onboarding-routes.js.new src/onboarding-routes.js

echo "✅ Export ajouté avec succès"
wc -l src/onboarding-routes.js
