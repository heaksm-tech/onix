import { createHash, randomBytes } from 'node:crypto';

import { env } from '../../config/env.js';

const TOKEN_BYTES = 32;
export const INVITATION_TOKEN_MAX_LENGTH = 128;

/** The bearer value placed in the email, never in the database. */
export function createInvitationToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/** Database representation of an account-invitation token. */
export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function invitationExpiresAt(): Date {
  return new Date(Date.now() + env.ACCOUNT_INVITATION_TTL_HOURS * 60 * 60 * 1000);
}
