import { apiFetchAsUser, sessionToken } from './server-api';
import type { AuthUser } from './session';

/**
 * The signed-in user, or null.
 *
 * Server-only — `server-api.ts` imports `next/headers`, which makes importing
 * this from a client component a build error. Client components take the user
 * as a prop; the shared types live in `lib/session.ts`.
 *
 * Every failure — expired session, deactivated account, unreachable API —
 * resolves to null rather than throwing: the caller then redirects to the
 * login page, which is something the user can act on, unlike an error screen.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // No cookie means no session, and no reason to ask the API.
  if (!(await sessionToken())) return null;

  try {
    const { user } = await apiFetchAsUser<{ user: AuthUser }>('/auth/me');
    return user;
  } catch {
    return null;
  }
}
