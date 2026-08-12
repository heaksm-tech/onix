import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands: undefined = undefined;

/**
 * A company name identifies the company, so it may only be used once.
 *
 * Duplicates that already exist are merged rather than dropped: a duplicate is
 * the same real company entered twice, and its communications are a record of
 * calls that actually happened. The oldest row of each name wins, every
 * communication is repointed onto it, and the rows left over are soft-deleted
 * the way the rest of the app deletes things.
 *
 * The index is partial on `deleted_at IS NULL`, so only live companies compete
 * for a name — a removed company's name is free again, and the rows merged
 * away below do not collide with the survivor they were merged into.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  // Names are trimmed on the way in now, so legacy padding would otherwise let
  // «ΑΒΓ ΕΠΕ » and «ΑΒΓ ΕΠΕ» both live.
  pgm.sql(`UPDATE companies SET name = btrim(name) WHERE name <> btrim(name)`);

  // Repoint first: the survivor is chosen among live rows, and the next
  // statement is what makes the losers stop being live.
  pgm.sql(`
    UPDATE communications AS m
       SET company_id = keeper.id
      FROM companies AS duplicate
      JOIN LATERAL (
             SELECT k.id
               FROM companies AS k
              WHERE k.deleted_at IS NULL
                AND lower(k.name) = lower(duplicate.name)
              ORDER BY k.id
              LIMIT 1
           ) AS keeper ON keeper.id <> duplicate.id
     WHERE m.company_id = duplicate.id
       AND duplicate.deleted_at IS NULL
  `);

  pgm.sql(`
    UPDATE companies AS c
       SET deleted_at = now()
     WHERE c.deleted_at IS NULL
       AND EXISTS (
             SELECT 1
               FROM companies AS keeper
              WHERE keeper.deleted_at IS NULL
                AND lower(keeper.name) = lower(c.name)
                AND keeper.id < c.id
           )
  `);

  // Replaces the plain lower(name) index rather than joining it: the unique
  // one serves the same «ORDER BY lower(name) WHERE deleted_at IS NULL» reads.
  pgm.dropIndex('companies', 'lower(name)', { name: 'companies_name_lower_idx' });

  pgm.createIndex('companies', 'lower(name)', {
    name: 'companies_name_unique_idx',
    unique: true,
    where: 'deleted_at IS NULL',
  });
}

/**
 * Only the constraint comes back. The merge is deliberately not reversed —
 * which rows were folded into which is not recorded, and re-splitting them
 * would invent companies that no longer have communications of their own.
 */
export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('companies', 'lower(name)', { name: 'companies_name_unique_idx' });

  pgm.createIndex('companies', 'lower(name)', {
    name: 'companies_name_lower_idx',
  });
}
