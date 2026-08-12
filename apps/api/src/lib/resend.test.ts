import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/env.js', () => ({ env: { resendApiKey: 're_test' } }));
vi.mock('../config/logger.js', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));

import { sendEmail } from './resend.js';

const email = {
  from: 'Onix CRM <onboarding@resend.dev>',
  to: 'delivered+password-change@resend.dev',
  subject: 'Θέμα',
  text: 'Κείμενο',
  html: '<p>Κείμενο</p>',
  idempotencyKey: 'password-change/user/1',
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Resend email boundary', () => {
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
  });

  it('reports a provider rejection without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('{"message":"rejected"}', { status: 403 })),
    );

    await expect(sendEmail(email)).resolves.toBe(false);
  });
});
