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
  router.post('/api/v1/embeddings/generate', async (request, env) => {
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
  router.post('/api/v1/embeddings/process-document/:id', async (request, env) => {
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
  router.get('/api/v1/embeddings/status/:documentId', async (request, env) => {
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
