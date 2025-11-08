// Module Knowledge - Text Processing & Chunking
import { logger } from '../../utils/logger.js';

const CHUNK_SIZE = 500; // tokens approximatifs
const OVERLAP = 50;

export function chunkText(text, chunkSize = CHUNK_SIZE, overlap = OVERLAP) {
  if (!text || text.length === 0) return [];
  
  // Découper en mots
  const words = text.split(/\s+/);
  const chunks = [];
  
  let i = 0;
  while (i < words.length) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    chunks.push({
      content: chunk,
      startIndex: i,
      wordCount: Math.min(chunkSize, words.length - i)
    });
    
    i += chunkSize - overlap;
  }
  
  logger.info('Text chunked', { 
    totalWords: words.length, 
    chunksCreated: chunks.length 
  });
  
  return chunks;
}

export function cleanText(text) {
  return text
    .replace(/\s+/g, ' ')  // Normaliser espaces
    .replace(/[^\w\s.,!?;:()\-]/g, '')  // Garder ponctuation
    .trim();
}

export function extractMetadata(html) {
  const metadata = {};
  
  // Titre
  const titleMatch = html.match(/<title>(.*?)<\/title>/i);
  if (titleMatch) metadata.title = titleMatch[1];
  
  // Description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
  if (descMatch) metadata.description = descMatch[1];
  
  // Keywords
  const kwMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["']/i);
  if (kwMatch) metadata.keywords = kwMatch[1];
  
  return metadata;
}
