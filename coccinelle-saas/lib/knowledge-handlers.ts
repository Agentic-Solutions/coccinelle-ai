import { buildApiUrl, getAuthHeaders, getCurrentTenantId, getTenantStorageKey } from './config';
import { processLocalCrawl } from './crawl-processor';
import { isDemoMode } from './mockData';

export async function loadKnowledgeData(
  setDocuments: (docs: any[]) => void,
  setCalls: (calls: any[]) => void,
  setAppointments: (appts: any[]) => void
) {
  console.log('🔄 loadData() appelé');

  if (isDemoMode()) {
    console.log('📍 Mode démo activé');
    const { migrateOldDocuments } = await import('./config');
    migrateOldDocuments();

    await new Promise(resolve => setTimeout(resolve, 500));

    const storageKey = getTenantStorageKey('kb_documents');
    console.log('🔑 Lecture depuis:', storageKey);

    const kbDocs = JSON.parse(localStorage.getItem(storageKey) || '[]');
    console.log('📚 Documents chargés depuis localStorage:', kbDocs.length);

    const { mockDocuments, mockCalls, mockAppointments } = await import('./mockData');
    const docsToUse = kbDocs.length > 0 ? kbDocs : mockDocuments;
    console.log('📚 Documents à afficher:', docsToUse.length);

    setDocuments(docsToUse);
    console.log('✅ setDocuments() appelé avec', docsToUse.length, 'documents');

    setCalls(mockCalls);
    setAppointments(mockAppointments);
    return;
  }

  // Mode production
  const [docsRes, callsRes, apptsRes] = await Promise.all([
    fetch(buildApiUrl('/api/v1/knowledge/documents')),
    fetch(buildApiUrl('/api/v1/vapi/calls')),
    fetch(buildApiUrl('/api/v1/appointments'))
  ]);

  const docsData = await docsRes.json();
  const callsData = await callsRes.json();
  const apptsData = await apptsRes.json();

  setDocuments(docsData.documents || []);
  setCalls(callsData.calls || []);
  setAppointments(apptsData.appointments || []);
}

export function deleteDocument(docId: string) {
  const existingDocs = JSON.parse(localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]');
  const updatedDocs = existingDocs.filter((doc: any) => doc.id !== docId);
  localStorage.setItem(getTenantStorageKey('kb_documents'), JSON.stringify(updatedDocs));
}

export async function structureWithAI(documents: any[]) {
  const crawledDocs = documents.filter(doc => doc.sourceType === 'crawl');

  if (crawledDocs.length === 0) {
    throw new Error('Aucune page crawlée à structurer');
  }

  const response = await fetch(buildApiUrl('/api/knowledge/structure-ai'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      documents: documents,
      tenantId: getCurrentTenantId()
    })
  });

  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.structuredDocuments) {
    throw new Error(data.error || 'Erreur inconnue');
  }

  // Ajouter les nouveaux documents structurés
  const storageKey = getTenantStorageKey('kb_documents');
  const existingDocs = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const updatedDocs = [...existingDocs, ...data.structuredDocuments];
  localStorage.setItem(storageKey, JSON.stringify(updatedDocs));

  return data;
}

export async function crawlWebsite(url: string, maxPages: number, maxDepth: number) {
  const response = await fetch(buildApiUrl('/api/knowledge/crawl'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ startUrl: url, tenantId: getCurrentTenantId(), maxPages, maxDepth })
  });

  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.pages) {
    throw new Error('Aucune page trouvée');
  }

  const validPages = data.pages.filter((page: any) => page.content && page.content.trim().length > 20);

  if (validPages.length === 0) {
    throw new Error('Aucun contenu valide trouvé. Vérifiez que le site est accessible.');
  }

  return validPages;
}

