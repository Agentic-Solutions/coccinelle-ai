// Module Knowledge - Routes SÉCURISÉES
// Version: 3.0.0 - 16 janvier 2026
// SÉCURITÉ: Auth JWT sur tous les endpoints
// Support Workers AI (768 dims) + OpenAI (1536 dims) fallback

import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';
import * as search from './search.js';
import * as embeddings from './embeddings.js';
import * as crawler from './crawler.js';
import * as auth from '../auth/helpers.js';

// ========================================
// HELPER: Auth check réutilisable
// ========================================
async function checkAuth(request, env) {
  const authResult = await auth.requireAuth(request, env);
  if (authResult.error) {
    return {
      error: true,
      response: new Response(JSON.stringify({ success: false, error: authResult.error }), {
        status: authResult.status,
        headers: { 'Content-Type': 'application/json' }
      })
    };
  }
  return { error: false, user: authResult.user, tenant: authResult.tenant };
}

export async function handleKnowledgeRoutes(request, env, path, method) {
  try {
    // POST /api/v1/knowledge/search - Recherche sémantique
    if (path === '/api/v1/knowledge/search' && method === 'POST') {
      return await handleSearch(request, env);
    }

    // POST /api/v1/knowledge/ask - RAG Question/Answer
    if (path === '/api/v1/knowledge/ask' && method === 'POST') {
      return await handleAsk(request, env);
    }

    // POST /api/v1/knowledge/crawl - Crawler web
    if (path === '/api/v1/knowledge/crawl' && method === 'POST') {
      return await handleCrawl(request, env);
    }

    // GET /api/v1/knowledge/documents - Liste documents
    if (path === '/api/v1/knowledge/documents' && method === 'GET') {
      return await handleListDocuments(request, env);
    }

    // POST /api/v1/knowledge/documents - Créer un document
    if (path === '/api/v1/knowledge/documents' && method === 'POST') {
      return await handleCreateDocument(request, env);
    }

    // POST /api/v1/knowledge/documents/upload - Upload document
    if (path === '/api/v1/knowledge/documents/upload' && method === 'POST') {
      return await handleUploadDocument(request, env);
    }

    // GET /api/v1/knowledge/crawls - Liste crawls
    if (path === '/api/v1/knowledge/crawls' && method === 'GET') {
      return await handleListCrawls(request, env);
    }

    // POST /api/v1/knowledge/embeddings/generate - Générer embeddings
    if (path === '/api/v1/knowledge/embeddings/generate' && method === 'POST') {
      return await handleGenerateEmbeddings(request, env);
    }

    // POST /api/v1/knowledge/embeddings/process-document/:id - Traiter document
    if (path.startsWith('/api/v1/knowledge/embeddings/process-document/') && method === 'POST') {
      const documentId = path.split('/').pop();
      return await handleProcessDocument(request, env, documentId);
    }

    // GET /api/v1/knowledge/embeddings/status/:documentId - Statut embeddings
    if (path.startsWith('/api/v1/knowledge/embeddings/status/') && method === 'GET') {
      const documentId = path.split('/').pop();
      return await handleEmbeddingStatus(request, env, documentId);
    }

    // POST /api/v1/knowledge/sync-vectorize - Sync DB vers Vectorize
    if (path === '/api/v1/knowledge/sync-vectorize' && method === 'POST') {
      return await handleSyncVectorize(request, env);
    }

    return null; // Route non trouvée

  } catch (error) {
    logger.error('Knowledge route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// ========================================
// HANDLERS - TOUS SÉCURISÉS
// ========================================

async function handleSearch(request, env) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const body = await request.json();
  const { query, topK = 5, provider = 'workersai' } = body;

  if (!query) {
    return errorResponse('query is required', 400);
  }

  const tenantId = tenant.id;

  let queryEmbedding;
  let targetVectorize;

  if (provider === 'workersai' && env.AI) {
    const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });
    queryEmbedding = result.data[0];
    targetVectorize = env.VECTORIZE_V2 || env.VECTORIZE;
    logger.info('Search using Workers AI', { provider: 'workersai', dimensions: 768, tenantId });
  } else {
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: query })
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate query embedding with OpenAI');
    }

    const embeddingData = await embeddingResponse.json();
    queryEmbedding = embeddingData.data[0].embedding;
    targetVectorize = env.VECTORIZE;
    logger.info('Search using OpenAI fallback', { provider: 'openai', dimensions: 1536, tenantId });
  }

  const searchResults = await targetVectorize.query(queryEmbedding, {
    topK: topK,
    returnMetadata: true,
    filter: { tenantId: tenantId }
  });

  const chunkIds = searchResults.matches.map(m => m.id);

  if (chunkIds.length === 0) {
    return successResponse({ query, results: [], count: 0, provider });
  }

  const placeholders = chunkIds.map(() => '?').join(',');
  const chunksResult = await env.DB.prepare(`
    SELECT c.id, c.content, c.chunk_index, d.source_url as url, d.title, d.source_type as doc_type
    FROM knowledge_chunks c
    JOIN knowledge_documents d ON c.document_id = d.id
    WHERE c.id IN (${placeholders})
  `).bind(...chunkIds).all();

  const enrichedResults = chunksResult.results.map(chunk => {
    const match = searchResults.matches.find(m => m.id === chunk.id);
    return { ...chunk, score: match?.score || 0 };
  });

  return successResponse({ query, results: enrichedResults, count: enrichedResults.length, provider });
}

