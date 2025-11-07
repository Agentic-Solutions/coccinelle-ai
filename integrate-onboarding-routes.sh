#!/bin/bash
# Script d'intégration des routes Onboarding dans index.js
# Coccinelle.AI v2.8.0 - Autopilot Onboarding

set -e

echo "🚀 Intégration des routes Onboarding dans src/index.js"

# Vérifier les fichiers
if [ ! -f "src/index.js" ]; then
    echo "❌ Erreur: src/index.js introuvable"
    exit 1
fi

if [ ! -f "src/onboarding-routes.js" ]; then
    echo "❌ Erreur: src/onboarding-routes.js introuvable"
    exit 1
fi

echo "✅ Fichiers trouvés"

# Créer backup
BACKUP_FILE="src/index.js.backup-integration-$(date +%Y%m%d-%H%M%S)"
cp src/index.js "$BACKUP_FILE"
echo "💾 Backup: $BACKUP_FILE"

# Modification 1: Ajouter l'import après ligne 10
sed -i '' '10 a\
import { handleOnboardingRoutes } from '"'"'./onboarding-routes.js'"'"';
' src/index.js

# Modification 2: Ajouter les routes après "if (authResponse) return authResponse;"
sed -i '' '/if (authResponse) return authResponse;/a\
\
    // Routes Onboarding (v2.8.0)\
    const onboardingResponse = await handleOnboardingRoutes(request, env, ctx, corsHeaders);\
    if (onboardingResponse) return onboardingResponse;
' src/index.js

echo "✅ Modifications appliquées"

# Vérifier syntaxe
if node --check src/index.js 2>/dev/null; then
    echo "✅ Syntaxe valide"
else
    echo "❌ Erreur syntaxe, restauration..."
    cp "$BACKUP_FILE" src/index.js
    exit 1
fi

echo "🎉 INTÉGRATION RÉUSSIE !"
