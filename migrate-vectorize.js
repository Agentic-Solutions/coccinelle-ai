// Script de migration des embeddings vers Vectorize
// Usage: node migrate-vectorize.js

import { generateEmbedding } from './src/embeddings.js';

const WORKER_URL = 'https://coccinelle-api.youssef-amrouche.workers.dev';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

async function migrateDocument(documentId) {
  console.log(`\n🚀 Migration embeddings pour: ${documentId}`);
  
  // 1. Récupérer les chunks du document
  console.log('📦 Récupération chunks...');
  
  const response = await fetch(`${WORKER_URL}/api/v1/knowledge/documents`);
  const data = await response.json();
  
  console.log(`✅ Documents disponibles: ${data.count}`);
  console.log('ℹ️  Pour une véritable migration, utilisez l\'API sync-vectorize');
  
  return {
    success: true,
    message: 'Migration preview completed'
  };
}

// Exécution
const docId = process.argv[2] || 'test-doc-005';
migrateDocument(docId)
  .then(result => {
    console.log('\n✅ Résultat:', result);
  })
  .catch(error => {
    console.error('\n❌ Erreur:', error);
  });
