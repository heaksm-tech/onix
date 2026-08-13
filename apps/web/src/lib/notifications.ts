export type Notification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  actionUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResponse = {
  notifications: Notification[];
  unreadCount: number;
};

const dateTimeFormatter = new Intl.DateTimeFormat('el-GR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Europe/Athens',
});

export function formatNotificationDate(value: string): string {
  return dateTimeFormatter.format(new Date(value));
}
