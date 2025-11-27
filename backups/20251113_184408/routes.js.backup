// Module Knowledge - Routes
import { jsonResponse, errorResponse, successResponse } from '../../utils/response.js';
import { logger } from '../../utils/logger.js';

export async function handleKnowledgeRoutes(request, env, path, method) {
  const url = new URL(request.url);
  
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
    
    return null; // Route non trouvée
    
  } catch (error) {
    logger.error('Knowledge route error', { error: error.message, path });
    return errorResponse(error.message);
  }
}

// ========================================
// HANDLERS
// ========================================

async function handleSearch(request, env) {
  const body = await request.json();
  const { query, topK = 5, tenantId = 'tenant_demo_001' } = body;
  
  if (!query) {
    return errorResponse('query is required', 400);
  }

  // 1. Générer embedding de la query
  const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query
    })
  });

  if (!embeddingResponse.ok) {
    throw new Error('Failed to generate query embedding');
  }

  const embeddingData = await embeddingResponse.json();
  const queryEmbedding = embeddingData.data[0].embedding;

  // 2. Recherche vectorielle
  const searchResults = await env.VECTORIZE.query(queryEmbedding, {
    topK: topK,
    returnMetadata: true,
    filter: { tenantId: tenantId }
  });

  // 3. Récupérer les chunks depuis D1
  const chunkIds = searchResults.matches.map(m => m.id);
  
  if (chunkIds.length === 0) {
    return successResponse({
      query: query,
      results: [],
      count: 0
    });
  }

  const placeholders = chunkIds.map(() => '?').join(',');
  const chunksResult = await env.DB.prepare(`
    SELECT 
      c.id,
      c.content,
      c.chunk_index,
      d.url,
      d.title,
      d.doc_type
    FROM kb_chunks c
    JOIN kb_documents d ON c.doc_id = d.id
    WHERE c.id IN (${placeholders})
  `).bind(...chunkIds).all();

  // 4. Enrichir avec scores
  const enrichedResults = chunksResult.results.map(chunk => {
    const match = searchResults.matches.find(m => m.id === chunk.id);
    return {
      ...chunk,
      score: match?.score || 0
    };
  });

  return successResponse({
    query: query,
    results: enrichedResults,
    count: enrichedResults.length
  });
}

async function handleAsk(request, env) {
  const body = await request.json();
  const { question, topK = 3, tenantId = 'tenant_demo_001' } = body;
  
  if (!question) {
    return errorResponse('question is required', 400);
  }

  // 1. Recherche sémantique (réutiliser la logique de handleSearch)
  const searchRequest = new Request(request.url, {
    method: 'POST',
    body: JSON.stringify({ query: question, topK, tenantId })
  });
  
  const searchResponse = await handleSearch(searchRequest, env);
  const searchData = await searchResponse.json();
  
  if (!searchData.success || searchData.results.length === 0) {
    return jsonResponse({
      success: true,
      question: question,
      answer: "Je n'ai pas trouvé d'information pertinente dans la base de connaissances.",
      sources: []
    });
  }

  // 2. Construire le contexte pour Claude
  const context = searchData.results
    .map(r => `[Source: ${r.title}]\n${r.content}`)
    .join('\n\n');

  // 3. Appel à Claude pour générer la réponse
  const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Contexte:\n${context}\n\nQuestion: ${question}\n\nRéponds de manière concise et précise en te basant uniquement sur le contexte fourni.`
      }]
    })
  });

  if (!claudeResponse.ok) {
    throw new Error('Failed to generate answer with Claude');
  }

  const claudeData = await claudeResponse.json();
  const answer = claudeData.content?.[0]?.text || 'Erreur lors de la génération de la réponse';

  return successResponse({
    question: question,
    answer: answer,
    sources: searchData.results.map(r => ({
      title: r.title,
      url: r.url,
      score: r.score
    }))
  });
}

async function handleCrawl(request, env) {
  // TODO: Implémenter le crawler
  return errorResponse('Crawler not implemented yet', 501);
}

async function handleListDocuments(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  
  const result = await env.DB.prepare(`
    SELECT id, title, url, doc_type, created_at
    FROM kb_documents
    WHERE tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenantId).all();
  
  return successResponse({
    documents: result.results,
    count: result.results.length
  });
}

async function handleUploadDocument(request, env) {
  // TODO: Implémenter upload
  return errorResponse('Upload not implemented yet', 501);
}

async function handleListCrawls(request, env) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenantId') || 'tenant_demo_001';
  
  const result = await env.DB.prepare(`
    SELECT id, url, status, pages_crawled, created_at
    FROM kb_crawls
    WHERE tenant_id = ?
    ORDER BY created_at DESC
  `).bind(tenantId).all();
  
  return successResponse({
    crawls: result.results,
    count: result.results.length
  });
}

