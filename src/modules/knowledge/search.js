// search.js - Module RAG Search pour Coccinelle.ai
// Version: 2.0.0 - 27 novembre 2025
// Support Workers AI (768 dims) + OpenAI (1536 dims)

const EMBEDDING_DIMENSIONS = {
  workersai: 768,
  openai: 1536
};

// FONCTION 1: Recherche sémantique vectorielle
export async function semanticSearch(vectorize, queryEmbedding, topK = 5, filter = {}) {
  try {
    // Validate embedding is present and non-empty
    if (!queryEmbedding || !Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
      throw new Error(`Invalid embedding: must be a non-empty array of numbers, got length ${queryEmbedding?.length || 0}`);
    }

    // Support 768 (Workers AI) ou 1536 (OpenAI) dimensions
    const validDimensions = [768, 1536];
    if (!validDimensions.includes(queryEmbedding.length)) {
      throw new Error(`Invalid embedding dimension: got ${queryEmbedding.length}, expected ${validDimensions.join(' or ')}`);
    }

    if (!vectorize || typeof vectorize.query !== 'function') {
      throw new Error('Vectorize index is not available or not properly bound');
    }

    const query = {
      vector: queryEmbedding,
      topK: topK,
      returnMetadata: true
    };

    if (filter.tenantId) {
      query.filter = { tenantId: filter.tenantId };
    }

    const results = await vectorize.query(query);

    if (!results || !results.matches) {
      return [];
    }

    return results.matches.map(match => ({
      chunkId: match.id,
      score: match.score,
      metadata: match.metadata,
      vector: match.vector
    }));
  } catch (error) {
    console.error('Error in semanticSearch:', error);
    throw new Error(`Semantic search failed: ${error.message}`);
  }
}

// FONCTION 2: Récupération des chunks depuis D1
export async function retrieveChunks(db, chunkIds) {
  try {
    if (!chunkIds || chunkIds.length === 0) {
      return [];
    }

    const placeholders = chunkIds.map(() => '?').join(',');
    const query = `
      SELECT 
        kc.id, kc.document_id, kc.chunk_index, kc.content, kc.token_count,
        kc.embedding_status, kd.title, kd.url, kd.source_type, kd.metadata
      FROM knowledge_chunks kc
      LEFT JOIN knowledge_documents kd ON kc.document_id = kd.id
      WHERE kc.id IN (${placeholders})
      ORDER BY kc.chunk_index ASC
    `;

    const result = await db.prepare(query).bind(...chunkIds).all();

    return result.results.map(row => ({
      id: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      tokenCount: row.token_count,
      embeddingStatus: row.embedding_status,
      document: {
        title: row.title,
        url: row.url,
        sourceType: row.source_type,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }
    }));
  } catch (error) {
    console.error('Error in retrieveChunks:', error);
    throw new Error(`Failed to retrieve chunks: ${error.message}`);
  }
}

// FONCTION 3: Construction du contexte RAG
export function buildContext(chunks, maxTokens = 2000) {
  try {
    let context = '';
    let totalTokens = 0;
    const includedChunks = [];
    const sortedChunks = chunks.sort((a, b) => (b.score || 0) - (a.score || 0));

    for (const chunk of sortedChunks) {
      const chunkTokens = chunk.tokenCount || Math.ceil(chunk.content.length / 4);
      
      if (totalTokens + chunkTokens > maxTokens) {
        break;
      }

      const source = chunk.document?.title || chunk.document?.url || 'Document inconnu';
      context += `\n\n[Source: ${source}]\n${chunk.content}`;
      
      totalTokens += chunkTokens;
      includedChunks.push(chunk.id);
    }

    return {
      context: context.trim(),
      totalTokens: totalTokens,
      chunksUsed: includedChunks.length,
      sources: chunks.filter(c => includedChunks.includes(c.id))
        .map(c => ({ title: c.document?.title, url: c.document?.url }))
    };
  } catch (error) {
    console.error('Error in buildContext:', error);
    throw new Error(`Failed to build context: ${error.message}`);
  }
}

