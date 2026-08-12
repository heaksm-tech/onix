import { Router } from 'express';
import { z } from 'zod';

import { query, queryOne } from '../../db/index.js';
import { HttpError } from '../../lib/http-error.js';
import { validate } from '../../middleware/validate.js';

type Company = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

/** Set by the partial unique index on `lower(name)` — see the migration. */
const UNIQUE_VIOLATION = '23505';

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === UNIQUE_VIOLATION
  );
}

// `companies.id` is a bigserial, so this arrives as a numeric string — it is
// kept as a string all the way to Postgres, which does the widening.
const idParams = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, 'Μη έγκυρο αναγνωριστικό εταιρείας.'),
});

// Matches the `name` column width, so an over-long value is a 422 naming the
// field rather than a 500 from Postgres.
const renameInput = z.object({ name: z.string().trim().min(1).max(255) });

type IdParams = z.infer<typeof idParams>;
type RenameInput = z.infer<typeof renameInput>;

export const companiesRouter: Router = Router();

companiesRouter.get('/companies', async (_req, res) => {
  const companies = await query<Company>(
    `SELECT id, name, email, phone
       FROM companies
      WHERE deleted_at IS NULL
      ORDER BY lower(name)`,
  );
  res.json({ companies });
});

/**
 * Rename a company.
 *
 * The name is the company's identity, so this reaches every communication that
 * points at it — which is exactly the point, and why the form that offers it
 * says so.
 *
 * The clash is caught from the index rather than checked for first: a SELECT
 * beforehand would leave a window in which a second request takes the name,
 * and the index has to be answered for either way.
 */
companiesRouter.patch(
  '/companies/:id',
  validate(idParams, 'params'),
  validate(renameInput),
  async (req, res) => {
    const { id } = req.params as IdParams;
    const { name } = req.body as RenameInput;

    let updated: { id: string; name: string } | undefined;
    try {
      updated = await queryOne<{ id: string; name: string }>(
        `UPDATE companies
            SET name = $2
          WHERE id = $1
            AND deleted_at IS NULL
          RETURNING id, name`,
        [id, name],
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      throw HttpError.conflict(`Η εταιρεία «${name}» υπάρχει ήδη.`);
    }

    if (!updated) throw HttpError.notFound('Η εταιρεία δεν βρέθηκε.');

    res.json({ company: updated });
  },
);
