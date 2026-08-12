'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { IconChevronDown, IconKey, IconLogout } from '@/components/icons';
import { UserAvatar } from '@/components/shell/user-avatar';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';
import { LOGIN_PATH, ROLE_LABELS, type AuthUser } from '@/lib/session';

/** Account actions in the top-right corner, available at every app width. */
export function AccountMenu({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const firstAction = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    firstAction.current?.focus();

    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    }

    // Tab is allowed to leave naturally; once focus lands outside, the panel
    // has no active control left to serve and closes behind it.
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

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // The endpoint already treats an unknown session as success, so the only
      // way here is an unreachable API. Leave the app regardless — the cookie
      // is either gone or will be rejected on the next authoritative check.
    }
    // A full load, not a router push: it clears every cached server render
    // made while signed in.
    window.location.assign(LOGIN_PATH);
  }

  return (
    <div ref={root} className="relative">
      <button
        ref={trigger}
        type="button"
        aria-label="Μενού λογαριασμού"
        aria-expanded={open}
        aria-controls="account-menu-panel"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 items-center gap-2 rounded-full pr-2 pl-0.5 text-ink-secondary outline-none transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <UserAvatar name={user.name} />
        <span className="hidden max-w-32 truncate text-sm font-medium xl:inline">{user.name}</span>
        <IconChevronDown
          className={cn(
            'hidden size-3.5 transition-transform duration-150 sm:block',
            open && 'rotate-180',
          )}
        />
      </button>

      {open ? (
        <div
          id="account-menu-panel"
          className="popover-panel absolute top-full right-0 z-20 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-pop"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-ink-faint">{user.email}</p>
            <p className="mt-1 text-[11px] text-ink-faint">{ROLE_LABELS[user.role]}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <Link
            ref={firstAction}
            href="/account/password"
            onClick={() => setOpen(false)}
            className="flex h-9 items-center gap-2 rounded-lg px-2.5 text-sm text-ink-secondary outline-none transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <IconKey className="size-4" />
            Αλλαγή κωδικού
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            disabled={signingOut}
            className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-sm text-ink-secondary outline-none transition-colors duration-150 hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50"
          >
            <IconLogout className="size-4" />
            {signingOut ? 'Αποσύνδεση…' : 'Αποσύνδεση'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
