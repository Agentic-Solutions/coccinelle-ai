// search.js - Module RAG Search pour Coccinelle.ai
// Version: 1.0.0 - 7 novembre 2025

// FONCTION 1: Recherche sémantique vectorielle
export async function semanticSearch(vectorize, queryEmbedding, topK = 5, filter = {}) {
  try {
    if (!queryEmbedding || queryEmbedding.length !== 1536) {
      throw new Error('Invalid embedding: must be array of 1536 numbers');
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

    return results.matches.map(match => ({
      chunkId: match.id,
      score: match.score,
      metadata: match.metadata,
      vector: match.vector
    }));
  } catch (error) {
    console.error('Error in semanticSearch:', error);
    throw new Error(`Semantic search failed: ${error.message});
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
    throw new Error(`Failed to retrieve chunks: ${error.message});
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
    throw new Error(`Failed to build context: ${error.message});
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
    throw new Error(`Failed to generate answer: ${error.message});
  }
}

// FONCTION 5: Pipeline RAG complet
export async function ragPipeline({ question, db, vectorize, openaiApiKey, llmApiKey, tenantId, agentId = null, topK = 5 }) {
  try {
    const startTime = Date.now();

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: question })
    });

    if (!embeddingResponse.ok) throw new Error('Failed to generate query embedding');
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const searchResults = await semanticSearch(vectorize, queryEmbedding, topK, { tenantId, agentId });

    if (searchResults.length === 0) {
      return {
        answer: "Je n'ai pas trouvé d'information pertinente dans la base de connaissances pour répondre à cette question.",
        sources: [],
        chunksUsed: 0,
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }

    const chunkIds = searchResults.map(r => r.chunkId);
    const chunks = await retrieveChunks(db, chunkIds);
    const chunksWithScores = chunks.map(chunk => {
      const match = searchResults.find(r => r.chunkId === chunk.id);
      return { ...chunk, score: match?.score || 0 };
    });

    const contextData = buildContext(chunksWithScores);
    const answerData = await generateAnswer(question, contextData.context, llmApiKey);

    await db.prepare(`
      INSERT INTO knowledge_search_logs (id, tenant_id, agent_id, query, results_count, top_score, processing_time_ms, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(crypto.randomUUID(), tenantId, agentId, question, chunks.length, searchResults[0]?.score || 0, Date.now() - startTime).run();

    return {
      answer: answerData.answer,
      sources: contextData.sources,
      chunksUsed: contextData.chunksUsed,
      confidence: searchResults[0]?.score || 0,
      model: answerData.model,
      provider: answerData.provider,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('Error in ragPipeline:', error);
    throw new Error(`RAG pipeline failed: ${error.message});
  }
}
