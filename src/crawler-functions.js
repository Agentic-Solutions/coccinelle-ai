// Web Crawler Functions - À intégrer dans index.js lors de la prochaine session
// Coccinelle.ai v1.13.1 - Phase 2 Web Crawler

function extractTextFromHTML(html) {
  return html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractMetadata(html, url) {
  const m = { url, title: '', description: '', headings: [] };
  const t = html.match(/<title[^>]*>(.*?)<\/title>/i);
  if (t) m.title = t[1].trim();
  const d = html.match(/<meta[^>]*name=["']description["'][^>]*content=["'](.*?)["']/i);
  if (d) m.description = d[1].trim();
  const h1 = html.match(/<h1[^>]*>(.*?)<\/h1>/gi) || [];
  const h2 = html.match(/<h2[^>]*>(.*?)<\/h2>/gi) || [];
  m.headings = [...h1, ...h2].map(h => extractTextFromHTML(h)).filter(h => h.length > 0);
  return m;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const matches = html.matchAll(/<a[^>]*href=["'](.*?)["']/gi);
  for (const m of matches) {
    try {
      let href = m[1];
      if (href.startsWith('/')) href = new URL(baseUrl).origin + href;
      else if (!href.startsWith('http')) href = new URL(href, new URL(baseUrl)).href;
      const u = new URL(href);
      if (u.protocol === 'http:' || u.protocol === 'https:') links.push(u.href);
    } catch (e) {}
  }
  return [...new Set(links)];
}

function isSameDomain(url1, url2) {
  try { return new URL(url1).hostname === new URL(url2).hostname; } catch { return false; }
}

function shouldCrawlUrl(url, includePatterns, excludePatterns) {
  if (excludePatterns?.length > 0) for (const p of excludePatterns) if (url.includes(p)) return false;
  if (includePatterns?.length > 0) { for (const p of includePatterns) if (url.includes(p)) return true; return false; }
  return true;
}

function hashString(str) {
  let h = 0; for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h = h & h; }
  return Math.abs(h).toString(36);
}

async function saveDocument(tenantId, db, docData) {
  const docId = 'doc_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
  const contentHash = hashString(docData.content || '');
  const existing = await db.prepare('SELECT id FROM knowledge_documents WHERE tenant_id = ? AND content_hash = ?').bind(tenantId, contentHash).first();
  if (existing) return existing.id;
  await db.prepare('INSERT INTO knowledge_documents (id, tenant_id, source_type, source_url, title, content, content_hash, word_count, metadata, status, crawled_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(docId, tenantId, docData.sourceType || 'webpage', docData.sourceUrl, docData.title, docData.content, contentHash, docData.content ? docData.content.split(/\s+/).length : 0, JSON.stringify(docData.metadata || {}), 'completed', new Date().toISOString(), new Date().toISOString(), new Date().toISOString()).run();
  return docId;
}

async function crawlWebsite(tenantId, db, rootUrl, options = {}) {
  const { maxPages = 50, maxDepth = 3, includePatterns = [], excludePatterns = [] } = options;
  const visited = new Set(); const queue = [{ url: rootUrl, depth: 0 }]; const documents = [];
  while (queue.length > 0 && visited.size < maxPages) {
    const { url, depth } = queue.shift();
    if (visited.has(url) || depth > maxDepth || !shouldCrawlUrl(url, includePatterns, excludePatterns)) continue;
    visited.add(url);
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Coccinelle.ai Bot/1.0' } });
      if (!response.ok || !(response.headers.get('content-type') || '').includes('text/html')) continue;
      const html = await response.text();
      const mainContent = extractTextFromHTML(html);
      const metadata = extractMetadata(html, url);
      if (mainContent && mainContent.length > 100) {
        documents.push(await saveDocument(tenantId, db, { sourceType: 'webpage', sourceUrl: url, title: metadata.title || url, content: mainContent, metadata }));
      }
      if (depth < maxDepth) {
        for (const link of extractLinks(html, url)) {
          if (isSameDomain(link, rootUrl) && !visited.has(link)) queue.push({ url: link, depth: depth + 1 });
        }
      }
      await new Promise(r => setTimeout(r, 500));
    } catch (e) {}
  }
  return { pagesCrawled: visited.size, documentsCreated: documents.length };
}

// INSTRUCTIONS POUR INTÉGRATION :
// 1. Copier toutes ces fonctions AVANT la ligne "export default {"
// 2. Ajouter les endpoints suivants dans le router principal :
//    - POST /api/v1/knowledge/crawl
//    - GET /api/v1/knowledge/crawl/:jobId
//    - GET /api/v1/knowledge/documents
// 3. Voir manifeste v1.13.1 pour le code complet des endpoints
