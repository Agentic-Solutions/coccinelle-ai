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
import { indexerFiches, ecrireContenuDocument } from '../shared/kb-ingest.js';
import {
  construireFiches, detecterStructure, reecrireLigneFiche, supprimerLigneFiche,
} from '../shared/kb-fiches.js';
import {
  enregistrerVersion, restaurerVersion, listerHistorique, JOURS_CORBEILLE,
} from './versions.js';
import { construireSuggestions } from './suggestions.js';

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

    // ── Chantier CX-2 ────────────────────────────────────────────────────
    // Ces routes doivent etre testees AVANT les `startsWith` plus generiques
    // ci-dessous, sinon /documents/:id/restore serait avale par /documents/:id.

    // GET /api/v1/knowledge/suggestions - Chips de la page « Ce que sait… »
    if (path === '/api/v1/knowledge/suggestions' && method === 'GET') {
      return await handleSuggestions(request, env);
    }

    // GET /api/v1/knowledge/deleted - Corbeille (30 jours)
    if (path === '/api/v1/knowledge/deleted' && method === 'GET') {
      return await handleListDeleted(request, env);
    }

    // GET /api/v1/knowledge/history - Dernieres modifications
    if (path === '/api/v1/knowledge/history' && method === 'GET') {
      return await handleHistory(request, env);
    }

    // POST /api/v1/knowledge/preview - Aperçu d'un import, AUCUNE ecriture
    if (path === '/api/v1/knowledge/preview' && method === 'POST') {
      return await handlePreview(request, env);
    }

    // POST /api/v1/knowledge/versions/:id/restore
    if (path.startsWith('/api/v1/knowledge/versions/') && path.endsWith('/restore') && method === 'POST') {
      const versionId = path.split('/').slice(-2)[0];
      return await handleRestoreVersion(request, env, versionId);
    }

    // POST /api/v1/knowledge/documents/:id/restore
    if (path.startsWith('/api/v1/knowledge/documents/') && path.endsWith('/restore') && method === 'POST') {
      const documentId = path.split('/').slice(-2)[0];
      return await handleRestoreDocument(request, env, documentId);
    }

    // PATCH/DELETE /api/v1/knowledge/fiches/:chunkId
    if (path.startsWith('/api/v1/knowledge/fiches/') && (method === 'PATCH' || method === 'DELETE')) {
      const chunkId = decodeURIComponent(path.split('/').pop());
      return method === 'PATCH'
        ? await handlePatchFiche(request, env, chunkId)
        : await handleDeleteFiche(request, env, chunkId);
    }

    // PATCH/DELETE /api/v1/knowledge/documents/:id
    if (path.startsWith('/api/v1/knowledge/documents/') && (method === 'PATCH' || method === 'DELETE')) {
      const documentId = decodeURIComponent(path.split('/').pop());
      return method === 'PATCH'
        ? await handlePatchDocument(request, env, documentId)
        : await handleDeleteDocument(request, env, documentId);
    }
    // ─────────────────────────────────────────────────────────────────────

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
  let useTextFallback = false;

  try {
    if (provider === 'workersai' && env.AI) {
      const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text: [query] });

      // Validate the embedding output
      if (!result?.data?.[0] || !Array.isArray(result.data[0]) || result.data[0].length === 0) {
        logger.error('Workers AI returned invalid embedding', { dimensions: result?.data?.[0]?.length || 0, tenantId });
        useTextFallback = true;
      } else {
        queryEmbedding = result.data[0];
        targetVectorize = env.VECTORIZE_V2 || env.VECTORIZE;
        logger.info('Search using Workers AI', { provider: 'workersai', dimensions: queryEmbedding.length, tenantId });
      }
    } else if (env.OPENAI_API_KEY) {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: query })
      });

      if (!embeddingResponse.ok) {
        logger.error('OpenAI embedding request failed', { status: embeddingResponse.status, tenantId });
        useTextFallback = true;
      } else {
        const embeddingData = await embeddingResponse.json();
        if (!embeddingData?.data?.[0]?.embedding || embeddingData.data[0].embedding.length === 0) {
          logger.error('OpenAI returned invalid embedding', { tenantId });
          useTextFallback = true;
        } else {
          queryEmbedding = embeddingData.data[0].embedding;
          targetVectorize = env.VECTORIZE;
          logger.info('Search using OpenAI fallback', { provider: 'openai', dimensions: queryEmbedding.length, tenantId });
        }
      }
    } else {
      logger.warn('No embedding provider available, using text search', { tenantId });
      useTextFallback = true;
    }
  } catch (embeddingError) {
    logger.error('Embedding generation failed', { error: embeddingError.message, tenantId });
    useTextFallback = true;
  }

  let enrichedResults = [];
  let usedProvider = provider;

  if (!useTextFallback && queryEmbedding && targetVectorize) {
    try {
      const searchResults = await targetVectorize.query(queryEmbedding, {
        topK: topK,
        returnMetadata: true,
        filter: { tenantId: tenantId }
      });

      const chunkIds = searchResults.matches.map(m => m.id);

      if (chunkIds.length > 0) {
        const placeholders = chunkIds.map(() => '?').join(',');
        const chunksResult = await env.DB.prepare(`
          SELECT c.id, c.content, c.chunk_index, d.source_url as url, d.title, d.source_type as doc_type
          FROM knowledge_chunks c
          JOIN knowledge_documents d ON c.document_id = d.id
          WHERE c.id IN (${placeholders})
        `).bind(...chunkIds).all();

        enrichedResults = chunksResult.results.map(chunk => {
          const match = searchResults.matches.find(m => m.id === chunk.id);
          return { ...chunk, score: match?.score || 0 };
        });
      }
    } catch (vectorError) {
      logger.error('Vector search failed, falling back to text search', { error: vectorError.message, tenantId });
      useTextFallback = true;
    }
  }

  // Text-based fallback when vector search is unavailable or returned no results
  if (useTextFallback || enrichedResults.length === 0) {
    logger.info('Using text-based fallback search', { query: query.substring(0, 80), tenantId });
    usedProvider = provider + '+text-fallback';

    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (keywords.length > 0) {
      try {
        const whereClauses = keywords.map(() => 'LOWER(c.content) LIKE ?').join(' OR ');
        const params = keywords.map(k => `%${k}%`);

        const chunksResult = await env.DB.prepare(`
          SELECT c.id, c.content, c.chunk_index, d.source_url as url, d.title, d.source_type as doc_type
          FROM knowledge_chunks c
          JOIN knowledge_documents d ON c.document_id = d.id
          WHERE d.tenant_id = ? AND d.is_active = 1 AND (${whereClauses})
          LIMIT ?
        `).bind(tenantId, ...params, topK).all();

        enrichedResults = (chunksResult.results || []).map(chunk => ({
          ...chunk,
          score: 0.5
        }));
      } catch (textError) {
        logger.error('Text fallback search failed', { error: textError.message, tenantId });
      }
    }
  }

  return successResponse({ query, results: enrichedResults, count: enrichedResults.length, provider: usedProvider });
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

    logger.info("[KB] Crawl completed", { tenantId: tenant.id, startUrl, pagesCount: pages.length });

    // SAUVEGARDER LES PAGES DANS LA DB
    const savedDocs = [];
    for (const page of pages) {
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      await env.DB.prepare(`
        INSERT INTO knowledge_documents (
          id, tenant_id, title, source_url, source_type, content, metadata, created_at, updated_at
        ) VALUES (?, ?, ?, ?, "crawl", ?, ?, ?, ?)
      `).bind(
        docId,
        tenant.id,
        page.title || "Page sans titre",
        page.url,
        page.content || "",
        JSON.stringify({ crawledAt: now, startUrl }),
        now,
        now
      ).run();
      
      await indexerFiches(env, { documentId: docId, tenantId: tenant.id, contenu: page.content || '' });
      savedDocs.push({ id: docId, url: page.url, title: page.title });
    }
    
    logger.info("[KB] Documents saved", { tenantId: tenant.id, docsCount: savedDocs.length });

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
      -- CX-2 : dit au dashboard quel document porte des fiches, donc lequel un
      -- import viendrait remplacer. Sans lui, le bandeau « Import détecté »
      -- devrait deviner sa cible.
      chunk_count as chunkCount,
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

  await indexerFiches(env, { documentId: id, tenantId, contenu: content });

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

