import { Router } from 'express';
import { z } from 'zod';

import { query, queryOne } from '../../db/index.js';
import { HttpError } from '../../lib/http-error.js';
import { validate } from '../../middleware/validate.js';
import { toNotification, type NotificationRow } from './service.js';

const NOTIFICATION_LIMIT = 30;

const idParams = z.object({
  id: z.string().uuid('Μη έγκυρο αναγνωριστικό ειδοποίησης.'),
});

type IdParams = z.infer<typeof idParams>;

export const notificationsRouter: Router = Router();

/** Latest notifications and the total unread count for the signed-in account. */
notificationsRouter.get('/notifications', async (req, res) => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

  const [rows, unread] = await Promise.all([
    query<NotificationRow>(
      `SELECT id, user_id, title, body, action_url, read_at, created_at
         FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2`,
      [user.id, NOTIFICATION_LIMIT],
    ),
    queryOne<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM notifications
        WHERE user_id = $1
          AND read_at IS NULL`,
      [user.id],
    ),
  ]);

  res.json({
    notifications: rows.map(toNotification),
    unreadCount: unread?.count ?? 0,
  });
});

/** Mark every notification belonging to the signed-in account as read. */
notificationsRouter.patch('/notifications/read-all', async (req, res) => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

  await query(
    `UPDATE notifications
        SET read_at = now()
      WHERE user_id = $1
        AND read_at IS NULL`,
    [user.id],
  );

  res.status(204).end();
});

/** Mark one notification as read without exposing another account's rows. */
notificationsRouter.patch(
  '/notifications/:id/read',
  validate(idParams, 'params'),
  async (req, res) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');
    const { id } = req.params as IdParams;

    const notification = await queryOne<{ id: string }>(
      `UPDATE notifications
          SET read_at = coalesce(read_at, now())
        WHERE id = $1
          AND user_id = $2
        RETURNING id`,
      [id, user.id],
    );

    if (!notification) throw HttpError.notFound('Η ειδοποίηση δεν βρέθηκε.');
    res.status(204).end();
  },
);

/** Delete every notification belonging to the signed-in account. */
notificationsRouter.delete('/notifications', async (req, res) => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');

  await query('DELETE FROM notifications WHERE user_id = $1', [user.id]);
  res.status(204).end();
});

/** Delete one notification without exposing another account's rows. */
notificationsRouter.delete('/notifications/:id', validate(idParams, 'params'), async (req, res) => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized('Απαιτείται σύνδεση.');
  const { id } = req.params as IdParams;

  const notification = await queryOne<{ id: string }>(
    `DELETE FROM notifications
        WHERE id = $1
          AND user_id = $2
      RETURNING id`,
    [id, user.id],
  );

  if (!notification) throw HttpError.notFound('Η ειδοποίηση δεν βρέθηκε.');
  res.status(204).end();
});
