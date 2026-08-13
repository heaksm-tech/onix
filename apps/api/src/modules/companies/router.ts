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

const editableEmail = z
  .string()
  .trim()
  .max(255)
  .refine(
    (value) => value === '' || z.string().email().safeParse(value).success,
    'Συμπληρώστε μια έγκυρη διεύθυνση email.',
  );

// Every field remains optional for backwards-compatible PATCH semantics. The
// edit form sends all three, including an empty email when it is being cleared.
const updateInput = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    email: editableEmail.optional(),
    phone: z.string().trim().min(1).max(30).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'Δεν δόθηκαν αλλαγές για την εταιρεία.');

type IdParams = z.infer<typeof idParams>;
type UpdateInput = z.infer<typeof updateInput>;

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
 * Update a company's shared identity and contact details.
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
  validate(updateInput),
  async (req, res) => {
    const { id } = req.params as IdParams;
    const input = req.body as UpdateInput;
    const changesEmail = Object.prototype.hasOwnProperty.call(input, 'email');

    let updated: Company | undefined;
    try {
      updated = await queryOne<Company>(
        `UPDATE companies
            SET name = coalesce($2, name),
                email = CASE WHEN $3::boolean THEN $4 ELSE email END,
                phone = coalesce($5, phone)
          WHERE id = $1
            AND deleted_at IS NULL
          RETURNING id, name, email, phone`,
        [id, input.name ?? null, changesEmail, input.email || null, input.phone ?? null],
      );
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      throw HttpError.conflict(`Η εταιρεία «${input.name}» υπάρχει ήδη.`);
    }

    if (!updated) throw HttpError.notFound('Η εταιρεία δεν βρέθηκε.');

    res.json({ company: updated });
  },
);
