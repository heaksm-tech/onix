import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * In-app notifications delivered to one account.
 *
 * Notification producers live in the API. The web app only reads this table
 * through the authenticated notification routes and records read state.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('notifications', {
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
    title: { type: 'varchar(160)', notNull: true },
    body: { type: 'text', notNull: true },
    action_url: { type: 'text' },
    read_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('notifications', 'notifications_title_not_blank', {
    check: "btrim(title) <> ''",
  });
  pgm.addConstraint('notifications', 'notifications_body_not_blank', {
    check: "btrim(body) <> ''",
  });
  pgm.addConstraint('notifications', 'notifications_action_url_internal', {
    check: "action_url IS NULL OR (action_url LIKE '/%' AND action_url NOT LIKE '//%')",
  });

  pgm.createIndex('notifications', ['user_id', { name: 'created_at', sort: 'DESC' }], {
    name: 'notifications_user_created_at_idx',
  });
  pgm.createIndex('notifications', ['user_id'], {
    name: 'notifications_unread_user_idx',
    where: 'read_at IS NULL',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('notifications');
}
