import { once } from 'node:events';

import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ query: vi.fn(), queryOne: vi.fn() }));

import { query, queryOne } from '../../db/index.js';
import { errorHandler } from '../../middleware/error-handler.js';
import type { AuthUser } from '../auth/types.js';
import { notificationsRouter } from './router.js';

const user: AuthUser = {
  id: '44bbdbba-c1e8-4b4d-892c-4453f7810d2a',
  name: 'Υπεύθυνος',
  email: 'manager@example.gr',
  role: 'manager',
};
const notificationId = '8129a17a-7153-49e0-89f4-f1b4a15e9be8';

const queryMock = vi.mocked(query);
const queryOneMock = vi.mocked(queryOne);

afterEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
});

async function request(method: string, path: string): Promise<Response> {
  const app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.use(notificationsRouter);
  app.use(errorHandler);

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('no port bound');

  try {
    return await fetch(`http://127.0.0.1:${address.port}${path}`, { method });
  } finally {
    server.close();
  }
}

describe('notifications', () => {
  it('lists only the signed-in account notifications and unread count', async () => {
    queryMock.mockResolvedValue([
      {
        id: notificationId,
        user_id: user.id,
        title: 'Νέα ανάθεση',
        body: 'Ανατέθηκε μια νέα επικοινωνία.',
        action_url: '/companies/communications',
        read_at: null,
        created_at: new Date('2026-08-13T09:00:00.000Z'),
      },
    ]);
    queryOneMock.mockResolvedValue({ count: 1 });

    const response = await request('GET', '/notifications');

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      unreadCount: 1,
      notifications: [{ id: notificationId, userId: user.id, readAt: null }],
    });
    expect(queryMock.mock.calls[0]?.[1]).toEqual([user.id, 30]);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([user.id]);
  });

  it('marks all notifications for only the signed-in account as read', async () => {
    queryMock.mockResolvedValue([]);

    const response = await request('PATCH', '/notifications/read-all');

    expect(response.status).toBe(204);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([user.id]);
  });

  it('does not reveal a notification owned by another account', async () => {
    queryOneMock.mockResolvedValue(undefined);

    const response = await request('PATCH', `/notifications/${notificationId}/read`);

    expect(response.status).toBe(404);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([notificationId, user.id]);
  });

  it('deletes every notification for only the signed-in account', async () => {
    queryMock.mockResolvedValue([]);

    const response = await request('DELETE', '/notifications');

    expect(response.status).toBe(204);
    expect(queryMock.mock.calls[0]?.[0]).toBe('DELETE FROM notifications WHERE user_id = $1');
    expect(queryMock.mock.calls[0]?.[1]).toEqual([user.id]);
  });

  it('deletes one notification owned by the signed-in account', async () => {
    queryOneMock.mockResolvedValue({ id: notificationId });

    const response = await request('DELETE', `/notifications/${notificationId}`);

    expect(response.status).toBe(204);
    expect(queryOneMock.mock.calls[0]?.[0]).toContain('DELETE FROM notifications');
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([notificationId, user.id]);
  });

  it('does not reveal another account notification while deleting', async () => {
    queryOneMock.mockResolvedValue(undefined);

    const response = await request('DELETE', `/notifications/${notificationId}`);

    expect(response.status).toBe(404);
    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([notificationId, user.id]);
  });
});
