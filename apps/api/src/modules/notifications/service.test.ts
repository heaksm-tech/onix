import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ queryOne: vi.fn() }));

import { queryOne } from '../../db/index.js';
import { createNotification, createNotificationsForRole } from './service.js';

const queryOneMock = vi.mocked(queryOne);

afterEach(() => {
  queryOneMock.mockReset();
});

describe('createNotification', () => {
  it('stores notification content for a backend producer', async () => {
    const createdAt = new Date('2026-08-13T09:00:00.000Z');
    queryOneMock.mockResolvedValue({
      id: '8129a17a-7153-49e0-89f4-f1b4a15e9be8',
      user_id: '44bbdbba-c1e8-4b4d-892c-4453f7810d2a',
      title: 'Νέα ανάθεση',
      body: 'Ανατέθηκε μια νέα επικοινωνία.',
      action_url: '/companies/communications',
      read_at: null,
      created_at: createdAt,
    });

    const notification = await createNotification({
      userId: '44bbdbba-c1e8-4b4d-892c-4453f7810d2a',
      title: '  Νέα ανάθεση  ',
      body: '  Ανατέθηκε μια νέα επικοινωνία.  ',
      actionUrl: '/companies/communications',
    });

    expect(queryOneMock.mock.calls[0]?.[1]).toEqual([
      '44bbdbba-c1e8-4b4d-892c-4453f7810d2a',
      'Νέα ανάθεση',
      'Ανατέθηκε μια νέα επικοινωνία.',
      '/companies/communications',
    ]);
    expect(notification).toMatchObject({
      title: 'Νέα ανάθεση',
      actionUrl: '/companies/communications',
      createdAt,
    });
  });

  it('creates notifications only for active accounts with the requested role', async () => {
    const clientQuery = vi.fn().mockResolvedValue({ rows: [] });

    await createNotificationsForRole({ query: clientQuery } as never, {
      role: 'admin',
      title: '  Νέος ενεργός λογαριασμός  ',
      body: '  Ο λογαριασμός ενεργοποιήθηκε.  ',
      actionUrl: '/accounts',
    });

    expect(clientQuery.mock.calls[0]?.[0]).toContain('WHERE role = $1');
    expect(clientQuery.mock.calls[0]?.[0]).toContain('AND active');
    expect(clientQuery.mock.calls[0]?.[1]).toEqual([
      'admin',
      'Νέος ενεργός λογαριασμός',
      'Ο λογαριασμός ενεργοποιήθηκε.',
      '/accounts',
    ]);
  });
});
