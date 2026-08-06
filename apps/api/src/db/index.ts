import type { PoolClient, QueryResultRow } from 'pg';

import { logger } from '../config/logger.js';
import { pool } from './pool.js';

export { pool, closePool } from './pool.js';

/**
 * Run a parameterised query against the pool.
 * Always pass values through `params` — never interpolate them into `text`.
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T[]> {
  const start = performance.now();
  const result = await pool.query<T>(text, params as unknown[]);
  logger.debug(
    { sql: text, rows: result.rowCount, ms: Math.round(performance.now() - start) },
    'query',
  );
  return result.rows;
}

/** Run a query expected to match at most one row. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: readonly unknown[] = [],
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

/**
 * Run `fn` inside a transaction, committing on success and rolling back on
 * throw. The client is always released.
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Cheap round-trip used by the health check. */
export async function ping(): Promise<boolean> {
  const rows = await query<{ ok: number }>('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}
