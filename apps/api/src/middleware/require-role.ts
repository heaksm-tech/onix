import type { RequestHandler } from 'express';

import { HttpError } from '../lib/http-error.js';
import type { UserRole } from '../modules/auth/types.js';

/**
 * Authorise a signed-in role at the API boundary.
 *
 * This middleware is deliberately separate from navigation visibility: a
 * hidden link is presentation, while this check is the permission itself.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) {
      next(HttpError.unauthorized('Απαιτείται σύνδεση.'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(HttpError.forbidden('Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη λειτουργία.'));
      return;
    }
    next();
  };
}
