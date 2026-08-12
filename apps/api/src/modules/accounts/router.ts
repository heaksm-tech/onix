import { Router } from 'express';
import { z } from 'zod';

import { env } from '../../config/env.js';
import { query, queryOne, transaction } from '../../db/index.js';
import { HttpError } from '../../lib/http-error.js';
import { requireRole } from '../../middleware/require-role.js';
import { validate } from '../../middleware/validate.js';
import { INVITABLE_ROLES, type AuthUser, type UserRole } from '../auth/types.js';
import { sendAccountInvitationEmail } from './invitation-email.js';
import {
  createInvitationToken,
  hashInvitationToken,
  invitationExpiresAt,
} from './invitation-token.js';

const invitationInput = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.enum(INVITABLE_ROLES),
});

const listQuery = z.object({ page: z.coerce.number().int().min(1).default(1) });
const accountParams = z.object({ id: z.string().uuid('Μη έγκυρο αναγνωριστικό λογαριασμού.') });
const accountStatusInput = z.object({ blocked: z.boolean() });

type InvitationInput = z.infer<typeof invitationInput>;
type ListQuery = z.infer<typeof listQuery>;
type AccountParams = z.infer<typeof accountParams>;
type AccountStatusInput = z.infer<typeof accountStatusInput>;
type PendingAccount = { id: string; password_hash: string | null };
type Invitation = { id: string };
type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  password_set: boolean;
  created_at: string;
};
type AccountTarget = Pick<AccountRow, 'id' | 'role' | 'active' | 'password_set'>;

const PAGE_SIZE = 20;

function accountItem(row: AccountRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    passwordSet: row.password_set,
    createdAt: row.created_at,
  };
}

/**
 * Keep account administration from removing the operator's own access, and
 * keep the CLI-only administrator role above a technical account's reach.
 */
function authoriseTarget(actor: AuthUser, target: AccountTarget): void {
  if (actor.id === target.id) {
    throw new HttpError(
      409,
      'ACCOUNT_SELF_MANAGEMENT',
      'Δεν μπορείτε να αποκλείσετε ή να διαγράψετε τον λογαριασμό σας.',
    );
  }
  if (actor.role === 'technical' && target.role === 'admin') {
    throw HttpError.forbidden('Ένας τεχνικός δεν μπορεί να αλλάξει λογαριασμό διαχειριστή.');
  }
}

export const accountsRouter: Router = Router();

/** Every account, newest first, twenty at a time. */
accountsRouter.get(
  '/accounts',
  requireRole('admin', 'technical'),
  validate(listQuery, 'query'),
  async (req, res) => {
    const { page } = req.query as unknown as ListQuery;

    const [items, totals] = await Promise.all([
      query<AccountRow>(
        `SELECT id, name, email, role, active,
                password_hash IS NOT NULL AS password_set, created_at
           FROM users
          ORDER BY created_at DESC, id DESC
          LIMIT $1 OFFSET $2`,
        [PAGE_SIZE, (page - 1) * PAGE_SIZE],
      ),
      queryOne<{ count: number }>('SELECT count(*)::int AS count FROM users'),
    ]);

    res.json({
      items: items.map(accountItem),
      total: totals?.count ?? 0,
      page,
      pageSize: PAGE_SIZE,
    });
  },
);

