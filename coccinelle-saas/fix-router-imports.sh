#!/bin/bash
set -e

echo "🔧 Correction des imports react-router-dom → next/navigation"

COMPONENTS_DIR="src/components/onboarding"

# Backup
BACKUP_DIR="${COMPONENTS_DIR}.backup-router-fix-$(date +%Y%m%d-%H%M%S)"
cp -r "$COMPONENTS_DIR" "$BACKUP_DIR"
echo "💾 Backup: $BACKUP_DIR"

# Remplacer dans tous les fichiers .jsx
for file in "$COMPONENTS_DIR"/*.jsx; do
    if [ -f "$file" ]; then
        if grep -q "react-router-dom" "$file"; then
            echo "✏️  Correction: $(basename $file)"
            
            # Remplacer les imports
            sed -i '' "s/import { useNavigate } from 'react-router-dom'/import { useRouter } from 'next\/navigation'/g" "$file"
            sed -i '' "s/from 'react-router-dom'/from 'next\/navigation'/g" "$file"
            
            # Remplacer useNavigate par useRouter
            sed -i '' 's/const navigate = useNavigate()/const router = useRouter()/g' "$file"
            sed -i '' 's/navigate(/router.push(/g' "$file"
        fi
    fi
done

echo "✅ Corrections terminées"
