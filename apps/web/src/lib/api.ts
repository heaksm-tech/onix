import { BROWSER_API_PATH, SERVER_API_URL } from './api-url';

/**
 * Thin wrapper around fetch for talking to the Express API.
 *
 * Server components call Express directly; browser code goes through this
 * app's own `/api/v1/*` route, which forwards on. Nothing here needs a
 * `NEXT_PUBLIC_*` value, so the API's address is never baked into the client
 * bundle.
 */
const BASE_URL = typeof window === 'undefined' ? SERVER_API_URL : BROWSER_API_PATH;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

type ErrorBody = { error?: { code?: string; message?: string } };

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    // Browser calls are same-origin now, so the session cookie rides along on
    // its own. Server components have no cookie jar and pass theirs as a
    // header instead — see `getCurrentUser` in `lib/auth.ts`.
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ErrorBody;
    throw new ApiError(
      res.status,
      body.error?.code ?? 'UNKNOWN',
      body.error?.message ?? `Request failed with status ${res.status}`,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
