import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * Email composed inside a communication and delivered to the company's email
 * address at a future instant. Delivery rows are immutable snapshots: an edit
 * cancels the previous pending version and creates another, preserving a full
 * audit trail and a stable idempotency key for every attempted message.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('scheduled_emails', {
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
    recipient_email: {
      type: 'varchar(255)',
      notNull: true,
    },
    subject: {
      type: 'varchar(255)',
      notNull: true,
    },
    body: {
      type: 'text',
      notNull: true,
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

  pgm.addConstraint('scheduled_emails', 'scheduled_emails_status_check', {
    check: "status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')",
  });
  pgm.addConstraint('scheduled_emails', 'scheduled_emails_attempts_check', {
    check: 'attempts >= 0',
  });

  pgm.createIndex('scheduled_emails', 'communication_id', {
    name: 'scheduled_emails_one_active_idx',
    unique: true,
    where: "status IN ('pending', 'processing')",
  });
  pgm.createIndex('scheduled_emails', 'next_attempt_at', {
    name: 'scheduled_emails_due_idx',
    where: "status = 'pending'",
  });

  pgm.createTrigger('scheduled_emails', 'set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('scheduled_emails');
}
