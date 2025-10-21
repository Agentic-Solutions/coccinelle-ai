// ==============================================================================
// COCCINELLE.AI - BACKEND API
// Version : 2.3.0 (Appointments Fixed for scheduled_at)
// Stack : Cloudflare Workers + D1 + Vectorize + OpenAI + Anthropic
// ==============================================================================

import { processText } from './text-processing.js';
import { processDocumentEmbeddings, getEmbeddingsStatus } from './embeddings.js';
import { ragPipeline, hybridSearch, upsertToVectorize } from './search.js';

// ==============================================================================
// CONFIGURATION
// ==============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
  'Content-Type': 'application/json'
};

// ==============================================================================
// HELPER FUNCTIONS
// ==============================================================================

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: CORS_HEADERS
  });
}

function errorResponse(message, status = 500, details = null) {
  return jsonResponse({
    success: false,
    error: message,
    details,
    timestamp: new Date().toISOString()
  }, status);
}

async function validateTenant(db, tenantId) {
  if (!tenantId) return false;
  
  const tenant = await db.prepare(
    'SELECT id FROM tenants WHERE id = ? AND is_active = 1'
  ).bind(tenantId).first();
  
  return !!tenant;
}

// ==============================================================================
// KNOWLEDGE BASE HANDLERS
// ==============================================================================

async function handleGetDocuments(env, tenantId) {
  try {
    const query = tenantId
      ? 'SELECT * FROM knowledge_documents WHERE tenant_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM knowledge_documents ORDER BY created_at DESC LIMIT 100';
    
    const stmt = tenantId 
      ? env.DB.prepare(query).bind(tenantId)
      : env.DB.prepare(query);
    
    const result = await stmt.all();
    
    return jsonResponse({
      success: true,
      documents: result.results || []
    });
  } catch (error) {
    console.error('[GET_DOCUMENTS] Error:', error);
    return errorResponse('Failed to fetch documents', 500, error.message);
  }
}

