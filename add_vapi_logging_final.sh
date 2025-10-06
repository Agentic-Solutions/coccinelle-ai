#!/bin/bash

# Sauvegarde
cp src/index.js src/index.js.backup_before_logging

# Trouver la ligne exacte du return confirmationMessage dans handleCreateAppointment
LINE_NUM=$(grep -n "return confirmationMessage;" src/index.js | head -1 | cut -d: -f1)

if [ -z "$LINE_NUM" ]; then
  echo "❌ Ligne 'return confirmationMessage;' non trouvée"
  exit 1
fi

echo "✅ Trouvé 'return confirmationMessage;' à la ligne $LINE_NUM"

# Créer le code de logging à insérer
cat > /tmp/vapi_logging_code.txt << 'ENDOFLOG'
  
  // Logger l'appel Vapi dans vapi_call_logs
  try {
    await logVapiCall(env, {
      call_id: ctx?.callId || `call_${Date.now()}`,
      tenant_id: tenant.id,
      phone_number: phone,
      status: 'completed',
      prospect_id: prospectId,
      prospect_name: `${firstName} ${lastName}`,
      prospect_email: email,
      functions_called: ['createAppointment'],
      appointment_created: true,
      appointment_id: appointmentId
    });
    console.log('✅ Appel Vapi loggé avec succès');
  } catch (logError) {
    console.error('⚠️ Erreur logging Vapi:', logError);
  }

ENDOFLOG

# Insérer le code avant le return
sed -i.bak "${LINE_NUM}r /tmp/vapi_logging_code.txt" src/index.js

echo "✅ Logging Vapi ajouté avant le return à la ligne $LINE_NUM"
echo "📁 Sauvegarde : src/index.js.backup_before_logging"

