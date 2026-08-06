import pg from 'pg';

import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.isProduction ? 20 : 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  // Fires for idle clients dropped by the server; the pool recovers on its own.
  logger.error({ err }, 'Unexpected error on idle postgres client');
});

export async function closePool(): Promise<void> {
  await pool.end();
}
