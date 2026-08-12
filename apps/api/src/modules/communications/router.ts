import { Router } from 'express';
import { z } from 'zod';

import { query, queryOne, transaction } from '../../db/index.js';
import { HttpError } from '../../lib/http-error.js';
import { requireRole } from '../../middleware/require-role.js';
import { validate } from '../../middleware/validate.js';
import type { AuthUser } from '../auth/types.js';

type User = { id: string; name: string; email: string };
type Communication = {
  id: string;
  company_id: string;
  user_id: string | null;
  outcome: string | null;
  interest_level: number | null;
  next_action_at: string | null;
  created_at: string;
};

/** Rows behind the dashboard summary, one type per aggregate query. */
type TotalsRow = {
  communications: number;
  companies: number;
  last_30_days: number;
  average_interest: number | null;
  overdue: number;
  upcoming: number;
};
type OutcomeRow = { outcome: string; count: number };
type ActivityRow = { date: string; count: number };
type FollowUpRow = {
  id: string;
  company_name: string;
  next_action: string | null;
  next_action_at: string;
  user_name: string;
  overdue: boolean;
  due_in_days: number;
};
type RecentRow = {
  id: string;
  company_name: string;
  contact_name: string | null;
  outcome: string | null;
  interest_level: number | null;
  created_at: string;
  user_name: string;
};

/** One row of the communications list, and the same row with its full detail. */
type ListRow = {
  id: string;
  company_id: string;
  company_name: string;
  contact_name: string | null;
  outcome: string | null;
  interest_level: number | null;
  next_action: string | null;
  next_action_at: string | null;
  /** NULL when there is no reminder at all — the mapper reads that as "not late". */
  overdue: boolean | null;
  created_at: string;
  user_id: string | null;
  user_name: string;
};
type DetailRow = ListRow & {
  company_email: string | null;
  company_phone: string | null;
  contact_role: string | null;
  notes: string | null;
  updated_at: string;
};

/**
 * Days are bucketed in the office's own timezone rather than UTC, so a call
 * logged at 01:00 in Athens counts towards that morning's report and not the
 * previous day's.
 */
const REPORT_TIME_ZONE = 'Europe/Athens';
const ACTIVITY_DAYS = 14;
const FOLLOW_UP_LIMIT = 6;
const RECENT_LIMIT = 8;
/**
 * Rows per page of the communications list. Travels to the client in the
 * response, so the list's page count follows this one number.
 */
const PAGE_SIZE = 20;

/** Administrators and technicians see the shared workspace; other roles own a private slice. */
function canViewAllCommunications(user: AuthUser): boolean {
  return user.role === 'admin' || user.role === 'technical';
}

/**
 * SQL scope shared by the list and every Dashboard aggregate.
 *
 * A privileged account with no filter gets the shared workspace. Supplying a
 * user id narrows it to that author. Restricted roles always resolve to their
 * own id, even if a caller manually adds somebody else's filter to the URL.
 */
function communicationScope(user: AuthUser, requestedUserId?: string) {
  const canViewAll = canViewAllCommunications(user);
  return {
    canViewAll: canViewAll && !requestedUserId,
    userId: canViewAll ? (requestedUserId ?? user.id) : user.id,
  };
}

async function authorFor(
  user: AuthUser,
  requestedUserId: string,
  existingCommunicationId?: string,
): Promise<string> {
  if (user.role === 'admin' || requestedUserId === user.id) return requestedUserId;

  if (user.role === 'technical') {
    const allowed = await queryOne<{ id: string }>(
      `SELECT id
         FROM users
        WHERE id = $1
          AND active
          AND (
            role <> 'admin'
            OR EXISTS (
              SELECT 1
                FROM communications
               WHERE id = $2
                 AND user_id = users.id
                 AND deleted_at IS NULL
            )
          )`,
      [requestedUserId, existingCommunicationId ?? null],
    );
    if (allowed) return requestedUserId;

    throw HttpError.forbidden(
      'Ένας τεχνικός δεν μπορεί να καταχωρίσει επικοινωνία για λογαριασμό διαχειριστή.',
    );
  }

  throw HttpError.forbidden('Μπορείτε να καταχωρίσετε επικοινωνίες μόνο για τον λογαριασμό σας.');
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined);

