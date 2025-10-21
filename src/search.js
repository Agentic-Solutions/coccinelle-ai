// ============================================================================
// COCCINELLE.AI - SEARCH & RAG MODULE
// Phase 5 : Semantic Search + RAG Pipeline
// Version : 1.17.1 (SQL Fix)
// ============================================================================

import { generateEmbedding } from './embeddings.js';

// ============================================================================
// SEMANTIC SEARCH
// ============================================================================

export async function semanticSearch(vectorize, queryEmbedding, topK = 10, filter = {}) {
  try {
    console.log('[SEARCH] Semantic search starting...', { topK, filter });

    const results = await vectorize.query(queryEmbedding, {
      topK,
      filter: filter.tenant_id ? { tenant_id: filter.tenant_id } : undefined
    });

    console.log('[SEARCH] Semantic search completed ✅', {
      resultsCount: results.matches?.length || 0
    });

    return results.matches || [];

  } catch (error) {
    console.error('[SEARCH] Semantic search error:', error);
    return [];
  }
}

// ============================================================================
// RETRIEVE CHUNKS FROM DB
// ============================================================================

export async function retrieveChunks(db, chunkIds) {
  try {
    if (!chunkIds || chunkIds.length === 0) {
      return [];
    }

    const placeholders = chunkIds.map(() => '?').join(',');
    
    const query = `
      SELECT 
        kc.id,
        kc.content,
        kc.chunk_index,
        kc.token_count,
        kd.id as document_id,
        kd.title as document_title,
        kd.source_url
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kc.document_id = kd.id
      WHERE kc.id IN (${placeholders})
      ORDER BY kc.chunk_index ASC
    `;

    const result = await db.prepare(query).bind(...chunkIds).all();

    console.log('[SEARCH] Retrieved chunks:', result.results?.length || 0);

    return result.results || [];

  } catch (error) {
    console.error('[SEARCH] Retrieve chunks error:', error);
    return [];
  }
}

// ============================================================================
// BUILD CONTEXT FOR RAG
// ============================================================================

export function buildContext(chunks, maxTokens = 4000) {
  try {
    let context = '';
    let totalTokens = 0;
    const usedChunks = [];

    for (const chunk of chunks) {
      const chunkTokens = chunk.token_count || 0;
      
      if (totalTokens + chunkTokens > maxTokens) {
        break;
      }

      context += `\n\n---\nSource: ${chunk.document_title}\n${chunk.content}`;
      totalTokens += chunkTokens;
      usedChunks.push({
        id: chunk.id,
        documentTitle: chunk.document_title,
        sourceUrl: chunk.source_url
      });
    }

    console.log('[SEARCH] Context built:', {
      chunks: usedChunks.length,
      tokens: totalTokens
    });

    return {
      context: context.trim(),
      chunks: usedChunks,
      totalTokens
    };

  } catch (error) {
    console.error('[SEARCH] Build context error:', error);
    return { context: '', chunks: [], totalTokens: 0 };
  }
}

// ============================================================================
// GENERATE ANSWER WITH CLAUDE
// ============================================================================

export async function generateAnswer(question, context, apiKey) {
  try {
    console.log('[RAG] Generating answer with Claude...');

    const prompt = `Tu es un assistant IA expert. Réponds à la question suivante en te basant UNIQUEMENT sur le contexte fourni.

CONTEXTE:
${context}

QUESTION: ${question}

INSTRUCTIONS:
- Réponds de manière précise et concise
- Base ta réponse UNIQUEMENT sur le contexte fourni
- Si l'information n'est pas dans le contexte, dis-le clairement
- Cite les sources quand c'est pertinent

RÉPONSE:`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[RAG] Claude API error:', error);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.content[0].text;

    console.log('[RAG] Answer generated ✅', {
      inputTokens: data.usage?.input_tokens || 0,
      outputTokens: data.usage?.output_tokens || 0
    });

    return {
      answer,
      tokensUsed: {
        input: data.usage?.input_tokens || 0,
        output: data.usage?.output_tokens || 0,
        total: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      }
    };

  } catch (error) {
    console.error('[RAG] Generate answer error:', error);
    throw error;
  }
}

// ============================================================================
// RAG PIPELINE (Complete workflow)
// ============================================================================

