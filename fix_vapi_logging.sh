#!/bin/bash

# Correction du code de logging Vapi
FICHIER="src/index.js"

# Remplacer vapi_call_id par call_id et corriger la requête SQL
sed -i '' 's/vapi_call_id, call_id, phone_number,/call_id, phone_number,/g' "$FICHIER"
sed -i '' 's/) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime/) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime/g' "$FICHIER"

# Supprimer la ligne vapiCallId de .bind()
sed -i '' '/vapiCallId,$/d' "$FICHIER"

echo "✅ Corrections appliquées"
echo "Vérifie le résultat :"
echo "sed -n '300,330p' src/index.js"
