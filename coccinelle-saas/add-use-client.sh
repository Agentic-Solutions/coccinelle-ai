#!/bin/bash
set -e

echo "🔧 Ajout de 'use client' aux composants Onboarding"

# Dossier des composants
COMPONENTS_DIR="src/components/onboarding"

# Vérifier que le dossier existe
if [ ! -d "$COMPONENTS_DIR" ]; then
    echo "❌ Dossier $COMPONENTS_DIR introuvable"
    exit 1
fi

# Créer un backup du dossier complet
BACKUP_DIR="${COMPONENTS_DIR}.backup-$(date +%Y%m%d-%H%M%S)"
cp -r "$COMPONENTS_DIR" "$BACKUP_DIR"
echo "💾 Backup créé: $BACKUP_DIR"

# Compteur de fichiers modifiés
COUNT=0

# Pour chaque fichier .jsx dans le dossier
for file in "$COMPONENTS_DIR"/*.jsx; do
    if [ -f "$file" ]; then
        # Vérifier si 'use client' est déjà présent
        if ! grep -q "^'use client'" "$file"; then
            echo "✏️  Ajout à: $(basename $file)"
            
            # Créer un fichier temporaire avec 'use client' en premier
            echo "'use client';" > "$file.tmp"
            echo "" >> "$file.tmp"
            cat "$file" >> "$file.tmp"
            
            # Remplacer le fichier original
            mv "$file.tmp" "$file"
            
            COUNT=$((COUNT + 1))
        else
            echo "⏭️  Déjà présent: $(basename $file)"
        fi
    fi
done

echo ""
echo "🎉 TERMINÉ !"
echo "✅ $COUNT fichiers modifiés"
echo "💾 Backup disponible dans: $BACKUP_DIR"
echo ""
echo "📋 Prochaine étape: démarrer le frontend avec 'npm run dev'"