accountsRouter.patch(
  '/accounts/:id/status',
  requireRole('admin', 'technical'),
  validate(accountParams, 'params'),
  validate(accountStatusInput),
  async (req, res) => {
    const actor = req.user;
    if (!actor) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

    const { id } = req.params as AccountParams;
    const { blocked } = req.body as AccountStatusInput;

    const account = await transaction(async (client) => {
      const result = await client.query<AccountTarget>(
        `SELECT id, role, active, password_hash IS NOT NULL AS password_set
           FROM users
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      const target = result.rows[0];
      if (!target) throw HttpError.notFound('Ο λογαριασμός δεν βρέθηκε.');

      authoriseTarget(actor, target);

      if (!blocked && !target.password_set) {
        throw new HttpError(
          409,
          'ACCOUNT_NOT_ACTIVATED',
          'Ο λογαριασμός πρέπει πρώτα να ενεργοποιηθεί από την πρόσκλησή του.',
        );
      }

      await client.query('UPDATE users SET active = $2 WHERE id = $1', [id, !blocked]);

      // A blocked account must lose every live browser immediately. Deleting
      // the sessions also prevents an old cookie becoming valid after unblock.
      if (blocked) await client.query('DELETE FROM sessions WHERE user_id = $1', [id]);

      return { id, active: !blocked };
    });

    res.json({ account });
  },
);

accountsRouter.delete(
  '/accounts/:id',
  requireRole('admin', 'technical'),
  validate(accountParams, 'params'),
  async (req, res) => {
    const actor = req.user;
    if (!actor) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

    const { id } = req.params as AccountParams;

    await transaction(async (client) => {
      const result = await client.query<AccountTarget>(
        `SELECT id, role, active, password_hash IS NOT NULL AS password_set
           FROM users
          WHERE id = $1
          FOR UPDATE`,
        [id],
      );
      const target = result.rows[0];
      if (!target) throw HttpError.notFound('Ο λογαριασμός δεν βρέθηκε.');

      authoriseTarget(actor, target);

      if (target.active) {
        throw new HttpError(
          409,
          'ACCOUNT_MUST_BE_BLOCKED',
          'Αποκλείστε πρώτα τον λογαριασμό και έπειτα διαγράψτε τον.',
        );
      }

      // Sessions and invitation ownership cascade; invitation attribution is
      // cleared; communication authors are set to NULL by their foreign key.
      await client.query('DELETE FROM users WHERE id = $1', [id]);
    });

    res.status(204).end();
  },
);

accountsRouter.post(
  '/account-invitations',
  requireRole('admin', 'technical'),
  validate(invitationInput),
  async (req, res) => {
    const inviter = req.user;
    if (!inviter) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

    const { email, role } = req.body as InvitationInput;
    const token = createInvitationToken();
    const expiresAt = invitationExpiresAt();

    const invitationId = await transaction(async (client) => {
      // The expression index on lower(email) is the race-safe authority. A
      // second invitation request waits for the first and then reuses its row.
      // Email is also the initial display name because this deliberately small
      // form asks for no identity field the recipient has not confirmed.
      await client.query(
        `INSERT INTO users (name, email, role, active)
         VALUES ($1, $1, $2, false)
         ON CONFLICT (lower(email)) DO NOTHING`,
        [email, role],
      );

      const accountResult = await client.query<PendingAccount>(
        `SELECT id, password_hash
           FROM users
          WHERE lower(email) = $1
          FOR UPDATE`,
        [email],
      );
      const account = accountResult.rows[0];
      if (!account) throw new Error('Account row disappeared while creating an invitation');

      if (account.password_hash) {
        throw new HttpError(409, 'ACCOUNT_EXISTS', 'Υπάρχει ήδη λογαριασμός με αυτό το email.');
      }

      // A pending account can be invited again. That also lets the authorised
      // sender correct its role; its existing display name is preserved.
      await client.query(
        `UPDATE users
            SET email = $2, role = $3, active = false
          WHERE id = $1`,
        [account.id, email, role],
      );

      const invitationResult = await client.query<Invitation>(
        `INSERT INTO account_invitations (user_id, invited_by, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE
               SET invited_by = EXCLUDED.invited_by,
                   token_hash = EXCLUDED.token_hash,
                   expires_at = EXCLUDED.expires_at,
                   accepted_at = NULL
         RETURNING id`,
        [account.id, inviter.id, hashInvitationToken(token), expiresAt],
      );
      const invitation = invitationResult.rows[0];
      if (!invitation) throw new Error('Invitation row was not returned');
      return invitation.id;
    });

    const activationUrl = new URL('/activate-account', env.appUrl);
    activationUrl.searchParams.set('token', token);

    const emailSent = await sendAccountInvitationEmail({
      invitationId,
      email,
      activationUrl: activationUrl.toString(),
      expiresAt,
    });

    if (!emailSent) {
      throw new HttpError(
        502,
        'INVITATION_EMAIL_FAILED',
        'Η πρόσκληση δημιουργήθηκε, αλλά δεν ήταν δυνατή η αποστολή του email. Δοκιμάστε ξανά.',
      );
    }

    res.status(201).json({ invitation: { email, role, expiresAt } });
  },
);