// FONCTION 4: Génération de réponse (Claude ou GPT)
export async function generateAnswer(question, context, apiKey, model = 'claude-sonnet-4-20250514') {
  try {
    const isAnthropic = apiKey.startsWith('sk-ant-');
    
    if (isAnthropic) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model,
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `En te basant sur le contexte suivant, réponds à la question de manière précise et concise.\n\nCONTEXTE:\n${context}\n\nQUESTION: ${question}\n\nINSTRUCTIONS:\n- Réponds uniquement en te basant sur le contexte fourni\n- Si l'information n'est pas dans le contexte, dis-le clairement\n- Sois précis et factuel`
          }]
        })
      });

      if (!response.ok) throw new Error(`Anthropic API error: ${response.status}`);
      const data = await response.json();
      return { answer: data.content[0].text, model: model, provider: 'anthropic' };
    } else {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model || 'gpt-4',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: 'Tu es un assistant qui répond aux questions en te basant uniquement sur le contexte fourni.' },
            { role: 'user', content: `CONTEXTE:\n${context}\n\nQUESTION: ${question}` }
          ]
        })
      });

      if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
      const data = await response.json();
      return { answer: data.choices[0].message.content, model: model, provider: 'openai' };
    }
  } catch (error) {
    console.error('Error in generateAnswer:', error);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
}

// FONCTION 5: Upsert vers Vectorize
export async function upsertToVectorize(vectorize, chunks) {
  try {
    if (!chunks || chunks.length === 0) {
      return { inserted: 0 };
    }

    const vectors = chunks.map(chunk => ({
      id: chunk.id,
      values: chunk.embedding,
      metadata: {
        documentId: chunk.documentId || chunk.document_id,
        chunkIndex: chunk.chunkIndex || chunk.chunk_index,
        tokenCount: chunk.tokenCount || chunk.token_count,
        tenantId: chunk.tenantId || chunk.tenant_id,
        agentId: chunk.agentId || chunk.agent_id
      }
    }));

    await vectorize.upsert(vectors);

    return {
      inserted: vectors.length,
      success: true
    };
  } catch (error) {
    console.error('Error in upsertToVectorize:', error);
    throw new Error(`Failed to upsert to Vectorize: ${error.message}`);
  }
}

// FONCTION 6: Fallback text-based search (when vector search fails)
async function textBasedSearch(db, question, tenantId, topK = 5) {
  try {
    // Use SQL LIKE-based search as fallback
    const keywords = question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (keywords.length === 0) {
      return [];
    }

    // Build a query that matches any keyword in chunk content
    const whereClauses = keywords.map(() => 'LOWER(kc.content) LIKE ?').join(' OR ');
    const params = keywords.map(k => `%${k}%`);

    const result = await db.prepare(`
      SELECT
        kc.id, kc.document_id, kc.chunk_index, kc.content, kc.token_count,
        kc.embedding_status, kd.title, kd.source_url as url, kd.source_type, kd.metadata,
        kd.tenant_id
      FROM knowledge_chunks kc
      LEFT JOIN knowledge_documents kd ON kc.document_id = kd.id
      WHERE kd.tenant_id = ? AND kd.is_active = 1 AND (${whereClauses})
      ORDER BY kc.chunk_index ASC
      LIMIT ?
    `).bind(tenantId, ...params, topK).all();

    return (result.results || []).map(row => ({
      id: row.id,
      documentId: row.document_id,
      chunkIndex: row.chunk_index,
      content: row.content,
      tokenCount: row.token_count,
      embeddingStatus: row.embedding_status,
      score: 0.5, // Arbitrary score for text-based matches
      document: {
        title: row.title,
        url: row.url,
        sourceType: row.source_type,
        metadata: row.metadata ? JSON.parse(row.metadata) : {}
      }
    }));
  } catch (error) {
    console.error('Error in textBasedSearch:', error);
    return [];
  }
}

