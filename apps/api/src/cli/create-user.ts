/**
 * Creates a user account, or sets the password of an existing one.
 *
 * There is no self-registration: this command is how accounts come into
 * existence. Run it from `apps/api`, or via `npm run user:create` at the
 * repository root.
 *
 *   npm run user:create
 *   npm run user:create -- --email anna@melas.gr --name "Άννα Μελά" --role admin
 *
 * Anything not passed as a flag is prompted for. The password is always
 * prompted — never taken from a flag — so it stays out of shell history and
 * process listings.
 *
 * It lives under `src/` rather than in `scripts/` because it is compiled into
 * `dist/` along with everything else, which is what puts it inside the
 * production image: a fresh deployment has no accounts and the whole CRM is
 * behind sign-in, so `npm run user:create:dist` has to work in a container
 * that carries no TypeScript source and no dev dependencies. The laptop-only
 * tools in `scripts/` have no such requirement.
 */
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

import { env } from '../config/env.js';
import { closePool, queryOne } from '../db/index.js';
import { MIN_PASSWORD_LENGTH, hashPassword } from '../modules/auth/password.js';
import { USER_ROLES, type UserRole } from '../modules/auth/types.js';

/** Wraps stdout so the password prompts can be answered invisibly. */
let muted = false;
const output = new Writable({
  write(chunk: Buffer, encoding, callback) {
    if (!muted) process.stdout.write(chunk, encoding);
    callback();
  },
});

const rl = createInterface({ input: process.stdin, output, terminal: true });

async function ask(question: string): Promise<string> {
  return (await rl.question(question)).trim();
}

async function askSecret(question: string): Promise<string> {
  // The prompt goes straight to stdout, bypassing the wrapper that is about to
  // swallow the echoed keystrokes.
  process.stdout.write(question);
  muted = true;
  try {
    // Not trimmed: leading and trailing spaces are legitimate password characters.
    return await rl.question('');
  } finally {
    muted = false;
    process.stdout.write('\n');
  }
}

/** Reads `--name value` or `--name=value`. */
function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  if (index !== -1) return process.argv[index + 1];

  const prefix = `--${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function isRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}

type ExistingUser = { id: string; name: string; role: UserRole; active: boolean };

async function run(): Promise<void> {
  const email = (flag('email') ?? (await ask('Email: '))).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`"${email}" is not a valid email address.`);
  }

  const existing = await queryOne<ExistingUser>(
    'SELECT id, name, role, active FROM users WHERE lower(email) = $1',
    [email],
  );

  if (existing) {
    console.log(`\n${existing.name} <${email}> already exists (role: ${existing.role}).`);
    console.log('Continuing sets a new password for that account.\n');
  }

  const name = existing?.name ?? flag('name') ?? (await ask('Full name: '));
  if (!name.trim()) throw new Error('A name is required.');

  const roles = USER_ROLES.join('|');
  const chosenRole = existing?.role ?? flag('role') ?? (await ask(`Role [${roles}]: `)) ?? '';
  const role = chosenRole.trim() || 'employee';
  if (!isRole(role)) throw new Error(`"${role}" is not one of: ${USER_ROLES.join(', ')}.`);

  const password = await askSecret(`Password (at least ${MIN_PASSWORD_LENGTH} characters): `);
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`The password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if ((await askSecret('Repeat password: ')) !== password) {
    throw new Error('The two passwords do not match.');
  }

  process.stdout.write('\nHashing…');
  const passwordHash = await hashPassword(password);
  process.stdout.write(' done\n');

  if (existing) {
    // Reactivating is intended: setting someone's password is how an
    // administrator brings a deactivated account back.
    await queryOne('UPDATE users SET password_hash = $2, active = true WHERE id = $1', [
      existing.id,
      passwordHash,
    ]);
    console.log(`\nUpdated the password for ${email}.`);
    if (!existing.active) console.log('The account was inactive and has been reactivated.');
  } else {
    await queryOne('INSERT INTO users (name, email, role, password_hash) VALUES ($1, $2, $3, $4)', [
      name.trim(),
      email,
      role,
      passwordHash,
    ]);
    console.log(`\nCreated ${name.trim()} <${email}> as ${role}.`);
  }

  // The dev port is only the right answer on a laptop; in a container the
  // web app is wherever it is published.
  console.log(
    env.isProduction
      ? 'They can sign in on the /login page of the web app.\n'
      : 'They can sign in at http://localhost:3000/login\n',
  );
}

async function main(): Promise<void> {
  try {
    await run();
  } finally {
    rl.close();
    await closePool();
  }
}

main().catch((err: unknown) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
