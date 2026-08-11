import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    // Puts each page's CSS in the document instead of a /_next/static request.
    // The login page depends on this: it is served to visitors who have no
    // session, and proxy.ts denies them everything under /_next/.
    inlineCss: true,
  },
  // Emits .next/standalone with a self-contained server.js, which is what the
  // production Docker image runs. Keeps the runtime layer small.
  output: 'standalone',
  turbopack: {
    // Pin the workspace root to this app. Without it, the convenience
    // package.json at the repository root makes Next infer the root from the
    // wrong lockfile when running locally via `npm run dev`.
    root: import.meta.dirname,
  },
};

export default nextConfig;