// FONCTION 7: Pipeline RAG complet (Workers AI par défaut)
export async function ragPipeline({ question, db, vectorize, env, openaiApiKey, llmApiKey, tenantId, agentId = null, topK = 5, provider = 'workersai' }) {
  try {
    const startTime = Date.now();

    let queryEmbedding;
    let targetVectorize = vectorize;
    let useTextFallback = false;

    // Générer l'embedding avec Workers AI ou OpenAI
    try {
      if (provider === 'workersai' && env?.AI) {
        // Workers AI - gratuit, edge
        const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
          text: [question]
        });

        // Validate embedding output
        if (!result?.data?.[0] || !Array.isArray(result.data[0]) || result.data[0].length === 0) {
          console.error('Workers AI returned invalid embedding', {
            hasData: !!result?.data,
            length: result?.data?.[0]?.length || 0
          });
          useTextFallback = true;
        } else {
          queryEmbedding = result.data[0];
          // Utiliser le nouvel index Vectorize (768 dims)
          targetVectorize = env.VECTORIZE_V2 || vectorize;
        }
      } else if (env?.OPENAI_API_KEY || openaiApiKey) {
        // OpenAI - fallback
        const apiKey = openaiApiKey || env?.OPENAI_API_KEY;
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ model: 'text-embedding-3-small', input: question })
        });

        if (!embeddingResponse.ok) {
          console.error('OpenAI embedding failed', { status: embeddingResponse.status });
          useTextFallback = true;
        } else {
          const embeddingData = await embeddingResponse.json();
          if (!embeddingData?.data?.[0]?.embedding || embeddingData.data[0].embedding.length === 0) {
            console.error('OpenAI returned invalid embedding');
            useTextFallback = true;
          } else {
            queryEmbedding = embeddingData.data[0].embedding;
            // Utiliser l'ancien index Vectorize (1536 dims)
            targetVectorize = env?.VECTORIZE || vectorize;
          }
        }
      } else {
        // No embedding provider available
        console.warn('No embedding provider available (env.AI or OPENAI_API_KEY), falling back to text search');
        useTextFallback = true;
      }
    } catch (embeddingError) {
      console.error('Embedding generation failed, falling back to text search:', embeddingError.message);
      useTextFallback = true;
    }

    let searchResults = [];
    let chunksWithScores = [];

    if (!useTextFallback && queryEmbedding) {
      // Validate embedding dimensions before querying
      const validDimensions = [768, 1536];
      if (!validDimensions.includes(queryEmbedding.length)) {
        console.error(`Invalid embedding dimension: ${queryEmbedding.length}, expected 768 or 1536. Falling back to text search.`);
        useTextFallback = true;
      }
    }

    if (!useTextFallback && queryEmbedding && targetVectorize) {
      // Try vector search
      try {
        searchResults = await semanticSearch(targetVectorize, queryEmbedding, topK, { tenantId, agentId });

        if (searchResults.length > 0) {
          const chunkIds = searchResults.map(r => r.chunkId);
          const chunks = await retrieveChunks(db, chunkIds);
          chunksWithScores = chunks.map(chunk => {
            const match = searchResults.find(r => r.chunkId === chunk.id);
            return { ...chunk, score: match?.score || 0 };
          });
        }
      } catch (vectorError) {
        console.error('Vector search failed, falling back to text search:', vectorError.message);
        useTextFallback = true;
      }
    }

    // Text-based fallback when vector search is unavailable or failed
    if (useTextFallback || (searchResults.length === 0 && queryEmbedding)) {
      console.info('Using text-based fallback search for question:', question.substring(0, 80));
      const textResults = await textBasedSearch(db, question, tenantId, topK);
      if (textResults.length > 0) {
        chunksWithScores = textResults;
        provider = provider + '+text-fallback';
      }
    }

    if (chunksWithScores.length === 0) {
      return {
        answer: "Je n'ai pas trouve d'information pertinente dans la base de connaissances pour repondre a cette question.",
        sources: [],
        chunksUsed: 0,
        confidence: 0,
        provider: provider,
        processingTime: Date.now() - startTime
      };
    }

    const contextData = buildContext(chunksWithScores);
    const answerData = await generateAnswer(question, contextData.context, llmApiKey || env?.ANTHROPIC_API_KEY);

    // Log search (graceful - don't fail if logging fails)
    try {
      await db.prepare(`
        INSERT INTO knowledge_search_logs (id, tenant_id, agent_id, query, results_count, top_score, processing_time_ms, embedding_provider, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(crypto.randomUUID(), tenantId, agentId, question, chunksWithScores.length, searchResults[0]?.score || chunksWithScores[0]?.score || 0, Date.now() - startTime, provider).run();
    } catch (logError) {
      console.error('Failed to log search:', logError.message);
    }

    return {
      answer: answerData.answer,
      sources: contextData.sources,
      chunksUsed: contextData.chunksUsed,
      confidence: searchResults[0]?.score || chunksWithScores[0]?.score || 0,
      model: answerData.model,
      provider: provider,
      llmProvider: answerData.provider,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('Error in ragPipeline:', error);
    throw new Error(`RAG pipeline failed: ${error.message}`);
  }
}
