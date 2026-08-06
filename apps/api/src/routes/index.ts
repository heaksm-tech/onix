import { Router } from 'express';

import { healthRouter } from './health.js';

/**
 * Root of the v1 API. Mount feature routers from `src/modules/<feature>` here,
 * e.g. `router.use('/companies', companiesRouter)`.
 */
export const apiRouter: Router = Router();

apiRouter.use(healthRouter);