// Maximum lengths mirror the column widths in `companies`, so an over-long
// value is a 422 naming the field rather than a 500 from Postgres.
const companyInput = z.object({
  name: z.string().trim().min(1).max(255),
  email: optionalText(255),
  // NOT NULL in `companies`: a company is reached by phone, so the record is
  // not useful without one.
  phone: z.string().trim().min(1).max(30),
});

// `companies.id` is a bigserial, so this arrives as a numeric string — it is
// kept as a string all the way to Postgres, which does the widening.
const companyIdInput = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, 'Μη έγκυρο αναγνωριστικό εταιρείας.');

/**
 * The fields of a communication itself, shared by create and update so the
 * two cannot drift apart. Only the company differs between them: creating
 * accepts a new company, editing moves the record between existing ones.
 */
const communicationFields = {
  userId: z.string().uuid(),
  contactName: optionalText(150),
  contactRole: optionalText(100),
  outcome: z.enum(['no_answer', 'callback', 'interested', 'not_interested']).optional(),
  interestLevel: z.number().int().min(1).max(5).optional(),
  notes: optionalText(10_000),
  nextAction: optionalText(255),
  nextActionAt: z.string().datetime({ offset: true }).optional(),
};

const createCommunicationInput = z
  .object({
    companyId: companyIdInput.optional(),
    company: companyInput.optional(),
    ...communicationFields,
  })
  .superRefine((value, context) => {
    if (Boolean(value.companyId) === Boolean(value.company)) {
      context.addIssue({
        code: 'custom',
        message: 'Επιλέξτε υπάρχουσα εταιρεία ή συμπληρώστε νέα εταιρεία.',
        path: ['companyId'],
      });
    }
  });

/**
 * A full replacement of the editable fields, not a patch: the edit form always
 * submits every one of them, so an omitted optional field means "cleared".
 */
const updateCommunicationInput = z.object({
  companyId: companyIdInput,
  ...communicationFields,
});

const idParams = z.object({ id: z.string().uuid('Μη έγκυρο αναγνωριστικό επικοινωνίας.') });

const authorFilter = z.string().uuid('Μη έγκυρο αναγνωριστικό χρήστη.').optional();
const summaryQuery = z.object({ userId: authorFilter });
const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  userId: authorFilter,
});

type CreateCommunicationInput = z.infer<typeof createCommunicationInput>;
type UpdateCommunicationInput = z.infer<typeof updateCommunicationInput>;
type IdParams = z.infer<typeof idParams>;
type SummaryQuery = z.infer<typeof summaryQuery>;
type ListQuery = z.infer<typeof listQuery>;

/**
 * The columns behind a listed communication.
 *
 * Whether a reminder is late is settled here rather than in the browser, for
 * the same reason the dashboard's follow-up list settles it in SQL: the
 * database owns the clock the timestamp was written against.
 */
const LIST_COLUMNS = `c.id, c.company_id, co.name AS company_name, c.contact_name,
              c.outcome, c.interest_level, c.next_action, c.next_action_at,
              c.next_action_at < now() AS overdue,
              c.created_at, c.user_id,
              coalesce(u.name, 'Διαγραμμένος χρήστης') AS user_name`;

const LIST_FROM = `FROM communications AS c
         JOIN companies AS co ON co.id = c.company_id
         LEFT JOIN users AS u ON u.id = c.user_id`;

function toListItem(row: ListRow) {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    outcome: row.outcome,
    interestLevel: row.interest_level,
    nextAction: row.next_action,
    nextActionAt: row.next_action_at,
    overdue: row.overdue ?? false,
    createdAt: row.created_at,
    userId: row.user_id,
    userName: row.user_name,
  };
}

function toDetail(row: DetailRow) {
  return {
    ...toListItem(row),
    companyEmail: row.company_email,
    companyPhone: row.company_phone,
    contactRole: row.contact_role,
    notes: row.notes,
    updatedAt: row.updated_at,
  };
}

export const communicationsRouter: Router = Router();

