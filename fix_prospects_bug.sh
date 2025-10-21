#!/bin/bash

echo "🔧 Correction du bug table prospects (colonnes name)..."

# Sauvegarde de sécurité
cp src/index.js src/index.js.backup_avant_fix_final_$(date +%Y%m%d_%H%M%S)

# BUG 1 - Ligne 407 : Remplacer la ligne complète
sed -i '407c\    INSERT INTO prospects (id, tenant_id, first_name, last_name, phone, email, status, created_at)' src/index.js

# BUG 1 - Ligne 408 : Remplacer la ligne complète
sed -i '408c\    VALUES (?, ?, ?, ?, ?, ?, '\''contacted'\'', datetime('\''now'\''))' src/index.js

# BUG 2 - Ligne 633 : Remplacer la ligne complète
sed -i '633c\    INSERT INTO prospects (id, tenant_id, first_name, last_name, phone, email, status, source, notes, created_at)' src/index.js

# BUG 2 - Ligne 634 : Remplacer la ligne complète
sed -i '634c\    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('\''now'\''))' src/index.js

echo "✅ Corrections appliquées !"
echo "📊 Vérification..."

# Vérifier qu'il n'y a plus de bug
if grep -q "INSERT INTO prospects.*tenant_id, name," src/index.js; then
    echo "❌ ERREUR : Bug toujours présent !"
    exit 1
else
    echo "✅ Bug corrigé avec succès !"
    wc -l src/index.js
fi
