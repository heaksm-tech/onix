import { NextResponse, type NextRequest } from 'next/server';

import { LOGIN_ACTION_PATH, LOGIN_PATH, SESSION_COOKIE } from '@/lib/session';

/**
 * The perimeter. Nothing but the login screen leaves this app without a
 * session — not a page, not an API call, and not a JavaScript chunk.
 *
 * Blocking the chunks is the reason this file matches static assets at all.
 * The client bundles name every endpoint the app calls and every screen it
 * has, so serving them to an anonymous visitor hands over a map of the API,
 * minified or not. They are only reachable to someone who has already signed
 * in and would receive them anyway.
 *
 * That is affordable solely because the login page needs no chunk: its form is
 * plain HTML and its CSS is inlined (`experimental.inlineCss`). If a client
 * component is ever added to it, the page will still render but stop
 * hydrating — check that before reaching for an exception here.
 *
 * The check is cookie *presence* only; validating it would mean a database
 * round trip per asset. The `(app)` layout does the real verification, and the
 * login page redirects away when a session turns out to be valid — which is
 * why the mirror rule is not here. Acting on presence alone in both places
 * would make a stale cookie bounce between them forever.
 */

/** Reachable without a session: the login document and the form it posts to. */
const PUBLIC_PATHS = new Set<string>([LOGIN_PATH, LOGIN_ACTION_PATH]);

/** Branding the login page references directly. Reveals nothing. */
const PUBLIC_FILES = new Set(['/favicon.ico', '/icon.svg']);

/**
 * Stylesheets stay public.
 *
 * They give away no endpoint, route or logic — only which utility classes the
 * app uses — and the login page already carries the very same rules inlined in
 * its own markup. Serving the file grants nothing the anonymous visitor was
 * not handed anyway. It matters in development, where `inlineCss` does not
 * apply and the page would otherwise render unstyled.
 */
function isStylesheet(pathname: string): boolean {
  return pathname.startsWith('/_next/') && pathname.endsWith('.css');
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || PUBLIC_FILES.has(pathname)) return NextResponse.next();
  if (isStylesheet(pathname)) return NextResponse.next();
  if (request.cookies.get(SESSION_COOKIE)) return NextResponse.next();

  // Assets and data get a flat 404 rather than a redirect: an HTML login page
  // is not a useful answer to a request for a script, and 404 discloses less
  // than 403 about what is there.
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return new NextResponse(null, { status: 404 });
  }

  const url = request.nextUrl.clone();
  url.pathname = LOGIN_PATH;
  url.search = '';
  if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);

  return NextResponse.redirect(url);
}

export const config = {
  // Everything, static assets included — see above.
  matcher: ['/:path*'],
};
