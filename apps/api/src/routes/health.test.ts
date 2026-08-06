import { describe, expect, it } from 'vitest';

import { createApp } from '../app.js';

describe('GET /api/v1/health', () => {
  it('reports the process as up', async () => {
    const app = createApp();
    const server = app.listen(0);
    const address = server.address();
    if (address === null || typeof address === 'string') throw new Error('no port bound');

    try {
      const res = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toMatchObject({ status: 'ok' });
    } finally {
      server.close();
    }
  });
});
