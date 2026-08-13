import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { closePool } from './db/index.js';
import { runNextActionReminderBatch } from './modules/next-action-reminders/service.js';
import { runScheduledEmailBatch } from './modules/scheduled-emails/service.js';

const POLL_INTERVAL_MS = 30_000;

let shuttingDown = false;
let wakeWorker: (() => void) | undefined;

function requestShutdown(signal: string): void {
  logger.info(`${signal} received, stopping communication automation worker`);
  shuttingDown = true;
  wakeWorker?.();
}

async function waitForNextPoll(): Promise<void> {
  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      wakeWorker = undefined;
      resolve();
    };
    const timeout = setTimeout(finish, POLL_INTERVAL_MS);
    wakeWorker = finish;
  });
}

process.on('SIGTERM', () => requestShutdown('SIGTERM'));
process.on('SIGINT', () => requestShutdown('SIGINT'));

async function main(): Promise<void> {
  logger.info(
    `Communication automation worker started (${env.NODE_ENV}); checking every ${POLL_INTERVAL_MS / 1_000} seconds`,
  );

  while (!shuttingDown) {
    try {
      await runNextActionReminderBatch();
    } catch (err) {
      logger.error({ err }, 'Next-action reminder worker batch failed');
    }

    try {
      await runScheduledEmailBatch();
    } catch (err) {
      logger.error({ err }, 'Scheduled email worker batch failed');
    }

    if (!shuttingDown) {
      await waitForNextPoll();
    }
  }

  await closePool();
  logger.info('Communication automation worker stopped');
}

void main().catch((err: unknown) => {
  logger.fatal({ err }, 'Communication automation worker could not start');
  process.exit(1);
});
