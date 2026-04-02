import { createAuth } from '@/lib/auth'

// ═══════════════════════════════════════
// API AUTH - Better Auth handler
// ═══════════════════════════════════════
// Gère automatiquement toutes les routes d'auth :
// POST /api/auth/sign-up     → Inscription
// POST /api/auth/sign-in     → Connexion
// POST /api/auth/sign-out    → Déconnexion
// GET  /api/auth/session     → Session courante
// POST /api/auth/forgot-password → Mot de passe oublié
// POST /api/auth/reset-password  → Réinitialisation

export const runtime = 'edge'

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = createAuth()
    return await auth.handler(request)
  } catch (error) {
    console.error('[Auth] Erreur GET:', error instanceof Error ? error.message : String(error))
    return new Response(JSON.stringify({ error: 'Erreur interne auth' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = createAuth()
    return await auth.handler(request)
  } catch (error) {
    console.error('[Auth] Erreur POST:', error instanceof Error ? error.message : String(error))
    return new Response(JSON.stringify({ error: 'Erreur interne auth' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
