import { once } from 'node:events';

import express from 'express';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock('./password-changed-email.js', () => ({ sendPasswordChangedEmail: vi.fn() }));

import { queryOne, transaction } from '../../db/index.js';
import { errorHandler } from '../../middleware/error-handler.js';
import { sendPasswordChangedEmail } from './password-changed-email.js';
import { hashPassword } from './password.js';
import { resetAll } from './rate-limit.js';
import { authRouter } from './router.js';
import { hashSessionToken } from './session.js';

const user = {
  id: 'b76cf7a7-7c65-47d2-a4e5-c7f5141944b2',
  name: 'Δοκιμαστικός Χρήστης',
  email: 'user@example.gr',
  role: 'employee' as const,
};

const currentPassword = 'τρέχων-κωδικός-42';
const newPassword = 'καινούριος-κωδικός-43';
let currentHash: string;

const queryOneMock = vi.mocked(queryOne);
const transactionMock = vi.mocked(transaction);
const sendPasswordChangedEmailMock = vi.mocked(sendPasswordChangedEmail);

beforeAll(async () => {
  currentHash = await hashPassword(currentPassword);
});

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
    return await fetch(`http://127.0.0.1:${address.port}/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Cookie: 'onix_session=current-token',
      },
      body: JSON.stringify(body),
    });
  } finally {
    server.close();
  }
}

describe('PUT /auth/password', () => {
  it('changes the hash, keeps the current session and sends the notification', async () => {
    const changedAt = new Date('2026-08-12T08:00:00.000Z');
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ updated_at: changedAt }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 });

    queryOneMock.mockResolvedValueOnce(user).mockResolvedValueOnce({ password_hash: currentHash });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));
    sendPasswordChangedEmailMock.mockResolvedValue(true);

    const response = await request({
      currentPassword,
      newPassword,
      confirmation: newPassword,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ notificationSent: true });
    expect(clientQuery).toHaveBeenCalledTimes(2);
    expect(clientQuery.mock.calls[1]).toEqual([
      'DELETE FROM sessions WHERE user_id = $1 AND token_hash <> $2',
      [user.id, hashSessionToken('current-token')],
    ]);
    expect(sendPasswordChangedEmailMock).toHaveBeenCalledWith({
      userId: user.id,
      name: user.name,
      email: user.email,
      changedAt,
    });
  });

  it('rejects a wrong current password before opening a transaction', async () => {
    queryOneMock.mockResolvedValueOnce(user).mockResolvedValueOnce({ password_hash: currentHash });

    const response = await request({
      currentPassword: 'όχι-ο-τρέχων-κωδικός',
      newPassword,
      confirmation: newPassword,
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'CURRENT_PASSWORD_INVALID' },
    });
    expect(transactionMock).not.toHaveBeenCalled();
    expect(sendPasswordChangedEmailMock).not.toHaveBeenCalled();
  });

  it('rejects two different new-password entries before reading credentials', async () => {
    queryOneMock.mockResolvedValueOnce(user);

    const response = await request({
      currentPassword,
      newPassword,
      confirmation: 'διαφορετικός-κωδικός-44',
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'PASSWORD_CONFIRMATION_MISMATCH' },
    });
    expect(queryOneMock).toHaveBeenCalledOnce();
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
