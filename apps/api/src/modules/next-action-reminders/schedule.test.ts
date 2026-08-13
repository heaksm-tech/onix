import { describe, expect, it, vi } from 'vitest';

import { cancelNextActionReminder, synchronizeNextActionReminder } from './schedule.js';

describe('next-action reminder scheduling', () => {
  it('creates a reminder whenever a timestamp is first assigned', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await synchronizeNextActionReminder(
      { query } as never,
      'communication-id',
      null,
      '2026-08-20T10:00:00+03:00',
    );

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain("status IN ('pending', 'processing')");
    expect(query.mock.calls[1]?.[0]).toContain('INSERT INTO next_action_reminders');
    expect(query.mock.calls[1]?.[1]).toEqual(['communication-id', '2026-08-20T10:00:00+03:00']);
  });

  it('does nothing when an edit keeps the same instant', async () => {
    const query = vi.fn();

    await synchronizeNextActionReminder(
      { query } as never,
      'communication-id',
      new Date('2026-08-20T07:00:00.000Z'),
      '2026-08-20T10:00:00+03:00',
    );

    expect(query).not.toHaveBeenCalled();
  });

  it('cancels the active reminder when the timestamp is cleared', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await synchronizeNextActionReminder(
      { query } as never,
      'communication-id',
      '2026-08-20T10:00:00+03:00',
      undefined,
    );

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[0]).toContain("status = 'cancelled'");
  });

  it('cancels a pending delivery when its communication is deleted', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await cancelNextActionReminder({ query } as never, 'communication-id');

    expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'cancelled'"), [
      'communication-id',
    ]);
  });
});
