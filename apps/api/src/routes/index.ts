import { Router } from 'express';

import { requireAuth } from '../middleware/require-auth.js';
import { authRouter } from '../modules/auth/router.js';
import { communicationsRouter } from '../modules/communications/router.js';
import { healthRouter } from './health.js';

/** Root of the v1 API. */
export const apiRouter: Router = Router();

// Public: liveness/readiness probes and the sign-in endpoints themselves.
apiRouter.use(healthRouter);
apiRouter.use(authRouter);

// Everything past this point requires a session.
apiRouter.use(requireAuth);
apiRouter.use(communicationsRouter);
