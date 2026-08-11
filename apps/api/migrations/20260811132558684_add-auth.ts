import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * Sign-in credentials and server-side sessions.
 *
 * `users.password_hash` is nullable on purpose. Accounts are created by an
 * administrator, and a row without a hash simply cannot sign in — which is
 * also what every user created before this migration gets. There is no
 * self-registration, so "no credential yet" is a normal, valid state rather
 * than an error to guard against.
 *
 * Sessions are opaque server-side records rather than self-contained tokens:
 * signing out, deactivating an account, or revoking a stolen cookie all take
 * effect on the next request, which a stateless token cannot offer without a
 * blocklist that would end up being this table anyway.
 *
 * Only the SHA-256 of the session token is stored. The token itself is 32
 * bytes of CSPRNG output, so a fast digest is enough — there is nothing to
 * brute-force — while a database leak still hands out no usable cookies.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn('users', {
    password_hash: { type: 'text' },
  });

  // Hashes are written by the application in a self-describing format
  // ("scrypt$N$r$p$salt$hash"). The check keeps a plaintext password from ever
  // being stored by mistake, without pinning the schema to one algorithm.
  pgm.addConstraint('users', 'users_password_hash_format', {
    check: "password_hash IS NULL OR password_hash ~ '^[a-z0-9]+[$]'",
  });

  pgm.createTable('sessions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      // Sessions are worthless without their user, and users are deactivated
      // rather than deleted, so cascading here loses nothing historical.
      onDelete: 'CASCADE',
    },
    token_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Every authenticated request looks a session up by this value, so it is the
  // one index that has to exist. Unique doubles as a guard against a token
  // ever being issued twice.
  pgm.createIndex('sessions', 'token_hash', {
    name: 'sessions_token_hash_unique_idx',
    unique: true,
  });

  // Supports "sign out everywhere" and the sweep of expired rows on login.
  pgm.createIndex('sessions', 'user_id');
  pgm.createIndex('sessions', 'expires_at');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('sessions');
  pgm.dropConstraint('users', 'users_password_hash_format');
  pgm.dropColumn('users', 'password_hash');
}
