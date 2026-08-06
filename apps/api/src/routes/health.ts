import { Router } from 'express';

import { ping } from '../db/index.js';

export const healthRouter: Router = Router();

/** Liveness — the process is up. Does not touch the database. */
healthRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/** Readiness — the process is up *and* the database answers. */
healthRouter.get('/health/ready', async (_req, res) => {
  try {
    await ping();
    res.json({ status: 'ok', database: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unreachable' });
  }
});
