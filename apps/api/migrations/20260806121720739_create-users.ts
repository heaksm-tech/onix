import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * The `users` table — the people who work in the CRM.
 *
 * As the first domain table, this is also the reference every later migration
 * should copy from: uuid primary key, native enum for a closed set of values,
 * timestamptz audit columns kept current by the shared set_updated_at()
 * trigger, and rules enforced in the database rather than only in application
 * code.
 *
 * Users are deactivated, never deleted. Setting active = false keeps the row
 * intact so historical records that reference it — who logged a call, who owns
 * a follow-up — stay readable after someone leaves.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('user_role', ['employee', 'manager', 'technical', 'admin']);

  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: { type: 'text', notNull: true },
    email: { type: 'text', notNull: true },
    role: { type: 'user_role', notNull: true, default: 'employee' },
    active: { type: 'boolean', notNull: true, default: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTrigger('users', 'set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });

  // Business email is the natural identity, and must be unique regardless of
  // how it was typed. A plain UNIQUE constraint would let Anna@… and anna@…
  // both exist, so uniqueness is enforced on the lowercased value.
  pgm.createIndex('users', 'lower(email)', {
    name: 'users_email_lower_unique_idx',
    unique: true,
  });

  // Lists are almost always "active people, optionally filtered by role".
  pgm.createIndex('users', ['active', 'role']);

  pgm.addConstraint('users', 'users_name_not_blank', {
    check: "btrim(name) <> ''",
  });

  // Deliberately permissive: rejects the genuinely malformed (no @, whitespace)
  // without trying to out-guess the real world on what a valid address looks like.
  pgm.addConstraint('users', 'users_email_shape', {
    check: "email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Dropping the table takes its trigger, indexes and constraints with it.
  pgm.dropTable('users');
  pgm.dropType('user_role');
}
