import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));
vi.mock('./email.js', () => ({ sendNextActionReminderEmail: vi.fn() }));

import { query, queryOne } from '../../db/index.js';
import { sendNextActionReminderEmail } from './email.js';
import { runNextActionReminderBatch } from './service.js';

const queryMock = vi.mocked(query);
const queryOneMock = vi.mocked(queryOne);
const sendEmailMock = vi.mocked(sendNextActionReminderEmail);

afterEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  sendEmailMock.mockReset();
});

describe('next-action reminder worker batch', () => {
  it('claims a due reminder, sends it and marks it as sent', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'reminder-id', attempts: 1 }])
      .mockResolvedValueOnce([]);
    queryOneMock.mockResolvedValue({
      reminder_id: 'reminder-id',
      communication_id: 'communication-id',
      scheduled_for: new Date('2026-08-20T07:00:00.000Z'),
      next_action: 'Να αποσταλεί η προσφορά',
      company_name: 'Δοκιμή Α.Ε.',
      contact_name: 'Γιώργος',
      user_name: 'Μαρία',
      user_email: 'maria@example.gr',
    });
    sendEmailMock.mockResolvedValue(true);

    await expect(runNextActionReminderBatch()).resolves.toBe(1);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ reminderId: 'reminder-id', recipientEmail: 'maria@example.gr' }),
    );
    expect(queryMock.mock.calls[2]?.[0]).toContain("status = 'sent'");
  });

  it('cancels a claimed reminder whose communication no longer matches', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'reminder-id', attempts: 1 }])
      .mockResolvedValueOnce([]);
    queryOneMock.mockResolvedValue(undefined);

    await expect(runNextActionReminderBatch()).resolves.toBe(1);

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(queryMock.mock.calls[2]?.[0]).toContain("status = 'cancelled'");
  });

  it('returns a failed delivery to the retry queue', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'reminder-id', attempts: 1 }])
      .mockResolvedValueOnce([]);
    queryOneMock.mockResolvedValue({
      reminder_id: 'reminder-id',
      communication_id: 'communication-id',
      scheduled_for: new Date('2026-08-20T07:00:00.000Z'),
      next_action: null,
      company_name: 'Δοκιμή Α.Ε.',
      contact_name: null,
      user_name: 'Μαρία',
      user_email: 'maria@example.gr',
    });
    sendEmailMock.mockResolvedValue(false);

    await runNextActionReminderBatch();

    expect(queryMock.mock.calls[2]?.[1]?.[1]).toBe('pending');
    expect(queryMock.mock.calls[2]?.[1]?.[2]).toBeInstanceOf(Date);
  });
});
