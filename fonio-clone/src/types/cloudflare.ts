// ═══════════════════════════════════════
// TYPES CLOUDFLARE - Bindings
// ═══════════════════════════════════════
// Déclare les types pour les bindings D1, R2 et variables d'env
// utilisés dans wrangler.toml
//
// Note : D1Database, R2Bucket, etc. sont disponibles globalement
// via tsconfig.json → types: ["@cloudflare/workers-types"]
// PAS BESOIN de les importer ou réexporter.

// Bindings Cloudflare (correspondants à wrangler.toml)
export interface CloudflareEnv {
  // Base de données D1
  DB: D1Database

  // Stockage R2
  R2: R2Bucket

  // Variables d'environnement
  APP_NAME: string
  APP_URL: string
  AUTH_SECRET: string
  TELNYX_API_KEY: string
  TELNYX_PUBLIC_KEY: string
  TELNYX_CONNECTION_ID: string
  TELNYX_MESSAGING_PROFILE_ID: string
  TELNYX_WEBHOOK_SIGNING_KEY: string
  RETELL_API_KEY: string
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  RESEND_API_KEY: string
}
