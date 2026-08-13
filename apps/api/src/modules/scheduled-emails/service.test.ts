import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../db/index.js', () => ({ query: vi.fn(), queryOne: vi.fn() }));
vi.mock('./email.js', () => ({ sendScheduledEmail: vi.fn() }));

import { query, queryOne } from '../../db/index.js';
import { sendScheduledEmail } from './email.js';
import { runScheduledEmailBatch } from './service.js';

const queryMock = vi.mocked(query);
const queryOneMock = vi.mocked(queryOne);
const sendEmailMock = vi.mocked(sendScheduledEmail);

afterEach(() => {
  queryMock.mockReset();
  queryOneMock.mockReset();
  sendEmailMock.mockReset();
});

describe('scheduled email worker batch', () => {
  it('claims a due email, sends its snapshot and marks it as sent', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'email-id', attempts: 1 }])
      .mockResolvedValueOnce([]);
    queryOneMock.mockResolvedValue({
      id: 'email-id',
      sender_email: 'manager@example.gr',
      recipient_email: 'company@example.gr',
      subject: 'Η προσφορά μας',
      body: 'Καλημέρα σας',
    });
    sendEmailMock.mockResolvedValue(true);

    await expect(runScheduledEmailBatch()).resolves.toBe(1);

    expect(sendEmailMock).toHaveBeenCalledWith({
      id: 'email-id',
      senderEmail: 'manager@example.gr',
      recipientEmail: 'company@example.gr',
      subject: 'Η προσφορά μας',
      body: 'Καλημέρα σας',
    });
    expect(queryMock.mock.calls[2]?.[0]).toContain("status = 'sent'");
    expect(queryOneMock.mock.calls[0]?.[0]).toContain('account.email AS sender_email');
    expect(queryOneMock.mock.calls[0]?.[0]).toContain('AND account.active');
  });

  it('cancels a claimed email when its communication is no longer active', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'email-id', attempts: 1 }])
      .mockResolvedValueOnce([]);
    queryOneMock.mockResolvedValue(undefined);

    await expect(runScheduledEmailBatch()).resolves.toBe(1);

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(queryMock.mock.calls[2]?.[0]).toContain("status = 'cancelled'");
  });

  it('returns a failed delivery to the retry queue', async () => {
    queryMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'email-id', attempts: 1 }])
      .mockResolvedValueOnce([]);
    queryOneMock.mockResolvedValue({
      id: 'email-id',
      sender_email: 'manager@example.gr',
      recipient_email: 'company@example.gr',
      subject: 'Η προσφορά μας',
      body: 'Καλημέρα σας',
    });
    sendEmailMock.mockResolvedValue(false);

    await runScheduledEmailBatch();

    expect(queryMock.mock.calls[2]?.[1]?.[1]).toBe('pending');
    expect(queryMock.mock.calls[2]?.[1]?.[2]).toBeInstanceOf(Date);
  });
});
