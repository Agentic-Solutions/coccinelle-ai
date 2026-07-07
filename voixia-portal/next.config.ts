import type { NextConfig } from "next";

// R01 : build webpack (pas de --turbopack). Static export pour Cloudflare Pages.
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  // On garde la vérif TS via `npm run typecheck` (tsc --noEmit, R27) hors build.
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
