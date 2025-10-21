// ============================================================================
// COCCINELLE.AI - TEXT PROCESSING MODULE
// Phase 3 : Chunking & Tokenization
// Version : 1.17.0
// ============================================================================

/**
 * Compte approximativement les tokens (1 token ≈ 4 caractères en français)
 */
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

/**
 * Nettoie le texte
 */
function cleanText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Divise le texte en chunks avec overlap
 */
function chunkText(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokens + sentenceTokens > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens
      });
      
      // Overlap : garder les derniers mots
      const words = currentChunk.split(' ');
      const overlapWords = Math.floor(overlap / 4);
      currentChunk = words.slice(-overlapWords).join(' ') + ' ';
      currentTokens = estimateTokens(currentChunk);
    }
    
    currentChunk += sentence + ' ';
    currentTokens += sentenceTokens;
  }

  // Ajouter le dernier chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      tokens: currentTokens
    });
  }

  return chunks;
}

/**
 * Fonction principale de traitement
 * @param {string} text - Texte à traiter
 * @param {object} options - Options (chunkSize, chunkOverlap)
 * @returns {Promise<Array>} - Array de chunks
 */
export async function processText(text, options = {}) {
  const {
    chunkSize = 1000,
    chunkOverlap = 200
  } = options;

  console.log('[TEXT_PROCESSING] Starting...', {
    textLength: text.length,
    chunkSize,
    chunkOverlap
  });

  // Nettoyer le texte
  const cleanedText = cleanText(text);
  
  // Générer les chunks
  const chunks = chunkText(cleanedText, chunkSize, chunkOverlap);

  console.log('[TEXT_PROCESSING] Completed ✅', {
    chunksGenerated: chunks.length,
    totalTokens: chunks.reduce((sum, c) => sum + c.tokens, 0)
  });

  return chunks;
}

/**
 * Validation du texte
 */
export function validateText(text) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Text must be a non-empty string' };
  }

  if (text.length < 50) {
    return { valid: false, error: 'Text is too short (minimum 50 characters)' };
  }

  if (text.length > 1000000) {
    return { valid: false, error: 'Text is too long (maximum 1M characters)' };
  }

  return { valid: true };
}

/**
 * Stats sur le texte
 */
export function getTextStats(text) {
  const cleaned = cleanText(text);
  const words = cleaned.split(/\s+/).length;
  const sentences = cleaned.split(/[.!?]+/).length;
  const tokens = estimateTokens(cleaned);

  return {
    characters: cleaned.length,
    words,
    sentences,
    estimatedTokens: tokens,
    avgWordsPerSentence: Math.round(words / sentences)
  };
}
