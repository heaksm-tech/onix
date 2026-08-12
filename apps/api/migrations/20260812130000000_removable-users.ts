import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * Keep communications after their author account is permanently removed.
 *
 * The author reference becomes nullable and the foreign key clears it on user
 * deletion. A NULL is deliberately not another user row: the account is truly
 * gone, while the communication remains an honest historical record whose UI
 * can identify the missing author as «Διαγραμμένος χρήστης».
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint('communications', 'communications_user_id_fkey');
  pgm.alterColumn('communications', 'user_id', { notNull: false });
  pgm.addConstraint('communications', 'communications_user_id_fkey', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users',
      onDelete: 'SET NULL',
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Restoring the old NOT NULL contract is safe only before a user with
  // communications has actually been deleted. Refuse a lossy rollback rather
  // than deleting history or inventing an author for it.
  pgm.sql(`
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM communications WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot restore required communication authors after a user deletion';
      END IF;
    END
    $$
  `);

  pgm.dropConstraint('communications', 'communications_user_id_fkey');
  pgm.alterColumn('communications', 'user_id', { notNull: true });
  pgm.addConstraint('communications', 'communications_user_id_fkey', {
    foreignKeys: {
      columns: 'user_id',
      references: 'users',
      onDelete: 'RESTRICT',
    },
  });
}
