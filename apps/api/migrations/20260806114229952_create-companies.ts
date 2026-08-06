import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * The `companies` table — the core CRM entity, and the worked example every
 * later migration can copy from. It demonstrates the conventions this project
 * uses: uuid primary keys from pgcrypto, timestamptz audit columns kept current
 * by the shared set_updated_at() trigger, enums as native Postgres types, and
 * indexes chosen for the queries we expect rather than added by reflex.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createType('company_status', ['prospect', 'active', 'inactive']);

  pgm.createTable('companies', {
    id: {
      type: 'uuid',
      primaryKey: true,
      // gen_random_uuid() comes from pgcrypto, installed in the baseline migration.
      default: pgm.func('gen_random_uuid()'),
    },
    name: { type: 'text', notNull: true },
    legal_name: { type: 'text' },
    // Greek ΑΦΜ / EU VAT number. Nullable because a prospect may be recorded
    // before its paperwork is known, but unique when present.
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
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // Keeps updated_at accurate without the application having to remember.
  pgm.createTrigger('companies', 'set_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });

  // Case-insensitive lookup by name, the primary way users will search.
  pgm.createIndex('companies', 'lower(name)', { name: 'companies_name_lower_idx' });

  // List views filter by status and sort by most recently touched.
  pgm.createIndex('companies', ['status', 'updated_at']);

  pgm.addConstraint('companies', 'companies_name_not_blank', {
    check: "btrim(name) <> ''",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Dropping the table takes its trigger, indexes and constraints with it.
  pgm.dropTable('companies');
  pgm.dropType('company_status');
}
