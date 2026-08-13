import { logger } from '../../config/logger.js';
import { query, queryOne } from '../../db/index.js';
import { sendScheduledEmail } from './email.js';

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_MINUTES = 15;

type ClaimedEmail = {
  id: string;
  attempts: number;
};

type EmailDelivery = {
  id: string;
  sender_email: string;
  recipient_email: string;
  subject: string;
  body: string;
};

async function recoverInterruptedDeliveries(): Promise<void> {
  await query(
    `UPDATE scheduled_emails
        SET status = 'pending', processing_started_at = NULL, next_attempt_at = now(),
            last_error = 'Η προηγούμενη προσπάθεια διακόπηκε πριν ολοκληρωθεί.'
      WHERE status = 'processing'
        AND processing_started_at < now() - make_interval(mins => $1)`,
    [STALE_PROCESSING_MINUTES],
  );
}

async function claimDueEmails(): Promise<ClaimedEmail[]> {
  return query<ClaimedEmail>(
    `WITH due AS (
       SELECT id
         FROM scheduled_emails
        WHERE status = 'pending'
          AND next_attempt_at <= now()
        ORDER BY next_attempt_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT $1
     )
     UPDATE scheduled_emails AS email
        SET status = 'processing', attempts = email.attempts + 1,
            processing_started_at = now(), last_error = NULL
       FROM due
      WHERE email.id = due.id
     RETURNING email.id, email.attempts`,
    [BATCH_SIZE],
  );
}

async function deliveryDetails(emailId: string): Promise<EmailDelivery | undefined> {
  return queryOne<EmailDelivery>(
    `SELECT email.id, account.email AS sender_email,
            email.recipient_email, email.subject, email.body
       FROM scheduled_emails AS email
       JOIN communications AS communication ON communication.id = email.communication_id
       JOIN companies AS company ON company.id = communication.company_id
       JOIN users AS account ON account.id = communication.user_id
      WHERE email.id = $1
        AND email.status = 'processing'
        AND communication.deleted_at IS NULL
        AND company.deleted_at IS NULL
        AND account.active`,
    [emailId],
  );
}

async function markCancelled(emailId: string): Promise<void> {
  await query(
    `UPDATE scheduled_emails
        SET status = 'cancelled', cancelled_at = now(), processing_started_at = NULL,
            last_error = 'Η επικοινωνία, η εταιρεία ή ο λογαριασμός αποστολής δεν είναι πλέον ενεργός.'
      WHERE id = $1 AND status = 'processing'`,
    [emailId],
  );
}

async function markSent(emailId: string): Promise<void> {
  await query(
    `UPDATE scheduled_emails
        SET status = 'sent', sent_at = now(), processing_started_at = NULL
      WHERE id = $1 AND status = 'processing'`,
    [emailId],
  );
}

async function markFailed(email: ClaimedEmail): Promise<void> {
  const exhausted = email.attempts >= MAX_ATTEMPTS;
  const retryDelayMs = Math.min(60 * 60_000, 60_000 * 2 ** (email.attempts - 1));

  await query(
    `UPDATE scheduled_emails
        SET status = $2, processing_started_at = NULL, next_attempt_at = $3,
            last_error = 'Δεν ήταν δυνατή η αποστολή του email μέσω Resend.'
      WHERE id = $1 AND status = 'processing'`,
    [email.id, exhausted ? 'failed' : 'pending', new Date(Date.now() + retryDelayMs)],
  );
}

/** Claim and deliver one bounded batch. Safe to call from more than one worker. */
export async function runScheduledEmailBatch(): Promise<number> {
  await recoverInterruptedDeliveries();
  const emails = await claimDueEmails();

  for (const email of emails) {
    const details = await deliveryDetails(email.id);
    if (!details) {
      await markCancelled(email.id);
      continue;
    }

    const sent = await sendScheduledEmail({
      id: details.id,
      senderEmail: details.sender_email,
      recipientEmail: details.recipient_email,
      subject: details.subject,
      body: details.body,
    });

    if (sent) {
      await markSent(email.id);
      logger.info({ scheduledEmailId: email.id }, 'Scheduled email sent');
    } else {
      await markFailed(email);
    }
  }

  return emails.length;
}
