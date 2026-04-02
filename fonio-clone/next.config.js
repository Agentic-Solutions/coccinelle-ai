// ═══════════════════════════════════════
// NEXT.CONFIG.JS — Configuration Next.js 15
// ═══════════════════════════════════════
// Compatible @cloudflare/next-on-pages (R07)
// PAS de turbopack (R01)

const path = require('path')

// Initialise les bindings Cloudflare (D1, R2) en dev local
const { setupDevPlatform } = require('@cloudflare/next-on-pages/next-dev')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fixe la détection de workspace root (supprime le warning lockfile)
  outputFileTracingRoot: path.join(__dirname),

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.r2.dev',
      },
    ],
  },

  // Packages Node.js qui ne doivent pas être bundlés côté serveur
  serverExternalPackages: [
    'telnyx',
    'retell-sdk',
    'stripe',
    'better-auth',
  ],
}

// En mode développement, active les bindings D1/R2 simulés
if (process.env.NODE_ENV === 'development') {
  setupDevPlatform().catch(console.error)
}

module.exports = nextConfig