communicationsRouter.get('/users', async (req, res) => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

  const users = await query<User>(
    `SELECT id, name, email
       FROM users
      WHERE active = true
        AND (
          $1::boolean
          OR ($2::boolean AND role <> 'admin')
          OR id = $3
        )
      ORDER BY name`,
    [user.role === 'admin', user.role === 'technical', user.id],
  );
  res.json({ users });
});

/** Existing accounts that own at least one visible communication, for filtering. */
communicationsRouter.get(
  '/communication-authors',
  requireRole('admin', 'technical'),
  async (_req, res) => {
    const users = await query<User>(
      `SELECT DISTINCT u.id, u.name, u.email
         FROM communications AS c
         JOIN users AS u ON u.id = c.user_id
        WHERE c.deleted_at IS NULL
        ORDER BY u.name, u.email`,
    );
    res.json({ users });
  },
);

/**
 * Everything the dashboard report renders, aggregated in the database.
 *
 * Five independent read-only queries, issued together: each is cheap, and one
 * combined statement would only make the SQL harder to read than the report.
 */
communicationsRouter.get(
  '/communications/summary',
  validate(summaryQuery, 'query'),
  async (req, res) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');
    const { userId: requestedUserId } = req.query as SummaryQuery;
    const { canViewAll, userId } = communicationScope(user, requestedUserId);

    const [totals, outcomes, activity, followUps, recent] = await Promise.all([
      queryOne<TotalsRow>(
        `SELECT count(*)::int AS communications,
              count(DISTINCT company_id)::int AS companies,
              count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS last_30_days,
              avg(interest_level)::float AS average_interest,
              count(*) FILTER (WHERE next_action_at < now())::int AS overdue,
              count(*) FILTER (WHERE next_action_at >= now())::int AS upcoming
         FROM communications
        WHERE deleted_at IS NULL
          AND ($1::boolean OR user_id = $2)`,
        [canViewAll, userId],
      ),
      query<OutcomeRow>(
        `SELECT coalesce(outcome, 'unset') AS outcome, count(*)::int AS count
         FROM communications
        WHERE deleted_at IS NULL
          AND ($1::boolean OR user_id = $2)
        GROUP BY 1`,
        [canViewAll, userId],
      ),
      // generate_series supplies the zero days: a gap in the bars is information,
      // and a GROUP BY on its own would silently drop it.
      query<ActivityRow>(
        `SELECT to_char(day.at, 'YYYY-MM-DD') AS date, count(c.id)::int AS count
         FROM generate_series(
                date_trunc('day', now() AT TIME ZONE $1) - make_interval(days => $2::int - 1),
                date_trunc('day', now() AT TIME ZONE $1),
                interval '1 day'
              ) AS day(at)
         LEFT JOIN communications AS c
                ON c.deleted_at IS NULL
               AND ($3::boolean OR c.user_id = $4)
               AND (c.created_at AT TIME ZONE $1) >= day.at
               AND (c.created_at AT TIME ZONE $1) < day.at + interval '1 day'
        GROUP BY day.at
        ORDER BY day.at`,
        [REPORT_TIME_ZONE, ACTIVITY_DAYS, canViewAll, userId],
      ),
      // Ascending, so the most overdue reminder is the first thing on the list.
      //
      // Whether a reminder is late, and by how many days, is settled here rather
      // than in the browser: the database holds both the timestamp and the clock
      // it was written against, and a report that renders on a server in another
      // timezone must not disagree with it about what «σήμερα» means.
      query<FollowUpRow>(
        `SELECT c.id, co.name AS company_name, c.next_action, c.next_action_at,
              coalesce(u.name, 'Διαγραμμένος χρήστης') AS user_name,
              c.next_action_at < now() AS overdue,
              (c.next_action_at AT TIME ZONE $1)::date
                - (now() AT TIME ZONE $1)::date AS due_in_days
         FROM communications AS c
         JOIN companies AS co ON co.id = c.company_id
         LEFT JOIN users AS u ON u.id = c.user_id
        WHERE c.deleted_at IS NULL
          AND ($3::boolean OR c.user_id = $4)
          AND c.next_action_at IS NOT NULL
        ORDER BY c.next_action_at
        LIMIT $2`,
        [REPORT_TIME_ZONE, FOLLOW_UP_LIMIT, canViewAll, userId],
      ),
      query<RecentRow>(
        `SELECT c.id, co.name AS company_name, c.contact_name, c.outcome,
              c.interest_level, c.created_at,
              coalesce(u.name, 'Διαγραμμένος χρήστης') AS user_name
         FROM communications AS c
         JOIN companies AS co ON co.id = c.company_id
         LEFT JOIN users AS u ON u.id = c.user_id
        WHERE c.deleted_at IS NULL
          AND ($2::boolean OR c.user_id = $3)
        ORDER BY c.created_at DESC
        LIMIT $1`,
        [RECENT_LIMIT, canViewAll, userId],
      ),
    ]);

    res.json({
      totals: {
        communications: totals?.communications ?? 0,
        companies: totals?.companies ?? 0,
        last30Days: totals?.last_30_days ?? 0,
        averageInterest: totals?.average_interest ?? null,
        overdue: totals?.overdue ?? 0,
        upcoming: totals?.upcoming ?? 0,
      },
      outcomes: outcomes.map((row) => ({ outcome: row.outcome, count: row.count })),
      activity: activity.map((row) => ({ date: row.date, count: row.count })),
      followUps: followUps.map((row) => ({
        id: row.id,
        companyName: row.company_name,
        nextAction: row.next_action,
        nextActionAt: row.next_action_at,
        userName: row.user_name,
        overdue: row.overdue,
        dueInDays: row.due_in_days,
      })),
      recent: recent.map((row) => ({
        id: row.id,
        companyName: row.company_name,
        contactName: row.contact_name,
        outcome: row.outcome,
        interestLevel: row.interest_level,
        createdAt: row.created_at,
        userName: row.user_name,
      })),
    });
  },
);