// ═══════════════════════════════════════════════════════════════════════════
// CHANTIER CX-2 — corriger, supprimer, restaurer
//
// Invariant tenu par tout ce bloc : la SOURCE est le document. Une fiche
// (une ligne de tableau dans knowledge_chunks) est une projection reconstruite
// a chaque ecriture par indexerFiches(). Corriger une fiche, c'est donc
// corriger LA LIGNE du document, puis reindexer — jamais ecrire dans le chunk,
// qui serait efface a la premiere re-ingestion.
// ═══════════════════════════════════════════════════════════════════════════

/** Charge un document du tenant. `actif` = false pour viser la corbeille. */
async function chargerDocument(env, tenantId, documentId, { actif = true } = {}) {
  return env.DB.prepare(`
    SELECT id, title, content, source_type, source_url, metadata, is_active, deleted_at
      FROM knowledge_documents
     WHERE id = ? AND tenant_id = ?${actif ? ' AND is_active = 1' : ''}
  `).bind(documentId, tenantId).first();
}

async function handlePatchDocument(request, env, documentId) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant, user } = authCheck;

  const doc = await chargerDocument(env, tenant.id, documentId);
  if (!doc) return errorResponse('Information introuvable', 404);

  const body = await request.json().catch(() => ({}));
  const { title, content, category } = body;
  if (title === undefined && content === undefined && category === undefined) {
    return errorResponse('Rien à modifier', 400);
  }

  await enregistrerVersion(env, {
    documentId, tenantId: tenant.id, auteur: user?.id, motif: 'edition_document',
  });

  if (title !== undefined || category !== undefined) {
    let metadata = doc.metadata;
    if (category !== undefined) {
      let meta = {};
      try { meta = JSON.parse(doc.metadata || '{}'); } catch { meta = {}; }
      metadata = JSON.stringify({ ...meta, category });
    }
    await env.DB.prepare(`
      UPDATE knowledge_documents
         SET title = COALESCE(?, title), metadata = ?, updated_at = datetime('now')
       WHERE id = ? AND tenant_id = ?
    `).bind(title ?? null, metadata, documentId, tenant.id).run();
  }

  let indexation = null;
  if (content !== undefined) {
    indexation = await ecrireContenuDocument(env, {
      documentId, tenantId: tenant.id, contenu: String(content),
    });
  }

  logger.info('[KB] Document modifié', { tenantId: tenant.id, documentId });
  const apres = await chargerDocument(env, tenant.id, documentId);
  return successResponse({ document: apres, fiches: indexation?.fiches ?? null });
}

