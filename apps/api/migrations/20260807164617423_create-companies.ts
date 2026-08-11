import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * Company identity data. Contacts, pipeline state, and interaction history are
 * intentionally stored separately.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('companies', {
    id: { type: 'bigserial', primaryKey: true },
    name: { type: 'varchar(255)', notNull: true },
    legal_name: { type: 'varchar(255)' },
    industry: { type: 'varchar(100)' },
    website: { type: 'varchar(255)' },
    phone: { type: 'varchar(30)', notNull: true },
    email: { type: 'varchar(255)' },
    address: { type: 'varchar(255)' },
    city: { type: 'varchar(100)' },
    notes: { type: 'text' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    deleted_at: { type: 'timestamptz' },
  });

  pgm.createIndex('companies', 'lower(name)', {
    name: 'companies_name_lower_idx',
  });

  pgm.createIndex('companies', 'deleted_at', {
    name: 'companies_deleted_at_idx',
  });

  pgm.createTrigger('companies', 'set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('companies');
}
