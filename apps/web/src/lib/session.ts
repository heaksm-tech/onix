import type { Route } from 'next';

/**
 * Session facts shared by the server, the proxy and client components.
 *
 * Deliberately free of any server-only import (`next/headers`, the API
 * client), so `proxy.ts` and `'use client'` components can both pull from it.
 * The server-side lookup lives in `lib/auth.ts`.
 */

/**
 * The cookie the API issues on sign-in. Cookie scope ignores the port, so a
 * cookie set by the API on one host is visible to the web app on the same host
 * — which is what lets the middleware see it at all.
 */
export const SESSION_COOKIE = 'onix_session';

/** Where the proxy sends people who are not signed in. */
export const LOGIN_PATH: Route = '/login';

/** Where the login form posts. Reachable without a session, unlike the rest. */
export const LOGIN_ACTION_PATH = '/api/auth/login';

/**
 * Why a sign-in attempt failed, as a short code carried in the URL.
 *
 * The login page renders without JavaScript, so the outcome of a POST has to
 * survive a redirect. Only these codes cross that gap — never the API's own
 * message — so nothing an attacker controls is ever echoed into the page, and
 * the copy stays in one place.
 */
export const LOGIN_ERRORS = {
  missing: 'Συμπληρώστε το email και τον κωδικό πρόσβασής σας.',
  credentials: 'Λανθασμένο email ή κωδικός πρόσβασης.',
  throttled: 'Πολλές αποτυχημένες προσπάθειες. Δοκιμάστε ξανά σε λίγα λεπτά.',
  unavailable: 'Δεν ήταν δυνατή η σύνδεση. Δοκιμάστε ξανά σε λίγο.',
} as const;

export type LoginErrorCode = keyof typeof LOGIN_ERRORS;

export function loginErrorMessage(code: string | undefined): string | undefined {
  return code && code in LOGIN_ERRORS ? LOGIN_ERRORS[code as LoginErrorCode] : undefined;
}

/** The roles declared by the database's `user_role` enum. */
export type UserRole = 'employee' | 'manager' | 'technical' | 'admin';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  employee: 'Υπάλληλος',
  manager: 'Υπεύθυνος',
  technical: 'Τεχνικός',
  admin: 'Διαχειριστής',
};

/**
 * Initials for the avatar: first letters of the first two words, so
 * «Σοφία Δ. Μελά» reads ΣΔ rather than a single letter.
 */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? '')
    .join('');
  return letters.toLocaleUpperCase('el-GR') || '?';
}

/**
 * Keep a `?next=` value to a path inside this app. Anything absolute — or the
 * protocol-relative `//evil.example` — is discarded rather than corrected, so
 * a crafted login link cannot bounce someone off-site after signing in.
 *
 * The cast is the one place a runtime string becomes a typed route: the value
 * arrives from the query string, so it cannot be checked at compile time, and
 * the guard above is what stands in for that.
 */
export function safeNextPath(value: string | undefined): Route {
  if (!value?.startsWith('/') || value.startsWith('//')) return '/';
  return value === LOGIN_PATH ? '/' : (value as Route);
}
