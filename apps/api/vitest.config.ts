import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Tests must never run against the development database. Both when running in
 * Docker (where DATABASE_URL is injected by compose) and locally (where it comes
 * from .env), inheriting it directly would let a fixture that truncates tables
 * wipe a developer's working data.
 *
 * Derive a sibling "<name>_test" database instead, or set TEST_DATABASE_URL to
 * override entirely. Create it with `npm run db:setup` (or `make test-db`).
 */
function testDatabaseUrl(): string {
  // Compose-injected process.env wins; otherwise fall back to a local .env file,
  // which vitest does not read on its own.
  const fileEnv = loadEnv('test', process.cwd(), '');

  if (process.env.TEST_DATABASE_URL ?? fileEnv.TEST_DATABASE_URL) {
    return (process.env.TEST_DATABASE_URL ?? fileEnv.TEST_DATABASE_URL) as string;
  }

  const base =
    process.env.DATABASE_URL ?? fileEnv.DATABASE_URL ?? 'postgres://localhost:5432/onix_dev';
  const url = new URL(base);
  const name = url.pathname.replace(/^\//, '') || 'onix';
  url.pathname = `/${name.replace(/_dev$/, '')}_test`;
  return url.toString();
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: testDatabaseUrl(),
    },
  },
});
