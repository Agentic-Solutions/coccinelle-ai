// ═══════════════════════════════════════
// AUTH - Better Auth avec D1
// ═══════════════════════════════════════
// Better Auth gère : inscription, connexion, sessions, OAuth
// Documentation : https://www.better-auth.com
//
// Configuration adaptée pour Cloudflare D1 (SQLite)

import { betterAuth } from 'better-auth'
import { getDB, getEnv } from './db'
import type { User } from '@/types/database'

// Créer l'instance Better Auth
// Appelée dans les API routes d'auth
export function createAuth() {
  const db = getDB()

  // Récupérer la baseURL et le secret depuis l'environnement Cloudflare
  // En dev : BETTER_AUTH_URL / AUTH_SECRET depuis .env.local
  // En prod : APP_URL / AUTH_SECRET depuis wrangler secrets
  let baseURL: string
  let secret: string
  try {
    baseURL = getEnv('APP_URL')
    secret = getEnv('AUTH_SECRET')
  } catch {
    // Fallback pour le dev local si getRequestContext n'est pas disponible
    baseURL = process.env['BETTER_AUTH_URL'] ?? process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'
    secret = process.env['AUTH_SECRET'] ?? 'dev-secret-change-me-in-production-32chars-minimum'
  }

  return betterAuth({
    // URL de base pour les callbacks et redirections
    baseURL,

    // Secret pour signer les sessions
    secret,

    // Base de données D1 — Better Auth accepte D1Database directement
    database: db,

    // Mapping des noms de tables (notre schéma utilise le pluriel)
    // Les colonnes sont en camelCase (convention Better Auth) — pas besoin de fields mapping
    user: {
      modelName: 'users',
    },
    session: {
      modelName: 'sessions',
      expiresIn: 60 * 60 * 24 * 7, // 7 jours
      updateAge: 60 * 60 * 24,       // Refresh tous les jours
    },
    account: {
      modelName: 'accounts',
    },
    verification: {
      modelName: 'verification',
    },

    // Configuration email/password
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },

    // Configuration de l'app
    appName: 'VoxyPhone',

    // Pages d'auth custom
    pages: {
      signIn: '/login',
      signUp: '/signup',
      error: '/login',
    },

    // Hooks sur les opérations DB (better-auth v1.5+)
    databaseHooks: {
      // Après la création d'un utilisateur
      user: {
        create: {
          async after(user) {
            // TODO: Créer l'organisation par défaut
            // TODO: Envoyer un email de bienvenue
            void user
          },
        },
      },

      // Mise à jour de last_login_at à chaque création de session (= connexion)
      session: {
        create: {
          async after(session) {
            try {
              await db.prepare(
                'UPDATE users SET last_login_at = datetime("now") WHERE id = ?'
              ).bind(session.userId).run()
            } catch (error) {
              console.error(
                '[Auth] Erreur mise à jour last_login:',
                error instanceof Error ? error.message : String(error)
              )
            }
          },
        },
      },
    },
  })
}

// ═══════════════════════════════════════
// HELPERS D'AUTH
// ═══════════════════════════════════════

// Type pour un utilisateur authentifié (null = non connecté)
export type AuthenticatedUser = User | null

// Récupérer l'utilisateur connecté depuis la session
export async function getCurrentUser(request: Request): Promise<User | null> {
  const auth = createAuth()
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session?.user) return null

  // Récupérer les infos complètes de l'utilisateur (avec organization_id, role, etc.)
  const db = getDB()
  const user = await db.prepare(
    'SELECT * FROM users WHERE id = ?'
  ).bind(session.user.id).first<User>()

  return user ?? null
}

// Vérifier que l'utilisateur est connecté (middleware)
export async function requireAuth(request: Request): Promise<User> {
  const user = await getCurrentUser(request)
  if (!user) {
    throw new Response('Non autorisé', { status: 401 })
  }
  return user
}

// Vérifier que l'utilisateur a un rôle spécifique
export async function requireRole(
  request: Request,
  roles: Array<User['role']>
): Promise<User> {
  const user = await requireAuth(request)
  if (!roles.includes(user.role)) {
    throw new Response('Accès interdit', { status: 403 })
  }
  return user
}
