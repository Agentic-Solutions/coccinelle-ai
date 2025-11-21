// Utilitaire pour accéder à la base de données D1 depuis les API Routes
// Note: getDB() a été supprimée car inutilisée. En mode démo, on utilise localStorage.
// En production, on utilisera queryDB() pour appeler l'API Cloudflare.

// Pour les API Routes Next.js, on doit appeler l'API Cloudflare
export async function queryDB(query: string, params: any[] = []) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://coccinelle-api.youssef-amrouche.workers.dev';
  
  // On va créer un endpoint spécial sur l'API Cloudflare pour les requêtes auth
  const response = await fetch(`${apiUrl}/api/v1/internal/db/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': process.env.INTERNAL_API_SECRET || 'dev-secret-123'
    },
    body: JSON.stringify({ query, params })
  });

  if (!response.ok) {
    throw new Error('Database query failed');
  }

  return response.json();
}
