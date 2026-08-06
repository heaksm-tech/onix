/**
 * Creates the local development and test databases if they do not exist.
 *
 * Only needed when running without Docker — the compose stack creates its
 * database from the POSTGRES_* environment variables instead. Safe to re-run;
 * existing databases are left untouched.
 *
 *   npm run db:setup
 */
import pg from 'pg';

const DEFAULT_URL = 'postgres://localhost:5432/onix_dev';

function targetNames(databaseUrl: string): { dev: string; test: string } {
  const url = new URL(databaseUrl);
  const dev = url.pathname.replace(/^\//, '') || 'onix_dev';
  return { dev, test: `${dev.replace(/_dev$/, '')}_test` };
}

/** Connect to the `postgres` maintenance database on the same server. */
function maintenanceUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.pathname = '/postgres';
  return url.toString();
}

async function ensureDatabase(client: pg.Client, name: string): Promise<void> {
  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);

  if (rowCount) {
    console.log(`  exists   ${name}`);
    return;
  }

  // Identifiers cannot be parameterised; quote defensively instead.
  await client.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
  console.log(`  created  ${name}`);
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_URL;
  const { dev, test } = targetNames(databaseUrl);

  const client = new pg.Client({ connectionString: maintenanceUrl(databaseUrl) });

  try {
    await client.connect();
  } catch (err) {
    console.error(
      `\nCould not reach PostgreSQL at ${new URL(databaseUrl).host}.\n` +
        `Is it running, and is DATABASE_URL in apps/api/.env correct?\n`,
    );
    throw err;
  }

  try {
    console.log(`PostgreSQL at ${new URL(databaseUrl).host}:`);
    await ensureDatabase(client, dev);
    await ensureDatabase(client, test);
    console.log(`\nNext: npm run migrate:up`);
  } finally {
    await client.end();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
