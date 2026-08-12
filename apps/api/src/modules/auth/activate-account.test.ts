import { once } from 'node:events';

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('./password-changed-email.js', () => ({ sendPasswordChangedEmail: vi.fn() }));

import { queryOne, transaction } from '../../db/index.js';
import { errorHandler } from '../../middleware/error-handler.js';
import { resetAll } from './rate-limit.js';
import { authRouter } from './router.js';

const invitation = {
  invitation_id: 'f65e8784-286a-4ae9-b6d3-e947ad5ebf30',
  id: 'a34925a4-1972-4a77-b3ed-c05600536210',
  name: 'new.user@example.gr',
  email: 'new.user@example.gr',
  role: 'employee' as const,
};

const password = 'πρώτος-κωδικός-42';
const queryOneMock = vi.mocked(queryOne);
const transactionMock = vi.mocked(transaction);

afterEach(() => {
  vi.clearAllMocks();
  resetAll();
});

async function request(body: unknown): Promise<Response> {
  const app = express();
  app.use(express.json());
  app.use(authRouter);
  app.use(errorHandler);

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port bound');

  try {
    return await fetch(`http://127.0.0.1:${address.port}/auth/activate-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } finally {
    server.close();
  }
}

describe('POST /auth/activate-account', () => {
  it('sets the first password, consumes the token and signs the user in', async () => {
    const user = {
      id: invitation.id,
      name: invitation.name,
      email: invitation.email,
      role: invitation.role,
    };
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [invitation] })
      .mockResolvedValueOnce({ rows: [user] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    queryOneMock.mockResolvedValueOnce(invitation);
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await request({ token: 'one-time-token', password, confirmation: password });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user });
    expect(response.headers.get('set-cookie')).toContain('onix_session=');
    expect(clientQuery).toHaveBeenCalledTimes(5);
    expect(clientQuery.mock.calls[2]).toEqual([
      'UPDATE account_invitations SET accepted_at = now() WHERE id = $1 AND accepted_at IS NULL',
      [invitation.invitation_id],
    ]);
    expect(clientQuery.mock.calls[4]?.[0]).toContain('INSERT INTO sessions');
  });

  it('answers an unknown, expired or already-used token with one safe error', async () => {
    queryOneMock.mockResolvedValueOnce(undefined);

    const response = await request({ token: 'not-valid', password, confirmation: password });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVITATION_INVALID' },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects different password entries before looking up the invitation', async () => {
    const response = await request({
      token: 'one-time-token',
      password,
      confirmation: 'διαφορετικός-κωδικός-43',
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'PASSWORD_CONFIRMATION_MISMATCH' },
    });
    expect(queryOneMock).not.toHaveBeenCalled();
  });
});
