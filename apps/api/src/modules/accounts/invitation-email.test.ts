import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/resend.js', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  transactionalEmailSender: vi.fn(() => 'Onix CRM <onboarding@resend.dev>'),
}));

import { sendEmail } from '../../lib/resend.js';
import { sendAccountInvitationEmail } from './invitation-email.js';

describe('account invitation email', () => {
  it('uses the branded template for the one-time activation link', async () => {
    await sendAccountInvitationEmail({
      invitationId: '8129a17a-7153-49e0-89f4-f1b4a15e9be8',
      email: 'new.user@example.gr',
      activationUrl: 'https://crm.example.gr/activate-account?token=secure-token',
      expiresAt: new Date('2026-08-14T09:00:00.000Z'),
    });

    expect(sendEmail).toHaveBeenCalledOnce();
    expect(vi.mocked(sendEmail).mock.calls[0]?.[0]).toMatchObject({
      to: 'new.user@example.gr',
      subject: 'Πρόσκληση στο Onix CRM',
      html: expect.stringContaining('Καλώς ήρθατε στο Onix CRM'),
      text: expect.stringContaining('https://crm.example.gr/activate-account?token=secure-token'),
    });

    const html = vi.mocked(sendEmail).mock.calls[0]?.[0].html ?? '';
    expect(html).toContain('Ενεργοποίηση λογαριασμού');
    expect(html).toContain('ΠΡΟΣΚΛΗΣΗ ΣΥΝΕΡΓΑΣΙΑΣ');
    expect(html).toContain('Η ΠΡΟΣΚΛΗΣΗ ΛΗΓΕΙ');
    expect(html).toContain('ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.');
    expect(html).toContain('token=secure-token');
  });
});
