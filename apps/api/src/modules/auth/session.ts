import { createHash, randomBytes } from 'node:crypto';

import type { Request, Response } from 'express';

import { env } from '../../config/env.js';
import { query, queryOne } from '../../db/index.js';
import type { AuthUser } from './types.js';

/**
 * Opaque, server-side sessions.
 *
 * The browser holds a random token in an httpOnly cookie; the database holds
 * its SHA-256 and the user it belongs to. Nothing about the user is encoded in
 * the token, so every request reads the current row — a signed-out session or
 * a deactivated account stops working immediately, with no token lifetime to
 * wait out.
 */

export const SESSION_COOKIE = 'onix_session';

const TOKEN_BYTES = 32;
const ttlMs = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/** Database representation of a browser session token. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Cookie attributes, kept identical between setting and clearing.
 *
 * No Domain attribute: the web app relays this cookie to the browser from its
 * own origin, so a host-only cookie is both correct and the tighter choice.
 */
function cookieOptions() {
  return {
    httpOnly: true,
    // Lax keeps the cookie off cross-site subrequests while still surviving a
    // normal link into the app — which is what stands in for a CSRF token
    // here, together with the API accepting no cross-origin browser requests.
    sameSite: 'lax' as const,
    secure: env.sessionCookieSecure,
    path: '/',
  };
}

/**
 * Read a single cookie off the request.
 *
 * Express 5 does not parse cookies and the API needs exactly one, so this
 * avoids pulling in cookie-parser for a five-line job.
 */
export function readSessionCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== SESSION_COOKIE) continue;
    return decodeURIComponent(part.slice(separator + 1).trim()) || undefined;
  }
  return undefined;
}

/** Issue a session for `userId` and return the token to hand to the browser. */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(TOKEN_BYTES).toString('base64url');
  const expiresAt = new Date(Date.now() + ttlMs);

  await query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [
    userId,
    hashSessionToken(token),
    expiresAt,
  ]);

  return { token, expiresAt };
}

/**
 * Resolve a token to its user, or undefined when the session is unknown,
 * expired, or belongs to a deactivated account.
 */
export async function resolveSession(token: string): Promise<AuthUser | undefined> {
  return queryOne<AuthUser>(
    `SELECT u.id, u.name, u.email, u.role
       FROM sessions AS s
       JOIN users AS u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND u.active`,
    [hashSessionToken(token)],
  );
}

/** Drop a single session. Silently does nothing if it is already gone. */
export async function revokeSession(token: string): Promise<void> {
  await query('DELETE FROM sessions WHERE token_hash = $1', [hashSessionToken(token)]);
}

/**
 * Remove sessions that can no longer authenticate anyone. Called on sign-in,
 * which keeps the table tidy without a scheduled job.
 */
export async function purgeExpiredSessions(): Promise<void> {
  await query('DELETE FROM sessions WHERE expires_at < now()');
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, { ...cookieOptions(), expires: expiresAt });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, cookieOptions());
}
