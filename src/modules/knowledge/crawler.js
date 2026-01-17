// Module Knowledge - Web Crawler
import { logger } from '../../utils/logger.js';

export async function crawlWebsite(url, maxPages = 10) {
  logger.info('Starting web crawl', { url, maxPages });
  
  const visited = new Set();
  const queue = [url];
  const results = [];
  
  while (queue.length > 0 && visited.size < maxPages) {
    const currentUrl = queue.shift();
    
    if (visited.has(currentUrl)) continue;
    visited.add(currentUrl);
    
    try {
      const response = await fetch(currentUrl);
      const html = await response.text();
      
      // Extraire le texte (simplification)
      const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      results.push({
        url: currentUrl,
        title: extractTitle(html),
        content: text,
        crawledAt: new Date().toISOString()
      });
      
      // Extraire les liens (simplification)
      const links = extractLinks(html, currentUrl);
      queue.push(...links);
      
    } catch (error) {
      logger.error('Crawl error', { url: currentUrl, error: error.message });
    }
  }
  
  return results;
}

function extractTitle(html) {
  const match = html.match(/<title>(.*?)<\/title>/i);
  return match ? match[1] : 'Untitled';
}

function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /<a[^>]+href=["']([^"']+)["']/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    try {
      const link = new URL(match[1], baseUrl).href;
      if (link.startsWith(baseUrl)) {
        links.push(link);
      }
    } catch (e) {
      // Invalid URL, skip
    }
  }
  
  return [...new Set(links)]; // Dédupliquer
}
