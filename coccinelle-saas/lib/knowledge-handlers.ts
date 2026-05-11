import { buildApiUrl, getAuthHeaders, getCurrentTenantId, getTenantStorageKey } from './config';
import { processLocalCrawl } from './crawl-processor';

export async function loadKnowledgeData(
  setDocuments: (docs: any[]) => void,
  setCalls: (calls: any[]) => void,
  setAppointments: (appts: any[]) => void
) {
  const authHeaders = getAuthHeaders();

  const [docsRes, callsRes, apptsRes] = await Promise.all([
    fetch(buildApiUrl('/api/v1/knowledge/documents'), { headers: authHeaders }),
    fetch(buildApiUrl('/api/v1/calls?limit=50'), { headers: authHeaders }),
    fetch(buildApiUrl('/api/v1/appointments'), { headers: authHeaders }),
  ]);

  const docsData = docsRes.ok ? await docsRes.json() : {};
  const callsData = callsRes.ok ? await callsRes.json() : {};
  const apptsData = apptsRes.ok ? await apptsRes.json() : {};

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

export async function saveCrawledPages(pages: any[]) {
  const structuredDocs = processLocalCrawl(pages);
  console.log('📚 processLocalCrawl retourné:', structuredDocs.length, 'documents');

  if (structuredDocs.length === 0) {
    throw new Error('Aucun contenu structuré trouvé');
  }

  const tenantId = getCurrentTenantId();
  const savedDocs = [];
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';

  for (const doc of structuredDocs) {
    const response = await fetch(`${API_URL}/api/v1/knowledge/documents?tenantId=${tenantId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: doc.title,
        content: doc.content,
        sourceType: 'crawl',
        tenantId,
        category: doc.category
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur sauvegarde document:', doc.title, errorText);
      continue;
    }

    const data = await response.json();
    if (data.success && data.document) {
      savedDocs.push(data.document);
    }
  }

  console.log('✅ Documents sauvegardés dans la DB:', savedDocs.length);
  return savedDocs;
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
