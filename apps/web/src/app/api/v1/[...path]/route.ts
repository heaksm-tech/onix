import { type NextRequest } from 'next/server';

import { SERVER_API_URL } from '@/lib/api-url';

/**
 * Forwards browser calls to the Express API.
 *
 * The browser has no route to Express of its own: `API_URL` is server-side
 * only, and in Docker the API is not published outside the private network.
 * Everything the client needs comes through here, which buys three things —
 * the session cookie is first-party to the web origin, there is no CORS to
 * configure, and an unauthenticated visitor cannot reach the API at all,
 * because `proxy.ts` turns them away before this handler runs.
 *
 * This is a pipe, not a policy layer. Authorisation stays in Express, which
 * answers 401 for every route it does not serve publicly — including ones that
 * do not exist, so the API surface cannot be mapped by probing.
 */

/** Hop-by-hop and connection-specific headers that must not be relayed. */
const STRIPPED_REQUEST_HEADERS = new Set([
  'connection',
  'content-length',
  'host',
  'keep-alive',
  'transfer-encoding',
  'upgrade',
]);

const STRIPPED_RESPONSE_HEADERS = new Set([
  'connection',
  'content-encoding',
  'content-length',
  'keep-alive',
  'transfer-encoding',
  'set-cookie',
]);

async function forward(request: NextRequest, path: string[]): Promise<Response> {
  const target = new URL(`${SERVER_API_URL}/${path.join('/')}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  // Read the body rather than streaming it: these are small JSON payloads, and
  // a buffered body avoids the half-duplex handshake that streaming requires.
  const body =
    request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    // The API being unreachable is an infrastructure fault, not a client
    // error, and it must not look like one to the caller.
    return Response.json(
      { error: { code: 'API_UNREACHABLE', message: 'Το API δεν αποκρίνεται.' } },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) responseHeaders.set(key, value);
  });

  // Session cookies are issued by Express but must land on *this* origin, so
  // they are relayed verbatim. getSetCookie keeps them separate — a plain get
  // would fold several cookies into one comma-joined and unusable string.
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append('set-cookie', cookie);
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type Context = { params: Promise<{ path: string[] }> };

async function handler(request: NextRequest, context: Context): Promise<Response> {
  const { path } = await context.params;
  return forward(request, path);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const HEAD = handler;
