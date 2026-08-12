import { once } from 'node:events';

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ query: vi.fn(), queryOne: vi.fn(), transaction: vi.fn() }));
vi.mock('./invitation-email.js', () => ({ sendAccountInvitationEmail: vi.fn() }));

import { query, queryOne, transaction } from '../../db/index.js';
import { errorHandler } from '../../middleware/error-handler.js';
import type { AuthUser } from '../auth/types.js';
import { sendAccountInvitationEmail } from './invitation-email.js';
import { accountsRouter } from './router.js';

const admin: AuthUser = {
  id: '5ea6a5a7-6202-4b46-b31f-f55318a3c475',
  name: 'Διαχειριστής',
  email: 'admin@example.gr',
  role: 'admin',
};

const manager: AuthUser = { ...admin, id: '44bbdbba-c1e8-4b4d-892c-4453f7810d2a', role: 'manager' };
const technician: AuthUser = {
  ...admin,
  id: '0949a8a1-6691-4906-8072-0d65e8557293',
  role: 'technical',
};

const queryMock = vi.mocked(query);
const queryOneMock = vi.mocked(queryOne);
const transactionMock = vi.mocked(transaction);
const sendAccountInvitationEmailMock = vi.mocked(sendAccountInvitationEmail);

afterEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  transactionMock.mockReset();
  sendAccountInvitationEmailMock.mockReset();
});

async function requestRoute(
  user: AuthUser,
  method: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(accountsRouter);
  app.use(errorHandler);

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port bound');

  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    });
  } finally {
    server.close();
  }
}

async function request(user: AuthUser, body: unknown): Promise<Response> {
  return requestRoute(user, 'POST', '/account-invitations', body);
}

describe('account administration', () => {
  const targetId = 'c6f8c871-0241-4f71-bdd4-c3e021395773';

  it('lists accounts twenty at a time for an administrator', async () => {
    queryMock.mockResolvedValue([
      {
        id: targetId,
        name: 'Άννα Μελά',
        email: 'anna@example.gr',
        role: 'employee',
        active: true,
        password_set: true,
        created_at: '2026-08-12T09:00:00.000Z',
      },
    ]);
    queryOneMock.mockResolvedValue({ count: 21 });

    const response = await requestRoute(admin, 'GET', '/accounts?page=2');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      total: 21,
      page: 2,
      pageSize: 20,
      items: [{ id: targetId, passwordSet: true }],
    });
    expect(queryMock.mock.calls[0]?.[1]).toEqual([20, 20]);
  });

  it('does not expose the account list to a manager', async () => {
    const response = await requestRoute(manager, 'GET', '/accounts');

    expect(response.status).toBe(403);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('blocks an account and revokes every existing session', async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: targetId, role: 'employee', active: true, password_set: true }],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await requestRoute(admin, 'PATCH', `/accounts/${targetId}/status`, {
      blocked: true,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ account: { id: targetId, active: false } });
    expect(clientQuery.mock.calls[1]?.[0]).toContain('UPDATE users SET active');
    expect(clientQuery.mock.calls[2]?.[0]).toContain('DELETE FROM sessions');
  });

  it('will not unblock an invitation that has not been activated', async () => {
    const clientQuery = vi.fn().mockResolvedValueOnce({
      rows: [{ id: targetId, role: 'employee', active: false, password_set: false }],
    });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await requestRoute(admin, 'PATCH', `/accounts/${targetId}/status`, {
      blocked: false,
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ACCOUNT_NOT_ACTIVATED' },
    });
    expect(clientQuery).toHaveBeenCalledOnce();
  });

  it('requires an active account to be blocked before permanent deletion', async () => {
    const clientQuery = vi.fn().mockResolvedValueOnce({
      rows: [{ id: targetId, role: 'employee', active: true, password_set: true }],
    });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await requestRoute(admin, 'DELETE', `/accounts/${targetId}`);

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ACCOUNT_MUST_BE_BLOCKED' },
    });
    expect(clientQuery).toHaveBeenCalledOnce();
  });

  it('permanently deletes a blocked account', async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: targetId, role: 'employee', active: false, password_set: true }],
      })
      .mockResolvedValueOnce({ rows: [] });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await requestRoute(admin, 'DELETE', `/accounts/${targetId}`);

    expect(response.status).toBe(204);
    expect(clientQuery.mock.calls[1]?.[0]).toBe('DELETE FROM users WHERE id = $1');
  });

  it('does not let an operator remove their own access', async () => {
    const clientQuery = vi.fn().mockResolvedValueOnce({
      rows: [{ id: admin.id, role: admin.role, active: true, password_set: true }],
    });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await requestRoute(admin, 'PATCH', `/accounts/${admin.id}/status`, {
      blocked: true,
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'ACCOUNT_SELF_MANAGEMENT' },
    });
  });

  it('does not let a technician alter an administrator', async () => {
    const clientQuery = vi.fn().mockResolvedValueOnce({
      rows: [{ id: admin.id, role: 'admin', active: true, password_set: true }],
    });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await requestRoute(technician, 'PATCH', `/accounts/${admin.id}/status`, {
      blocked: true,
    });

    expect(response.status).toBe(403);
    expect(clientQuery).toHaveBeenCalledOnce();
  });
});

describe('POST /account-invitations', () => {
  it('creates a pending account and sends a one-time activation link', async () => {
    const accountId = 'c6f8c871-0241-4f71-bdd4-c3e021395773';
    const invitationId = '8129a17a-7153-49e0-89f4-f1b4a15e9be8';
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: accountId, password_hash: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: invitationId }] });

    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));
    sendAccountInvitationEmailMock.mockResolvedValue(true);

    const response = await request(admin, { email: 'NEW.User@Example.GR', role: 'technical' });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      invitation: { email: 'new.user@example.gr', role: 'technical' },
    });
    expect(clientQuery).toHaveBeenCalledTimes(4);
    expect(sendAccountInvitationEmailMock).toHaveBeenCalledOnce();

    const email = sendAccountInvitationEmailMock.mock.calls[0]?.[0];
    expect(email).toMatchObject({ invitationId, email: 'new.user@example.gr' });
    expect(email?.activationUrl).toMatch(/^http:\/\/localhost:3000\/activate-account\?token=/);

    const storedTokenHash = clientQuery.mock.calls[3]?.[1]?.[2];
    const deliveredToken = new URL(email?.activationUrl ?? '').searchParams.get('token');
    expect(storedTokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(deliveredToken).toBeTruthy();
    expect(storedTokenHash).not.toBe(deliveredToken);
  });

  it('does not offer the invitation route to a manager', async () => {
    const response = await request(manager, { email: 'new.user@example.gr', role: 'employee' });

    expect(response.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(sendAccountInvitationEmailMock).not.toHaveBeenCalled();
  });

  it('reports a delivery failure so the sender can rotate and retry the link', async () => {
    transactionMock.mockResolvedValue('8129a17a-7153-49e0-89f4-f1b4a15e9be8');
    sendAccountInvitationEmailMock.mockResolvedValue(false);

    const response = await request(admin, {
      email: 'new.user@example.gr',
      role: 'employee',
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: 'INVITATION_EMAIL_FAILED' },
    });
    expect(sendAccountInvitationEmailMock).toHaveBeenCalledOnce();
  });

  it('rejects admin as an assignable role before touching the database', async () => {
    const response = await request(admin, { email: 'new.user@example.gr', role: 'admin' });

    expect(response.status).toBe(422);
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
