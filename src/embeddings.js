// ============================================================================
// COCCINELLE.AI - EMBEDDINGS MODULE
// Phase 4 : Génération embeddings OpenAI
// Version : 1.16.1 (Fix: Auto-sync Vectorize)
// ============================================================================

/**
 * Génère un embedding pour un texte via OpenAI API
 * @param {string} text - Texte à vectoriser
 * @param {string} apiKey - Clé API OpenAI
 * @returns {Promise<Array<number>|null>} - Vector [1536] ou null si erreur
 */
export async function generateEmbedding(text, apiKey) {
  try {
    console.log('[EMBEDDINGS] Génération embedding...', {
      textLength: text.length,
      textPreview: text.substring(0, 100)
    });

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[EMBEDDINGS] Erreur OpenAI API:', {
        status: response.status,
        error
      });
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    console.log('[EMBEDDINGS] Embedding généré ✅', {
      dimensions: embedding.length,
      tokensUsed: data.usage?.total_tokens || 'N/A'
    });

    return embedding;

  } catch (error) {
    console.error('[EMBEDDINGS] Erreur génération:', error);
    return null;
  }
}

/**
 * Stocke un embedding dans la DB ET dans Vectorize
 * @param {D1Database} db - Instance Cloudflare D1
 * @param {Vectorize} vectorize - Instance Cloudflare Vectorize
 * @param {string} chunkId - ID du chunk
 * @param {Array<number>} embedding - Vector embedding
 * @param {Object} metadata - Metadata du chunk (document_id, tenant_id, chunk_index)
 * @returns {Promise<boolean>} - Succès ou échec
 */
export async function storeEmbedding(db, vectorize, chunkId, embedding, metadata) {
  try {
    const vectorId = `vec_${chunkId}_${Date.now()}`;
    
    // 1. Stocker vector_id dans DB
    await db.prepare(`
      UPDATE knowledge_chunks 
      SET vector_id = ?,
          embedding_model = 'text-embedding-3-small'
      WHERE id = ?
    `).bind(vectorId, chunkId).run();

    console.log('[EMBEDDINGS] Vector ID stocké dans DB ✅', {
      chunkId,
      vectorId
    });

    // 2. Upsert dans Vectorize
    if (vectorize) {
      await vectorize.upsert([
        {
          id: chunkId,
          values: embedding,
          metadata: {
            vector_id: vectorId,
            document_id: metadata.document_id,
            tenant_id: metadata.tenant_id,
            chunk_index: metadata.chunk_index
          }
        }
      ]);

      console.log('[EMBEDDINGS] Vector upsert dans Vectorize ✅', {
        chunkId,
        dimensions: embedding.length
      });
    } else {
      console.warn('[EMBEDDINGS] Vectorize non disponible - skip upsert');
    }

    return true;

  } catch (error) {
    console.error('[EMBEDDINGS] Erreur stockage:', error);
    return false;
  }
}

/**
 * Process tous les chunks d'un document pour générer embeddings
 * @param {D1Database} db - Instance Cloudflare D1
 * @param {Vectorize} vectorize - Instance Cloudflare Vectorize
 * @param {string} documentId - ID du document
 * @param {string} apiKey - Clé API OpenAI
 * @returns {Promise<Object>} - Résultat du processing
 */
