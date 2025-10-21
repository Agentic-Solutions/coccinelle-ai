// Coccinelle.ai - Backend API v1.14.0
// Phase 1: KB Database ✅
// Phase 2: Web Crawler ✅  
// Phase 3: Text Processing ✅ (MODULE SÉPARÉ)

// Import du module text processing
import { processDocument } from './text-processing.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // ========================================
      // ROUTES KNOWLEDGE BASE (Phase 1 + 2 + 3)
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

        // Créer un job de crawl
        const jobId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO crawl_jobs (id, agent_id, service_id, start_url, status, created_at)
          VALUES (?, ?, ?, ?, 'pending', ?)
        `).bind(jobId, agentId, serviceId || null, targetUrl, now).run();

        // Lancer le crawl en arrière-plan
        ctx.waitUntil(
          crawlWebsite(env.DB, jobId, targetUrl, agentId, serviceId, {
            includePatterns: includePatterns || [],
            excludePatterns: excludePatterns || [],
            maxPages: maxPages || 50
          })
        );

        return new Response(JSON.stringify({
          success: true,
          jobId,
          message: 'Crawl started in background'
        }), {
          status: 202,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /api/v1/knowledge/crawl/:jobId - Status du crawl
      if (path.match(/^\/api\/v1\/knowledge\/crawl\/[^/]+$/) && method === 'GET') {
        const jobId = path.split('/').pop();

        const job = await env.DB.prepare(`
          SELECT * FROM crawl_jobs WHERE id = ?
        `).bind(jobId).first();

        if (!job) {
          return new Response(JSON.stringify({ error: 'Job not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(job), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // GET /api/v1/knowledge/documents - Liste des documents
      if (path === '/api/v1/knowledge/documents' && method === 'GET') {
        const agentId = url.searchParams.get('agentId');
        const serviceId = url.searchParams.get('serviceId');

        let query = 'SELECT * FROM knowledge_documents WHERE 1=1';
        const params = [];

        if (agentId) {
          query += ' AND agent_id = ?';
          params.push(agentId);
        }

        if (serviceId) {
          query += ' AND service_id = ?';
          params.push(serviceId);
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const { results } = await env.DB.prepare(query).bind(...params).all();

        return new Response(JSON.stringify({
          success: true,
          count: results.length,
          documents: results
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // POST /api/v1/knowledge/documents/:id/process - Process un document (PHASE 3 - NOUVEAU)
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

      if (path.match(/^\/api\/v1\/agents\/[^/]+\/availability$/) && method === 'GET') {
        const agentId = path.split('/')[4];
        const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];

        const { results } = await env.DB.prepare(`
          SELECT * FROM agent_availability 
          WHERE agent_id = ? AND date = ?
          ORDER BY start_time
        `).bind(agentId, date).all();

        return new Response(JSON.stringify({ availability: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // ROUTES APPOINTMENTS
      // ========================================

      if (path === '/api/v1/appointments' && method === 'GET') {
        const agentId = url.searchParams.get('agentId');
        const prospectId = url.searchParams.get('prospectId');

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

        query += ' ORDER BY appointment_date DESC LIMIT 100';

        const { results } = await env.DB.prepare(query).bind(...params).all();

        return new Response(JSON.stringify({ appointments: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/v1/appointments' && method === 'POST') {
        const body = await request.json();
        const { prospectId, agentId, appointmentDate, duration, type, notes } = body;

        if (!prospectId || !agentId || !appointmentDate) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const id = crypto.randomUUID();
        const token = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO appointments (id, prospect_id, agent_id, appointment_date, duration_minutes, type, status, notes, confirmation_token, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?)
        `).bind(id, prospectId, agentId, appointmentDate, duration || 30, type || 'visit', notes || null, token, now).run();

        const appointment = await env.DB.prepare('SELECT * FROM appointments WHERE id = ?').bind(id).first();

        return new Response(JSON.stringify({ success: true, appointment }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // ROUTES VAPI
      // ========================================

      if (path === '/api/v1/vapi/calls' && method === 'GET') {
        const { results } = await env.DB.prepare(
          'SELECT * FROM vapi_calls ORDER BY created_at DESC LIMIT 100'
        ).all();

        return new Response(JSON.stringify({ calls: results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === '/api/v1/vapi/stats' && method === 'GET') {
        const stats = await env.DB.prepare(`
          SELECT 
            COUNT(*) as total_calls,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_calls,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_calls,
            AVG(duration_seconds) as avg_duration
          FROM vapi_calls
        `).first();

        return new Response(JSON.stringify(stats), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // WEBHOOK VAPI
      // ========================================

      if (path === '/webhooks/vapi/function-call' && method === 'POST') {
        const body = await request.json();
        const { message } = body;

        if (!message || !message.functionCall) {
          return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { name, parameters } = message.functionCall;

        if (name === 'checkAvailability') {
          const { agentId, date } = parameters;

          if (!agentId || !date) {
            return new Response(JSON.stringify({
              results: [{
                functionName: 'checkAvailability',
                result: { error: 'agentId and date are required' }
              }]
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { results } = await env.DB.prepare(`
            SELECT start_time, end_time FROM agent_availability 
            WHERE agent_id = ? AND date = ? AND is_available = 1
            ORDER BY start_time
          `).bind(agentId, date).all();

          return new Response(JSON.stringify({
            results: [{
              functionName: 'checkAvailability',
              result: {
                available: results.length > 0,
                slots: results.map(slot => ({
                  start: slot.start_time,
                  end: slot.end_time
                }))
              }
            }]
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (name === 'createAppointment') {
          const { prospectData, agentId, date, time } = parameters;

          if (!prospectData || !agentId || !date || !time) {
            return new Response(JSON.stringify({
              results: [{
                functionName: 'createAppointment',
                result: { error: 'Missing required parameters' }
              }]
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const prospectId = crypto.randomUUID();
          const appointmentId = crypto.randomUUID();
          const token = crypto.randomUUID();
          const now = new Date().toISOString();
          const appointmentDateTime = `${date}T${time}:00`;

          await env.DB.prepare(`
            INSERT INTO prospects (id, first_name, last_name, phone, email, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `).bind(
            prospectId,
            prospectData.firstName,
            prospectData.lastName,
            prospectData.phone,
            prospectData.email || null,
            now
          ).run();

          await env.DB.prepare(`
            INSERT INTO appointments (id, prospect_id, agent_id, appointment_date, duration_minutes, type, status, confirmation_token, created_at)
            VALUES (?, ?, ?, ?, 30, 'call', 'confirmed', ?, ?)
          `).bind(appointmentId, prospectId, agentId, appointmentDateTime, token, now).run();

          const confirmUrl = `https://coccinelle-api.youssef-amrouche.workers.dev/rdv/${token}`;

          return new Response(JSON.stringify({
            results: [{
              functionName: 'createAppointment',
              result: {
                success: true,
                appointmentId,
                confirmationUrl: confirmUrl,
                message: `Rendez-vous confirmé pour le ${date} à ${time}`
              }
            }]
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (name === 'searchKnowledge') {
          const { query, agentId } = parameters;

          if (!query) {
            return new Response(JSON.stringify({
              results: [{
                functionName: 'searchKnowledge',
                result: { error: 'query is required' }
              }]
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Log de recherche
          await env.DB.prepare(`
            INSERT INTO knowledge_search_logs (id, query, agent_id, created_at)
            VALUES (?, ?, ?, ?)
          `).bind(crypto.randomUUID(), query, agentId || null, new Date().toISOString()).run();

          // Recherche simple dans documents (sera améliorée avec embeddings Phase 4)
          const { results } = await env.DB.prepare(`
            SELECT title, url, content_preview FROM knowledge_documents
            WHERE agent_id = ? AND (title LIKE ? OR content_preview LIKE ?)
            LIMIT 3
          `).bind(agentId, `%${query}%`, `%${query}%`).all();

          return new Response(JSON.stringify({
            results: [{
              functionName: 'searchKnowledge',
              result: {
                found: results.length > 0,
                results: results
              }
            }]
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          results: [{
            functionName: name,
            result: { error: 'Unknown function' }
          }]
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ========================================
      // ROUTES CONFIRMATION RDV
      // ========================================

      if (path.match(/^\/rdv\/[^/]+$/) && method === 'GET') {
        const token = path.split('/').pop();

        const appointment = await env.DB.prepare(`
          SELECT a.*, p.first_name, p.last_name, p.phone, ag.name as agent_name
          FROM appointments a
          JOIN prospects p ON a.prospect_id = p.id
          JOIN agents ag ON a.agent_id = ag.id
          WHERE a.confirmation_token = ?
        `).bind(token).first();

        if (!appointment) {
          return new Response('Rendez-vous non trouvé', { status: 404 });
        }

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Confirmation Rendez-vous</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
              .status { padding: 10px; border-radius: 4px; margin: 20px 0; }
              .confirmed { background: #d4edda; color: #155724; }
              .cancelled { background: #f8d7da; color: #721c24; }
              button { padding: 10px 20px; margin: 10px 5px; border: none; border-radius: 4px; cursor: pointer; }
              .btn-modify { background: #007bff; color: white; }
              .btn-cancel { background: #dc3545; color: white; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>🗓️ Confirmation de Rendez-vous</h1>
              <div class="status ${appointment.status === 'confirmed' ? 'confirmed' : 'cancelled'}">
                Statut: ${appointment.status === 'confirmed' ? '✅ Confirmé' : '❌ Annulé'}
              </div>
              <p><strong>Avec:</strong> ${appointment.agent_name}</p>
              <p><strong>Date:</strong> ${new Date(appointment.appointment_date).toLocaleString('fr-FR')}</p>
              <p><strong>Durée:</strong> ${appointment.duration_minutes} minutes</p>
              <p><strong>Contact:</strong> ${appointment.first_name} ${appointment.last_name} (${appointment.phone})</p>
              
              ${appointment.status === 'confirmed' ? `
                <form method="POST" style="display: inline;">
                  <input type="hidden" name="action" value="modify">
                  <button type="submit" class="btn-modify">Modifier</button>
                </form>
                <form method="POST" style="display: inline;">
                  <input type="hidden" name="action" value="cancel">
                  <button type="submit" class="btn-cancel">Annuler</button>
                </form>
              ` : ''}
            </div>
          </body>
          </html>
        `;

        return new Response(html, {
          headers: { 'Content-Type': 'text/html' }
        });
      }

      if (path.match(/^\/rdv\/[^/]+$/) && method === 'POST') {
        const token = path.split('/').pop();
        const formData = await request.formData();
        const action = formData.get('action');

        if (action === 'cancel') {
          await env.DB.prepare(`
            UPDATE appointments SET status = 'cancelled' WHERE confirmation_token = ?
          `).bind(token).run();

          return new Response('Rendez-vous annulé', {
            status: 302,
            headers: { 'Location': `/rdv/${token}` }
          });
        }

        if (action === 'modify') {
          return new Response('Fonctionnalité de modification à venir', { status: 501 });
        }

        return new Response('Action invalide', { status: 400 });
      }

      // ========================================
      // ROUTE PAR DÉFAUT
      // ========================================

      return new Response(JSON.stringify({
        service: 'Coccinelle.ai API',
        version: '1.14.0',
        status: 'operational',
        phases: {
          phase1_kb_database: 'completed',
          phase2_web_crawler: 'completed',
          phase3_text_processing: 'completed'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// ============================================
// FONCTIONS CRAWLER (Phase 2)
// ============================================

// 1. Extraction de texte depuis HTML
function extractTextFromHTML(html) {
  // Supprimer les scripts et styles
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Supprimer les balises HTML
  text = text.replace(/<[^>]+>/g, ' ');
  
  // Décoder les entités HTML
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  
  // Nettoyer les espaces
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

// 2. Extraction de métadonnées
function extractMetadata(html, url) {
  const metadata = {
    title: '',
    description: '',
    h1: [],
    h2: []
  };

  // Title
  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }

  // Meta description
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
  if (descMatch) {
    metadata.description = descMatch[1].trim();
  }

  // H1
  const h1Matches = html.matchAll(/<h1[^>]*>(.*?)<\/h1>/gi);
  for (const match of h1Matches) {
    const h1Text = match[1].replace(/<[^>]+>/g, '').trim();
    if (h1Text) metadata.h1.push(h1Text);
  }

  // H2
  const h2Matches = html.matchAll(/<h2[^>]*>(.*?)<\/h2>/gi);
  for (const match of h2Matches) {
    const h2Text = match[1].replace(/<[^>]+>/g, '').trim();
    if (h2Text) metadata.h2.push(h2Text);
  }

  return metadata;
}

// 3. Extraction des liens
function extractLinks(html, baseUrl) {
  const links = [];
  const linkMatches = html.matchAll(/<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/gi);

  for (const match of linkMatches) {
    try {
      const href = match[1];
      const absoluteUrl = new URL(href, baseUrl).href;
      
      // Nettoyer les ancres et paramètres inutiles
      const cleanUrl = absoluteUrl.split('#')[0];
      
      if (cleanUrl && !links.includes(cleanUrl)) {
        links.push(cleanUrl);
      }
    } catch (e) {
      // URL invalide, ignorer
    }
  }

  return links;
}

// 4. Vérifier si URL est du même domaine
function isSameDomain(url1, url2) {
  try {
    const domain1 = new URL(url1).hostname;
    const domain2 = new URL(url2).hostname;
    return domain1 === domain2;
  } catch (e) {
    return false;
  }
}

// 5. Vérifier si URL doit être crawlée
function shouldCrawlUrl(url, includePatterns, excludePatterns) {
  // Exclure certains types de fichiers
  const excludedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.zip', '.exe', '.mp4', '.mp3'];
  if (excludedExtensions.some(ext => url.toLowerCase().endsWith(ext))) {
    return false;
  }

  // Vérifier les patterns d'exclusion
  if (excludePatterns.length > 0) {
    if (excludePatterns.some(pattern => url.includes(pattern))) {
      return false;
    }
  }

  // Vérifier les patterns d'inclusion (si spécifiés)
  if (includePatterns.length > 0) {
    return includePatterns.some(pattern => url.includes(pattern));
  }

  return true;
}

// 6. Générer un hash pour le contenu
async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 7. Sauvegarder un document dans la DB
async function saveDocument(db, url, content, metadata, agentId, serviceId, jobId) {
  const contentHash = await hashString(content);
  
  // Vérifier si le document existe déjà
  const existing = await db.prepare(
    'SELECT id FROM knowledge_documents WHERE content_hash = ?'
  ).bind(contentHash).first();

  if (existing) {
    console.log(`Document déjà existant (hash): ${url}`);
    return { saved: false, reason: 'duplicate_hash' };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const contentPreview = content.substring(0, 500);

  await db.prepare(`
    INSERT INTO knowledge_documents (
      id, agent_id, service_id, crawl_job_id, 
      url, title, content, content_preview, 
      content_hash, metadata, word_count, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    id,
    agentId,
    serviceId || null,
    jobId,
    url,
    metadata.title || 'Sans titre',
    content,
    contentPreview,
    contentHash,
    JSON.stringify(metadata),
    content.split(/\s+/).length,
    now
  ).run();

  return { saved: true, id };
}

// 8. Fonction principale de crawl BFS
async function crawlWebsite(db, jobId, startUrl, agentId, serviceId, options = {}) {
  const {
    includePatterns = [],
    excludePatterns = [],
    maxPages = 50,
    delay = 500 // 500ms entre chaque requête
  } = options;

  const visited = new Set();
  const queue = [startUrl];
  let pagesCrawled = 0;

  // Update job status
  await db.prepare(
    'UPDATE crawl_jobs SET status = ?, started_at = ? WHERE id = ?'
  ).bind('running', new Date().toISOString(), jobId).run();

  try {
    while (queue.length > 0 && pagesCrawled < maxPages) {
      const currentUrl = queue.shift();

      if (visited.has(currentUrl)) {
        continue;
      }

      visited.add(currentUrl);

      try {
        console.log(`Crawling: ${currentUrl}`);

        const response = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Coccinelle.ai Bot/1.0'
          }
        });

        if (!response.ok) {
          console.log(`Failed to fetch ${currentUrl}: ${response.status}`);
          continue;
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('text/html')) {
          console.log(`Skipping non-HTML: ${currentUrl}`);
          continue;
        }

        const html = await response.text();

        // Extraire contenu et métadonnées
        const text = extractTextFromHTML(html);
        const metadata = extractMetadata(html, currentUrl);

        // Sauvegarder le document
        const saveResult = await saveDocument(
          db,
          currentUrl,
          text,
          metadata,
          agentId,
          serviceId,
          jobId
        );

        if (saveResult.saved) {
          pagesCrawled++;
          
          // Update crawl stats
          await db.prepare(
            'UPDATE crawl_jobs SET pages_crawled = ? WHERE id = ?'
          ).bind(pagesCrawled, jobId).run();
        }

        // Extraire et ajouter les liens à la queue
        const links = extractLinks(html, currentUrl);
        for (const link of links) {
          if (
            !visited.has(link) &&
            isSameDomain(startUrl, link) &&
            shouldCrawlUrl(link, includePatterns, excludePatterns)
          ) {
            queue.push(link);
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        console.error(`Error crawling ${currentUrl}:`, error.message);
      }
    }

    // Job terminé avec succès
    await db.prepare(`
      UPDATE crawl_jobs 
      SET status = 'completed', 
          completed_at = ?,
          pages_crawled = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), pagesCrawled, jobId).run();

  } catch (error) {
    // Job en erreur
    await db.prepare(`
      UPDATE crawl_jobs 
      SET status = 'failed', 
          error_message = ?,
          completed_at = ?
      WHERE id = ?
    `).bind(error.message, new Date().toISOString(), jobId).run();
  }
}
