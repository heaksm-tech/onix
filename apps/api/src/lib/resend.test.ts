import { afterEach, describe, expect, it, vi } from 'vitest';

const envMock = vi.hoisted(() => ({
  resendApiKey: 're_test',
  isProduction: false,
  resendFromEmail: undefined as string | undefined,
}));

vi.mock('../config/env.js', () => ({ env: envMock }));
vi.mock('../config/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import { emailSender, noReplyEmailSender, sendEmail, transactionalEmailSender } from './resend.js';

const email = {
  from: 'Onix CRM <onboarding@resend.dev>',
  to: 'user@example.gr',
  subject: 'Θέμα',
  text: 'Κείμενο',
  html: '<p>Κείμενο</p>',
  idempotencyKey: 'password-change/user/1',
};

afterEach(() => {
  vi.unstubAllGlobals();
  envMock.isProduction = false;
  envMock.resendFromEmail = undefined;
});

describe('Resend email boundary', () => {
  it('supports a company-facing display name without changing the sending address', () => {
    expect(emailSender('ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.')).toBe(
      'ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε. <onboarding@resend.dev>',
    );
    expect(transactionalEmailSender()).toBe('Onix CRM <onboarding@resend.dev>');
    expect(noReplyEmailSender()).toBe('Onix CRM <onboarding@resend.dev>');
  });

  it('uses noreply at the exact verified production domain', () => {
    envMock.isProduction = true;
    envMock.resendFromEmail = 'notifications@sending.example.gr';

    expect(noReplyEmailSender()).toBe('Onix CRM <noreply@sending.example.gr>');
  });

  it('sends the transactional payload with authentication and idempotency', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendEmail(email)).resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers).toMatchObject({
      Authorization: 'Bearer re_test',
      'Idempotency-Key': email.idempotencyKey,
    });
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: email.from,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
    expect(JSON.parse(String(init.body))).not.toHaveProperty('reply_to');
  });

  it('passes a reply address using Resend reply_to', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(sendEmail({ ...email, replyTo: 'manager@example.gr' })).resolves.toBe(true);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toMatchObject({
      from: email.from,
      reply_to: 'manager@example.gr',
    });
  });

  it('reports a provider rejection without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"message":"rejected"}', { status: 403 })),
    );

    await expect(sendEmail(email)).resolves.toBe(false);
  });
});
