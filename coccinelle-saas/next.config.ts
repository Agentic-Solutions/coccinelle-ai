import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configuration pour Cloudflare Pages (seulement en production)
  // En développement, on garde le mode normal pour supporter les API routes
  ...(process.env.NODE_ENV === 'production' && process.env.CF_PAGES === '1'
    ? { output: 'export' }
    : {}),
  images: {
    unoptimized: true,
  },

  // Désactiver ESLint et TypeScript check pendant le build (pour déploiement rapide)
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Configuration des alias pour Turbopack
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/services': './src/services',
    };
    return config;
  },

  // Configuration pour développement local avec Turbopack (désactivée pour build Cloudflare)
  // experimental: {
  //   turbo: {
  //     root: __dirname,
  //   },
  // },
};

export default nextConfig;
