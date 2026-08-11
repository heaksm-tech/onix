'use client';

import { useState } from 'react';

import { IconLogout } from '@/components/icons';
import { apiFetch } from '@/lib/api';
import { LOGIN_PATH, ROLE_LABELS, initials, type AuthUser } from '@/lib/session';

/** Who is signed in, and the way out. Sits at the foot of the sidebar. */
export function UserCard({ user }: { user: AuthUser }) {
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // The endpoint already treats an unknown session as success, so the only
      // way here is an unreachable API. Send the user to the login page
      // regardless — the cookie is either gone or about to be rejected.
    }
    // A full load, not a router push: it clears every cached server render
    // made while signed in.
    window.location.assign(LOGIN_PATH);
  }

  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-strong text-xs font-semibold text-white"
      >
        {initials(user.name)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium">{user.name}</span>
        <span className="truncate text-[11px] text-ink-faint">{ROLE_LABELS[user.role]}</span>
      </span>
      <button
        type="button"
        onClick={() => void signOut()}
        disabled={signingOut}
        aria-label="Αποσύνδεση"
        title="Αποσύνδεση"
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-faint transition-colors duration-150 outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60 disabled:pointer-events-none disabled:opacity-50"
      >
        <IconLogout className="size-[18px]" />
      </button>
    </div>
  );
}