export async function processDocumentEmbeddings(db, vectorize, documentId, apiKey) {
  console.log('[EMBEDDINGS] Processing document:', documentId);

  try {
    // 1. Récupérer tous les chunks du document avec metadata
    const chunks = await db.prepare(`
      SELECT 
        kc.id, 
        kc.content, 
        kc.token_count, 
        kc.chunk_index,
        kc.document_id,
        kc.tenant_id
      FROM knowledge_chunks kc
      WHERE kc.document_id = ?
      ORDER BY kc.chunk_index ASC
    `).bind(documentId).all();

    if (!chunks.results || chunks.results.length === 0) {
      return {
        success: false,
        error: 'Aucun chunk trouvé pour ce document'
      };
    }

    console.log('[EMBEDDINGS] Chunks trouvés:', chunks.results.length);

    // 2. Process par batch de 10 (limite rate OpenAI)
    const batchSize = 10;
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < chunks.results.length; i += batchSize) {
      const batch = chunks.results.slice(i, i + batchSize);
      
      console.log(`[EMBEDDINGS] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.results.length / batchSize)}`);

      // Process batch en parallèle
      const results = await Promise.all(
        batch.map(async (chunk) => {
          const embedding = await generateEmbedding(chunk.content, apiKey);
          
          if (embedding) {
            const metadata = {
              document_id: chunk.document_id,
              tenant_id: chunk.tenant_id,
              chunk_index: chunk.chunk_index
            };
            
            const stored = await storeEmbedding(db, vectorize, chunk.id, embedding, metadata);
            return stored ? 'success' : 'store_failed';
          }
          return 'generation_failed';
        })
      );

      // Compter succès/échecs
      processed += results.filter(r => r === 'success').length;
      failed += results.filter(r => r !== 'success').length;

      // Rate limiting : attendre 1 seconde entre batches
      if (i + batchSize < chunks.results.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. Mettre à jour le document
    await db.prepare(`
      UPDATE knowledge_documents
      SET indexed_at = datetime('now'),
          status = 'indexed'
      WHERE id = ?
    `).bind(documentId).run();

    console.log('[EMBEDDINGS] Processing terminé ✅', {
      processed,
      failed,
      total: chunks.results.length
    });

    return {
      success: true,
      documentId,
      totalChunks: chunks.results.length,
      processed,
      failed,
      vectorizeSync: vectorize ? 'enabled' : 'disabled',
      status: failed === 0 ? 'completed' : 'partial'
    };

  } catch (error) {
    console.error('[EMBEDDINGS] Erreur processing document:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process un batch de chunks spécifiques
 * @param {D1Database} db - Instance Cloudflare D1
 * @param {Vectorize} vectorize - Instance Cloudflare Vectorize
 * @param {Array<string>} chunkIds - Liste IDs chunks
 * @param {string} apiKey - Clé API OpenAI
 * @returns {Promise<Object>} - Résultat du processing
 */
export async function batchProcessChunks(db, vectorize, chunkIds, apiKey) {
  console.log('[EMBEDDINGS] Batch processing:', chunkIds.length, 'chunks');

  try {
    let processed = 0;
    let failed = 0;

    for (const chunkId of chunkIds) {
      // Récupérer le chunk avec metadata
      const chunk = await db.prepare(`
        SELECT 
          kc.id, 
          kc.content,
          kc.document_id,
          kc.tenant_id,
          kc.chunk_index
        FROM knowledge_chunks kc
        WHERE kc.id = ?
      `).bind(chunkId).first();

      if (!chunk) {
        console.warn('[EMBEDDINGS] Chunk non trouvé:', chunkId);
        failed++;
        continue;
      }

      // Générer embedding
      const embedding = await generateEmbedding(chunk.content, apiKey);
      
      if (embedding) {
        const metadata = {
          document_id: chunk.document_id,
          tenant_id: chunk.tenant_id,
          chunk_index: chunk.chunk_index
        };
        
        const stored = await storeEmbedding(db, vectorize, chunk.id, embedding, metadata);
        if (stored) {
          processed++;
        } else {
          failed++;
        }
      } else {
        failed++;
      }

      // Rate limiting : 500ms entre chunks
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return {
      success: true,
      processed,
      failed,
      total: chunkIds.length
    };

  } catch (error) {
    console.error('[EMBEDDINGS] Erreur batch processing:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Vérifie le status des embeddings pour un document
 * @param {D1Database} db - Instance Cloudflare D1
 * @param {string} documentId - ID du document
 * @returns {Promise<Object>} - Status embeddings
 */
export async function getEmbeddingsStatus(db, documentId) {
  try {
    const stats = await db.prepare(`
      SELECT 
        COUNT(*) as total_chunks,
        SUM(CASE WHEN vector_id IS NOT NULL THEN 1 ELSE 0 END) as embedded_chunks,
        AVG(token_count) as avg_tokens
      FROM knowledge_chunks
      WHERE document_id = ?
    `).bind(documentId).first();

    const document = await db.prepare(`
      SELECT id, title, status, indexed_at
      FROM knowledge_documents
      WHERE id = ?
    `).bind(documentId).first();

    return {
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
        indexedAt: document.indexed_at
      },
      chunks: {
        total: stats.total_chunks,
        embedded: stats.embedded_chunks,
        pending: stats.total_chunks - stats.embedded_chunks,
        avgTokens: Math.round(stats.avg_tokens)
      },
      progress: stats.total_chunks > 0 
        ? Math.round((stats.embedded_chunks / stats.total_chunks) * 100)
        : 0
    };

  } catch (error) {
    console.error('[EMBEDDINGS] Erreur status:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
