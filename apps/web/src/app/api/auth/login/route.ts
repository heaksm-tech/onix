import { type NextRequest } from 'next/server';

import { SERVER_API_URL } from '@/lib/api-url';
import { LOGIN_PATH, safeNextPath, type LoginErrorCode } from '@/lib/session';

/**
 * Target of the login form.
 *
 * This is a plain HTML form submission: url-encoded in, redirect out.
 *
 * Express still does the real work. This handler exists to turn its JSON
 * answer into a redirect the browser can follow, and to relay the
 * session cookie so it lands on the web origin rather than the API's.
 */

/**
 * 303 so the browser follows with GET — a 307 would repeat the POST.
 *
 * The Location is relative on purpose. An absolute URL would have to be built
 * from this server's own idea of its origin, which is not the origin the
 * browser used: `next dev` binds 0.0.0.0 and reports it back, which would send
 * the browser somewhere the session cookie does not exist. A relative Location
 * is resolved by the browser against the address it actually asked for.
 */
function seeOther(location: string, headers = new Headers()): Response {
  headers.set('location', location);
  return new Response(null, { status: 303, headers });
}

function back(next: string, error: LoginErrorCode): Response {
  const query = new URLSearchParams({ error });
  // The typed email is deliberately not carried back: it would end up in the
  // URL bar, browser history and every access log along the way.
  if (next !== '/') query.set('next', next);
  return seeOther(`${LOGIN_PATH}?${query}`);
}

export async function POST(request: NextRequest): Promise<Response> {
  const form = await request.formData();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const next = safeNextPath(String(form.get('next') ?? '') || undefined);

  if (!email || !password) return back(next, 'missing');

  let upstream: Response;
  try {
    upstream = await fetch(`${SERVER_API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    return back(next, 'unavailable');
  }

  if (!upstream.ok) {
    if (upstream.status === 429) return back(next, 'throttled');
    // 401 is a wrong email or password; 422 means the request never reached
    // the credential check, and saying so would only describe the schema.
    return back(next, upstream.status === 401 ? 'credentials' : 'unavailable');
  }

  const headers = new Headers();
  for (const cookie of upstream.headers.getSetCookie()) {
    headers.append('set-cookie', cookie);
  }
  return seeOther(next, headers);
}
