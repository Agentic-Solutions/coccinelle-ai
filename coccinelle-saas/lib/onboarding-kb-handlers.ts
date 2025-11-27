/**
 * Handlers pour l'étape Knowledge Base de l'onboarding
 * Extrait de src/components/onboarding/KnowledgeBaseStep.jsx
 */

import { buildApiUrl, getAuthHeaders, getCurrentTenantId, getTenantStorageKey } from './config';
import { processLocalCrawl } from './crawl-processor';
import { generateDocumentsFromAnswers, calculateInitialScore } from './kb-assistant-questions';
import { isDemoMode } from './mockData';

/**
 * Crawler un site web et sauvegarder les documents
 */
export async function crawlWebsiteForOnboarding(
  websiteUrl: string,
  setProgressCallback?: (message: string) => void
) {
  // Créer un contrôleur pour timeout (augmenté pour correspondre au timeout backend + retry)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 secondes timeout

  try {
    const response = await fetch(
      buildApiUrl('/api/knowledge/crawl'),
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          startUrl: websiteUrl,
          maxPages: 10,
          maxDepth: 2,
          tenantId: getCurrentTenantId()
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Erreur lors du crawl');
    }

    // Filtrer les pages valides
    const validPages = data.pages.filter((page: any) =>
      page.content && page.content.trim().length > 20
    );

    console.log(`📊 Pages crawlées: ${data.pages.length}, valides: ${validPages.length}`);

    if (validPages.length === 0) {
      const totalPages = data.pages.length;
      if (totalPages === 0) {
        throw new Error(`Le site "${websiteUrl}" ne répond pas assez rapidement ou bloque notre crawler. Vérifiez l'URL ou essayez une autre méthode (import de fichiers ou assistant IA).`);
      } else {
        throw new Error(`Le site "${websiteUrl}" a été crawlé (${totalPages} page${totalPages > 1 ? 's' : ''}) mais aucun contenu textuel n'a été trouvé. Le site utilise peut-être beaucoup de JavaScript. Essayez une autre méthode.`);
      }
    }

    // Traiter les pages pour créer des documents structurés
    const structuredDocs = processLocalCrawl(validPages);

    // Convertir en format de document avec IDs et dates
    const finalDocs = structuredDocs.map((doc: any, index: number) => ({
      id: `doc_crawl_${Date.now()}_${index}`,
      title: doc.title,
      content: doc.content,
      category: doc.category,
      created_at: new Date().toISOString(),
      sourceType: 'crawl'
    }));

    // Sauvegarder dans localStorage
    if (finalDocs.length > 0) {
      const existingDocs = JSON.parse(
        localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]'
      );
      localStorage.setItem(
        getTenantStorageKey('kb_documents'),
        JSON.stringify([...existingDocs, ...finalDocs])
      );
    }

    return {
      jobId: data.jobId,
      documentsCount: finalDocs.length,
      pagesAnalyzed: validPages.length
    };
  } catch (error) {
    clearTimeout(timeoutId);

    // Gérer spécifiquement les erreurs de timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Le crawl a pris trop de temps (>45s). Le site est peut-être trop lent. Essayez une autre méthode (import de fichiers ou assistant IA).');
    }

    throw error;
  }
}

/**
 * Upload des fichiers pour l'onboarding
 */
export async function uploadFilesForOnboarding(files: File[]) {
  if (files.length === 0) {
    throw new Error('Aucun fichier à uploader');
  }

  const formData = new FormData();
  files.forEach(file => {
    formData.append('files', file);
  });

  const authToken = localStorage.getItem('auth_token');
  const response = await fetch(
    buildApiUrl('/api/v1/knowledge/documents/upload'),
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    }
  );

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || 'Erreur lors de l\'upload');
  }

  return {
    filesCount: files.length,
    success: true
  };
}

/**
 * Générer les documents depuis les réponses de l'assistant
 */
export async function generateDocumentsFromAssistant(
  answers: Record<string, string>,
  questions: any[],
  setProgressCallback: (message: string) => void
) {
  // Récupérer infos utilisateur
  setProgressCallback('Analyse de vos réponses...');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
  const companyName = tenant.company_name || user.company_name || 'Votre entreprise';
  const sector = user.sector || 'default';

  await new Promise(resolve => setTimeout(resolve, 800));

  // Générer les documents
  setProgressCallback('Génération de documents structurés...');
  const documents = generateDocumentsFromAnswers(sector, companyName, answers);

  await new Promise(resolve => setTimeout(resolve, 800));

  // Calculer score initial
  const initialScore = calculateInitialScore(answers, questions);

  // Sauvegarder les documents
  setProgressCallback('Sauvegarde dans votre Knowledge Base...');

  if (isDemoMode()) {
    await saveToDemoMode(documents);
  } else {
    await saveToProduction(documents, tenant);
  }

  await new Promise(resolve => setTimeout(resolve, 400));

  // Message de succès
  setProgressCallback(`✓ ${documents.length} documents créés avec succès !`);
  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    documentsGenerated: documents.length,
    initialScore,
    answers
  };
}

/**
 * Sauvegarder en mode démo (localStorage)
 */
async function saveToDemoMode(documents: any[]) {
  const existingDocs = JSON.parse(
    localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]'
  );

  const newDocs = documents.map((doc, index) => ({
    id: `doc_assistant_${Date.now()}_${index}`,
    title: doc.title,
    content: doc.content,
    created_at: new Date().toISOString(),
    sourceType: 'assistant'
  }));

  localStorage.setItem(
    getTenantStorageKey('kb_documents'),
    JSON.stringify([...existingDocs, ...newDocs])
  );

  console.log('📚 Documents sauvegardés en localStorage (mode démo):', newDocs.length);
}

/**
 * Sauvegarder en mode production (API)
 */
async function saveToProduction(documents: any[], tenant: any) {
  for (const doc of documents) {
    try {
      await fetch(
        buildApiUrl('/api/v1/knowledge/documents'),
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: doc.title,
            content: doc.content,
            tenantId: tenant.id,
            sourceType: 'assistant'
          })
        }
      );
    } catch (error) {
      console.error('Erreur upload document:', error);
      // Continue même en cas d'erreur
    }
  }
}
