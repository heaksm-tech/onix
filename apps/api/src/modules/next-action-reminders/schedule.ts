import type { PoolClient } from 'pg';

type Timestamp = Date | string | null | undefined;

function instant(value: Timestamp): number | null {
  if (value === null || value === undefined) return null;
  return new Date(value).getTime();
}

/**
 * Make the durable reminder match the communication's current timestamp.
 *
 * The caller owns the surrounding transaction and, for edits, must lock the
 * communication first. Historical rows are cancelled instead of deleted so a
 * worker and the email provider can safely keep using their stable row ids.
 */
export async function synchronizeNextActionReminder(
  client: Pick<PoolClient, 'query'>,
  communicationId: string,
  previousTimestamp: Timestamp,
  nextTimestamp: Timestamp,
): Promise<void> {
  if (instant(previousTimestamp) === instant(nextTimestamp)) return;

  await client.query(
    `UPDATE next_action_reminders
        SET status = 'cancelled', cancelled_at = now(), processing_started_at = NULL
      WHERE communication_id = $1
        AND status IN ('pending', 'processing')`,
    [communicationId],
  );

  if (nextTimestamp === null || nextTimestamp === undefined) return;

  await client.query(
    `INSERT INTO next_action_reminders (
       communication_id, scheduled_for, next_attempt_at
     ) VALUES ($1, $2, $2)`,
    [communicationId, nextTimestamp],
  );
}

/** Cancel any email which has not completed when a communication is removed. */
export async function cancelNextActionReminder(
  client: Pick<PoolClient, 'query'>,
  communicationId: string,
): Promise<void> {
  await client.query(
    `UPDATE next_action_reminders
        SET status = 'cancelled', cancelled_at = now(), processing_started_at = NULL
      WHERE communication_id = $1
        AND status IN ('pending', 'processing')`,
    [communicationId],
  );
}
