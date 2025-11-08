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