async function handleDeleteDocument(request, env, documentId) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant, user } = authCheck;

  const doc = await chargerDocument(env, tenant.id, documentId);
  if (!doc) return errorResponse('Information introuvable', 404);

  // Suppression DOUCE : le document sort des recherches (toutes filtrent
  // is_active = 1) mais reste restaurable. Ses fiches ne sont pas effacees —
  // elles reviennent intactes a la restauration, sans re-ingestion.
  await enregistrerVersion(env, {
    documentId, tenantId: tenant.id, auteur: user?.id, motif: 'suppression',
  });
  await env.DB.prepare(`
    UPDATE knowledge_documents
       SET is_active = 0, deleted_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?
  `).bind(documentId, tenant.id).run();

  logger.info('[KB] Document supprimé (doux)', { tenantId: tenant.id, documentId });
  return successResponse({
    document_id: documentId,
    restaurable_jusqu_a_jours: JOURS_CORBEILLE,
    message: `Supprimée. Restaurable pendant ${JOURS_CORBEILLE} jours.`,
  });
}

async function handleRestoreDocument(request, env, documentId) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const doc = await chargerDocument(env, tenant.id, documentId, { actif: false });
  if (!doc) return errorResponse('Information introuvable', 404);
  if (doc.is_active === 1) return successResponse({ document_id: documentId, deja_active: true });

  // Hors fenetre : on ne restaure pas en silence quelque chose que l'UI
  // annonce comme perdu.
  const dansLaFenetre = await env.DB.prepare(`
    SELECT 1 AS ok FROM knowledge_documents
     WHERE id = ? AND tenant_id = ?
       AND deleted_at IS NOT NULL
       AND deleted_at > datetime('now', '-${JOURS_CORBEILLE} days')
  `).bind(documentId, tenant.id).first();
  if (!dansLaFenetre) {
    return errorResponse(`Supprimée il y a plus de ${JOURS_CORBEILLE} jours : non restaurable`, 410);
  }

  await env.DB.prepare(`
    UPDATE knowledge_documents
       SET is_active = 1, deleted_at = NULL, updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?
  `).bind(documentId, tenant.id).run();

  logger.info('[KB] Document restauré', { tenantId: tenant.id, documentId });
  return successResponse({ document_id: documentId, restaure: true });
}