communicationsRouter.post(
  '/communications',
  validate(createCommunicationInput),
  async (req, res) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');
    const input = req.body as CreateCommunicationInput;
    const userId = await authorFor(user, input.userId);

    const result = await transaction(async (client) => {
      let companyId = input.companyId;
      let companyCreated = false;

      if (input.company) {
        // A company name is unique among live companies. Left to the index the
        // clash would be a 500, so it is caught here as a 409 the form can
        // show next to the field — and caught by the same statement that
        // inserts, which leaves no window for a second request to slip in.
        const company = await client.query<{ id: string }>(
          `INSERT INTO companies (name, email, phone)
         VALUES ($1, $2, $3)
         ON CONFLICT (lower(name)) WHERE deleted_at IS NULL DO NOTHING
         RETURNING id`,
          [input.company.name, input.company.email ?? null, input.company.phone],
        );
        if (company.rowCount === 0) {
          throw HttpError.conflict(`Η εταιρεία «${input.company.name}» υπάρχει ήδη.`);
        }
        companyId = company.rows[0]?.id;
        companyCreated = true;
      } else {
        // Checked rather than left to the foreign key, so a stale option in the
        // caller's dropdown reads as "company not found" instead of a 500.
        const existing = await client.query(
          `SELECT 1 FROM companies WHERE id = $1 AND deleted_at IS NULL`,
          [companyId],
        );
        if (existing.rowCount === 0) throw HttpError.notFound('Η εταιρεία δεν βρέθηκε.');
      }

      if (!companyId) throw new Error('Company id was not resolved');

      const communication = await client.query<Communication>(
        `INSERT INTO communications (
         company_id, user_id, contact_name, contact_role, outcome,
         interest_level, notes, next_action, next_action_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, company_id, user_id, outcome, interest_level, next_action_at, created_at`,
        [
          companyId,
          userId,
          input.contactName ?? null,
          input.contactRole ?? null,
          input.outcome ?? null,
          input.interestLevel ?? null,
          input.notes ?? null,
          input.nextAction ?? null,
          input.nextActionAt ?? null,
        ],
      );

      return { communication: communication.rows[0], companyCreated };
    });

    res.status(201).json(result);
  },
);

/**
 * Every communication, newest first, one page at a time.
 *
 * `id` breaks ties in the sort: two records logged in the same millisecond
 * would otherwise be free to swap places between pages and show up twice.
 */
