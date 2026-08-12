import { SERVER_API_URL } from '@/lib/api-url';
import {
  ACTIVATE_ACCOUNT_PATH,
  INVITATION_TOKEN_MAX_LENGTH,
  MIN_PASSWORD_LENGTH,
  type ActivationErrorCode,
} from '@/lib/account-activation';

/** 303 makes the browser follow a native form POST with a GET. */
function seeOther(location: string, headers = new Headers()): Response {
  headers.set('location', location);
  headers.set('cache-control', 'no-store');
  return new Response(null, { status: 303, headers });
}

function back(token: string, error: ActivationErrorCode): Response {
  const query = new URLSearchParams({ error });
  if (token) query.set('token', token);
  return seeOther(`${ACTIVATE_ACCOUNT_PATH}?${query}`);
}

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const token = String(form.get('token') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const confirmation = String(form.get('confirmation') ?? '');

  if (!token) return back('', 'missing');
  if (token.length > INVITATION_TOKEN_MAX_LENGTH) return back('', 'invalid');
  if (password.length < MIN_PASSWORD_LENGTH) return back(token, 'password');
  if (password.normalize('NFKC') !== confirmation.normalize('NFKC')) {
    return back(token, 'mismatch');
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${SERVER_API_URL}/auth/activate-account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password, confirmation }),
      cache: 'no-store',
    });
  } catch {
    return back(token, 'unavailable');
  }

  if (!upstream.ok) {
    const body = (await upstream.json().catch(() => ({}))) as {
      error?: { code?: string };
    };
    if (upstream.status === 429) return back(token, 'throttled');
    if (body.error?.code === 'PASSWORD_CONFIRMATION_MISMATCH') return back(token, 'mismatch');
    if (upstream.status === 400 || upstream.status === 409) return back(token, 'invalid');
    if (upstream.status === 422) return back(token, 'password');
    return back(token, 'unavailable');
  }

  const headers = new Headers();
  for (const cookie of upstream.headers.getSetCookie()) {
    headers.append('set-cookie', cookie);
  }
  return seeOther('/', headers);
}
