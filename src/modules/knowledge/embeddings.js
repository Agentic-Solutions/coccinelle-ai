// embeddings.js - Module Embeddings pour Coccinelle.ai
// Version: 2.0.0 - 27 novembre 2025
// Support Workers AI (gratuit, edge) + OpenAI (fallback)

// Configuration des providers
const PROVIDERS = {
  workersai: {
    model: '@cf/baai/bge-base-en-v1.5',
    dimensions: 768,
    description: 'Workers AI - Gratuit, edge, rapide'
  },
  openai: {
    model: 'text-embedding-3-small',
    dimensions: 1536,
    description: 'OpenAI - Payant, haute qualité'
  }
};

const DEFAULT_PROVIDER = 'workersai'; // Utiliser Workers AI par défaut
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// FONCTION 1: Génération d'un embedding unique (Workers AI ou OpenAI)
export async function generateEmbedding(text, env, options = {}) {
  const provider = options.provider || DEFAULT_PROVIDER;

  try {
    if (!text || text.trim().length === 0) throw new Error('Text cannot be empty');

    if (provider === 'workersai') {
      return await generateEmbeddingWorkersAI(text, env.AI);
    } else {
      return await generateEmbeddingOpenAI(text, env.OPENAI_API_KEY || options.openaiApiKey);
    }
  } catch (error) {
    console.error(`Error in generateEmbedding (${provider}):`, error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

// Workers AI embedding (gratuit, edge)
async function generateEmbeddingWorkersAI(text, ai) {
  if (!ai) throw new Error('Workers AI binding (env.AI) is required');

  const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
    text: [text]
  });

  if (!result.data || !result.data[0]) {
    throw new Error('Invalid response from Workers AI');
  }

  return result.data[0];
}

// OpenAI embedding (legacy/fallback)
async function generateEmbeddingOpenAI(text, openaiApiKey) {
  if (!openaiApiKey) throw new Error('OpenAI API key is required');

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({ model: PROVIDERS.openai.model, input: text })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || response.status}`);
      }

      const data = await response.json();
      if (!data.data || !data.data[0] || !data.data[0].embedding) {
        throw new Error('Invalid response from OpenAI API');
      }

      return data.data[0].embedding;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        console.log(`Retry ${attempt}/${MAX_RETRIES} after error:`, error.message);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }
  throw lastError;
}

// FONCTION 2: Traitement complet d'un document (Workers AI par défaut)
export async function processDocumentEmbeddings(db, vectorize, documentId, env, options = {}) {
  const provider = options.provider || DEFAULT_PROVIDER;
  const model = PROVIDERS[provider].model;

  try {
    const startTime = Date.now();

    const chunksResult = await db.prepare(`
      SELECT id, content, token_count, embedding_status
      FROM knowledge_chunks
      WHERE document_id = ?
      ORDER BY chunk_index ASC
    `).bind(documentId).all();

    const chunks = chunksResult.results;
    if (chunks.length === 0) throw new Error('No chunks found for this document');

    console.log(`Processing ${chunks.length} chunks for document ${documentId} with ${provider}`);

    const chunksToProcess = chunks.filter(chunk => chunk.embedding_status !== 'completed');
    if (chunksToProcess.length === 0) {
      return {
        documentId: documentId,
        totalChunks: chunks.length,
        processed: 0,
        skipped: chunks.length,
        status: 'already_completed',
        provider: provider,
        processingTime: Date.now() - startTime
      };
    }

    // Générer les embeddings avec Workers AI ou OpenAI
    const embeddings = await batchGenerateEmbeddings(
      chunksToProcess.map(c => c.content),
      env,
      { provider }
    );

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunksToProcess.length; i++) {
      const chunk = chunksToProcess[i];
      const embedding = embeddings[i];

      try {
        await db.prepare(`
          UPDATE knowledge_chunks
          SET embedding = ?, embedding_status = 'completed', embedding_model = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(JSON.stringify(embedding), model, chunk.id).run();
        successCount++;
      } catch (error) {
        console.error(`Error updating chunk ${chunk.id}:`, error);
        await db.prepare(`
          UPDATE knowledge_chunks SET embedding_status = 'error', updated_at = datetime('now') WHERE id = ?
        `).bind(chunk.id).run();
        errorCount++;
      }
    }

    // Upsert vers le bon index Vectorize selon le provider
    if (successCount > 0) {
      const chunksWithEmbeddings = chunksToProcess.slice(0, successCount).map((chunk, i) => ({
        id: chunk.id,
        embedding: embeddings[i],
        documentId: documentId,
        tokenCount: chunk.token_count
      }));

      // VECTORIZE_V2 pour Workers AI (768 dims), VECTORIZE pour OpenAI (1536 dims)
      const targetVectorize = provider === 'workersai' ? (env.VECTORIZE_V2 || vectorize) : vectorize;
      await upsertToVectorize(targetVectorize, chunksWithEmbeddings);
    }

    const documentStatus = errorCount === 0 ? 'completed' : 'partial';
    await db.prepare(`
      UPDATE knowledge_documents SET embedding_status = ?, embedding_provider = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(documentStatus, provider, documentId).run();

    return {
      documentId: documentId,
      totalChunks: chunks.length,
      processed: successCount,
      errors: errorCount,
      skipped: chunks.length - chunksToProcess.length,
      status: documentStatus,
      provider: provider,
      model: model,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('Error in processDocumentEmbeddings:', error);
    await db.prepare(`
      UPDATE knowledge_documents SET embedding_status = 'error', updated_at = datetime('now') WHERE id = ?
    `).bind(documentId).run();
    throw new Error(`Failed to process document embeddings: ${error.message}`);
  }
}

// FONCTION 3: Génération par batch (Workers AI ou OpenAI)
export async function batchGenerateEmbeddings(texts, env, options = {}) {
  const provider = options.provider || DEFAULT_PROVIDER;

  try {
    if (!texts || texts.length === 0) return [];

    texts.forEach((text, index) => {
      if (!text || text.trim().length === 0) {
        throw new Error(`Text at index ${index} is empty`);
      }
    });

    if (provider === 'workersai') {
      return await batchGenerateEmbeddingsWorkersAI(texts, env.AI);
    } else {
      return await batchGenerateEmbeddingsOpenAI(texts, env.OPENAI_API_KEY || options.openaiApiKey);
    }
  } catch (error) {
    console.error(`Error in batchGenerateEmbeddings (${provider}):`, error);
    throw new Error(`Failed to generate batch embeddings: ${error.message}`);
  }
}

// Workers AI batch embeddings
async function batchGenerateEmbeddingsWorkersAI(texts, ai) {
  if (!ai) throw new Error('Workers AI binding (env.AI) is required');

  const allEmbeddings = [];

  // Workers AI supporte les batches directement
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} with Workers AI`);

    const result = await ai.run('@cf/baai/bge-base-en-v1.5', {
      text: batch
    });

    if (!result.data || result.data.length !== batch.length) {
      throw new Error('Invalid response from Workers AI batch');
    }

    allEmbeddings.push(...result.data);
  }

  return allEmbeddings;
}

