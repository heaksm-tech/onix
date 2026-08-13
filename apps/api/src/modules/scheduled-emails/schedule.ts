import type { PoolClient } from 'pg';

type Timestamp = Date | string;

export type ScheduledEmailDraft = {
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledFor: Timestamp;
};

export type StoredScheduledEmail = {
  recipient_email: string;
  subject: string;
  body: string;
  scheduled_for: Timestamp;
};

function sameInstant(left: Timestamp, right: Timestamp): boolean {
  return new Date(left).getTime() === new Date(right).getTime();
}

function isUnchanged(
  previous: StoredScheduledEmail | null | undefined,
  next: ScheduledEmailDraft | null | undefined,
): boolean {
  if (!previous || !next) return !previous && !next;
  return (
    previous.recipient_email === next.recipientEmail &&
    previous.subject === next.subject &&
    previous.body === next.body &&
    sameInstant(previous.scheduled_for, next.scheduledFor)
  );
}

/** Make the one active outbound email match the communication form. */
export async function synchronizeScheduledEmail(
  client: Pick<PoolClient, 'query'>,
  communicationId: string,
  previous: StoredScheduledEmail | null | undefined,
  next: ScheduledEmailDraft | null | undefined,
): Promise<void> {
  if (isUnchanged(previous, next)) return;

  await client.query(
    `UPDATE scheduled_emails
        SET status = 'cancelled', cancelled_at = now(), processing_started_at = NULL
      WHERE communication_id = $1
        AND status IN ('pending', 'processing')`,
    [communicationId],
  );

  if (!next) return;

  await client.query(
    `INSERT INTO scheduled_emails (
       communication_id, recipient_email, subject, body, scheduled_for, next_attempt_at
     ) VALUES ($1, $2, $3, $4, $5, $5)`,
    [communicationId, next.recipientEmail, next.subject, next.body, next.scheduledFor],
  );
}

/** Cancel a message which must no longer leave after its communication is removed. */
export async function cancelScheduledEmail(
  client: Pick<PoolClient, 'query'>,
  communicationId: string,
): Promise<void> {
  await client.query(
    `UPDATE scheduled_emails
        SET status = 'cancelled', cancelled_at = now(), processing_started_at = NULL
      WHERE communication_id = $1
        AND status IN ('pending', 'processing')`,
    [communicationId],
  );
}
