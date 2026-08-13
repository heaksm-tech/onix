import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * Durable delivery state for reminders triggered by a communication's
 * `next_action_at`. Rows are retained after delivery or cancellation so the
 * worker has an audit trail and every scheduled version has a stable email
 * idempotency key.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('next_action_reminders', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    communication_id: {
      type: 'uuid',
      notNull: true,
      references: 'communications',
      onDelete: 'CASCADE',
    },
    scheduled_for: {
      type: 'timestamptz',
      notNull: true,
    },
    status: {
      type: 'varchar(20)',
      notNull: true,
      default: 'pending',
    },
    attempts: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    next_attempt_at: {
      type: 'timestamptz',
      notNull: true,
    },
    processing_started_at: {
      type: 'timestamptz',
    },
    sent_at: {
      type: 'timestamptz',
    },
    cancelled_at: {
      type: 'timestamptz',
    },
    last_error: {
      type: 'text',
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
  });

  pgm.addConstraint('next_action_reminders', 'next_action_reminders_status_check', {
    check: "status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')",
  });
  pgm.addConstraint('next_action_reminders', 'next_action_reminders_attempts_check', {
    check: 'attempts >= 0',
  });

  pgm.createIndex('next_action_reminders', 'communication_id', {
    name: 'next_action_reminders_one_active_idx',
    unique: true,
    where: "status IN ('pending', 'processing')",
  });
  pgm.createIndex('next_action_reminders', 'next_attempt_at', {
    name: 'next_action_reminders_due_idx',
    where: "status = 'pending'",
  });

  pgm.createTrigger('next_action_reminders', 'set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });

  // Deploying the feature must not forget follow-ups which were scheduled
  // before this table existed. Overdue rows become immediately eligible; the
  // worker still sends them in bounded batches.
  pgm.sql(`
    INSERT INTO next_action_reminders (
      communication_id, scheduled_for, next_attempt_at
    )
    SELECT id, next_action_at, next_action_at
      FROM communications
     WHERE next_action_at IS NOT NULL
       AND deleted_at IS NULL
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('next_action_reminders');
}
