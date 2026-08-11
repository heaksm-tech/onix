import { cookies } from 'next/headers';

import { apiFetch } from './api';
import { SESSION_COOKIE } from './session';

/**
 * Calling the API as the signed-in user, from a server component.
 *
 * Server components have no cookie jar of their own, so the incoming session
 * cookie has to be forwarded by hand — without it every route behind
 * `requireAuth` answers 401. Reads are `no-store` by default: a CRM dashboard
 * that shows yesterday's numbers is worse than one that takes a moment.
 *
 * Server-only. The `next/headers` import makes importing this from a client
 * component a build error, which is the point — browser code goes through
 * `apiFetch` and this app's own `/api/v1/*` route instead.
 */

/** The raw session token on this request, if there is one. */
export async function sessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function apiFetchAsUser<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await sessionToken();

  return apiFetch<T>(path, {
    cache: 'no-store',
    ...init,
    headers: {
      ...(token ? { cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}` } : {}),
      ...init.headers,
    },
  });
}
