/**
 * Copies the committed .example env files into place if they do not exist yet.
 *
 * Uses only Node built-ins and runs before any dependency is installed, so it
 * works identically on macOS, Linux and Windows (where `cp` does not exist).
 * Re-running is safe: existing files are never overwritten.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const files = [
  ['apps/api/.env.example', 'apps/api/.env'],
  ['apps/web/.env.local.example', 'apps/web/.env.local'],
];

let created = 0;

for (const [from, to] of files) {
  const target = join(root, to);

  if (existsSync(target)) {
    console.log(`  exists   ${to}`);
    continue;
  }

  copyFileSync(join(root, from), target);
  console.log(`  created  ${to}`);
  created += 1;
}

if (created > 0) {
  console.log(`\nEdit apps/api/.env if your PostgreSQL needs a username and password.`);
}
