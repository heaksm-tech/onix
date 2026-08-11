import { Router } from 'express';
import { z } from 'zod';

import { query, queryOne, transaction } from '../../db/index.js';
import { HttpError } from '../../lib/http-error.js';
import { validate } from '../../middleware/validate.js';

type Company = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};
type User = { id: string; name: string; email: string };
type Communication = {
  id: string;
  company_id: string;
  user_id: string;
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

/**
 * Days are bucketed in the office's own timezone rather than UTC, so a call
 * logged at 01:00 in Athens counts towards that morning's report and not the
 * previous day's.
 */
const REPORT_TIME_ZONE = 'Europe/Athens';
const ACTIVITY_DAYS = 14;
const FOLLOW_UP_LIMIT = 6;
const RECENT_LIMIT = 8;

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

const createCommunicationInput = z
  .object({
    // `companies.id` is a bigserial, so this arrives as a numeric string —
    // it is kept as a string all the way to Postgres, which does the widening.
    companyId: z
      .string()
      .trim()
      .regex(/^[1-9]\d*$/, 'Μη έγκυρο αναγνωριστικό εταιρείας.')
      .optional(),
    company: companyInput.optional(),
    userId: z.string().uuid(),
    contactName: optionalText(150),
    contactRole: optionalText(100),
    outcome: z.enum(['no_answer', 'callback', 'interested', 'not_interested']).optional(),
    interestLevel: z.number().int().min(1).max(5).optional(),
    notes: optionalText(10_000),
    nextAction: optionalText(255),
    nextActionAt: z.string().datetime({ offset: true }).optional(),
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

type CreateCommunicationInput = z.infer<typeof createCommunicationInput>;

export const communicationsRouter: Router = Router();

communicationsRouter.get('/companies', async (_req, res) => {
  const companies = await query<Company>(
    `SELECT id, name, email, phone
       FROM companies
      WHERE deleted_at IS NULL
      ORDER BY lower(name)`,
  );
  res.json({ companies });
});

communicationsRouter.get('/users', async (_req, res) => {
  const users = await query<User>(
    `SELECT id, name, email
       FROM users
      WHERE active = true
      ORDER BY name`,
  );
  res.json({ users });
});

/**
 * Everything the dashboard report renders, aggregated in the database.
 *
 * Five independent read-only queries, issued together: each is cheap, and one
 * combined statement would only make the SQL harder to read than the report.
 */
communicationsRouter.get('/communications/summary', async (_req, res) => {
  const [totals, outcomes, activity, followUps, recent] = await Promise.all([
    queryOne<TotalsRow>(
      `SELECT count(*)::int AS communications,
              count(DISTINCT company_id)::int AS companies,
              count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS last_30_days,
              avg(interest_level)::float AS average_interest,
              count(*) FILTER (WHERE next_action_at < now())::int AS overdue,
              count(*) FILTER (WHERE next_action_at >= now())::int AS upcoming
         FROM communications
        WHERE deleted_at IS NULL`,
    ),
    query<OutcomeRow>(
      `SELECT coalesce(outcome, 'unset') AS outcome, count(*)::int AS count
         FROM communications
        WHERE deleted_at IS NULL
        GROUP BY 1`,
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
               AND (c.created_at AT TIME ZONE $1) >= day.at
               AND (c.created_at AT TIME ZONE $1) < day.at + interval '1 day'
        GROUP BY day.at
        ORDER BY day.at`,
      [REPORT_TIME_ZONE, ACTIVITY_DAYS],
    ),
    // Ascending, so the most overdue reminder is the first thing on the list.
    //
    // Whether a reminder is late, and by how many days, is settled here rather
    // than in the browser: the database holds both the timestamp and the clock
    // it was written against, and a report that renders on a server in another
    // timezone must not disagree with it about what «σήμερα» means.
    query<FollowUpRow>(
      `SELECT c.id, co.name AS company_name, c.next_action, c.next_action_at, u.name AS user_name,
              c.next_action_at < now() AS overdue,
              (c.next_action_at AT TIME ZONE $1)::date
                - (now() AT TIME ZONE $1)::date AS due_in_days
         FROM communications AS c
         JOIN companies AS co ON co.id = c.company_id
         JOIN users AS u ON u.id = c.user_id
        WHERE c.deleted_at IS NULL
          AND c.next_action_at IS NOT NULL
        ORDER BY c.next_action_at
        LIMIT $2`,
      [REPORT_TIME_ZONE, FOLLOW_UP_LIMIT],
    ),
    query<RecentRow>(
      `SELECT c.id, co.name AS company_name, c.contact_name, c.outcome,
              c.interest_level, c.created_at, u.name AS user_name
         FROM communications AS c
         JOIN companies AS co ON co.id = c.company_id
         JOIN users AS u ON u.id = c.user_id
        WHERE c.deleted_at IS NULL
        ORDER BY c.created_at DESC
        LIMIT $1`,
      [RECENT_LIMIT],
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
});

communicationsRouter.post(
  '/communications',
  validate(createCommunicationInput),
  async (req, res) => {
    const input = req.body as CreateCommunicationInput;

    const result = await transaction(async (client) => {
      let companyId = input.companyId;
      let companyCreated = false;

      if (input.company) {
        const company = await client.query<{ id: string }>(
          `INSERT INTO companies (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING id`,
          [input.company.name, input.company.email ?? null, input.company.phone],
        );
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
          input.userId,
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