export function saveCrawledPages(pages: any[]) {
  const structuredDocs = processLocalCrawl(pages);
  console.log('📚 processLocalCrawl retourné:', structuredDocs.length, 'documents');

  if (structuredDocs.length === 0) {
    throw new Error('Aucun contenu structuré trouvé');
  }

  const finalDocs = structuredDocs.map((doc: any, index: number) => ({
    id: `doc_crawl_${Date.now()}_${index}`,
    title: doc.title,
    content: doc.content,
    category: doc.category,
    created_at: new Date().toISOString(),
    sourceType: 'crawl'
  }));

  const storageKey = getTenantStorageKey('kb_documents');
  const existingDocs = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const allDocs = [...existingDocs, ...finalDocs];
  localStorage.setItem(storageKey, JSON.stringify(allDocs));

  return finalDocs;
}

export async function importFromGoogle(url: string) {
  console.log('📍 Import Google Business:', url);

  const response = await fetch(buildApiUrl('/api/knowledge/import-google'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ url, tenantId: getCurrentTenantId() })
  });

  if (!response.ok) {
    throw new Error(`Erreur API ${response.status}`);
  }

  const data = await response.json();

  if (!data.success || !data.documents) {
    throw new Error(data.error || 'Erreur d\'import');
  }

  console.log('✅ Données Google extraites:', data.businessData?.name);
  console.log('📚 Documents créés:', data.documents.length);

  const finalDocs = data.documents.map((doc: any, index: number) => ({
    id: `doc_google_${Date.now()}_${index}`,
    title: doc.title,
    content: doc.content,
    category: doc.category,
    created_at: new Date().toISOString(),
    sourceType: 'google'
  }));

  const storageKey = getTenantStorageKey('kb_documents');
  const existingDocs = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const allDocs = [...existingDocs, ...finalDocs];
  localStorage.setItem(storageKey, JSON.stringify(allDocs));

  return { documents: finalDocs, businessData: data.businessData };
}

export async function uploadManualDocument(title: string, content: string) {
  if (isDemoMode()) {
    await new Promise(resolve => setTimeout(resolve, 500));

    const newDoc = {
      id: `doc_manual_${Date.now()}`,
      title: title,
      content: content,
      created_at: new Date().toISOString(),
      sourceType: 'manual'
    };

    const existingDocs = JSON.parse(localStorage.getItem(getTenantStorageKey('kb_documents')) || '[]');
    localStorage.setItem(getTenantStorageKey('kb_documents'), JSON.stringify([...existingDocs, newDoc]));

    return newDoc;
  }

  // Mode production
  const response = await fetch(buildApiUrl('/api/v1/knowledge/documents'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ title, content, tenantId: getCurrentTenantId(), sourceType: 'manual' })
  });

  if (!response.ok) {
    throw new Error('Erreur ajout');
  }

  return response.json();
}

export function saveManualInformation(category: string, data: any) {
  const timestamp = Date.now();
  let content = '';
  let title = '';

  switch (category) {
    case 'contact':
      title = `Contact - ${data.type || 'Information'}`;
      content = `# ${data.type || 'Contact'}\n\n**${data.type}**: ${data.value}\n\n`;
      break;
    case 'schedule':
      title = `Horaires - ${data.day || 'Jour'}`;
      content = `# Horaires\n\n**${data.day}**: ${data.hours}\n\n`;
      break;
    case 'services':
      title = `Service`;
      content = `# Services\n\n- ${data.service}\n`;
      break;
    case 'about':
      title = `À propos`;
      content = `# À propos\n\n${data.description}\n\n`;
      break;
  }

  const newDoc = {
    id: `doc_manual_${timestamp}`,
    title,
    content,
    category,
    sourceType: 'manual',
    created_at: new Date().toISOString()
  };

  const storageKey = getTenantStorageKey('kb_documents');
  const existingDocs = JSON.parse(localStorage.getItem(storageKey) || '[]');
  const updatedDocs = [...existingDocs, newDoc];
  localStorage.setItem(storageKey, JSON.stringify(updatedDocs));

  return newDoc;
}

export async function askKnowledgeBase(question: string, documents: any[], useAI: boolean) {
  const response = await fetch(buildApiUrl('/api/knowledge/ask'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      question,
      tenantId: getCurrentTenantId(),
      maxResults: 3,
      documents,
      useAI
    })
  });

  if (!response.ok) {
    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`⏱️ ${data.error}`);
    }
    throw new Error('Erreur API');
  }

  return response.json();
}