async function handleProcessDocument(env, documentId, ctx) {
  try {
    console.log(`[PROCESS_DOCUMENT] Starting for doc: ${documentId}`);
    
    const document = await env.DB.prepare(
      'SELECT * FROM knowledge_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!document) {
      return errorResponse('Document not found', 404);
    }
    
    await env.DB.prepare(
      'UPDATE knowledge_documents SET status = ? WHERE id = ?'
    ).bind('processing', documentId).run();
    
    const chunks = await processText(document.content, {
      chunkSize: 500,
      chunkOverlap: 50
    });
    
    console.log(`[PROCESS_DOCUMENT] Created ${chunks.length} chunks`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${documentId}-chunk-${i}`;
      await env.DB.prepare(
        `INSERT OR REPLACE INTO knowledge_chunks 
         (id, document_id, chunk_index, content, token_count) 
         VALUES (?, ?, ?, ?, ?)`
      ).bind(chunkId, documentId, i, chunks[i].text, chunks[i].tokens).run();
    }
    
    await env.DB.prepare(
      'UPDATE knowledge_documents SET status = ?, chunk_count = ? WHERE id = ?'
    ).bind('processed', chunks.length, documentId).run();
    
    ctx.waitUntil(
      processDocumentEmbeddings(env, documentId).catch(err => {
        console.error('[PROCESS_DOCUMENT] Embeddings error:', err);
      })
    );
    
    return jsonResponse({
      success: true,
      message: 'Document processed successfully',
      chunks: chunks.length
    });
  } catch (error) {
    console.error('[PROCESS_DOCUMENT] Error:', error);
    await env.DB.prepare(
      'UPDATE knowledge_documents SET status = ? WHERE id = ?'
    ).bind('error', documentId).run();
    return errorResponse('Document processing failed', 500, error.message);
  }
}

async function handleGenerateEmbeddings(env, documentId, ctx) {
  try {
    console.log(`[GENERATE_EMBEDDINGS] Starting for doc: ${documentId}`);
    
    const document = await env.DB.prepare(
      'SELECT * FROM knowledge_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!document) {
      return errorResponse('Document not found', 404);
    }
    
    await env.DB.prepare(
      'UPDATE knowledge_documents SET status = ? WHERE id = ?'
    ).bind('embedding', documentId).run();
    
    ctx.waitUntil(
      processDocumentEmbeddings(env, documentId)
        .then(async () => {
          await env.DB.prepare(
            'UPDATE knowledge_documents SET status = ? WHERE id = ?'
          ).bind('indexed', documentId).run();
          console.log(`[GENERATE_EMBEDDINGS] Completed for doc: ${documentId}`);
        })
        .catch(async (error) => {
          console.error('[GENERATE_EMBEDDINGS] Error:', error);
          await env.DB.prepare(
            'UPDATE knowledge_documents SET status = ? WHERE id = ?'
          ).bind('error', documentId).run();
        })
    );
    
    return jsonResponse({
      success: true,
      message: 'Embeddings generation started',
      documentId
    });
  } catch (error) {
    console.error('[GENERATE_EMBEDDINGS] Error:', error);
    return errorResponse('Failed to generate embeddings', 500, error.message);
  }
}

async function handleGetEmbeddingsStatus(env, documentId) {
  try {
    const status = await getEmbeddingsStatus(env, documentId);
    return jsonResponse({
      success: true,
      status
    });
  } catch (error) {
    console.error('[GET_EMBEDDINGS_STATUS] Error:', error);
    return errorResponse('Failed to get embeddings status', 500, error.message);
  }
}

async function handleSearch(env, body) {
  try {
    const { query, tenantId, limit = 5 } = body;
    
    if (!query) {
      return errorResponse('Query is required', 400);
    }
    
    console.log(`[SEARCH] Query: ${query}, Tenant: ${tenantId}`);
    
    const results = await hybridSearch(env, query, {
      tenantId,
      limit
    });
    
    return jsonResponse({
      success: true,
      results
    });
  } catch (error) {
    console.error('[SEARCH] Error:', error);
    return errorResponse('Search failed', 500, error.message);
  }
}

async function handleAsk(env, body) {
  try {
    const { question, tenantId } = body;
    
    if (!question) {
      return errorResponse('Question is required', 400);
    }
    
    console.log(`[ASK] Question: ${question}, Tenant: ${tenantId}`);
    
    const answer = await ragPipeline(env, question, {
      tenantId
    });
    
    return jsonResponse({
      success: true,
      answer
    });
  } catch (error) {
    console.error('[ASK] Error:', error);
    return errorResponse('Failed to generate answer', 500, error.message);
  }
}

async function handleSyncVectorize(env, body) {
  try {
    const { documentId } = body;
    
    if (!documentId) {
      return errorResponse('documentId is required', 400);
    }
    
    console.log(`[SYNC_VECTORIZE] Syncing document: ${documentId}`);
    
    const chunks = await env.DB.prepare(
      'SELECT * FROM knowledge_chunks WHERE document_id = ?'
    ).bind(documentId).all();
    
    if (!chunks.results || chunks.results.length === 0) {
      return errorResponse('No chunks found for this document', 404);
    }
    
    for (const chunk of chunks.results) {
      if (chunk.embedding_vector) {
        const embedding = JSON.parse(chunk.embedding_vector);
        await upsertToVectorize(env, chunk.id, embedding, {
          document_id: documentId,
          chunk_index: chunk.chunk_index,
          content: chunk.content
        });
      }
    }
    
    return jsonResponse({
      success: true,
      message: `Synced ${chunks.results.length} chunks to Vectorize`
    });
  } catch (error) {
    console.error('[SYNC_VECTORIZE] Error:', error);
    return errorResponse('Failed to sync to Vectorize', 500, error.message);
  }
}

// ==============================================================================
// APPOINTMENTS HANDLERS (FIXED FOR scheduled_at)
// ==============================================================================

async function handleGetAppointments(env, tenantId) {
  try {
    const appointments = await env.DB.prepare(`
      SELECT 
        a.*,
        p.first_name || ' ' || COALESCE(p.last_name, '') as prospect_name,
        p.phone as prospect_phone,
        p.email as prospect_email,
        ag.first_name || ' ' || ag.last_name as agent_name,
        ag.email as agent_email
      FROM appointments a
      LEFT JOIN prospects p ON a.prospect_id = p.id
      LEFT JOIN agents ag ON a.agent_id = ag.id
      WHERE a.tenant_id = ?
      ORDER BY a.scheduled_at DESC
      LIMIT 100
    `).bind(tenantId || 'tenant_demo_001').all();

    return jsonResponse({
      success: true,
      appointments: appointments.results || []
    });
  } catch (error) {
    console.error('[GET_APPOINTMENTS] Error:', error);
    return errorResponse('Failed to fetch appointments', 500, error.message);
  }
}

async function handleGetAppointmentDetail(env, appointmentId, tenantId) {
  try {
    const appointment = await env.DB.prepare(`
      SELECT 
        a.*,
        p.first_name || ' ' || COALESCE(p.last_name, '') as prospect_name,
        p.phone as prospect_phone,
        p.email as prospect_email,
        ag.first_name || ' ' || ag.last_name as agent_name,
        ag.email as agent_email
      FROM appointments a
      LEFT JOIN prospects p ON a.prospect_id = p.id
      LEFT JOIN agents ag ON a.agent_id = ag.id
      WHERE a.id = ? AND a.tenant_id = ?
    `).bind(appointmentId, tenantId || 'tenant_demo_001').first();

    if (!appointment) {
      return errorResponse('Rendez-vous introuvable', 404);
    }

    return jsonResponse({
      success: true,
      appointment
    });
  } catch (error) {
    console.error('[GET_APPOINTMENT_DETAIL] Error:', error);
    return errorResponse('Failed to fetch appointment', 500, error.message);
  }
}

async function handleCreateAppointment(env, body) {
  try {
    const { prospect_id, agent_id, appointment_date, appointment_time, notes } = body;
    const tenantId = body.tenantId || 'tenant_demo_001';

    if (!prospect_id || !agent_id || !appointment_date || !appointment_time) {
      return errorResponse('Champs requis : prospect_id, agent_id, appointment_date, appointment_time', 400);
    }

    const appointmentId = `rdv-${Date.now()}`;
    const managementToken = `token-${appointmentId}`;
    const scheduledAt = `${appointment_date}T${appointment_time}:00`;

    await env.DB.prepare(`
      INSERT INTO appointments (
        id, tenant_id, prospect_id, agent_id, 
        type, scheduled_at, duration_minutes, 
        status, management_token, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      appointmentId,
      tenantId,
      prospect_id,
      agent_id,
      'visite',
      scheduledAt,
      60,
      'scheduled',
      managementToken,
      notes || null
    ).run();

    const newAppointment = await env.DB.prepare(`
      SELECT 
        a.*,
        p.first_name || ' ' || COALESCE(p.last_name, '') as prospect_name,
        p.phone as prospect_phone,
        ag.first_name || ' ' || ag.last_name as agent_name
      FROM appointments a
      LEFT JOIN prospects p ON a.prospect_id = p.id
      LEFT JOIN agents ag ON a.agent_id = ag.id
      WHERE a.id = ?
    `).bind(appointmentId).first();

    return jsonResponse({
      success: true,
      appointment: newAppointment,
      message: 'Rendez-vous créé avec succès'
    }, 201);
  } catch (error) {
    console.error('[CREATE_APPOINTMENT] Error:', error);
    return errorResponse('Failed to create appointment', 500, error.message);
  }
}

async function handleUpdateAppointment(env, appointmentId, body) {
  try {
    const { appointment_date, appointment_time, status, notes } = body;
    const tenantId = body.tenantId || 'tenant_demo_001';

    let scheduledAt = null;
    if (appointment_date && appointment_time) {
      scheduledAt = `${appointment_date}T${appointment_time}:00`;
    }

    const updates = [];
    const params = [];

    if (scheduledAt) {
      updates.push('scheduled_at = ?');
      params.push(scheduledAt);
    }
    if (status) {
      updates.push('status = ?');
      params.push(status);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }

    if (updates.length === 0) {
      return errorResponse('Aucune modification fournie', 400);
    }

    updates.push('updated_at = datetime("now")');
    params.push(appointmentId, tenantId);

    await env.DB.prepare(`
      UPDATE appointments 
      SET ${updates.join(', ')}
      WHERE id = ? AND tenant_id = ?
    `).bind(...params).run();

    const updatedAppointment = await env.DB.prepare(`
      SELECT 
        a.*,
        p.first_name || ' ' || COALESCE(p.last_name, '') as prospect_name,
        p.phone as prospect_phone,
        ag.first_name || ' ' || ag.last_name as agent_name
      FROM appointments a
      LEFT JOIN prospects p ON a.prospect_id = p.id
      LEFT JOIN agents ag ON a.agent_id = ag.id
      WHERE a.id = ?
    `).bind(appointmentId).first();

    return jsonResponse({
      success: true,
      appointment: updatedAppointment,
      message: 'Rendez-vous modifié avec succès'
    });
  } catch (error) {
    console.error('[UPDATE_APPOINTMENT] Error:', error);
    return errorResponse('Failed to update appointment', 500, error.message);
  }
}

async function handleDeleteAppointment(env, appointmentId, tenantId) {
  try {
    const result = await env.DB.prepare(`
      DELETE FROM appointments 
      WHERE id = ? AND tenant_id = ?
    `).bind(appointmentId, tenantId || 'tenant_demo_001').run();

    if (result.meta.changes === 0) {
      return errorResponse('Rendez-vous introuvable', 404);
    }

    return jsonResponse({
      success: true,
      message: 'Rendez-vous supprimé avec succès'
    });
  } catch (error) {
    console.error('[DELETE_APPOINTMENT] Error:', error);
    return errorResponse('Failed to delete appointment', 500, error.message);
  }
}

async function handleGetProspects(env, tenantId) {
  try {
    const query = tenantId
      ? 'SELECT * FROM prospects WHERE tenant_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM prospects ORDER BY created_at DESC LIMIT 100';
    
    const stmt = tenantId 
      ? env.DB.prepare(query).bind(tenantId)
      : env.DB.prepare(query);
    
    const result = await stmt.all();
    
    return jsonResponse({
      success: true,
      prospects: result.results || []
    });
  } catch (error) {
    console.error('[GET_PROSPECTS] Error:', error);
    return errorResponse('Failed to fetch prospects', 500, error.message);
  }
}

async function handleGetAgents(env, tenantId) {
  try {
    const query = tenantId
      ? 'SELECT * FROM agents WHERE tenant_id = ? AND is_active = 1'
      : 'SELECT * FROM agents WHERE is_active = 1 LIMIT 100';
    
    const stmt = tenantId 
      ? env.DB.prepare(query).bind(tenantId)
      : env.DB.prepare(query);
    
    const result = await stmt.all();
    
    return jsonResponse({
      success: true,
      agents: result.results || []
    });
  } catch (error) {
    console.error('[GET_AGENTS] Error:', error);
    return errorResponse('Failed to fetch agents', 500, error.message);
  }
}

// ==============================================================================
// MAIN HANDLER
// ==============================================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    console.log(`[REQUEST] ${method} ${path}`);

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    try {
      // ========================================
      // KNOWLEDGE BASE ENDPOINTS
      // ========================================

      if (path === "/api/v1/knowledge/documents" && method === "POST") {
        try {
          const body = await request.json();
          const { title, content, source_type = "manual", source_url = "" } = body;

          if (!title || !content) {
            return jsonResponse({ error: "title and content are required" }, 400);
          }

          const docId = `doc-${Date.now()}`;
          const tenantId = "tenant_demo_001";

          await env.DB.prepare(
            `INSERT INTO knowledge_documents (id, tenant_id, title, content, source_type, source_url, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).bind(docId, tenantId, title, content, source_type, source_url, "pending").run();

          return jsonResponse({
            success: true,
            document: {
              id: docId,
              tenant_id: tenantId,
              title,
              content,
              source_type,
              source_url,
              status: "pending"
            }
          }, 201);
        } catch (error) {
          return jsonResponse({ error: error.message }, 500);
        }
      }

      if (path === '/api/v1/knowledge/documents' && method === 'GET') {
        const tenantId = url.searchParams.get('tenantId');
        return await handleGetDocuments(env, tenantId);
      }

      if (path.match(/^\/api\/v1\/knowledge\/documents\/[^/]+\/process$/) && method === 'POST') {
        const documentId = path.split('/')[5];
        return await handleProcessDocument(env, documentId, ctx);
      }

      if (path.match(/^\/api\/v1\/knowledge\/documents\/[^/]+\/embeddings$/) && method === 'POST') {
        const documentId = path.split('/')[5];
        return await handleGenerateEmbeddings(env, documentId, ctx);
      }

      if (path.match(/^\/api\/v1\/knowledge\/documents\/[^/]+\/embeddings\/status$/) && method === 'GET') {
        const documentId = path.split('/')[5];
        return await handleGetEmbeddingsStatus(env, documentId);
      }

      if (path === '/api/v1/knowledge/search' && method === 'POST') {
        const body = await request.json();
        return await handleSearch(env, body);
      }

      if (path === '/api/v1/knowledge/ask' && method === 'POST') {
        const body = await request.json();
        return await handleAsk(env, body);
      }

      if (path === '/api/v1/knowledge/sync-vectorize' && method === 'POST') {
        const body = await request.json();
        return await handleSyncVectorize(env, body);
      }

      // ========================================
      // APPOINTMENTS ENDPOINTS (FIXED)
      // ========================================

      if (path === '/api/v1/appointments' && method === 'GET') {
        const tenantId = url.searchParams.get('tenantId');
        return await handleGetAppointments(env, tenantId);
      }

      if (path.match(/^\/api\/v1\/appointments\/[^/]+$/) && method === 'GET') {
        const appointmentId = path.split('/')[4];
        const tenantId = url.searchParams.get('tenantId');
        return await handleGetAppointmentDetail(env, appointmentId, tenantId);
      }

      if (path === '/api/v1/appointments' && method === 'POST') {
        const body = await request.json();
        return await handleCreateAppointment(env, body);
      }

      if (path.match(/^\/api\/v1\/appointments\/[^/]+$/) && method === 'PUT') {
        const appointmentId = path.split('/')[4];
        const body = await request.json();
        return await handleUpdateAppointment(env, appointmentId, body);
      }

      if (path.match(/^\/api\/v1\/appointments\/[^/]+$/) && method === 'DELETE') {
        const appointmentId = path.split('/')[4];
        const tenantId = url.searchParams.get('tenantId');
        return await handleDeleteAppointment(env, appointmentId, tenantId);
      }

      if (path === '/api/v1/prospects' && method === 'GET') {
        const tenantId = url.searchParams.get('tenantId');
        return await handleGetProspects(env, tenantId);
      }

      if (path === '/api/v1/agents' && method === 'GET') {
        const tenantId = url.searchParams.get('tenantId');
        return await handleGetAgents(env, tenantId);
      }

      // ========================================
      // VAPI ENDPOINTS
      // ========================================

      if (path === '/api/v1/vapi/stats' && method === 'GET') {
        try {
          const tenantId = 'tenant_demo_001';
          
          const totalCalls = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM vapi_calls WHERE tenant_id = ?'
          ).bind(tenantId).first();
          
          const completedCalls = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM vapi_calls WHERE tenant_id = ? AND status = ?'
          ).bind(tenantId, 'completed').first();
          
          const appointments = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM vapi_calls WHERE tenant_id = ? AND appointment_created = 1'
          ).bind(tenantId).first();
          
          const avgDuration = await env.DB.prepare(
            'SELECT AVG(duration_seconds) as avg FROM vapi_calls WHERE tenant_id = ? AND status = ?'
          ).bind(tenantId, 'completed').first();
          
          const totalCost = await env.DB.prepare(
            'SELECT SUM(CAST(cost_usd AS REAL)) as total FROM vapi_calls WHERE tenant_id = ?'
          ).bind(tenantId).first();
          
          const stats = {
            total_calls: totalCalls.count || 0,
            completed_calls: completedCalls.count || 0,
            appointments_created: appointments.count || 0,
            conversion_rate: totalCalls.count > 0 
              ? ((appointments.count / totalCalls.count) * 100).toFixed(1) + '%'
              : '0%',
            avg_duration_seconds: Math.round(avgDuration.avg || 0),
            total_cost_usd: (totalCost.total || 0).toFixed(4),
            avg_sentiment: '0.75'
          };
          
          return jsonResponse({ success: true, stats });
        } catch (error) {
          console.error('[VAPI_STATS] Error:', error);
          return jsonResponse({ error: error.message }, 500);
        }
      }

      if (path === '/api/v1/vapi/calls' && method === 'GET') {
        try {
          const tenantId = 'tenant_demo_001';
          
          const calls = await env.DB.prepare(
            `SELECT 
              id,
              call_id,
              vapi_call_id,
              status,
              duration_seconds,
              cost_usd,
              prospect_name,
              phone_number,
              appointment_created,
              created_at
            FROM vapi_calls 
            WHERE tenant_id = ?
            ORDER BY created_at DESC
            LIMIT 100`
          ).bind(tenantId).all();
          
          return jsonResponse({ success: true, calls: calls.results || [] });
        } catch (error) {
          console.error('[VAPI_CALLS] Error:', error);
          return jsonResponse({ error: error.message }, 500);
        }
      }

      if (path.match(/^\/api\/v1\/vapi\/calls\/[^/]+$/) && method === 'GET') {
        try {
          const callId = path.split('/')[5];
          const tenantId = 'tenant_demo_001';
          
          const call = await env.DB.prepare(
            `SELECT * FROM vapi_calls WHERE id = ? AND tenant_id = ?`
          ).bind(callId, tenantId).first();
          
          if (!call) {
            return jsonResponse({ success: false, error: 'Call not found' }, 404);
          }
          
          return jsonResponse({ success: true, call });
        } catch (error) {
          console.error('[VAPI_CALL_DETAIL] Error:', error);
          return jsonResponse({ error: error.message }, 500);
        }
      }

      // ========================================
      // Endpoint interne DB pour auth frontend
      // ========================================
      if (url.pathname === "/api/v1/internal/db/query" && request.method === "POST") {
        try {
          const secret = request.headers.get("X-Internal-Secret");
          if (secret !== "dev-secret-123") {
            return jsonResponse({ error: "Unauthorized" }, 401);
          }
          const { query, params } = await request.json();
          const stmt = env.DB.prepare(query);
          let result;
          if (params && params.length > 0) {
            result = await stmt.bind(...params).all();
          } else {
            result = await stmt.all();
          }
          return jsonResponse(result);
        } catch (error) {
          console.error("[INTERNAL DB] Error:", error);
          return jsonResponse({ error: error.message }, 500);
        }
      }

      return errorResponse('Endpoint not found', 404);

    } catch (error) {
      console.error('[MAIN_HANDLER] Unhandled error:', error);
      return errorResponse('Internal server error', 500, error.message);
    }
  }
};