async function handleGenerateEmbeddings(request, env) {
  // TODO: Implémenter génération embeddings
  return errorResponse('Generate embeddings not implemented yet', 501);
}
// ============================================================================
// RAG ROUTES - EMBEDDINGS + SEARCH
// ============================================================================

import * as search from './search.js';
import * as embeddings from './embeddings.js';

export function registerRagRoutes(router) {
  
  // Endpoint 1: Recherche sémantique simple
  router.post('/api/v1/knowledge/search', async (request, env) => {
    try {
      const { query, topK = 5 } = await request.json();
      
      if (!query) {
        return new Response(JSON.stringify({ error: 'Query is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: query
        })
      });

      const embeddingData = await embeddingResponse.json();
      const queryEmbedding = embeddingData.data[0].embedding;

      const results = await search.semanticSearch(
        env.VECTORIZE,
        queryEmbedding,
        topK,
        { tenantId: request.tenantId || 'default' }
      );

      const chunkIds = results.map(r => r.chunkId);
      const chunks = await search.retrieveChunks(env.DB, chunkIds);

      return new Response(JSON.stringify({
        success: true,
        query: query,
        results: chunks,
        count: chunks.length
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Search error:', error);
      return new Response(JSON.stringify({
        error: 'Search failed',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Endpoint 2: Question/Réponse RAG
  router.post('/api/v1/knowledge/ask', async (request, env) => {
    try {
      const { question, topK = 5 } = await request.json();
      
      if (!question) {
        return new Response(JSON.stringify({ error: 'Question is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await search.ragPipeline({
        question: question,
        db: env.DB,
        vectorize: env.VECTORIZE,
        openaiApiKey: env.OPENAI_API_KEY,
        llmApiKey: env.ANTHROPIC_API_KEY,
        tenantId: request.tenantId || 'default',
        agentId: null,
        topK: topK
      });

      return new Response(JSON.stringify({
        success: true,
        question: question,
        answer: result.answer,
        sources: result.sources,
        chunksUsed: result.chunksUsed,
        confidence: result.confidence,
        model: result.model,
        provider: result.provider,
        processingTime: result.processingTime
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('RAG pipeline error:', error);
      return new Response(JSON.stringify({
        error: 'RAG pipeline failed',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Endpoint 3: Sync DB vers Vectorize
  router.post('/api/v1/knowledge/sync-vectorize', async (request, env) => {
    try {
      const chunksResult = await env.DB.prepare(`
        SELECT 
          kc.id,
          kc.embedding,
          kc.document_id,
          kc.chunk_index,
          kc.token_count,
          kd.tenant_id,
          kd.agent_id
        FROM knowledge_chunks kc
        LEFT JOIN knowledge_documents kd ON kc.document_id = kd.id
        WHERE kc.embedding IS NOT NULL
        AND kc.embedding_status = 'completed'
      `).all();

      const chunks = chunksResult.results.map(chunk => ({
        id: chunk.id,
        embedding: JSON.parse(chunk.embedding),
        documentId: chunk.document_id,
        chunkIndex: chunk.chunk_index,
        tokenCount: chunk.token_count,
        tenantId: chunk.tenant_id,
        agentId: chunk.agent_id
      }));

      const result = await search.upsertToVectorize(env.VECTORIZE, chunks);

      return new Response(JSON.stringify({
        success: true,
        message: 'Sync completed',
        totalChunks: chunks.length,
        inserted: result.inserted
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Sync error:', error);
      return new Response(JSON.stringify({
        error: 'Sync failed',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Endpoint 4: Générer embedding
  router.post('/api/v1/knowledge/embeddings/generate', async (request, env) => {
    try {
      const { text } = await request.json();
      
      if (!text) {
        return new Response(JSON.stringify({ error: 'Text is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const embedding = await embeddings.generateEmbedding(text, env.OPENAI_API_KEY);

      return new Response(JSON.stringify({
        success: true,
        embedding: embedding,
        dimensions: 1536,
        model: 'text-embedding-3-small'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Generate embedding error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to generate embedding',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Endpoint 5: Process document
  router.post('/api/v1/knowledge/embeddings/process-document/:id', async (request, env) => {
    try {
      const documentId = request.params.id;

      const result = await embeddings.processDocumentEmbeddings(
        env.DB,
        env.VECTORIZE,
        documentId,
        env.OPENAI_API_KEY
      );

      return new Response(JSON.stringify({
        success: true,
        documentId: documentId,
        ...result
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Process document error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to process document',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });

  // Endpoint 6: Check status
  router.get('/api/v1/knowledge/embeddings/status/:documentId', async (request, env) => {
    try {
      const documentId = request.params.documentId;

      const status = await embeddings.checkEmbeddingStatus(env.DB, documentId);

      return new Response(JSON.stringify({
        success: true,
        ...status
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Check status error:', error);
      return new Response(JSON.stringify({
        error: 'Failed to check status',
        message: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  });
}
