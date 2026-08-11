import { cookies } from 'next/headers';

import { apiFetch } from './api';
import { SESSION_COOKIE, type AuthUser } from './session';

/**
 * The signed-in user, or null.
 *
 * Server-only — the `next/headers` import makes importing this from a client
 * component a build error. Client components take the user as a prop; the
 * shared types live in `lib/session.ts`.
 *
 * Server components have no cookie jar of their own, so the incoming session
 * cookie is forwarded to the API by hand. Every failure — expired session,
 * deactivated account, unreachable API — resolves to null rather than
 * throwing: the caller then redirects to the login page, which is something
 * the user can act on, unlike an error screen.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { user } = await apiFetch<{ user: AuthUser }>('/auth/me', {
      cache: 'no-store',
      headers: { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` },
    });
    return user;
  } catch {
    return null;
  }
}
