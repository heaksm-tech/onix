/**
 * Seeds the two accounts every Onix deployment starts with.
 *
 *   npm run db:seed              # create or restore both accounts
 *   npm run db:seed -- --reset   # …and remove every other account first
 *
 * Unlike the throwaway development seed this replaces, it is meant to run on
 * production too: a fresh deployment has no accounts and the whole CRM is
 * behind sign-in, so this is what opens the door. That is also why it lives
 * under `src/` next to `create-user.ts` rather than in `scripts/` — only `src/`
 * is compiled into `dist/` and therefore into the runtime image, where it runs
 * as `npm run db:seed:dist`.
 *
 * The passwords below are committed on purpose, so the same two credentials
 * work on a laptop and on the server without anything being passed around.
 * They are therefore public to everyone who can read this repository: change
 * them on the server with `npm run user:create:dist` once you are signed in,
 * and treat what is written here as first-login credentials, not as secrets.
 *
 * Re-running is safe and idempotent. Each run restores both accounts to
 * exactly what is declared here — name, role, password, active — which makes
 * this the way back in after a forgotten password, not only a first-run step.
 */
import type { PoolClient } from 'pg';

import { closePool, transaction } from '../db/index.js';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../modules/auth/password.js';
import type { UserRole } from '../modules/auth/types.js';

type SeedAccount = {
  name: string;
  email: string;
  role: UserRole;
  password: string;
};

/** Owns the deployment: full access, and the account orphaned records fall back to. */
const ADMIN: SeedAccount = {
  name: 'Διαχειριστής Onix',
  email: 'admin@melaslogistics.gr',
  role: 'admin',
  password: 'bb7P9rtwM6C%',
};

/** Kept deliberately non-admin, so role-dependent screens can be checked honestly. */
const DEVELOPER: SeedAccount = {
  name: 'Τεχνική Υποστήριξη',
  email: 'dev@melaslogistics.gr',
  role: 'technical',
  password: 'p46VWyt%Kv2k',
};

const ACCOUNTS: readonly SeedAccount[] = [ADMIN, DEVELOPER];

type SeedResult = { account: SeedAccount; id: string; created: boolean };

/**
 * Create the account, or restore an existing one to the declared values.
 *
 * ON CONFLICT needs a unique index to arbitrate, and users' uniqueness lives on
 * lower(email) rather than on the column, so the target matches that expression
 * exactly. `email` is overwritten as well as matched on, which normalises the
 * stored casing if the row was first created as `Admin@…`.
 */
async function upsert(
  client: PoolClient,
  account: SeedAccount,
  passwordHash: string,
): Promise<SeedResult> {
  const { rows } = await client.query<{ id: string; created: boolean }>(
    `INSERT INTO users (name, email, role, password_hash)
          VALUES ($1, $2, $3, $4)
     ON CONFLICT (lower(email)) DO UPDATE
            SET name = EXCLUDED.name,
                email = EXCLUDED.email,
                role = EXCLUDED.role,
                password_hash = EXCLUDED.password_hash,
                active = true
      RETURNING id, xmax = 0 AS created`,
    [account.name, account.email, account.role, passwordHash],
  );

  // xmax is zero only on a genuinely inserted row, which is the one way an
  // upsert can tell "created" from "restored" in a single statement.
  const row = rows[0];
  if (!row) throw new Error(`${account.email} was neither created nor updated.`);

  return { account, id: row.id, created: row.created };
}

/**
 * Reduce the users table to the seeded accounts.
 *
 * Communications reference their author with ON DELETE RESTRICT, so deleting a
 * user who has logged one is refused by the database — correctly, since that
 * history is the point of the CRM. They are reassigned to the administrator
 * first: the account that logged them is going away either way, and losing the
 * communication with it would be far worse than losing its attribution.
 *
 * Sessions are cleared for everyone, seeded accounts included. Their passwords
 * were just rewritten, and a cookie that outlives the password it was issued
 * against is exactly what a reset is supposed to close.
 */
async function reset(client: PoolClient, keep: readonly string[]): Promise<void> {
  const { rows: doomed } = await client.query<{ email: string }>(
    'SELECT email FROM users WHERE NOT (id = ANY($1::uuid[])) ORDER BY email',
    [keep],
  );

  if (doomed.length === 0) {
    console.log('  reset      no other accounts to remove');
    await client.query('DELETE FROM sessions');
    return;
  }

  const { rowCount: reassigned } = await client.query(
    'UPDATE communications SET user_id = $1 WHERE NOT (user_id = ANY($2::uuid[]))',
    [keep[0], keep],
  );

  await client.query('DELETE FROM sessions');
  await client.query('DELETE FROM users WHERE NOT (id = ANY($1::uuid[]))', [keep]);

  if (reassigned) {
    console.log(`  reassigned ${reassigned} communication(s) to ${ADMIN.email}`);
  }
  for (const { email } of doomed) console.log(`  deleted    ${email}`);
}

async function run(): Promise<void> {
  const shouldReset = process.argv.includes('--reset');

  for (const account of ACCOUNTS) {
    if (account.password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `The seed password for ${account.email} is shorter than the ${MIN_PASSWORD_LENGTH} characters accounts require.`,
      );
    }
  }

  // Hashing is deliberately slow, so it happens before the transaction opens
  // rather than holding a write lock on users for a fifth of a second.
  process.stdout.write('\nHashing…');
  const prepared = await Promise.all(
    ACCOUNTS.map(async (account) => ({
      account,
      passwordHash: await hashPassword(account.password),
    })),
  );
  process.stdout.write(' done\n\n');

  const results = await transaction(async (client) => {
    const seeded: SeedResult[] = [];
    for (const { account, passwordHash } of prepared) {
      seeded.push(await upsert(client, account, passwordHash));
    }

    for (const { account, created } of seeded) {
      console.log(`  ${created ? 'created  ' : 'restored '} ${account.email} (${account.role})`);
    }

    // ADMIN is first in ACCOUNTS, so keep[0] is the account reassignment
    // targets. Asserting it here keeps that coupling from breaking silently if
    // the order above is ever changed.
    const keep = seeded.map(({ id }) => id);
    if (shouldReset) {
      if (seeded[0]?.account !== ADMIN) throw new Error('The administrator must be seeded first.');
      await reset(client, keep);
    }

    return seeded;
  });

  const width = Math.max(...ACCOUNTS.map(({ email }) => email.length));
  console.log('\nSign in with:\n');
  for (const { account } of results) {
    console.log(`  ${account.email.padEnd(width)}  ${account.password}`);
  }

  console.log(
    shouldReset
      ? '\nThese are now the only accounts in the database.'
      : '\nOther existing accounts were left alone — pass --reset to remove them.',
  );
  console.log('These passwords are in the repository. Change them with `npm run user:create`.\n');
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
