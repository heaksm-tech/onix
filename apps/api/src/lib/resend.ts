import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

const RESEND_EMAILS_URL = 'https://api.resend.com/emails';
const EMAIL_TIMEOUT_MS = 10_000;

type Email = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
};

/** Verified address with the display name appropriate for each email audience. */
export function emailSender(displayName: string): string {
  // Production startup validation guarantees this value. The fallback keeps
  // the type honest and is never used there.
  const productionSender = env.resendFromEmail ?? 'onboarding@resend.dev';
  const address = env.isProduction ? productionSender : 'onboarding@resend.dev';
  return `${displayName} <${address}>`;
}

/** Sender selected once for internal and account-related transactional email. */
export function transactionalEmailSender(): string {
  return emailSender('Onix CRM');
}

/**
 * Send one transactional email through Resend's HTTP API.
 *
 * Node already supplies `fetch`, so this small boundary does not justify an
 * SDK dependency. Failures are returned rather than thrown: callers perform
 * their durable work first and must not pretend it was rolled back merely
 * because a notification provider was unavailable afterwards.
 */
export async function sendEmail(email: Email): Promise<boolean> {
  if (!env.resendApiKey) {
    logger.warn('Email notification skipped because RESEND_API_KEY is not configured');
    return false;
  }

  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': email.idempotencyKey,
      },
      signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
      body: JSON.stringify({
        from: email.from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });

    if (response.ok) return true;

    const failure = await response.text().catch(() => '');
    logger.error(
      { status: response.status, resendError: failure.slice(0, 1_000) },
      'Resend rejected an email notification',
    );
    return false;
  } catch (err) {
    logger.error({ err }, 'Could not reach Resend for an email notification');
    return false;
  }
}
