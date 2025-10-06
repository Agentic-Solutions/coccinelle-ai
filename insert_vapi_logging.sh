#!/bin/bash

# Script pour insérer le code de logging Vapi dans src/index.js
# À la ligne 296 (juste après console.log('✅ RDV créé'))

FICHIER="src/index.js"
LIGNE_INSERTION=296

# Créer une sauvegarde
cp "$FICHIER" "${FICHIER}.backup_$(date +%Y%m%d_%H%M%S)"

# Créer le code à insérer
cat > /tmp/vapi_logging_insert.txt << 'ENDOFCODE'

    // Log de l'appel dans vapi_call_logs
    try {
      const vapiCallId = ctx?.call?.id || `call_${Date.now()}`;
      const callStatus = 'completed';
      const callDuration = 0;
      const callCost = '0.00';
      
      await env.DB.prepare(`
        INSERT INTO vapi_call_logs (
          id, tenant_id, vapi_call_id, call_id, phone_number,
          status, duration_seconds, cost_usd,
          prospect_id, prospect_name, prospect_email,
          appointment_created, appointment_id,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        `log_${Date.now()}`,
        tenant.id,
        vapiCallId,
        vapiCallId,
        phone || '',
        callStatus,
        callDuration,
        callCost,
        prospectId,
        `${firstName} ${lastName}`,
        email || '',
        1,
        appointmentId
      ).run();
      
      console.log('✅ Appel Vapi loggé dans vapi_call_logs');
    } catch (logError) {
      console.error('❌ Erreur logging Vapi:', logError);
    }
ENDOFCODE

# Créer le nouveau fichier avec l'insertion
{
  head -n $((LIGNE_INSERTION)) "$FICHIER"
  cat /tmp/vapi_logging_insert.txt
  tail -n +$((LIGNE_INSERTION + 1)) "$FICHIER"
} > "${FICHIER}.new"

# Remplacer l'ancien fichier
mv "${FICHIER}.new" "$FICHIER"

# Nettoyer
rm /tmp/vapi_logging_insert.txt

echo "✅ Code de logging inséré à la ligne ${LIGNE_INSERTION}"
echo "✅ Sauvegarde créée : ${FICHIER}.backup_*"
echo ""
echo "Vérifie que l'insertion s'est bien faite :"
echo "sed -n '295,330p' src/index.js"
