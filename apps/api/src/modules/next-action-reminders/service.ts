import { query, queryOne } from '../../db/index.js';
import { logger } from '../../config/logger.js';
import { sendNextActionReminderEmail } from './email.js';

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_MINUTES = 15;

type ClaimedReminder = {
  id: string;
  attempts: number;
};

type ReminderDelivery = {
  reminder_id: string;
  communication_id: string;
  scheduled_for: Date;
  next_action: string | null;
  company_name: string;
  contact_name: string | null;
  user_name: string;
  user_email: string;
};

async function recoverInterruptedDeliveries(): Promise<void> {
  await query(
    `UPDATE next_action_reminders
        SET status = 'pending',
            processing_started_at = NULL,
            next_attempt_at = now(),
            last_error = 'Η προηγούμενη προσπάθεια διακόπηκε πριν ολοκληρωθεί.'
      WHERE status = 'processing'
        AND processing_started_at < now() - make_interval(mins => $1)`,
    [STALE_PROCESSING_MINUTES],
  );
}

async function claimDueReminders(): Promise<ClaimedReminder[]> {
  return query<ClaimedReminder>(
    `WITH due AS (
       SELECT id
         FROM next_action_reminders
        WHERE status = 'pending'
          AND next_attempt_at <= now()
        ORDER BY next_attempt_at, id
        FOR UPDATE SKIP LOCKED
        LIMIT $1
     )
     UPDATE next_action_reminders AS reminder
        SET status = 'processing',
            attempts = reminder.attempts + 1,
            processing_started_at = now(),
            last_error = NULL
       FROM due
      WHERE reminder.id = due.id
     RETURNING reminder.id, reminder.attempts`,
    [BATCH_SIZE],
  );
}

async function deliveryDetails(reminderId: string): Promise<ReminderDelivery | undefined> {
  return queryOne<ReminderDelivery>(
    `SELECT reminder.id AS reminder_id,
            communication.id AS communication_id,
            reminder.scheduled_for,
            communication.next_action,
            company.name AS company_name,
            communication.contact_name,
            account.name AS user_name,
            account.email AS user_email
       FROM next_action_reminders AS reminder
       JOIN communications AS communication
         ON communication.id = reminder.communication_id
       JOIN companies AS company
         ON company.id = communication.company_id
       JOIN users AS account
         ON account.id = communication.user_id
      WHERE reminder.id = $1
        AND reminder.status = 'processing'
        AND communication.deleted_at IS NULL
        AND company.deleted_at IS NULL
        AND account.active
        AND communication.next_action_at = reminder.scheduled_for`,
    [reminderId],
  );
}

async function markCancelled(reminderId: string): Promise<void> {
  await query(
    `UPDATE next_action_reminders
        SET status = 'cancelled', cancelled_at = now(), processing_started_at = NULL,
            last_error = 'Η επικοινωνία ή ο λογαριασμός δεν είναι πλέον ενεργός.'
      WHERE id = $1
        AND status = 'processing'`,
    [reminderId],
  );
}

async function markSent(reminderId: string): Promise<void> {
  await query(
    `UPDATE next_action_reminders
        SET status = 'sent', sent_at = now(), processing_started_at = NULL
      WHERE id = $1
        AND status = 'processing'`,
    [reminderId],
  );
}

async function markFailed(reminder: ClaimedReminder): Promise<void> {
  const exhausted = reminder.attempts >= MAX_ATTEMPTS;
  const retryDelayMs = Math.min(60 * 60_000, 60_000 * 2 ** (reminder.attempts - 1));

  await query(
    `UPDATE next_action_reminders
        SET status = $2,
            processing_started_at = NULL,
            next_attempt_at = $3,
            last_error = 'Δεν ήταν δυνατή η αποστολή του email μέσω Resend.'
      WHERE id = $1
        AND status = 'processing'`,
    [reminder.id, exhausted ? 'failed' : 'pending', new Date(Date.now() + retryDelayMs)],
  );
}

/** Claim and deliver one bounded batch. Safe to call from more than one worker. */
export async function runNextActionReminderBatch(): Promise<number> {
  await recoverInterruptedDeliveries();
  const reminders = await claimDueReminders();

  for (const reminder of reminders) {
    const details = await deliveryDetails(reminder.id);
    if (!details) {
      await markCancelled(reminder.id);
      continue;
    }

    const sent = await sendNextActionReminderEmail({
      reminderId: details.reminder_id,
      communicationId: details.communication_id,
      recipientName: details.user_name,
      recipientEmail: details.user_email,
      companyName: details.company_name,
      contactName: details.contact_name,
      nextAction: details.next_action,
      scheduledFor: details.scheduled_for,
    });

    if (sent) {
      await markSent(reminder.id);
      logger.info({ reminderId: reminder.id }, 'Next-action reminder email sent');
    } else {
      await markFailed(reminder);
    }
  }

  return reminders.length;
}
