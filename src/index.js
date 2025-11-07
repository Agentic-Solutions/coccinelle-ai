// Coccinelle.ai - Backend API v2.7.2
// Phase 1: KB Database ✅
// Phase 2: Web Crawler ✅  
// Phase 3: Text Processing ✅ (MODULE SÉPARÉ)
// Phase 4: KB Advanced Endpoints ✅ (DELETE, UPLOAD, LIST CRAWLS)
// Fix: tenant_id ajouté à l'endpoint UPLOAD

// Import du module text processing
import { processDocument } from './text-processing.js';
import { handleAuthRoutes } from './auth-routes.js';
import { initRagRoutes } from './rag-init.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
initRagRoutes(router);
      'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Routes Auth (nouveau v2.5.1)
    const authResponse = await handleAuthRoutes(request, env, ctx, corsHeaders);
    if (authResponse) return authResponse;


    try {
      // ========================================
      // ROUTES KNOWLEDGE BASE (Phase 1 + 2 + 3 + 4)
      // ========================================

      // POST /api/v1/knowledge/crawl - Lancer un crawl
      if (path === '/api/v1/knowledge/crawl' && method === 'POST') {
        const body = await request.json();
        const { url: targetUrl, agentId, serviceId, includePatterns, excludePatterns, maxPages } = body;

        if (!targetUrl || !agentId) {
          return new Response(JSON.stringify({ error: 'url and agentId required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const jobId = `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO knowledge_crawl_jobs (id, url, agent_id, service_id, status, include_patterns, exclude_patterns, max_pages, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          jobId,
          targetUrl,
          agentId,
          serviceId || null,
          'pending',
          includePatterns ? JSON.stringify(includePatterns) : null,
          excludePatterns ? JSON.stringify(excludePatterns) : null,
          maxPages || 50,
          now
        ).run();

        await runCrawl(jobId, targetUrl, agentId, env, maxPages || 50);

        return new Response(JSON.stringify({
          success: true,
          jobId,
          message: 'Crawl started'
        }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /api/v1/knowledge/crawl/:jobId - Status du crawl
      if (path.match(/^\/api\/v1\/knowledge\/crawl\/[^/]+$/) && method === 'GET') {
        const jobId = path.split('/').pop();

        const job = await env.DB.prepare(
          'SELECT * FROM knowledge_crawl_jobs WHERE id = ?'
        ).bind(jobId).first();

        if (!job) {
          return new Response(JSON.stringify({ error: 'Job not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ job }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /api/v1/knowledge/documents - Liste des documents
      if (path === '/api/v1/knowledge/documents' && method === 'GET') {
        const { searchParams } = new URL(request.url);
        const source_type = searchParams.get('source_type');
        let query = 'SELECT * FROM knowledge_documents WHERE 1=1';
        const params = [];

        if (source_type) {
          query += ' AND source_type = ?';
          params.push(source_type);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const result = await env.DB.prepare(query).bind(...params).all();

        for (const doc of result.results || []) {
          const chunkCount = await env.DB.prepare(
            'SELECT COUNT(*) as count FROM knowledge_chunks WHERE document_id = ?'
          ).bind(doc.id).first();
          doc.chunk_count = chunkCount?.count || 0;
        }

        return new Response(JSON.stringify({
          success: true,
          documents: result.results || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /api/v1/knowledge/documents/:id/process - Process un document (PHASE 3)
      if (path.match(/^\/api\/v1\/knowledge\/documents\/[^/]+\/process$/) && method === 'POST') {
        const docId = path.split('/')[5];

        // Lancer le processing en arrière-plan
        ctx.waitUntil(processDocument(env.DB, docId));

        return new Response(JSON.stringify({
          success: true,
          message: 'Document processing started',
          documentId: docId
        }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // DELETE /api/v1/knowledge/documents/:id - Supprimer un document (PHASE 4)
      if (path.match(/^\/api\/v1\/knowledge\/documents\/[^/]+$/) && method === 'DELETE') {
        const docId = path.split('/').pop();
        
        try {
          // 1. Récupérer les chunks pour supprimer de Vectorize
          const chunks = await env.DB.prepare(
            'SELECT id FROM knowledge_chunks WHERE document_id = ?'
          ).bind(docId).all();

          // 2. Supprimer de Vectorize
          if (chunks.results && chunks.results.length > 0) {
            const vectorIds = chunks.results.map(c => c.id);
            try {
              await env.VECTORIZE_INDEX.deleteByIds(vectorIds);
            } catch (e) {
              console.error('Erreur suppression Vectorize:', e);
            }
          }

          // 3. Supprimer les chunks
          await env.DB.prepare(
            'DELETE FROM knowledge_chunks WHERE document_id = ?'
          ).bind(docId).run();

          // 4. Supprimer le document
          await env.DB.prepare(
            'DELETE FROM knowledge_documents WHERE id = ?'
          ).bind(docId).run();

          return new Response(JSON.stringify({
            success: true,
            message: 'Document supprimé avec succès',
            deleted: {
              document_id: docId,
              chunks_count: chunks.results?.length || 0
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // POST /api/v1/knowledge/documents/upload - Upload fichier (PHASE 4 - CORRIGÉ)
      if (path === '/api/v1/knowledge/documents/upload' && method === 'POST') {
        try {
          const body = await request.json();
          const { filename, content, fileType } = body;

          // Vérifier le type de fichier
          const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
          if (!allowedTypes.includes(fileType)) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Type de fichier non supporté. Utilisez TXT, PDF ou DOCX.'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Décoder le contenu base64
          let textContent = '';
          
          if (fileType === 'text/plain') {
            // Pour TXT, décoder directement
            textContent = atob(content);
          } else if (fileType === 'application/pdf') {
            // Pour PDF, on va juste stocker et marquer comme "à traiter"
            textContent = '[PDF - Traitement requis] ' + filename;
          } else {
            // Pour DOCX, pareil
            textContent = '[DOCX - Traitement requis] ' + filename;
          }

          // Créer le hash du contenu
          const encoder = new TextEncoder();
          const data = encoder.encode(textContent);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          // Vérifier si déjà existant
          const existing = await env.DB.prepare(
            'SELECT id FROM knowledge_documents WHERE content_hash = ?'
          ).bind(contentHash).first();

          if (existing) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Ce document existe déjà dans la base'
            }), {
              status: 409,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Insérer le document (AVEC tenant_id)
          const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          await env.DB.prepare(`
            INSERT INTO knowledge_documents (
              id, tenant_id, title, content, source_type, source_url, 
              content_hash, metadata, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            docId,
            'tenant_demo_001',
            filename,
            textContent,
            'upload',
            '',
            contentHash,
            JSON.stringify({ 
              filename: filename,
              fileType: fileType,
              uploadedAt: new Date().toISOString()
            }),
            'pending',
            new Date().toISOString(),
            new Date().toISOString()
          ).run();

          return new Response(JSON.stringify({
            success: true,
            message: 'Fichier uploadé avec succès',
            document: {
              id: docId,
              title: filename,
              status: 'pending',
              type: fileType
            }
          }), {
            status: 201,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // GET /api/v1/knowledge/crawls - Liste des crawls (PHASE 4)
      if (path === '/api/v1/knowledge/crawls' && method === 'GET') {
        try {
          const { searchParams } = new URL(request.url);
          const status = searchParams.get('status');
          const limit = parseInt(searchParams.get('limit') || '20');
          const offset = parseInt(searchParams.get('offset') || '0');

          let query = 'SELECT * FROM knowledge_crawl_jobs WHERE 1=1';
          const params = [];

          if (status) {
            query += ' AND status = ?';
            params.push(status);
          }

          query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
          params.push(limit, offset);

          const crawls = await env.DB.prepare(query).bind(...params).all();

          // Compter le total
          let countQuery = 'SELECT COUNT(*) as total FROM knowledge_crawl_jobs WHERE 1=1';
          const countParams = [];
          if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
          }
          
          const countResult = await env.DB.prepare(countQuery).bind(...countParams).first();

          return new Response(JSON.stringify({
            success: true,
            crawls: crawls.results || [],
            pagination: {
              total: countResult?.total || 0,
              limit,
              offset,
              hasMore: (countResult?.total || 0) > (offset + limit)
            }
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({
            success: false,
            error: error.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      // ========================================
      // ROUTES PROSPECTS
      // ========================================

      if (path === '/api/v1/prospects' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM prospects ORDER BY created_at DESC LIMIT 100'
        ).all();

        return new Response(JSON.stringify({ prospects: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/v1/prospects' && method === 'POST') {
        const body = await request.json();
        const { firstName, lastName, email, phone, budget, location, propertyType, notes } = body;

        if (!firstName || !lastName || !phone) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO prospects (id, first_name, last_name, email, phone, budget, location, property_type, notes, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, firstName, lastName, email || null, phone, budget || null, location || null, propertyType || null, notes || null, now).run();

        const prospect = await env.DB.prepare('SELECT * FROM prospects WHERE id = ?').bind(id).first();

        return new Response(JSON.stringify({ success: true, prospect }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // ROUTES AGENTS
      // ========================================

      if (path === '/api/v1/agents' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM agents WHERE is_active = 1').all();
        return new Response(JSON.stringify({ agents: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // ROUTES SERVICES
      // ========================================

      if (path === '/api/v1/services' && method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM services WHERE is_active = 1').all();
        return new Response(JSON.stringify({ services: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // ROUTES APPOINTMENTS (RDV)
      // ========================================

      if (path === '/api/v1/appointments' && method === 'GET') {
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agent_id');
        const prospectId = searchParams.get('prospect_id');
        const status = searchParams.get('status');

        let query = 'SELECT * FROM appointments WHERE 1=1';
        const params = [];

        if (agentId) {
          query += ' AND agent_id = ?';
          params.push(agentId);
        }

        if (prospectId) {
          query += ' AND prospect_id = ?';
          params.push(prospectId);
        }

        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }

        query += ' ORDER BY appointment_date DESC, appointment_time DESC LIMIT 100';

        const { results } = await env.DB.prepare(query).bind(...params).all();

        return new Response(JSON.stringify({ appointments: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/v1/appointments' && method === 'POST') {
        const body = await request.json();
        const { prospectId, agentId, serviceId, appointmentDate, appointmentTime, duration, notes } = body;

        if (!prospectId || !agentId || !serviceId || !appointmentDate || !appointmentTime) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO appointments (id, prospect_id, agent_id, service_id, appointment_date, appointment_time, duration, notes, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(id, prospectId, agentId, serviceId, appointmentDate, appointmentTime, duration || 30, notes || null, 'scheduled', now).run();

        const appointment = await env.DB.prepare('SELECT * FROM appointments WHERE id = ?').bind(id).first();

        return new Response(JSON.stringify({ success: true, appointment }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // ROUTES VAPI (Agent vocal Sara)
      // ========================================

      // GET /api/v1/vapi/calls - Liste des appels
      if (path === '/api/v1/vapi/calls' && method === 'GET') {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const agentId = searchParams.get('agent_id');
        const limit = parseInt(searchParams.get('limit') || '50');

        let query = 'SELECT * FROM vapi_call_logs WHERE 1=1';
        const params = [];

        if (status) {
          query += ' AND status = ?';
          params.push(status);
        }

        if (agentId) {
          query += ' AND agent_id = ?';
          params.push(agentId);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const { results } = await env.DB.prepare(query).bind(...params).all();

        return new Response(JSON.stringify({
          success: true,
          calls: results
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /api/v1/vapi/stats - Statistiques des appels
      if (path === '/api/v1/vapi/stats' && method === 'GET') {
        const totalCalls = await env.DB.prepare('SELECT COUNT(*) as count FROM vapi_call_logs').first();
        const completedCalls = await env.DB.prepare('SELECT COUNT(*) as count FROM vapi_call_logs WHERE status = ?').bind('completed').first();
        const avgDuration = await env.DB.prepare('SELECT AVG(duration) as avg FROM vapi_call_logs WHERE duration IS NOT NULL').first();

        return new Response(JSON.stringify({
          success: true,
          stats: {
            total_calls: totalCalls?.count || 0,
            completed_calls: completedCalls?.count || 0,
            avg_duration: Math.round(avgDuration?.avg || 0)
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /webhooks/vapi/function-call - Handler pour les tool calls de VAPI
      if (path === '/webhooks/vapi/function-call' && method === 'POST') {
        const body = await request.json();
        const { message } = body;

        if (!message?.toolCalls || message.toolCalls.length === 0) {
          return new Response(JSON.stringify({
            results: []
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const results = [];

        for (const toolCall of message.toolCalls) {
          const { function: func, id: toolCallId } = toolCall;
          const functionName = func.name;
          const args = func.arguments;

          console.log(`[VAPI Tool Call] ${functionName}`, args);

          try {
            let result = null;

            // 1. searchKnowledgeBase
            if (functionName === 'searchKnowledgeBase') {
              const { query } = args;
              
              const searchResult = await env.DB.prepare(`
                SELECT title, content, source_url 
                FROM knowledge_documents 
                WHERE content LIKE ? 
                LIMIT 3
              `).bind(`%${query}%`).all();

              result = {
                found: searchResult.results.length > 0,
                results: searchResult.results,
                count: searchResult.results.length
              };

              await env.DB.prepare(`
                INSERT INTO knowledge_search_logs (id, query, agent_id, created_at)
                VALUES (?, ?, ?, ?)
              `).bind(crypto.randomUUID(), query, 'sara', new Date().toISOString()).run();
            }

            // 2. checkAvailability
            else if (functionName === 'checkAvailability') {
              const { agentId, date } = args;
              
              const appointments = await env.DB.prepare(`
                SELECT appointment_time, duration 
                FROM appointments 
                WHERE agent_id = ? AND appointment_date = ?
              `).bind(agentId, date).all();

              const availableSlots = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
              const bookedSlots = appointments.results.map(a => a.appointment_time);
              const freeSlots = availableSlots.filter(slot => !bookedSlots.includes(slot));

              result = {
                agentId,
                date,
                available: freeSlots.length > 0,
                slots: freeSlots
              };
            }

            // 3. createAppointment
            else if (functionName === 'createAppointment') {
              const { prospectName, prospectPhone, agentId, serviceId, date, time, notes } = args;

              let prospectId = null;
              const existingProspect = await env.DB.prepare(
                'SELECT id FROM prospects WHERE phone = ?'
              ).bind(prospectPhone).first();

              if (existingProspect) {
                prospectId = existingProspect.id;
              } else {
                prospectId = crypto.randomUUID();
                const [firstName, ...lastNameParts] = prospectName.split(' ');
                const lastName = lastNameParts.join(' ') || firstName;

                await env.DB.prepare(`
                  INSERT INTO prospects (id, first_name, last_name, phone, created_at)
                  VALUES (?, ?, ?, ?, ?)
                `).bind(prospectId, firstName, lastName, prospectPhone, new Date().toISOString()).run();
              }

              const appointmentId = crypto.randomUUID();
              await env.DB.prepare(`
                INSERT INTO appointments (id, prospect_id, agent_id, service_id, appointment_date, appointment_time, duration, notes, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).bind(
                appointmentId,
                prospectId,
                agentId,
                serviceId,
                date,
                time,
                30,
                notes || null,
                'scheduled',
                new Date().toISOString()
              ).run();

              result = {
                success: true,
                appointmentId,
                prospectId,
                date,
                time
              };
            }

            results.push({
              toolCallId,
              result
            });

          } catch (error) {
            console.error(`Error executing ${functionName}:`, error);
            results.push({
              toolCallId,
              result: {
                error: error.message
              }
            });
          }
        }

        return new Response(JSON.stringify({
          results
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /webhooks/vapi/call-events - Webhook pour les événements d'appels
      if (path === '/webhooks/vapi/call-events' && method === 'POST') {
        const body = await request.json();
        const { message } = body;

        console.log('[VAPI Event]', message?.type || 'unknown', body);

        if (message?.type === 'end-of-call-report') {
          const callId = message.call?.id || crypto.randomUUID();
          const duration = message.call?.duration || 0;
          const cost = message.call?.cost || 0;
          const transcript = message.transcript || '';

          await env.DB.prepare(`
            INSERT INTO vapi_call_logs (id, call_id, status, duration, cost, transcript, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).bind(
            crypto.randomUUID(),
            callId,
            'completed',
            duration,
            cost,
            transcript,
            new Date().toISOString()
          ).run();
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // ROUTE PAR DÉFAUT
      // ========================================

      return new Response(JSON.stringify({

    // ============================================
    // POST /api/v1/claude/completion
    // ============================================
    if (path === '/api/v1/claude/completion' && method === 'POST') {
      try {
        const { messages, system, max_tokens = 1000 } = await request.json();
        
        if (!messages || !Array.isArray(messages)) {
          return new Response(JSON.stringify({ error: 'Messages required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        console.log('[CLAUDE] Completion:', messages.length, 'messages');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens,
            messages,
            ...(system && { system })
          })
        });
        
        if (!response.ok) {
          console.error('[CLAUDE] API error:', response.status);
          return new Response(JSON.stringify({ error: 'Claude API error' }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const data = await response.json();
        
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('[CLAUDE] Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // ============================================
    // POST /api/v1/knowledge/guided-faqs
    // ============================================
    if (path === '/api/v1/knowledge/guided-faqs' && method === 'POST') {
      try {
        const tenantId = request.headers.get('X-Tenant-ID') || 'tenant_demo_001';
        const { faqs } = await request.json();
        
        if (!faqs || !Array.isArray(faqs)) {
          return new Response(JSON.stringify({ error: 'FAQs required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        console.log(`[GUIDED-FAQS] Creating ${faqs.length} FAQs`);
        
        const db = env.DB;
        let created = 0;
        
        for (const faq of faqs) {
          const docId = `faq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const content = `Q: ${faq.question}\n\nA: ${faq.answer}`;
          
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(content));
          const hash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
          
          await db.prepare(`
            INSERT INTO knowledge_documents (
              id, tenant_id, source_type, title, content, content_hash, 
              word_count, metadata, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).bind(
            docId, tenantId, 'guided_faq', 
            `FAQ: ${faq.question.substring(0, 80)}`, content, hash,
            content.split(/\s+/).length, 
            JSON.stringify({ category: faq.category || 'general', keywords: faq.keywords || '' }),
            'pending', new Date().toISOString(), new Date().toISOString()
          ).run();
          
          created++;
        }
        
        return new Response(JSON.stringify({ success: true, created }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error('[GUIDED-FAQS] Error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

        error: 'Route not found',
        path,
        method
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// ========================================
// FONCTION CRAWLER (Background)
// ========================================

async function runCrawl(jobId, startUrl, agentId, env, maxPages = 50) {
  const db = env.DB;
  const apiKey = env.OPENAI_API_KEY;
  
  console.log('🔵 [runCrawl] START - jobId:', jobId, 'startUrl:', startUrl);
  
  try {
    // 1. Mettre le job en "running"
    await db.prepare(`
      UPDATE knowledge_crawl_jobs 
      SET status = 'running', started_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), jobId).run();
    
    console.log('🟢 [runCrawl] Job mis en running');

    // 2. Fetch de la page
    console.log('🟢 [runCrawl] Fetching:', startUrl);
    const response = await fetch(startUrl, {
      headers: { 'User-Agent': 'Coccinelle-Bot/1.0' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.log('🟢 [runCrawl] Page fetchée avec succès');

    // 3. Extraire le texte
    const html = await response.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log('🟢 [runCrawl] Texte extrait, longueur:', text.length);

    // 4. Créer le document
    if (text.length > 100) {
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Calculer le hash du contenu
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Compter les mots
      const wordCount = text.split(/\s+/).length;
      
      await db.prepare(`
        INSERT INTO knowledge_documents (
          id, tenant_id, source_type, source_url, 
          title, content, content_hash, word_count, metadata, status, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        docId,
        'tenant_demo_001',
        'crawl',
        startUrl,
        new URL(startUrl).hostname,
        text.substring(0, 50000),
        contentHash,
        wordCount,
        JSON.stringify({ crawl_job_id: jobId, agent_id: agentId }),
        'pending',
        new Date().toISOString(),
        new Date().toISOString()
      ).run();

      console.log('✅ [runCrawl] Document créé:', docId);
      
      // 5. CHUNKING
      console.log('🔄 [runCrawl] Début chunking...');
      
      const { processDocument } = await import('./text-processing.js');
      const chunkResult = await processDocument(db, docId);
      
      if (!chunkResult.success) {
        console.error('❌ [runCrawl] Erreur chunking:', chunkResult.error);
      } else {
        console.log('✅ [runCrawl] Chunking OK:', chunkResult.totalChunks, 'chunks');
        
        // 6. EMBEDDINGS OPENAI
        console.log('🔄 [runCrawl] Début génération embeddings...');
        
        // Récupérer les chunks
        const chunks = await db.prepare(`
          SELECT id, content, token_count 
          FROM knowledge_chunks 
          WHERE document_id = ? 
          ORDER BY chunk_index
        `).bind(docId).all();
        
        let embeddingsGenerated = 0;
        
        for (const chunk of chunks.results || []) {
          try {
            console.log(`[EMBEDDINGS] Processing chunk ${chunk.id}`);
            
            // Appel OpenAI
            const embResponse = await fetch('https://api.openai.com/v1/embeddings', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'text-embedding-3-small',
                input: chunk.content,
                encoding_format: 'float'
              })
            });
            
            if (!embResponse.ok) {
              console.error('[EMBEDDINGS] OpenAI error:', embResponse.status);
              continue;
            }
            
            const embData = await embResponse.json();
            const embedding = embData.data[0].embedding;
            
            // Sauvegarder l'embedding
            await db.prepare(`
              UPDATE knowledge_chunks 
              SET embedding = ?, updated_at = ?
              WHERE id = ?
            `).bind(
              JSON.stringify(embedding),
              new Date().toISOString(),
              chunk.id
            ).run();
            
            embeddingsGenerated++;
            console.log(`[EMBEDDINGS] Chunk ${chunk.id} embedding saved`);
            
            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            
          } catch (error) {
            console.error(`[EMBEDDINGS] Error chunk ${chunk.id}:`, error.message);
          }
        }
        
        // Mettre à jour le statut du document
        if (embeddingsGenerated > 0) {
          await db.prepare(`
            UPDATE knowledge_documents 
            SET status = 'indexed', indexed_at = ?
            WHERE id = ?
          `).bind(new Date().toISOString(), docId).run();
          
          console.log(`✅ [runCrawl] Embeddings OK: ${embeddingsGenerated}/${chunks.results.length}`);
        }
      }
    }

    // 7. Marquer le job comme completed
    await db.prepare(`
      UPDATE knowledge_crawl_jobs 
      SET status = 'completed', completed_at = ?, pages_crawled = 1
      WHERE id = ?
    `).bind(new Date().toISOString(), jobId).run();

    console.log('✅ [runCrawl] Job completed');

  } catch (error) {
    console.error('❌ [runCrawl] ERROR:', error.message);
    
    await db.prepare(`
      UPDATE knowledge_crawl_jobs 
      SET status = 'failed', error_message = ?, completed_at = ?
      WHERE id = ?
    `).bind(error.message, new Date().toISOString(), jobId).run();
  }
}