communicationsRouter.get('/communications', validate(listQuery, 'query'), async (req, res) => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');
  const { page, userId: requestedUserId } = req.query as unknown as ListQuery;
  const { canViewAll, userId } = communicationScope(user, requestedUserId);

  const [items, totals] = await Promise.all([
    query<ListRow>(
      `SELECT ${LIST_COLUMNS}
         ${LIST_FROM}
        WHERE c.deleted_at IS NULL
          AND ($3::boolean OR c.user_id = $4)
        ORDER BY c.created_at DESC, c.id DESC
        LIMIT $1 OFFSET $2`,
      [PAGE_SIZE, (page - 1) * PAGE_SIZE, canViewAll, userId],
    ),
    queryOne<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM communications
        WHERE deleted_at IS NULL
          AND ($1::boolean OR user_id = $2)`,
      [canViewAll, userId],
    ),
  ]);

  res.json({
    items: items.map(toListItem),
    total: totals?.count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  });
});

// Declared after `/communications/summary`, which is a literal path and would
// otherwise be swallowed by this one — Express matches in declaration order.
communicationsRouter.get('/communications/:id', validate(idParams, 'params'), async (req, res) => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');
  const { id } = req.params as IdParams;

  const row = await queryOne<DetailRow>(
    `SELECT ${LIST_COLUMNS}, co.email AS company_email, co.phone AS company_phone,
              c.contact_role, c.notes, c.updated_at
         ${LIST_FROM}
        WHERE c.id = $1
          AND c.deleted_at IS NULL
          AND ($2::boolean OR c.user_id = $3)`,
    [id, canViewAllCommunications(user), user.id],
  );

  if (!row) throw HttpError.notFound('Η επικοινωνία δεν βρέθηκε.');

  res.json({ communication: toDetail(row) });
});

communicationsRouter.put(
  '/communications/:id',
  validate(idParams, 'params'),
  validate(updateCommunicationInput),
  async (req, res) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');
    const { id } = req.params as IdParams;
    const input = req.body as UpdateCommunicationInput;
    const userId = await authorFor(user, input.userId, id);

    // Checked rather than left to the foreign key, so a stale option in the
    // caller's dropdown reads as "company not found" instead of a 500.
    const company = await queryOne(`SELECT 1 FROM companies WHERE id = $1 AND deleted_at IS NULL`, [
      input.companyId,
    ]);
    if (!company) throw HttpError.notFound('Η εταιρεία δεν βρέθηκε.');

    const updated = await queryOne<{ id: string }>(
      `UPDATE communications
          SET company_id = $2, user_id = $3, contact_name = $4, contact_role = $5,
              outcome = $6, interest_level = $7, notes = $8, next_action = $9,
              next_action_at = $10
        WHERE id = $1
          AND deleted_at IS NULL
          AND ($11::boolean OR user_id = $12)
        RETURNING id`,
      [
        id,
        input.companyId,
        userId,
        input.contactName ?? null,
        input.contactRole ?? null,
        input.outcome ?? null,
        input.interestLevel ?? null,
        input.notes ?? null,
        input.nextAction ?? null,
        input.nextActionAt ?? null,
        canViewAllCommunications(user),
        user.id,
      ],
    );

    if (!updated) throw HttpError.notFound('Η επικοινωνία δεν βρέθηκε.');

    res.status(204).end();
  },
);

/**
 * Soft delete: the row keeps its place in the table and every read filters on
 * `deleted_at IS NULL`. A communication is a record of something that actually
 * happened, so removing it from view must not remove it from history.
 */
communicationsRouter.delete(
  '/communications/:id',
  validate(idParams, 'params'),
  async (req, res) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');
    const { id } = req.params as IdParams;

    const deleted = await queryOne<{ id: string }>(
      `UPDATE communications
          SET deleted_at = now()
        WHERE id = $1
          AND deleted_at IS NULL
          AND ($2::boolean OR user_id = $3)
        RETURNING id`,
      [id, canViewAllCommunications(user), user.id],
    );

    if (!deleted) throw HttpError.notFound('Η επικοινωνία δεν βρέθηκε.');

    res.status(204).end();
  },
);
