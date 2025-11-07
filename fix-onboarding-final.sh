#!/bin/bash
set -e

echo "🔧 Correction finale de onboarding-routes.js"

# Restaurer le vrai backup
BACKUP=$(ls -t src/onboarding-routes.js.backup-before-export* 2>/dev/null | head -n 1)
if [ -n "$BACKUP" ]; then
    cp "$BACKUP" src/onboarding-routes.js
    echo "✅ Backup restauré"
fi

# Chercher si handleOnboardingRoutes existe SANS export
if grep -q "^async function handleOnboardingRoutes" src/onboarding-routes.js; then
    echo "📝 Fonction handleOnboardingRoutes trouvée (non exportée)"
    echo "🔧 Ajout de l'export..."
    
    # Remplacer "async function" par "export async function" seulement pour handleOnboardingRoutes
    sed -i '' 's/^async function handleOnboardingRoutes/export async function handleOnboardingRoutes/' src/onboarding-routes.js
    
    echo "✅ Export ajouté"
elif grep -q "^export async function handleOnboardingRoutes" src/onboarding-routes.js; then
    echo "✅ Export déjà présent"
else
    echo "❌ Fonction handleOnboardingRoutes introuvable"
    echo "📋 Fonctions trouvées:"
    grep "^function\|^async function\|^export" src/onboarding-routes.js | head -n 10
    exit 1
fi

# Vérifier syntaxe
if node --check src/onboarding-routes.js 2>/dev/null; then
    echo "✅ Syntaxe valide"
else
    echo "❌ Erreur syntaxe"
    exit 1
fi

echo "🎉 Fichier corrigé avec succès"
wc -l src/onboarding-routes.js