async function handleListDeleted(request, env) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const res = await env.DB.prepare(`
    SELECT id, title, source_type, deleted_at, chunk_count
      FROM knowledge_documents
     WHERE tenant_id = ? AND is_active = 0
       AND deleted_at IS NOT NULL
       AND deleted_at > datetime('now', '-${JOURS_CORBEILLE} days')
     ORDER BY deleted_at DESC
  `).bind(tenant.id).all();

  return successResponse({
    documents: res.results || [],
    count: (res.results || []).length,
    fenetre_jours: JOURS_CORBEILLE,
  });
}

async function handleHistory(request, env) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const url = new URL(request.url);
  const limite = parseInt(url.searchParams.get('limite') || '10', 10);
  const modifications = await listerHistorique(env, tenant.id, limite);
  return successResponse({ modifications, count: modifications.length });
}

async function handleRestoreVersion(request, env, versionId) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant, user } = authCheck;

  const res = await restaurerVersion(env, {
    versionId: parseInt(versionId, 10), tenantId: tenant.id, auteur: user?.id,
  });
  if (res.error) return errorResponse(res.error, res.status || 400);
  return successResponse(res);
}

/** Charge une fiche et le document qui la porte, avec son index de ligne. */
async function chargerFiche(env, tenantId, chunkId) {
  const chunk = await env.DB.prepare(`
    SELECT kc.id, kc.document_id, kc.content, kc.metadata,
           kd.content AS document_contenu, kd.title AS document_titre
      FROM knowledge_chunks kc
      JOIN knowledge_documents kd ON kd.id = kc.document_id
     WHERE kc.id = ? AND kc.tenant_id = ? AND kd.is_active = 1
  `).bind(chunkId, tenantId).first();
  if (!chunk) return null;

  let meta = {};
  try { meta = JSON.parse(chunk.metadata || '{}'); } catch { meta = {}; }
  return { ...chunk, meta };
}

async function handlePatchFiche(request, env, chunkId) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant, user } = authCheck;

  const fiche = await chargerFiche(env, tenant.id, chunkId);
  if (!fiche) return errorResponse('Information introuvable', 404);
  if (fiche.meta?.type !== 'fiche' || !Number.isInteger(fiche.meta.ligne)) {
    // Fiche indexee avant CX-2 : on ne sait pas quelle ligne du document elle
    // represente. Ecrire au jugé corromprait une autre prestation.
    return errorResponse(
      'Cette information doit être réimportée avant de pouvoir être corrigée ligne à ligne',
      409,
    );
  }

  const body = await request.json().catch(() => ({}));
  const modifs = {};
  for (const champ of ['libelle', 'prix', 'details']) {
    if (body[champ] !== undefined) modifs[champ] = String(body[champ]);
  }
  if (!Object.keys(modifs).length) return errorResponse('Rien à modifier', 400);

  const reecrit = reecrireLigneFiche(fiche.document_contenu, fiche.meta.ligne, modifs);
  if (!reecrit) {
    return errorResponse('Ligne introuvable dans le document — modification refusée', 409);
  }

  await enregistrerVersion(env, {
    documentId: fiche.document_id, tenantId: tenant.id, auteur: user?.id, motif: 'edition_fiche',
  });
  const indexation = await ecrireContenuDocument(env, {
    documentId: fiche.document_id, tenantId: tenant.id, contenu: reecrit.contenu,
  });

  // On relit la fiche telle qu'elle vient d'etre RECONSTRUITE : c'est elle que
  // l'agent lira, pas la valeur saisie.
  const apres = await env.DB.prepare(
    'SELECT id, content, metadata FROM knowledge_chunks WHERE id = ?',
  ).bind(chunkId).first();

  logger.info('[KB] Fiche corrigée', {
    tenantId: tenant.id, documentId: fiche.document_id, ligne: fiche.meta.ligne,
  });

  return successResponse({
    chunk_id: chunkId,
    document_id: fiche.document_id,
    ligne_avant: reecrit.avant,
    ligne_apres: reecrit.apres,
    fiche: apres || null,
    fiches: indexation.fiches,
  });
}

