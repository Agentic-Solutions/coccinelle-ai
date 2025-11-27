// embeddings.js - Module Embeddings pour Coccinelle.ai
// Version: 1.0.0 - 7 novembre 2025

const EMBEDDING_MODEL = 'text-embedding-3-small';
const BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// FONCTION 1: Génération d'un embedding unique
export async function generateEmbedding(text, openaiApiKey, model = EMBEDDING_MODEL) {
  try {
    if (!text || text.trim().length === 0) throw new Error('Text cannot be empty');
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
          body: JSON.stringify({ model: model, input: text })
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
  } catch (error) {
    console.error('Error in generateEmbedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message});
  }
}

// FONCTION 2: Traitement complet d'un document
export async function processDocumentEmbeddings(db, vectorize, documentId, openaiApiKey) {
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

    console.log(`Processing ${chunks.length} chunks for document ${documentId}`);

    const chunksToProcess = chunks.filter(chunk => chunk.embedding_status !== 'completed');
    if (chunksToProcess.length === 0) {
      return {
        documentId: documentId,
        totalChunks: chunks.length,
        processed: 0,
        skipped: chunks.length,
        status: 'already_completed',
        processingTime: Date.now() - startTime
      };
    }

    const embeddings = await batchGenerateEmbeddings(chunksToProcess.map(c => c.content), openaiApiKey);

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
        `).bind(JSON.stringify(embedding), EMBEDDING_MODEL, chunk.id).run();
        successCount++;
      } catch (error) {
        console.error(`Error updating chunk ${chunk.id}:`, error);
        await db.prepare(`
          UPDATE knowledge_chunks SET embedding_status = 'error', updated_at = datetime('now') WHERE id = ?
        `).bind(chunk.id).run();
        errorCount++;
      }
    }

    if (successCount > 0) {
      const chunksWithEmbeddings = chunksToProcess.slice(0, successCount).map((chunk, i) => ({
        id: chunk.id,
        embedding: embeddings[i],
        documentId: documentId,
        tokenCount: chunk.token_count
      }));
      await upsertToVectorize(vectorize, chunksWithEmbeddings);
    }

    const documentStatus = errorCount === 0 ? 'completed' : 'partial';
    await db.prepare(`
      UPDATE knowledge_documents SET embedding_status = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(documentStatus, documentId).run();

    return {
      documentId: documentId,
      totalChunks: chunks.length,
      processed: successCount,
      errors: errorCount,
      skipped: chunks.length - chunksToProcess.length,
      status: documentStatus,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    console.error('Error in processDocumentEmbeddings:', error);
    await db.prepare(`
      UPDATE knowledge_documents SET embedding_status = 'error', updated_at = datetime('now') WHERE id = ?
    `).bind(documentId).run();
    throw new Error(`Failed to process document embeddings: ${error.message});
  }
}

// FONCTION 3: Génération par batch
export async function batchGenerateEmbeddings(texts, openaiApiKey, model = EMBEDDING_MODEL) {
  try {
    if (!texts || texts.length === 0) return [];

    texts.forEach((text, index) => {
      if (!text || text.trim().length === 0) {
        throw new Error(`Text at index ${index} is empty`);
      }
    });

    const allEmbeddings = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(texts.length / BATCH_SIZE)}`);

      let lastError;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const response = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${openaiApiKey}`
            },
            body: JSON.stringify({ model: model, input: batch })
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
  } catch (error) {
    console.error('Error in batchGenerateEmbeddings:', error);
    throw new Error(`Failed to generate batch embeddings: ${error.message});
  }
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
    throw new Error(`Failed to check embedding status: ${error.message});
  }
}
