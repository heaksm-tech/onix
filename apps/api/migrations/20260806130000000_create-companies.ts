import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('company_status', ['prospect', 'active', 'inactive']);

  pgm.createTable('companies', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: { type: 'text', notNull: true },
    legal_name: { type: 'text' },
    vat_number: { type: 'text', unique: true },
    status: { type: 'company_status', notNull: true, default: 'prospect' },
    email: { type: 'text' },
    phone: { type: 'text' },
    website: { type: 'text' },
    address_line1: { type: 'text' },
    address_line2: { type: 'text' },
    city: { type: 'text' },
    postal_code: { type: 'text' },
    country: { type: 'text', notNull: true, default: 'GR' },
    notes: { type: 'text' },
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

  pgm.createTrigger('companies', 'set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });

  pgm.createIndex('companies', 'lower(name)', {
    name: 'companies_name_lower_idx',
  });
  pgm.createIndex('companies', ['status', 'updated_at']);
  pgm.addConstraint('companies', 'companies_name_not_blank', {
    check: "btrim(name) <> ''",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('companies');
  pgm.dropType('company_status');
}