// OpenAI batch embeddings (legacy)
async function batchGenerateEmbeddingsOpenAI(texts, openaiApiKey) {
  if (!openaiApiKey) throw new Error('OpenAI API key is required');

  const allEmbeddings = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)} with OpenAI`);

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({ model: PROVIDERS.openai.model, input: batch })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(`OpenAI API error: ${error.error?.message || response.status}`);
        }

        const data = await response.json();
        const batchEmbeddings = data.data.sort((a, b) => a.index - b.index).map(item => item.embedding);
        allEmbeddings.push(...batchEmbeddings);
        break;
      } catch (error) {
        lastError = error;
        if (attempt < MAX_RETRIES) {
          console.log(`Retry ${attempt}/${MAX_RETRIES} for batch starting at index ${i}`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
      }
    }

    if (allEmbeddings.length < i + batch.length) throw lastError;

    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return allEmbeddings;
}

// FONCTION 4: Vérification du statut
export async function checkEmbeddingStatus(db, documentId) {
  try {
    const documentResult = await db.prepare(`
      SELECT id, title, embedding_status, created_at, updated_at
      FROM knowledge_documents WHERE id = ?
    `).bind(documentId).first();

    if (!documentResult) throw new Error('Document not found');

    const chunksResult = await db.prepare(`
      SELECT embedding_status, COUNT(*) as count
      FROM knowledge_chunks WHERE document_id = ?
      GROUP BY embedding_status
    `).bind(documentId).all();

    const chunkStats = {};
    let totalChunks = 0;

    chunksResult.results.forEach(row => {
      chunkStats[row.embedding_status] = row.count;
      totalChunks += row.count;
    });

    const completedChunks = chunkStats['completed'] || 0;
    const completionPercentage = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;

    return {
      documentId: documentId,
      title: documentResult.title,
      status: documentResult.embedding_status,
      totalChunks: totalChunks,
      completed: completedChunks,
      pending: chunkStats['pending'] || 0,
      error: chunkStats['error'] || 0,
      completionPercentage: completionPercentage,
      createdAt: documentResult.created_at,
      updatedAt: documentResult.updated_at
    };
  } catch (error) {
    console.error('Error in checkEmbeddingStatus:', error);
    throw new Error(`Failed to check embedding status: ${error.message}`);
  }
}
