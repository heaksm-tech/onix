import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Emits .next/standalone with a self-contained server.js, which is what the
  // production Docker image runs. Keeps the runtime layer small.
  output: 'standalone',
};

export default nextConfig;
