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
// ============================================
// TEXT PROCESSING MODULE - Phase 3
// ============================================
// v1.14.2 - 18 octobre 2025 - FIX: Added tenant_id

export function countTokens(text) {
  if (!text || typeof text !== 'string') return 0;
  return Math.ceil(text.length / 1.3);
}

export function chunkText(text, maxTokens = 512, overlapTokens = 50) {
  if (!text || typeof text !== 'string') return [];
  
  const chunks = [];
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let currentTokens = 0;
  
  for (const paragraph of paragraphs) {
    const paragraphTokens = countTokens(paragraph);
    
    if (paragraphTokens > maxTokens) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
        currentTokens = 0;
      }
      
      const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
      
      for (const sentence of sentences) {
        const sentenceTokens = countTokens(sentence);
        
        if (currentTokens + sentenceTokens > maxTokens) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = sentence;
          currentTokens = sentenceTokens;
        } else {
          currentChunk += ' ' + sentence;
          currentTokens += sentenceTokens;
        }
      }
    } else {
      if (currentTokens + paragraphTokens > maxTokens) {
        chunks.push(currentChunk.trim());
        
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(overlapTokens * 1.3));
        
        currentChunk = overlapWords.join(' ') + '\n\n' + paragraph;
        currentTokens = countTokens(currentChunk);
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
        currentTokens += paragraphTokens;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

export async function processDocument(db, documentId) {
  try {
    console.log(`[TEXT-PROCESSING] Starting processing for document: ${documentId}`);
    
    const document = await db.prepare(
      'SELECT * FROM knowledge_documents WHERE id = ?'
    ).bind(documentId).first();
    
    if (!document) {
      console.error(`[TEXT-PROCESSING] Document not found: ${documentId}`);
      return { success: false, error: 'Document not found' };
    }
    
    console.log(`[TEXT-PROCESSING] Document loaded: ${document.title} (${document.word_count} words)`);
    
    const chunks = chunkText(document.content, 512, 50);
    console.log(`[TEXT-PROCESSING] Created ${chunks.length} chunks`);
    
    let savedChunks = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      const chunkId = crypto.randomUUID();
      const tokenCount = countTokens(chunkText);
      
      await db.prepare(`
        INSERT INTO knowledge_chunks (
          id, document_id, tenant_id, chunk_index, content, 
          token_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        chunkId,
        documentId,
        document.tenant_id,
        i,
        chunkText,
        tokenCount,
        new Date().toISOString()
      ).run();
      
      savedChunks++;
      console.log(`[TEXT-PROCESSING] Chunk ${i}/${chunks.length} saved (${tokenCount} tokens)`);
    }
    
    await db.prepare(`
      UPDATE knowledge_documents 
      SET chunk_count = ?
      WHERE id = ?
    `).bind(chunks.length, documentId).run();
    
    console.log(`[TEXT-PROCESSING] Document ${documentId} processed successfully`);
    console.log(`[TEXT-PROCESSING] Stats: ${savedChunks} saved`);
    
    return {
      success: true,
      documentId,
      totalChunks: chunks.length,
      savedChunks,
      avgTokensPerChunk: Math.round(chunks.reduce((sum, c) => sum + countTokens(c), 0) / chunks.length)
    };
    
  } catch (error) {
    console.error(`[TEXT-PROCESSING] Error processing document ${documentId}:`, error.message);
    return { success: false, error: error.message };
  }
}