async function handleDeleteFiche(request, env, chunkId) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant, user } = authCheck;

  const fiche = await chargerFiche(env, tenant.id, chunkId);
  if (!fiche) return errorResponse('Information introuvable', 404);
  if (fiche.meta?.type !== 'fiche' || !Number.isInteger(fiche.meta.ligne)) {
    return errorResponse(
      'Cette information doit être réimportée avant de pouvoir être supprimée ligne à ligne',
      409,
    );
  }

  const reecrit = supprimerLigneFiche(fiche.document_contenu, fiche.meta.ligne);
  if (!reecrit) {
    return errorResponse('Ligne introuvable dans le document — suppression refusée', 409);
  }

  await enregistrerVersion(env, {
    documentId: fiche.document_id, tenantId: tenant.id, auteur: user?.id,
    motif: 'suppression_fiche',
  });
  const indexation = await ecrireContenuDocument(env, {
    documentId: fiche.document_id, tenantId: tenant.id, contenu: reecrit.contenu,
  });

  logger.info('[KB] Fiche supprimée', {
    tenantId: tenant.id, documentId: fiche.document_id, ligne: fiche.meta.ligne,
  });

  return successResponse({
    document_id: fiche.document_id,
    ligne_supprimee: reecrit.avant,
    fiches: indexation.fiches,
    restaurable: true,
  });
}

async function handlePreview(request, env) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const body = await request.json().catch(() => ({}));
  const contenu = String(body.content || '');
  if (!contenu.trim()) return errorResponse('content is required', 400);

  const structure = detecterStructure(contenu);
  const fiches = construireFiches(contenu);

  // Compare a un document existant : c'est ce qui alimente le bandeau
  // « Import détecté : N prix modifiés ». AUCUNE ecriture ici — l'utilisateur
  // voit avant de decider.
  let modifications = [];
  if (body.document_id) {
    const doc = await chargerDocument(env, tenant.id, body.document_id);
    if (doc) {
      const avant = construireFiches(doc.content || '');
      const parLibelle = new Map(avant.map(f => [f.libelle, f]));
      for (const f of fiches) {
        const ancien = parLibelle.get(f.libelle);
        if (!ancien) modifications.push({ libelle: f.libelle, avant: null, apres: f.prix, type: 'ajout' });
        else if (ancien.prix !== f.prix) {
          modifications.push({ libelle: f.libelle, avant: ancien.prix, apres: f.prix, type: 'prix' });
        }
      }
      const nouveaux = new Set(fiches.map(f => f.libelle));
      for (const a of avant) {
        if (!nouveaux.has(a.libelle)) {
          modifications.push({ libelle: a.libelle, avant: a.prix, apres: null, type: 'suppression' });
        }
      }
    }
  }

  return successResponse({
    structure: structure.type,
    fiches: fiches.map(f => ({
      libelle: f.libelle, prix: f.prix, details: f.details,
      categorie: f.categorie, texte: f.texte, ligne: f.ligne,
    })),
    count: fiches.length,
    modifications,
    prix_modifies: modifications.filter(m => m.type === 'prix').length,
  });
}

async function handleSuggestions(request, env) {
  const authCheck = await checkAuth(request, env);
  if (authCheck.error) return authCheck.response;
  const { tenant } = authCheck;

  const url = new URL(request.url);
  const exclure = (url.searchParams.get('exclure') || '').split(',').map(s => s.trim()).filter(Boolean);
  const res = await construireSuggestions(env, tenant.id, exclure);
  return successResponse(res);
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
