// ============================================================================
// VAPI CALL LOGGER - v1.7.0
// ============================================================================

export async function logVapiCall(env, callData) {
  const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    await env.DB.prepare(`
      INSERT INTO vapi_call_logs (
        id, tenant_id, call_id, phone_number, direction, status,
        started_at, ended_at, duration_seconds, cost_usd,
        prospect_id, prospect_name, prospect_email,
        transcript, summary, sentiment_score,
        functions_called, appointment_created, appointment_id,
        error_message, error_type, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      callId,
      callData.tenant_id || 'tenant_demo_001',
      callData.call_id,
      callData.phone_number || null,
      callData.direction || 'inbound',
      callData.status || 'completed',
      callData.started_at || new Date().toISOString(),
      callData.ended_at || new Date().toISOString(),
      callData.duration_seconds || 0,
      callData.cost_usd || 0,
      callData.prospect_id || null,
      callData.prospect_name || null,
      callData.prospect_email || null,
      callData.transcript || null,
      callData.summary || null,
      callData.sentiment_score || null,
      JSON.stringify(callData.functions_called || []),
      callData.appointment_created ? 1 : 0,
      callData.appointment_id || null,
      callData.error_message || null,
      callData.error_type || null,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();
    
    console.log('✅ Vapi call logged:', callId);
    return callId;
  } catch (error) {
    console.error('❌ Error logging Vapi call:', error);
    return null;
  }
}

export async function getVapiCalls(env, tenantId, filters = {}) {
  let query = `
    SELECT * FROM vapi_call_logs 
    WHERE tenant_id = ?
  `;
  const params = [tenantId];
  
  // Filtres optionnels
  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }
  
  if (filters.prospect_id) {
    query += ` AND prospect_id = ?`;
    params.push(filters.prospect_id);
  }
  
  if (filters.date_from) {
    query += ` AND started_at >= ?`;
    params.push(filters.date_from);
  }
  
  if (filters.date_to) {
    query += ` AND started_at <= ?`;
    params.push(filters.date_to);
  }
  
  query += ` ORDER BY started_at DESC LIMIT 100`;
  
  const result = await env.DB.prepare(query).bind(...params).all();
  return result.results || [];
}

export async function getVapiCallById(env, tenantId, callId) {
  const result = await env.DB.prepare(`
    SELECT * FROM vapi_call_logs 
    WHERE id = ? AND tenant_id = ?
  `).bind(callId, tenantId).first();
  
  return result;
}

export async function getVapiStats(env, tenantId) {
  // Statistiques globales
  const stats = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_calls,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
      SUM(CASE WHEN appointment_created = 1 THEN 1 ELSE 0 END) as appointments_created,
      AVG(duration_seconds) as avg_duration,
      SUM(cost_usd) as total_cost,
      AVG(sentiment_score) as avg_sentiment
    FROM vapi_call_logs
    WHERE tenant_id = ?
  `).bind(tenantId).first();
  
  // Taux de conversion
  const conversionRate = stats.total_calls > 0 
    ? (stats.appointments_created / stats.total_calls * 100).toFixed(2)
    : 0;
  
  return {
    total_calls: stats.total_calls || 0,
    completed_calls: stats.completed_calls || 0,
    appointments_created: stats.appointments_created || 0,
    conversion_rate: `${conversionRate}%`,
    avg_duration_seconds: Math.round(stats.avg_duration || 0),
    total_cost_usd: (stats.total_cost || 0).toFixed(2),
    avg_sentiment: stats.avg_sentiment ? stats.avg_sentiment.toFixed(2) : null
  };
}
