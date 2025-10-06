#!/bin/bash

# On va chercher la fonction handleCreateAppointment dans le webhook Vapi
# et ajouter un appel à logVapiCall après la création du RDV

# Trouver la ligne qui contient "async function handleCreateAppointment"
LINE_START=$(grep -n "async function handleCreateAppointment" src/index.js | cut -d: -f1)

if [ -z "$LINE_START" ]; then
  echo "❌ Fonction handleCreateAppointment non trouvée"
  exit 1
fi

echo "✅ Fonction handleCreateAppointment trouvée à la ligne $LINE_START"

# Créer un patch pour ajouter le logging
cat > /tmp/webhook_logging_patch.txt << 'ENDOFPATCH'

    // Logger l'appel dans vapi_call_logs
    await logVapiCall(env, {
      call_id: toolCallId,
      tenant_id: 'tenant_demo_001',
      phone_number: phone,
      status: 'completed',
      prospect_id: prospectId,
      prospect_name: fullName,
      prospect_email: email,
      functions_called: ['createAppointment'],
      appointment_created: true,
      appointment_id: appointmentId
    });

ENDOFPATCH

# Trouver la ligne qui contient "return { success: true" dans handleCreateAppointment
LINE_RETURN=$(awk "NR>$LINE_START && /return { success: true/ {print NR; exit}" src/index.js)

if [ -n "$LINE_RETURN" ]; then
  # Insérer le logging juste avant le return
  sed -i.tmp "${LINE_RETURN}r /tmp/webhook_logging_patch.txt" src/index.js
  rm -f src/index.js.tmp
  echo "✅ Logging Vapi ajouté à la ligne $LINE_RETURN"
else
  echo "⚠️  Ligne 'return { success: true' non trouvée dans handleCreateAppointment"
fi

echo ""
echo "✅ Webhook Vapi modifié avec succès !"