export async function ragPipeline({
  question,
  db,
  vectorize,
  openaiApiKey,
  anthropicApiKey,
  topK = 5,
  tenantId,
  maxTokens = 4000
}) {
  const startTime = Date.now();

  try {
    console.log('[RAG] Pipeline starting...', { question, topK, tenantId });

    // 1. Generate query embedding
    const queryEmbedding = await generateEmbedding(question, openaiApiKey);
    if (!queryEmbedding) {
      return {
        success: false,
        error: 'Failed to generate query embedding'
      };
    }

    // 2. Semantic search
    const searchResults = await semanticSearch(
      vectorize,
      queryEmbedding,
      topK,
      { tenant_id: tenantId }
    );

    if (!searchResults || searchResults.length === 0) {
      return {
        success: true,
        answer: "Je n'ai pas trouvé d'information pertinente pour répondre à votre question.",
        sources: [],
        chunksRetrieved: 0,
        tokensUsed: { input: 0, output: 0, total: 0 }
      };
    }

    // 3. Retrieve full chunks
    const chunkIds = searchResults.map(r => r.id);
    const chunks = await retrieveChunks(db, chunkIds);

    // 4. Build context
    const { context, chunks: usedChunks, totalTokens } = buildContext(chunks, maxTokens);

    // 5. Generate answer
    const { answer, tokensUsed } = await generateAnswer(question, context, anthropicApiKey);

    const processingTime = Date.now() - startTime;

    console.log('[RAG] Pipeline completed ✅', {
      processingTime: `${processingTime}ms`,
      chunksRetrieved: usedChunks.length
    });

    return {
      success: true,
      answer,
      sources: usedChunks,
      chunksRetrieved: usedChunks.length,
      searchScore: searchResults[0]?.score || 0,
      processingTime,
      tokensUsed
    };

  } catch (error) {
    console.error('[RAG] Pipeline error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// HYBRID SEARCH (Semantic + Full-text SQL)
// ============================================================================

export async function hybridSearch({
  query,
  db,
  vectorize,
  openaiApiKey,
  topK = 10,
  tenantId
}) {
  try {
    console.log('[HYBRID_SEARCH] Starting...', { query, topK, tenantId });

    // 1. Semantic search avec Vectorize
    const queryEmbedding = await generateEmbedding(query, openaiApiKey);
    
    let semanticResults = [];
    if (queryEmbedding) {
      semanticResults = await semanticSearch(
        vectorize,
        queryEmbedding,
        topK,
        { tenant_id: tenantId }
      );
    }

    // 2. Full-text search SQL (FIX: Préfixes ajoutés)
    const sqlQuery = `
      SELECT 
        kc.id,
        kc.content,
        kc.chunk_index,
        kc.token_count,
        kd.id as document_id,
        kd.title as document_title,
        kd.source_url
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kc.document_id = kd.id
      WHERE kd.tenant_id = ?
      AND kc.content LIKE ?
      ORDER BY kc.chunk_index ASC
      LIMIT ?
    `;

    const sqlResults = await db.prepare(sqlQuery)
      .bind(tenantId, `%${query}%`, topK)
      .all();

    console.log('[HYBRID_SEARCH] Results:', {
      semantic: semanticResults.length,
      fulltext: sqlResults.results?.length || 0
    });

    // 3. Merge et dédupliquer
    const mergedResults = new Map();

    // Ajouter résultats sémantiques avec score
    for (const result of semanticResults) {
      mergedResults.set(result.id, {
        id: result.id,
        score: result.score,
        source: 'semantic'
      });
    }

    // Ajouter résultats full-text
    for (const result of (sqlResults.results || [])) {
      if (!mergedResults.has(result.id)) {
        mergedResults.set(result.id, {
          id: result.id,
          score: 0.5,
          source: 'fulltext'
        });
      }
    }

    // 4. Récupérer les chunks complets
    const chunkIds = Array.from(mergedResults.keys());
    const chunks = await retrieveChunks(db, chunkIds);

    // 5. Ajouter les scores
    const resultsWithScores = chunks.map(chunk => ({
      ...chunk,
      score: mergedResults.get(chunk.id)?.score || 0,
      searchSource: mergedResults.get(chunk.id)?.source || 'unknown'
    }));

    // 6. Trier par score
    resultsWithScores.sort((a, b) => b.score - a.score);

    console.log('[HYBRID_SEARCH] Completed ✅', {
      totalResults: resultsWithScores.length
    });

    return resultsWithScores.slice(0, topK);

  } catch (error) {
    console.error('[HYBRID_SEARCH] Error:', error);
    throw error;
  }
}

// ============================================================================
// UPSERT TO VECTORIZE
// ============================================================================

export async function upsertToVectorize(vectorize, chunks) {
  try {
    console.log('[VECTORIZE_SYNC] Upserting chunks:', chunks.length);

    const batchSize = 1000;
    let synced = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      const vectors = batch.map(chunk => ({
        id: chunk.id,
        values: chunk.embedding,
        metadata: {
          document_id: chunk.document_id,
          tenant_id: chunk.tenant_id,
          chunk_index: chunk.chunk_index
        }
      }));

      await vectorize.upsert(vectors);
      synced += vectors.length;

      console.log(`[VECTORIZE_SYNC] Batch ${Math.floor(i / batchSize) + 1} synced`);
    }

    console.log('[VECTORIZE_SYNC] Completed ✅', { synced });

    return { success: true, synced };

  } catch (error) {
    console.error('[VECTORIZE_SYNC] Error:', error);
    return { success: false, error: error.message };
  }
}
