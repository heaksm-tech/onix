import { Router } from 'express';
import { z } from 'zod';

import { queryOne } from '../../db/index.js';
import { HttpError } from '../../lib/http-error.js';
import { requireAuth } from '../../middleware/require-auth.js';
import { validate } from '../../middleware/validate.js';
import { fakeVerify, verifyPassword } from './password.js';
import { consume, reset } from './rate-limit.js';
import {
  clearSessionCookie,
  createSession,
  purgeExpiredSessions,
  readSessionCookie,
  revokeSession,
  setSessionCookie,
} from './session.js';
import type { AuthUser } from './types.js';

/**
 * Sign-in only. Accounts are created by an administrator with
 * `npm run user:create`; there is deliberately no registration endpoint.
 */

const WINDOW_MS = 15 * 60 * 1000;
/** Per source address — generous, since a whole office shares one. */
const IP_LIMIT = 30;
/** Per account — the number that actually stops guessing one password. */
const EMAIL_LIMIT = 8;

const loginInput = z.object({
  email: z.string().trim().toLowerCase().min(1).max(320),
  // No shape rules on the way in: the stored hash decides, and rejecting a
  // "too short" password here would only leak what the rules are.
  password: z.string().min(1).max(1024),
});

type LoginInput = z.infer<typeof loginInput>;

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
