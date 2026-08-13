import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/resend.js', () => ({
  sendEmail: vi.fn(),
  transactionalEmailSender: vi.fn(() => 'Onix CRM <onboarding@resend.dev>'),
}));

import { sendEmail } from '../../lib/resend.js';
import { sendNextActionReminderEmail } from './email.js';

const sendEmailMock = vi.mocked(sendEmail);

beforeEach(() => {
  sendEmailMock.mockReset().mockResolvedValue(true);
});

describe('next-action reminder email', () => {
  it('delivers the recorded action in Greek with a stable idempotency key', async () => {
    await expect(
      sendNextActionReminderEmail({
        reminderId: 'reminder-id',
        communicationId: 'communication-id',
        recipientName: 'Μαρία',
        recipientEmail: 'maria@example.gr',
        companyName: 'Δοκιμή Α.Ε.',
        contactName: 'Γιώργος',
        nextAction: 'Να αποσταλεί η προσφορά',
        scheduledFor: new Date('2026-08-20T07:00:00.000Z'),
      }),
    ).resolves.toBe(true);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'maria@example.gr',
        subject: 'Υπενθύμιση επόμενης ενέργειας — Δοκιμή Α.Ε.',
        idempotencyKey: 'next-action-reminder/reminder-id',
        text: expect.stringContaining('Η επόμενη ενέργεια είναι: Να αποσταλεί η προσφορά'),
        html: expect.stringContaining('Προβολή επικοινωνίας'),
      }),
    );
  });

  it('uses the generic Greek reminder when no action text was entered', async () => {
    await sendNextActionReminderEmail({
      reminderId: 'reminder-id',
      communicationId: 'communication-id',
      recipientName: 'Μαρία',
      recipientEmail: 'maria@example.gr',
      companyName: 'Δοκιμή Α.Ε.',
      contactName: null,
      nextAction: null,
      scheduledFor: new Date('2026-08-20T07:00:00.000Z'),
    });

    expect(sendEmailMock.mock.calls[0]?.[0].text).toContain(
      'Χρειάζεται να πραγματοποιήσετε την επόμενη ενέργεια για αυτή την επικοινωνία.',
    );
  });
});