async function handleAsk(request, env) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const body = await request.json();
  const { question, topK = 5, provider = 'workersai' } = body;

  if (!question) {
    return errorResponse('question is required', 400);
  }

  const tenantId = tenant.id;

  const result = await search.ragPipeline({
    question,
    db: env.DB,
    vectorize: env.VECTORIZE,
    env,
    llmApiKey: env.ANTHROPIC_API_KEY,
    tenantId,
    topK,
    provider
  });

  return successResponse({
    question,
    answer: result.answer,
    sources: result.sources,
    chunksUsed: result.chunksUsed,
    confidence: result.confidence,
    model: result.model,
    provider: result.provider,
    llmProvider: result.llmProvider,
    processingTime: result.processingTime
  });
}

async function handleCrawl(request, env) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const body = await request.json();
  const { startUrl, maxPages, maxDepth } = body;

  if (!startUrl) {
    return errorResponse('startUrl is required', 400);
  }

  try {
    const pages = await crawler.crawlWebsite(startUrl, maxPages || 10);

    logger.info('[KB] Crawl completed', { tenantId: tenant.id, startUrl, pagesCount: pages.length });

    return successResponse({
      success: true,
      pages: pages.map(page => ({
        url: page.url,
        title: page.title,
        content: page.content
      }))
    });
  } catch (error) {
    logger.error('[KB] Crawl error', { error: error.message, startUrl, tenantId: tenant.id });
    return errorResponse(`Erreur lors du crawl: ${error.message}`, 500);
  }
}

async function handleListDocuments(request, env) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const tenantId = tenant.id;

  logger.info('[KB] GET documents', { tenantId });

  const result = await env.DB.prepare(`
    SELECT
      id,
      title,
      source_url as url,
      source_type as sourceType,
      content,
      metadata,
      created_at
    FROM knowledge_documents
    WHERE tenant_id = ? AND is_active = 1
    ORDER BY created_at DESC
  `).bind(tenantId).all();

  const documents = result.results.map(doc => {
    let category = null;
    if (doc.metadata) {
      try {
        const meta = JSON.parse(doc.metadata);
        category = meta.category;
      } catch (e) {
        // Ignore parse errors
      }
    }
    return { ...doc, category };
  });

  logger.info('[KB] Documents found', { tenantId, count: documents.length });

  return successResponse({ documents, count: documents.length });
}

async function handleCreateDocument(request, env) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const body = await request.json();
  const { title, content, sourceType = 'manual', sourceUrl, category } = body;

  if (!title || !content) {
    return errorResponse('title and content are required', 400);
  }

  const tenantId = tenant.id;
  const id = `doc_${sourceType}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const contentHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content))
    .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

  const wordCount = content.split(/\s+/).length;
  const metadata = category ? JSON.stringify({ category }) : null;

  await env.DB.prepare(`
    INSERT INTO knowledge_documents
    (id, tenant_id, source_type, source_url, title, content, content_hash, word_count, status, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?, datetime('now'))
  `).bind(id, tenantId, sourceType, sourceUrl || null, title, content, contentHash, wordCount, metadata).run();

  logger.info('[KB] Document created', { tenantId, documentId: id });

  const document = {
    id,
    title,
    content,
    source_type: sourceType,
    source_url: sourceUrl,
    category,
    created_at: new Date().toISOString()
  };

  return successResponse({ document, message: 'Document créé avec succès' });
}

async function handleUploadDocument(request, env) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;

  return errorResponse('Upload not implemented yet', 501);
}

async function handleListCrawls(request, env) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const tenantId = tenant.id;

  const result = await env.DB.prepare(`
    SELECT id, url, status, pages_crawled, created_at
    FROM knowledge_crawl_jobs
    WHERE tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenantId).all();

  return successResponse({ crawls: result.results, count: result.results.length });
}

