import { once } from 'node:events';

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ query: vi.fn(), queryOne: vi.fn() }));

import { queryOne } from '../../db/index.js';
import { errorHandler } from '../../middleware/error-handler.js';
import { companiesRouter } from './router.js';

const queryOneMock = vi.mocked(queryOne);

afterEach(() => {
  queryOneMock.mockReset();
});

async function patchCompany(body: unknown): Promise<Response> {
  const app = express();
  app.use(express.json());
  app.use(companiesRouter);
  app.use(errorHandler);

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port bound');

  try {
    return await fetch(`http://127.0.0.1:${address.port}/companies/12`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } finally {
    server.close();
  }
}

describe('company contact editing', () => {
  it('updates name, email and phone together', async () => {
    queryOneMock.mockResolvedValue({
      id: '12',
      name: 'Δοκιμή Α.Ε.',
      email: 'sales@example.gr',
      phone: '2101234567',
    });

    const response = await patchCompany({
      name: 'Δοκιμή Α.Ε.',
      email: 'sales@example.gr',
      phone: '2101234567',
    });

    expect(response.status).toBe(200);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([
      '12',
      'Δοκιμή Α.Ε.',
      true,
      'sales@example.gr',
      '2101234567',
    ]);
  });

  it('allows the optional company email to be cleared', async () => {
    queryOneMock.mockResolvedValue({
      id: '12',
      name: 'Δοκιμή Α.Ε.',
      email: null,
      phone: '2101234567',
    });

    const response = await patchCompany({ email: '' });

    expect(response.status).toBe(200);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual(['12', null, true, null, null]);
  });
});
