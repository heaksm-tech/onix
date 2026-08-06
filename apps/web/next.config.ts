import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
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