async function handleGenerateEmbeddings(request, env) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;

  const body = await request.json();
  const { text, provider = 'workersai' } = body;

  if (!text) {
    return errorResponse('text is required', 400);
  }

  const embedding = await embeddings.generateEmbedding(text, env, { provider });
  const dimensions = provider === 'workersai' ? 768 : 1536;
  const model = provider === 'workersai' ? '@cf/baai/bge-base-en-v1.5' : 'text-embedding-3-small';

  return successResponse({ embedding, dimensions, model, provider });
}

async function handleProcessDocument(request, env, documentId) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  // Vérifier que le document appartient au tenant
  const docCheck = await env.DB.prepare(`
    SELECT id FROM knowledge_documents WHERE id = ? AND tenant_id = ?
  `).bind(documentId, tenant.id).first();

  if (!docCheck) {
    return errorResponse('Document not found or access denied', 404);
  }

  const body = await request.json().catch(() => ({}));
  const { provider = 'workersai' } = body;

  const targetVectorize = provider === 'workersai' ? (env.VECTORIZE_V2 || env.VECTORIZE) : env.VECTORIZE;
  const result = await embeddings.processDocumentEmbeddings(env.DB, targetVectorize, documentId, env, { provider });

  logger.info('[KB] Document processed', { tenantId: tenant.id, documentId });

  return successResponse(result);
}

async function handleEmbeddingStatus(request, env, documentId) {
  // 🔐 AUTH REQUIRED
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  // Vérifier que le document appartient au tenant
  const docCheck = await env.DB.prepare(`
    SELECT id FROM knowledge_documents WHERE id = ? AND tenant_id = ?
  `).bind(documentId, tenant.id).first();

  if (!docCheck) {
    return errorResponse('Document not found or access denied', 404);
  }

  const status = await embeddings.checkEmbeddingStatus(env.DB, documentId);
  return successResponse(status);
}

async function handleSyncVectorize(request, env) {
  // 🔐 AUTH REQUIRED + ADMIN ONLY
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { user, tenant } = authCheck;

  // Vérifier que l'utilisateur est admin
  if (user.role !== 'admin') {
    return errorResponse('Admin access required', 403);
  }

  const body = await request.json().catch(() => ({}));
  const { provider = 'workersai' } = body;

  // Récupérer uniquement les chunks du tenant
  const chunksResult = await env.DB.prepare(`
    SELECT kc.id, kc.embedding, kc.document_id, kc.chunk_index, kc.token_count, kd.tenant_id, kd.agent_id
    FROM knowledge_chunks kc
    LEFT JOIN knowledge_documents kd ON kc.document_id = kd.id
    WHERE kc.embedding IS NOT NULL 
      AND kc.embedding_status = 'completed'
      AND kd.tenant_id = ?
  `).bind(tenant.id).all();

  const chunks = chunksResult.results.map(chunk => ({
    id: chunk.id,
    embedding: JSON.parse(chunk.embedding),
    documentId: chunk.document_id,
    chunkIndex: chunk.chunk_index,
    tokenCount: chunk.token_count,
    tenantId: chunk.tenant_id,
    agentId: chunk.agent_id
  }));

  const targetVectorize = provider === 'workersai' ? (env.VECTORIZE_V2 || env.VECTORIZE) : env.VECTORIZE;
  const result = await search.upsertToVectorize(targetVectorize, chunks);

  logger.info('[KB] Vectorize sync completed', { tenantId: tenant.id, chunksCount: chunks.length });

  return successResponse({
    message: 'Sync completed',
    totalChunks: chunks.length,
    inserted: result.inserted,
    provider
  });
}
