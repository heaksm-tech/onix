import { once } from 'node:events';

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  transaction: vi.fn(),
}));

import { query, queryOne, transaction } from '../../db/index.js';
import { errorHandler } from '../../middleware/error-handler.js';
import type { AuthUser } from '../auth/types.js';
import { communicationsRouter } from './router.js';

const manager: AuthUser = {
  id: '44bbdbba-c1e8-4b4d-892c-4453f7810d2a',
  name: 'Υπεύθυνος',
  email: 'manager@example.gr',
  role: 'manager',
};
const admin: AuthUser = {
  ...manager,
  id: '5ea6a5a7-6202-4b46-b31f-f55318a3c475',
  role: 'admin',
};
const technician: AuthUser = {
  ...manager,
  id: '0949a8a1-6691-4906-8072-0d65e8557293',
  role: 'technical',
};
const otherUserId = 'c6f8c871-0241-4f71-bdd4-c3e021395773';
const communicationId = '8129a17a-7153-49e0-89f4-f1b4a15e9be8';

const queryMock = vi.mocked(query);
const queryOneMock = vi.mocked(queryOne);
const transactionMock = vi.mocked(transaction);

afterEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  transactionMock.mockReset();
});

async function request(
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
  app.use(communicationsRouter);
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

describe('role-scoped communications', () => {
  it('returns only the signed-in account as an author option to a manager', async () => {
    queryMock.mockResolvedValue([]);

    const response = await request(manager, 'GET', '/users');

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[0]).toContain("role <> 'admin'");
    expect(queryMock.mock.calls[0]?.[1]).toEqual([false, false, manager.id]);
  });

  it('excludes administrators from technician author options', async () => {
    queryMock.mockResolvedValue([]);

    const response = await request(technician, 'GET', '/users');

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([false, true, technician.id]);
  });

  it('keeps every active author option available to administrators', async () => {
    queryMock.mockResolvedValue([]);

    const response = await request(admin, 'GET', '/users');

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([true, false, admin.id]);
  });

  it('scopes a manager list and count to their own user id', async () => {
    queryMock.mockResolvedValue([]);
    queryOneMock.mockResolvedValue({ count: 0 });

    const response = await request(manager, 'GET', '/communications?page=2');

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([20, 20, false, manager.id, null]);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([false, manager.id, null]);
  });

  it('keeps the shared list for administrators', async () => {
    queryMock.mockResolvedValue([]);
    queryOneMock.mockResolvedValue({ count: 0 });

    const response = await request(admin, 'GET', '/communications');

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([20, 0, true, admin.id, null]);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([true, admin.id, null]);
  });

  it('narrows an administrator list to the requested author', async () => {
    queryMock.mockResolvedValue([]);
    queryOneMock.mockResolvedValue({ count: 0 });

    const response = await request(admin, 'GET', `/communications?userId=${otherUserId}`);

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([20, 0, false, otherUserId, null]);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([false, otherUserId, null]);
  });

  it('ignores a crafted author filter for a manager', async () => {
    queryMock.mockResolvedValue([]);
    queryOneMock.mockResolvedValue({ count: 0 });

    const response = await request(manager, 'GET', `/communications?userId=${otherUserId}`);

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([20, 0, false, manager.id, null]);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([false, manager.id, null]);
  });

  it('searches communication text inside the caller role scope', async () => {
    queryMock.mockResolvedValue([]);
    queryOneMock.mockResolvedValue({ count: 0 });

    const response = await request(
      manager,
      'GET',
      '/communications?q=%20%20%CE%91%CE%B8%CE%AE%CE%BD%CE%B1%25_%20%20',
    );

    expect(response.status).toBe(200);
    expect(queryMock.mock.calls[0]?.[0]).toContain('c.notes');
    expect(queryMock.mock.calls[0]?.[0]).toContain('strpos(');
    expect(queryMock.mock.calls[0]?.[1]).toEqual([20, 0, false, manager.id, 'Αθήνα%_']);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([false, manager.id, 'Αθήνα%_']);
  });

  it('scopes every Dashboard aggregate to a manager', async () => {
    queryMock.mockResolvedValue([]);
    queryOneMock.mockResolvedValue(undefined);

    const response = await request(manager, 'GET', '/communications/summary');

    expect(response.status).toBe(200);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([false, manager.id]);
    expect(queryMock.mock.calls.map((call) => call[1])).toEqual([
      [false, manager.id],
      ['Europe/Athens', 14, false, manager.id],
      ['Europe/Athens', 6, false, manager.id],
      [8, false, manager.id],
    ]);
  });

  it('narrows every Dashboard aggregate to the selected author', async () => {
    queryMock.mockResolvedValue([]);
    queryOneMock.mockResolvedValue(undefined);

    const response = await request(admin, 'GET', `/communications/summary?userId=${otherUserId}`);

    expect(response.status).toBe(200);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([false, otherUserId]);
    expect(queryMock.mock.calls.map((call) => call[1])).toEqual([
      [false, otherUserId],
      ['Europe/Athens', 14, false, otherUserId],
      ['Europe/Athens', 6, false, otherUserId],
      [8, false, otherUserId],
    ]);
  });

  it('offers communication authors only to privileged roles', async () => {
    queryMock.mockResolvedValue([]);

    const adminResponse = await request(admin, 'GET', '/communication-authors');
    const managerResponse = await request(manager, 'GET', '/communication-authors');

    expect(adminResponse.status).toBe(200);
    expect(managerResponse.status).toBe(403);
    expect(queryMock).toHaveBeenCalledOnce();
    expect(queryMock.mock.calls[0]?.[0]).toContain('SELECT DISTINCT u.id');
  });

  it('does not reveal another user communication through its detail URL', async () => {
    queryOneMock.mockResolvedValue(undefined);

    const response = await request(manager, 'GET', `/communications/${communicationId}`);

    expect(response.status).toBe(404);
    expect(queryOneMock.mock.calls[0]?.[0]).toContain('OR c.user_id = $3');
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([communicationId, false, manager.id]);
  });

  it('returns the full email history inside the same communication scope', async () => {
    queryOneMock.mockResolvedValue({
      id: communicationId,
      company_id: '1',
      company_name: 'Δοκιμή Α.Ε.',
      company_email: 'company@example.gr',
      company_phone: '2101234567',
      contact_name: null,
      contact_role: null,
      outcome: null,
      interest_level: null,
      next_action: null,
      next_action_at: null,
      overdue: null,
      notes: null,
      created_at: '2026-08-12T10:00:00.000Z',
      updated_at: '2026-08-13T10:00:00.000Z',
      user_id: manager.id,
      user_name: manager.name,
      scheduled_emails: [
        {
          id: 'pending-email-id',
          recipientEmail: 'company@example.gr',
          subject: 'Δεύτερο μήνυμα',
          body: 'Θα θέλαμε να επικοινωνήσουμε ξανά.',
          scheduledFor: '2099-08-23T07:00:00.000Z',
          status: 'pending',
          sentAt: null,
          cancelledAt: null,
          createdAt: '2026-08-13T10:00:00.000Z',
          updatedAt: '2026-08-13T10:00:00.000Z',
        },
        {
          id: 'sent-email-id',
          recipientEmail: 'company@example.gr',
          subject: 'Πρώτο μήνυμα',
          body: 'Σας αποστέλλουμε την πρότασή μας.',
          scheduledFor: '2026-08-13T07:00:00.000Z',
          status: 'sent',
          sentAt: '2026-08-13T07:00:02.000Z',
          cancelledAt: null,
          createdAt: '2026-08-12T10:00:00.000Z',
          updatedAt: '2026-08-13T07:00:02.000Z',
        },
      ],
    });

    const response = await request(manager, 'GET', `/communications/${communicationId}`);

    expect(response.status).toBe(200);
    expect(queryOneMock.mock.calls[0]?.[0]).toContain('jsonb_agg');
    await expect(response.json()).resolves.toMatchObject({
      communication: {
        scheduledEmail: { subject: 'Δεύτερο μήνυμα' },
        scheduledEmails: [
          { subject: 'Δεύτερο μήνυμα', status: 'pending' },
          { subject: 'Πρώτο μήνυμα', status: 'sent' },
        ],
      },
    });
  });

  it('rejects creating a communication under another user before writing anything', async () => {
    const response = await request(manager, 'POST', '/communications', {
      companyId: '1',
      userId: otherUserId,
    });

    expect(response.status).toBe(403);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('rejects a technician assigning a communication to an administrator', async () => {
    queryOneMock.mockResolvedValue(undefined);

    const response = await request(technician, 'POST', '/communications', {
      companyId: '1',
      userId: admin.id,
    });

    expect(response.status).toBe(403);
    expect(queryOneMock.mock.calls[0]?.[0]).toContain("role <> 'admin'");
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([admin.id, null]);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('allows an administrator to assign a communication to an administrator', async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: communicationId,
            company_id: '1',
            user_id: admin.id,
            outcome: null,
            interest_level: null,
            next_action_at: null,
            created_at: '2026-08-12T10:00:00.000Z',
          },
        ],
      });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await request(admin, 'POST', '/communications', {
      companyId: '1',
      userId: admin.id,
    });

    expect(response.status).toBe(201);
    expect(queryOneMock).not.toHaveBeenCalled();
    expect(clientQuery.mock.calls[1]?.[1]?.[1]).toBe(admin.id);
  });

  it.each([
    ['creating', 'POST', '/communications'],
    ['updating', 'PUT', `/communications/${communicationId}`],
  ])('rejects a past next-action time when %s a communication', async (_label, method, path) => {
    const response = await request(manager, method, path, {
      companyId: '1',
      userId: manager.id,
      nextActionAt: new Date(Date.now() - 60_000).toISOString(),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: 'VALIDATION_ERROR',
        details: [
          {
            path: ['nextActionAt'],
            message: 'Η υπενθύμιση πρέπει να είναι στο μέλλον.',
          },
        ],
      },
    });
    expect(queryOneMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('schedules an email reminder when a communication has a next-action timestamp', async () => {
    const nextActionAt = '2099-08-20T10:00:00+03:00';
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ '?column?': 1 }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: communicationId,
            company_id: '1',
            user_id: manager.id,
            outcome: null,
            interest_level: null,
            next_action_at: nextActionAt,
            created_at: '2026-08-12T10:00:00.000Z',
          },
        ],
      })
      .mockResolvedValue({ rows: [] });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await request(manager, 'POST', '/communications', {
      companyId: '1',
      userId: manager.id,
      nextAction: 'Να αποσταλεί η προσφορά',
      nextActionAt,
    });

    expect(response.status).toBe(201);
    expect(clientQuery.mock.calls[3]?.[0]).toContain('INSERT INTO next_action_reminders');
    expect(clientQuery.mock.calls[3]?.[1]).toEqual([communicationId, nextActionAt]);
  });

  it('replaces the scheduled reminder when next-action time is edited', async () => {
    const nextActionAt = '2099-08-21T14:00:00+03:00';
    queryOneMock.mockResolvedValue({ '?column?': 1 });
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rows: [{ next_action_at: new Date('2026-08-20T07:00:00.000Z') }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await request(manager, 'PUT', `/communications/${communicationId}`, {
      companyId: '1',
      userId: manager.id,
      nextAction: 'Να γίνει τηλεφωνική επικοινωνία',
      nextActionAt,
    });

    expect(response.status).toBe(204);
    expect(clientQuery.mock.calls[2]?.[0]).toContain("status = 'cancelled'");
    expect(clientQuery.mock.calls[3]?.[0]).toContain('INSERT INTO next_action_reminders');
    expect(clientQuery.mock.calls[3]?.[1]).toEqual([communicationId, nextActionAt]);
  });

  it('stores a composed company email with its send time', async () => {
    const scheduledFor = '2099-08-22T09:30:00+03:00';
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ email: 'company@example.gr' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: communicationId,
            company_id: '1',
            user_id: manager.id,
            outcome: null,
            interest_level: null,
            next_action_at: null,
            created_at: '2026-08-12T10:00:00.000Z',
          },
        ],
      })
      .mockResolvedValue({ rows: [] });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await request(manager, 'POST', '/communications', {
      companyId: '1',
      userId: manager.id,
      scheduledEmail: {
        subject: 'Η προσφορά μας',
        body: 'Καλημέρα σας,\n\nΣας στέλνουμε την προσφορά μας.',
        scheduledFor,
      },
    });

    expect(response.status).toBe(201);
    expect(clientQuery.mock.calls[3]?.[0]).toContain('INSERT INTO scheduled_emails');
    expect(clientQuery.mock.calls[3]?.[1]).toEqual([
      communicationId,
      'company@example.gr',
      'Η προσφορά μας',
      'Καλημέρα σας,\n\nΣας στέλνουμε την προσφορά μας.',
      scheduledFor,
    ]);
  });

  it('rejects a scheduled email when the selected company has no email', async () => {
    const clientQuery = vi
      .fn()
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ email: null }] })
      .mockResolvedValue({ rows: [] });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await request(manager, 'POST', '/communications', {
      companyId: '1',
      userId: manager.id,
      scheduledEmail: {
        subject: 'Η προσφορά μας',
        body: 'Καλημέρα σας',
        scheduledFor: '2099-08-22T09:30:00+03:00',
      },
    });

    expect(response.status).toBe(422);
    expect(clientQuery).toHaveBeenCalledOnce();
  });

  it('scopes deletion to the manager who owns the communication', async () => {
    const clientQuery = vi.fn().mockResolvedValue({ rows: [] });
    transactionMock.mockImplementation((run) => run({ query: clientQuery } as never));

    const response = await request(manager, 'DELETE', `/communications/${communicationId}`);

    expect(response.status).toBe(404);
    expect(clientQuery.mock.calls[0]?.[1]).toEqual([communicationId, false, manager.id]);
  });
});
