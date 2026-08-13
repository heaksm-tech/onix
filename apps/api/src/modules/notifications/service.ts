import type { PoolClient } from 'pg';

import { queryOne } from '../../db/index.js';
import type { UserRole } from '../auth/types.js';

export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type CreateNotificationInput = {
  userId: string;
  title: string;
  body: string;
  actionUrl?: string;
};

export type CreateRoleNotificationsInput = Omit<CreateNotificationInput, 'userId'> & {
  role: UserRole;
};

type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  action_url: string | null;
  read_at: Date | null;
  created_at: Date;
};

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    actionUrl: row.action_url,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

/**
 * Create an in-app notification for one account.
 *
 * Backend features call this after their own write has committed when exactly
 * one recipient should receive the event.
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  const row = await queryOne<NotificationRow>(
    `INSERT INTO notifications (user_id, title, body, action_url)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, title, body, action_url, read_at, created_at`,
    [input.userId, input.title.trim(), input.body.trim(), input.actionUrl ?? null],
  );

  if (!row) throw new Error('Notification insert returned no row');
  return toNotification(row);
}

/** Create the same notification for every active account with a given role. */
export async function createNotificationsForRole(
  client: Pick<PoolClient, 'query'>,
  input: CreateRoleNotificationsInput,
): Promise<Notification[]> {
  const result = await client.query<NotificationRow>(
    `INSERT INTO notifications (user_id, title, body, action_url)
     SELECT id, $2, $3, $4
       FROM users
      WHERE role = $1
        AND active
     RETURNING id, user_id, title, body, action_url, read_at, created_at`,
    [input.role, input.title.trim(), input.body.trim(), input.actionUrl ?? null],
  );

  return result.rows.map(toNotification);
}

export type { NotificationRow };
