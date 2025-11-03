#!/bin/bash
set -e

echo "🎨 Conversion des composants au style minimaliste"

COMP_DIR="src/components/onboarding"

# Fonction pour convertir les classes Tailwind
convert_styles() {
    local file=$1
    echo "✏️  Conversion: $(basename $file)"
    
    # Remplacements de couleurs
    sed -i '' 's/bg-gradient-to-br from-blue-50 to-indigo-100/bg-white dark:bg-black/g' "$file"
    sed -i '' 's/bg-blue-600/bg-black dark:bg-white/g' "$file"
    sed -i '' 's/hover:bg-blue-700/hover:bg-neutral-800 dark:hover:bg-neutral-200/g' "$file"
    sed -i '' 's/text-blue-600/text-black dark:text-white/g' "$file"
    sed -i '' 's/text-white/text-white dark:text-black/g' "$file"
    sed -i '' 's/bg-white rounded-2xl shadow-xl/bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-sm/g' "$file"
    sed -i '' 's/bg-blue-50/bg-neutral-50 dark:bg-neutral-900/g' "$file"
    sed -i '' 's/bg-green-50/bg-neutral-50 dark:bg-neutral-900/g' "$file"
    sed -i '' 's/bg-purple-50/bg-neutral-50 dark:bg-neutral-900/g' "$file"
    sed -i '' 's/bg-yellow-50/bg-neutral-50 dark:bg-neutral-900/g' "$file"
    sed -i '' 's/text-gray-600/text-neutral-600 dark:text-neutral-400/g' "$file"
    sed -i '' 's/text-gray-700/text-neutral-700 dark:text-neutral-300/g' "$file"
    sed -i '' 's/text-gray-800/text-neutral-800 dark:text-neutral-200/g' "$file"
    sed -i '' 's/border-gray-300/border-neutral-300 dark:border-neutral-700/g' "$file"
    sed -i '' 's/border-2 border-blue-500/border-2 border-black dark:border-white/g' "$file"
    sed -i '' 's/bg-indigo-600/bg-black dark:bg-white/g' "$file"
    sed -i '' 's/hover:bg-indigo-700/hover:bg-neutral-800 dark:hover:bg-neutral-200/g' "$file"
}

# Convertir tous les composants
for file in "$COMP_DIR"/*.jsx; do
    if [ -f "$file" ]; then
        convert_styles "$file"
    fi
done

echo "✅ Conversion terminée"
