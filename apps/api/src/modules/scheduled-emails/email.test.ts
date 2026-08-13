import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/resend.js', () => ({
  emailSender: (name: string) => `${name} <sender@example.gr>`,
  sendEmail: vi.fn(),
}));

import { sendEmail } from '../../lib/resend.js';
import { sendScheduledEmail } from './email.js';

const sendEmailMock = vi.mocked(sendEmail);

afterEach(() => {
  sendEmailMock.mockReset();
});

describe('scheduled email rendering', () => {
  it('preserves the composed text and escapes its HTML representation', async () => {
    sendEmailMock.mockResolvedValue(true);

    await expect(
      sendScheduledEmail({
        id: 'email-id',
        recipientEmail: 'company@example.gr',
        subject: 'Θέμα επικοινωνίας',
        body: 'Καλημέρα <script>alert("x")</script>\nΔεύτερη γραμμή',
      }),
    ).resolves.toBe(true);

    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε. <sender@example.gr>',
        to: 'company@example.gr',
        subject: 'Θέμα επικοινωνίας',
        text: 'Καλημέρα <script>alert("x")</script>\nΔεύτερη γραμμή',
        idempotencyKey: 'scheduled-email/email-id',
      }),
    );
    const payload = sendEmailMock.mock.calls[0]?.[0];
    expect(payload?.html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(payload?.html).not.toContain('<script>');
  });
});
