import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * One-time account invitations.
 *
 * The email carries a random bearer token, while the database stores only its
 * SHA-256. One row per user makes sending the invitation again an explicit
 * rotation: the earlier link stops working as soon as the replacement is
 * issued. Accepting a link records when it was used rather than deleting it,
 * which leaves a small audit trail without retaining a usable credential.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('account_invitations', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    invited_by: {
      type: 'uuid',
      references: 'users',
      // A reset may remove the person who sent an invitation. The invitation
      // still belongs to its recipient, so only the attribution becomes NULL.
      onDelete: 'SET NULL',
    },
    token_hash: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    accepted_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTrigger('account_invitations', 'set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });

  pgm.createIndex('account_invitations', 'user_id', {
    name: 'account_invitations_user_unique_idx',
    unique: true,
  });
  pgm.createIndex('account_invitations', 'token_hash', {
    name: 'account_invitations_token_hash_unique_idx',
    unique: true,
  });
  pgm.createIndex('account_invitations', 'expires_at');

  pgm.addConstraint('account_invitations', 'account_invitations_token_hash_format', {
    check: "token_hash ~ '^[0-9a-f]{64}$'",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('account_invitations');
}
