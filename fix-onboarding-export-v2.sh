#!/bin/bash
set -e

echo "🔧 Ajout de l'export à onboarding-routes.js (version macOS)"

# Restaurer le backup
if [ -f "src/onboarding-routes.js.backup-before-export"* ]; then
    BACKUP=$(ls -t src/onboarding-routes.js.backup-before-export* | head -n 1)
    cp "$BACKUP" src/onboarding-routes.js
    echo "✅ Backup restauré"
fi

# Compter les lignes
TOTAL_LINES=$(wc -l < src/onboarding-routes.js | tr -d ' ')
echo "📊 Fichier original: $TOTAL_LINES lignes"

# Créer le nouveau fichier avec header + export
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

# Ajouter le contenu original (sauf les 8 premières lignes)
tail -n +9 src/onboarding-routes.js >> src/onboarding-routes.js.new

# Calculer le nombre de lignes à garder (toutes sauf la dernière)
LINES_TO_KEEP=$(($(wc -l < src/onboarding-routes.js.new | tr -d ' ') - 1))

# Garder toutes les lignes sauf la dernière, puis ajouter return null + }
sed -n "1,${LINES_TO_KEEP}p" src/onboarding-routes.js.new > src/onboarding-routes.js.temp

# Ajouter la fin
cat >> src/onboarding-routes.js.temp << 'EOF'

  // Aucune route Onboarding ne correspond
  return null;
}
EOF

# Remplacer
mv src/onboarding-routes.js.temp src/onboarding-routes.js
rm -f src/onboarding-routes.js.new

echo "✅ Export ajouté avec succès"
NEW_LINES=$(wc -l < src/onboarding-routes.js | tr -d ' ')
echo "📊 Nouveau fichier: $NEW_LINES lignes"
echo "📈 Différence: +$((NEW_LINES - TOTAL_LINES)) lignes"

# Vérifier l'export
echo ""
echo "🔍 Vérification de l'export:"
head -n 15 src/onboarding-routes.js | grep -A 3 "export"
