import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * Baseline database setup: UUID generation and a shared trigger function that
 * keeps `updated_at` current. Feature migrations build on top of this.
 *
 * Usage in a later migration:
 *   pgm.createTrigger('companies', 'set_updated_at', {
 *     when: 'BEFORE', operation: 'UPDATE', level: 'ROW',
 *     function: 'set_updated_at',
 *   });
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createFunction(
    'set_updated_at',
    [],
    { returns: 'trigger', language: 'plpgsql', replace: true },
    `
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    `,
  );
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropFunction('set_updated_at', [], { ifExists: true });
  pgm.dropExtension('pgcrypto', { ifExists: true });
}
