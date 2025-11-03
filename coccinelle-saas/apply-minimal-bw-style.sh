#!/bin/bash
set -e

echo "🎨 Application du style noir/blanc Coccinelle.AI"

COMP_DIR="src/components/onboarding"

for file in "$COMP_DIR"/*.jsx; do
    if [ -f "$file" ]; then
        echo "✏️  $(basename $file)"
        
        # Supprimer TOUTES les couleurs et remplacer par noir/blanc/gris
        sed -i '' 's/bg-neutral-50/bg-white/g' "$file"
        sed -i '' 's/bg-neutral-900/bg-black/g' "$file"
        sed -i '' 's/bg-black dark:bg-white/bg-black/g' "$file"
        sed -i '' 's/bg-white dark:bg-black/bg-white/g' "$file"
        sed -i '' 's/text-white dark:text-black/text-white/g' "$file"
        sed -i '' 's/text-black dark:text-white/text-black/g' "$file"
        sed -i '' 's/border-neutral-200 dark:border-neutral-800/border-gray-200/g' "$file"
        sed -i '' 's/border-neutral-300 dark:border-neutral-700/border-gray-300/g' "$file"
        sed -i '' 's/text-neutral-600 dark:text-neutral-400/text-gray-600/g' "$file"
        sed -i '' 's/text-neutral-700 dark:text-neutral-300/text-gray-700/g' "$file"
        sed -i '' 's/text-neutral-800 dark:text-neutral-200/text-gray-900/g' "$file"
        sed -i '' 's/hover:bg-neutral-800 dark:hover:bg-neutral-200/hover:bg-gray-800/g' "$file"
        sed -i '' 's/hover:bg-neutral-50/hover:bg-gray-50/g' "$file"
        sed -i '' 's/shadow-sm/shadow-none/g' "$file"
    fi
done

echo "✅ Style noir/blanc appliqué"
