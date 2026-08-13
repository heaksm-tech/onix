'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/button';
import { IconBell, IconCheck, IconClose, IconTrash } from '@/components/icons';
import { ApiError, apiFetch } from '@/lib/api';
import {
  formatNotificationDate,
  type Notification,
  type NotificationsResponse,
} from '@/lib/notifications';

const POLL_INTERVAL_MS = 60_000;
type DeleteTarget = Notification | 'all';

/** Notification feed in the global topbar. The API remains the source of truth. */
export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [deleting, setDeleting] = useState<string>();
  const [deleteError, setDeleteError] = useState<string>();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const data = await apiFetch<NotificationsResponse>('/notifications');
        if (!active) return;
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setLoadFailed(false);
      } catch {
        if (active) setLoadFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    const timer = window.setInterval(() => void load(), POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    }

    function onFocusIn(event: FocusEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open]);

  async function markAllRead() {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: notification.readAt ?? readAt,
        })),
      );
      setUnreadCount(0);
    } catch {
      setLoadFailed(true);
    }
  }

  const markRead = useCallback((notification: Notification) => {
    if (notification.readAt) return;

    const readAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, readAt } : item)),
    );
    setUnreadCount((current) => Math.max(0, current - 1));
    void apiFetch(`/notifications/${notification.id}/read`, {
      method: 'PATCH',
      keepalive: true,
    });
  }, []);

  useEffect(() => {
    const scrollContainer = list.current;
    if (!open || !scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting || entry.intersectionRatio < 1) continue;

          const id = (entry.target as HTMLElement).dataset.notificationId;
          const notification = notifications.find((item) => item.id === id);
          if (!notification || notification.readAt) continue;

          // Stop observing before updating state so this exact visible row
          // cannot enqueue the same read request twice during the rerender.
          observer.unobserve(entry.target);
          markRead(notification);
        }
      },
      { root: scrollContainer, threshold: 1 },
    );

    for (const row of scrollContainer.querySelectorAll<HTMLElement>('[data-notification-id]')) {
      observer.observe(row);
    }

    return () => observer.disconnect();
  }, [markRead, notifications, open]);

  async function remove(target: DeleteTarget) {
    setDeleteError(undefined);
    setDeleting(target === 'all' ? 'all' : target.id);

    try {
      const deletingAll = target === 'all';
      await apiFetch(deletingAll ? '/notifications' : `/notifications/${target.id}`, {
        method: 'DELETE',
      });

      if (deletingAll) {
        setNotifications([]);
        setUnreadCount(0);
      } else {
        setNotifications((current) => current.filter((item) => item.id !== target.id));
        if (!target.readAt) setUnreadCount((current) => Math.max(0, current - 1));
      }
    } catch (caught) {
      setDeleteError(caught instanceof ApiError ? caught.message : 'Δεν ήταν δυνατή η διαγραφή.');
    } finally {
      setDeleting(undefined);
    }
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label={
          unreadCount > 0 ? `Ειδοποιήσεις, ${unreadCount} μη αναγνωσμένες` : 'Ειδοποιήσεις'
        }
        aria-expanded={open}
        aria-controls="notification-menu-panel"
        onClick={() => setOpen((current) => !current)}
        className="relative grid size-8 place-items-center rounded-lg text-ink-secondary transition-colors duration-150 outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <IconBell className="size-[18px]" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
        ) : null}
      </button>

      {open ? (
        <section
          id="notification-menu-panel"
          aria-label="Ειδοποιήσεις"
          className="popover-panel fixed top-14 right-4 left-4 z-20 overflow-hidden rounded-xl border border-line bg-surface shadow-pop sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-[min(22rem,calc(100vw-2rem))]"
        >
          <div className="flex h-12 items-center justify-between gap-3 border-b border-line px-4">
            <div className="flex min-w-0 items-baseline gap-2">
              <h2 className="text-sm font-semibold">Ειδοποιήσεις</h2>
              {unreadCount > 0 ? (
                <span className="text-xs tabular-nums text-ink-faint">{unreadCount} νέες</span>
              ) : null}
            </div>
            {notifications.length > 0 ? (
              <div className="flex shrink-0 items-center gap-0.5">
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    aria-label="Σήμανση όλων ως διαβασμένων"
                    title="Όλες διαβασμένες"
                    onClick={() => void markAllRead()}
                    className="grid size-8 place-items-center rounded-lg text-accent outline-none transition-colors duration-150 hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-accent/60"
                  >
                    <IconCheck className="size-4" />
                  </button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-8 px-0"
                  aria-label="Καθαρισμός Όλων"
                  title="Καθαρισμός Όλων"
                  disabled={Boolean(deleting)}
                  onClick={() => void remove('all')}
                >
                  <IconTrash className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>

          {deleteError ? (
            <p role="alert" className="border-b border-line px-4 py-2 text-xs text-negative">
              {deleteError}
            </p>
          ) : null}

          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-ink-secondary">
              Φόρτωση ειδοποιήσεων…
            </p>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <div className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
                <IconBell className="size-5" />
              </div>
              <h2 className="mt-3 text-sm font-semibold">Δεν υπάρχουν ειδοποιήσεις</h2>
              <p className="mt-1 text-xs text-ink-secondary">
                Οι νέες ειδοποιήσεις θα εμφανίζονται εδώ.
              </p>
              {loadFailed ? (
                <p className="mt-3 text-xs text-negative" role="status">
                  Δεν ήταν δυνατή η ενημέρωση της λίστας.
                </p>
              ) : null}
            </div>
          ) : (
            <ul ref={list} className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => {
                const content = (
                  <>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm font-medium text-ink">{notification.title}</span>
                      <span className="mt-0.5 text-xs leading-5 text-ink-secondary">
                        {notification.body}
                      </span>
                      <span className="mt-1 text-[11px] tabular-nums text-ink-faint">
                        {formatNotificationDate(notification.createdAt)}
                      </span>
                    </span>
                    <span className="mt-1 flex size-1.5 shrink-0" aria-hidden>
                      {!notification.readAt ? (
                        <span className="size-1.5 rounded-full bg-accent" />
                      ) : null}
                    </span>
                  </>
                );

                return (
                  <li
                    key={notification.id}
                    data-notification-id={notification.id}
                    className="relative border-b border-line last:border-0"
                  >
                    <div className="flex w-full min-w-0 gap-3 py-3 pr-12 pl-4 text-left">
                      {content}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 size-8 px-0"
                      aria-label={`Διαγραφή Ειδοποίησης: ${notification.title}`}
                      title="Διαγραφή Ειδοποίησης"
                      disabled={Boolean(deleting)}
                      onClick={() => void remove(notification)}
                    >
                      <IconClose className="size-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
