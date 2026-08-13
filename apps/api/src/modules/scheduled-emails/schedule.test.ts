import { describe, expect, it, vi } from 'vitest';

import { cancelScheduledEmail, synchronizeScheduledEmail } from './schedule.js';

const draft = {
  recipientEmail: 'company@example.gr',
  subject: 'Η προσφορά μας',
  body: 'Καλημέρα σας,\n\nΣας στέλνουμε την προσφορά μας.',
  scheduledFor: '2026-08-20T10:00:00+03:00',
};

describe('scheduled email synchronization', () => {
  it('creates a durable delivery snapshot', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await synchronizeScheduledEmail({ query } as never, 'communication-id', null, draft);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0]?.[0]).toContain("status IN ('pending', 'processing')");
    expect(query.mock.calls[1]?.[0]).toContain('INSERT INTO scheduled_emails');
    expect(query.mock.calls[1]?.[1]).toEqual([
      'communication-id',
      draft.recipientEmail,
      draft.subject,
      draft.body,
      draft.scheduledFor,
    ]);
  });

  it('keeps the existing row when every stored field is unchanged', async () => {
    const query = vi.fn();

    await synchronizeScheduledEmail(
      { query } as never,
      'communication-id',
      {
        recipient_email: draft.recipientEmail,
        subject: draft.subject,
        body: draft.body,
        scheduled_for: new Date('2026-08-20T07:00:00.000Z'),
      },
      draft,
    );

    expect(query).not.toHaveBeenCalled();
  });

  it('cancels the active row when the composer is cleared', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await synchronizeScheduledEmail(
      { query } as never,
      'communication-id',
      {
        recipient_email: draft.recipientEmail,
        subject: draft.subject,
        body: draft.body,
        scheduled_for: draft.scheduledFor,
      },
      undefined,
    );

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[0]).toContain("status = 'cancelled'");
  });

  it('cancels a pending email when its communication is deleted', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });

    await cancelScheduledEmail({ query } as never, 'communication-id');

    expect(query).toHaveBeenCalledWith(expect.stringContaining("status = 'cancelled'"), [
      'communication-id',
    ]);
  });
});
