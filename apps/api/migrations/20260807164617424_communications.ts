import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('communications', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },

    company_id: {
      type: 'bigint',
      notNull: true,
      references: 'companies',
      onDelete: 'RESTRICT',
    },

    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'RESTRICT',
    },

    contact_name: {
      type: 'varchar(150)',
    },

    contact_role: {
      type: 'varchar(100)',
    },

    outcome: {
      type: 'varchar(30)',
    },

    interest_level: {
      type: 'smallint',
    },

    notes: {
      type: 'text',
    },

    next_action: {
      type: 'varchar(255)',
    },

    next_action_at: {
      type: 'timestamptz',
    },

    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },

    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },

    deleted_at: {
      type: 'timestamptz',
    },
  });

  pgm.addConstraint('communications', 'communications_outcome_check', {
    check:
      "outcome IS NULL OR outcome IN ('no_answer', 'callback', 'interested', 'not_interested')",
  });

  pgm.addConstraint('communications', 'communications_interest_level_check', {
    check: 'interest_level IS NULL OR interest_level BETWEEN 1 AND 5',
  });

  pgm.createIndex('communications', 'next_action_at', {
    name: 'idx_communications_next_action_at',
    where: 'next_action_at IS NOT NULL AND deleted_at IS NULL',
  });

  pgm.createTrigger('communications', 'set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('communications');
}
