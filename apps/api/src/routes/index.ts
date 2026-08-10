import { Router } from 'express';

import { communicationsRouter } from '../modules/communications/router.js';
import { healthRouter } from './health.js';

/** Root of the v1 API. */
export const apiRouter: Router = Router();

apiRouter.use(healthRouter);
apiRouter.use(communicationsRouter);
