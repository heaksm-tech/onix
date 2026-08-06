import { defineConfig } from 'vitest/config';

/**
 * Tests must never run against the development database. Inside the container
 * DATABASE_URL already points at onix_dev, so inheriting it would let a fixture
 * that truncates tables wipe a developer's working data.
 *
 * Derive a sibling "<name>_test" database instead, or set TEST_DATABASE_URL to
 * override entirely. Create it with `make test-db`.
 */
function testDatabaseUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;

  const base = process.env.DATABASE_URL ?? 'postgres://onix:onix@postgres:5432/onix_dev';
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
