import type { AuthUser } from '../modules/auth/types.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by the `requireAuth` middleware; absent on public routes. */
    user?: AuthUser;
  }
}
