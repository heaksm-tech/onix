import { Router } from 'express';
import { z } from 'zod';

import { queryOne, transaction } from '../../db/index.js';
import { HttpError } from '../../lib/http-error.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { sendPasswordChangedEmail } from './password-changed-email.js';
import {
  MIN_PASSWORD_LENGTH,
  fakeVerify,
  hashPassword,
  passwordsMatch,
  verifyPassword,
} from './password.js';
import { consume, reset } from './rate-limit.js';
import {
  clearSessionCookie,
  createSession,
  hashSessionToken,
  purgeExpiredSessions,
  readSessionCookie,
  revokeSession,
  setSessionCookie,
} from './session.js';
import type { AuthUser } from './types.js';

/**
 * Account authentication and the signed-in user's own credentials. Accounts
 * are still created by an administrator with `npm run user:create`; there is
 * deliberately no registration endpoint.
 */

const WINDOW_MS = 15 * 60 * 1000;
/** Per source address — generous, since a whole office shares one. */
const IP_LIMIT = 30;
/** Per account — the number that actually stops guessing one password. */
const EMAIL_LIMIT = 8;
/** A stolen signed-in browser must not become an unlimited current-password oracle. */
const PASSWORD_CHANGE_LIMIT = 8;

const loginInput = z.object({
  email: z.string().trim().toLowerCase().min(1).max(320),
  // No shape rules on the way in: the stored hash decides, and rejecting a
  // "too short" password here would only leak what the rules are.
  password: z.string().min(1).max(1024),
});

type LoginInput = z.infer<typeof loginInput>;

const changePasswordInput = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(1024),
  confirmation: z.string().min(1).max(1024),
});

type ChangePasswordInput = z.infer<typeof changePasswordInput>;

type Credentials = AuthUser & { active: boolean; password_hash: string | null };

/** One message for every failure mode, so nothing reveals which accounts exist. */
const INVALID_CREDENTIALS = 'Λανθασμένο email ή κωδικός πρόσβασης.';

export const authRouter: Router = Router();

authRouter.post('/auth/login', validate(loginInput), async (req, res) => {
  const { email, password } = req.body as LoginInput;
  const address = req.ip ?? 'unknown';

  for (const [key, limit] of [
    [`ip:${address}`, IP_LIMIT],
    [`email:${email}`, EMAIL_LIMIT],
  ] as const) {
    const result = consume(key, limit, WINDOW_MS);
    if (!result.allowed) {
      res.set('Retry-After', String(result.retryAfterSeconds));
      throw new HttpError(
        429,
        'TOO_MANY_ATTEMPTS',
        'Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.',
      );
    }
  }

  const found = await queryOne<Credentials>(
    `SELECT id, name, email, role, active, password_hash
       FROM users
      WHERE lower(email) = $1`,
    [email],
  );

  // A missing account, an account an administrator has not given a password
  // yet, and a deactivated account all have to cost the same as a wrong
  // password — otherwise the response time answers questions the message does not.
  if (!found?.password_hash || !found.active) {
    await fakeVerify(password);
    throw HttpError.unauthorized(INVALID_CREDENTIALS);
  }

  if (!(await verifyPassword(password, found.password_hash))) {
    throw HttpError.unauthorized(INVALID_CREDENTIALS);
  }

  const user: AuthUser = {
    id: found.id,
    name: found.name,
    email: found.email,
    role: found.role,
  };

  const { token, expiresAt } = await createSession(user.id);
  setSessionCookie(res, token, expiresAt);

  reset(`email:${email}`);
  await purgeExpiredSessions();

  res.json({ user });
});

authRouter.post('/auth/logout', async (req, res) => {
  const token = readSessionCookie(req);
  if (token) await revokeSession(token);

  // Always clear the cookie and answer 204: signing out of an already-dead
  // session is a success from the caller's point of view.
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get('/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

authRouter.put('/auth/password', requireAuth, validate(changePasswordInput), async (req, res) => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

  const { currentPassword, newPassword, confirmation } = req.body as ChangePasswordInput;
  if (!passwordsMatch(newPassword, confirmation)) {
    throw new HttpError(
      422,
      'PASSWORD_CONFIRMATION_MISMATCH',
      'Οι δύο καταχωρίσεις του νέου κωδικού δεν συμφωνούν.',
    );
  }

  const limitKey = `password:${user.id}`;
  const limit = consume(limitKey, PASSWORD_CHANGE_LIMIT, WINDOW_MS);
  if (!limit.allowed) {
    res.set('Retry-After', String(limit.retryAfterSeconds));
    throw new HttpError(
      429,
      'TOO_MANY_ATTEMPTS',
      'Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.',
    );
  }

  const credentials = await queryOne<{ password_hash: string | null }>(
    'SELECT password_hash FROM users WHERE id = $1 AND active',
    [user.id],
  );

  if (!credentials?.password_hash) {
    throw HttpError.unauthorized('Ο λογαριασμός δεν μπορεί να αλλάξει κωδικό πρόσβασης.');
  }
  if (!(await verifyPassword(currentPassword, credentials.password_hash))) {
    throw new HttpError(401, 'CURRENT_PASSWORD_INVALID', 'Ο τρέχων κωδικός δεν είναι σωστός.');
  }
  if (await verifyPassword(newPassword, credentials.password_hash)) {
    throw new HttpError(
      409,
      'PASSWORD_UNCHANGED',
      'Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τρέχοντα.',
    );
  }

  const token = readSessionCookie(req);
  if (!token) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

  // Hash before opening the transaction: scrypt is deliberately slow, and
  // there is no reason to hold a write lock while it does its work.
  const passwordHash = await hashPassword(newPassword);

  const changedAt = await transaction(async (client) => {
    // The old hash in the predicate closes the small window in which another
    // session could change the password between verification and this write.
    const changed = await client.query<{ updated_at: Date }>(
      `UPDATE users
            SET password_hash = $2
          WHERE id = $1
            AND password_hash = $3
            AND active
          RETURNING updated_at`,
      [user.id, passwordHash, credentials.password_hash],
    );

    const row = changed.rows[0];
    if (!row) {
      throw HttpError.conflict(
        'Ο κωδικός άλλαξε από άλλη συνεδρία. Ανανεώστε τη σελίδα και δοκιμάστε ξανά.',
      );
    }

    // Keep the browser that proved the old password; close every other
    // session so a forgotten or stolen cookie cannot survive the change.
    await client.query('DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2', [
      user.id,
      hashSessionToken(token),
    ]);

    return row.updated_at;
  });

  reset(limitKey);

  const notificationSent = await sendPasswordChangedEmail({
    userId: user.id,
    name: user.name,
    email: user.email,
    changedAt,
  });

  res.json({ notificationSent });
});
