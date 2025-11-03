#!/bin/bash
set -e

echo "🔧 Correction des variables d'environnement Vite → Next.js"

COMPONENTS_DIR="src/components/onboarding"

# Backup
BACKUP_DIR="${COMPONENTS_DIR}.backup-env-fix-$(date +%Y%m%d-%H%M%S)"
cp -r "$COMPONENTS_DIR" "$BACKUP_DIR"
echo "💾 Backup: $BACKUP_DIR"

# Remplacer dans tous les fichiers
for file in "$COMPONENTS_DIR"/*.jsx; do
    if [ -f "$file" ]; then
        if grep -q "import\.meta\.env\.VITE_API_URL" "$file"; then
            echo "✏️  Correction: $(basename $file)"
            
            # Remplacer VITE_API_URL par NEXT_PUBLIC_API_URL
            sed -i '' 's/import\.meta\.env\.VITE_API_URL/process.env.NEXT_PUBLIC_API_URL/g' "$file"
        fi
    fi
done

echo "✅ Corrections terminées"
