/**
 * Where the API lives, from each side of the app.
 *
 * The browser never talks to Express directly — it calls this app's own
 * `/api/v1/*` route, which forwards to the API. That keeps the session cookie
 * first-party to the web origin and leaves nothing about the API reachable
 * from an unauthenticated browser.
 *
 * Server components skip the detour and call Express straight out, over the
 * private network in Docker.
 */
export const SERVER_API_URL = process.env.API_URL ?? 'http://localhost:4000/api/v1';

/** Same-origin path the browser uses. Must match the route handler's location. */
export const BROWSER_API_PATH = '/api/v1';
