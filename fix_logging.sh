#!/bin/bash

# Sauvegarde
cp src/index.js src/index.js.backup_$(date +%s)

# Correction du bloc de logging (lignes 305-335)
sed -i.bak '305,335d' src/index.js

# Insertion du code corrigé à la ligne 305
sed -i '304a\
    // LOGGING VAPI - Enregistrement dans vapi_call_logs\
    try {\
      const vapiCallId = ctx?.call?.id || `call_${Date.now()}`;\
      const callStatus = "completed";\
      const callDuration = 0;\
      const callCost = "0.00";\
      const now = new Date().toISOString();\
\
      await env.DB.prepare(`\
        INSERT INTO vapi_call_logs (\
          id, tenant_id, call_id, phone_number,\
          status, duration_seconds, cost_usd,\
          prospect_id, prospect_name, prospect_email,\
          appointment_created, appointment_id,\
          created_at, updated_at\
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\
      `).bind(\
        `log_${Date.now()}`,\
        tenant.id,\
        vapiCallId,\
        phone || "",\
        callStatus,\
        callDuration,\
        callCost,\
        prospectId,\
        `${firstName} ${lastName}`,\
        email || "",\
        1,\
        appointmentId,\
        now,\
        now\
      ).run();\
\
      console.log("✅ Appel Vapi loggé dans vapi_call_logs - ID:", vapiCallId);\
    } catch (logError) {\
      console.error("❌ Erreur logging Vapi:", logError.message);\
    }
' src/index.js

echo "✅ Correction appliquée !"
