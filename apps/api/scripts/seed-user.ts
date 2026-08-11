/**
 * Seeds a known development account so a fresh clone can sign in immediately.
 *
 *   npm run db:seed
 *
 *   email:    admin@test.com
 *   password: 123456
 *
 * Deliberately trivial credentials, and deliberately refused when NODE_ENV is
 * production: this account exists to save typing on a laptop, and a six-digit
 * admin password on a reachable deployment is a break-in waiting to happen.
 * Real accounts are made with `npm run user:create`, which prompts for a
 * password and enforces a length.
 *
 * Re-running is safe — the account is updated in place, not duplicated.
 */
import { closePool, queryOne } from '../src/db/index.js';
import { hashPassword } from '../src/modules/auth/password.js';

const SEED = {
  name: 'Διαχειριστής Onix',
  email: 'admin@test.com',
  role: 'admin',
  password: '123456',
} as const;

async function run(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a development account with NODE_ENV=production.');
  }

  const passwordHash = await hashPassword(SEED.password);

  // ON CONFLICT needs a unique index to arbitrate, and users' uniqueness lives
  // on lower(email) rather than the column, so match that expression exactly.
  const user = await queryOne<{ id: string }>(
    `INSERT INTO users (name, email, role, password_hash)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (lower(email)) DO UPDATE
            SET name = EXCLUDED.name,
                role = EXCLUDED.role,
                password_hash = EXCLUDED.password_hash,
                active = true
      RETURNING id`,
    [SEED.name, SEED.email, SEED.role, passwordHash],
  );

  if (!user) throw new Error('The seed user was neither created nor updated.');

  console.log(`\nSeeded ${SEED.email} (password: ${SEED.password}) as ${SEED.role}.`);
  console.log('Sign in at http://localhost:3000/login\n');
  console.warn('Development only — delete or change this account before deploying anywhere.\n');
}

async function main(): Promise<void> {
  try {
    await run();
  } finally {
    await closePool();
  }
}

main().catch((err: unknown) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
