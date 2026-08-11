import type { RequestHandler } from 'express';

import { HttpError } from '../lib/http-error.js';
import { readSessionCookie, resolveSession } from '../modules/auth/session.js';

/**
 * Gate for everything that is not public. Resolves the session cookie into
 * `req.user` or rejects with 401, which the web app turns into a redirect to
 * the login page.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = readSessionCookie(req);

  if (!token) {
    next(HttpError.unauthorized('Απαιτείται σύνδεση.'));
    return;
  }

  const user = await resolveSession(token);

  if (!user) {
    next(HttpError.unauthorized('Η συνεδρία σας έληξε. Συνδεθείτε ξανά.'));
    return;
  }

  req.user = user;
  next();
};
