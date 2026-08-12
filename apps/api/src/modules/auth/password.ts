import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Password hashing with scrypt from `node:crypto`.
 *
 * scrypt is memory-hard and ships with Node, so the API keeps its dependency
 * list — and its Docker build — free of a native module. The cost parameters
 * below put a single hash at roughly 100ms on ordinary hardware, which is the
 * point: they make guessing expensive, and they are recorded inside every hash
 * so raising them later does not invalidate the passwords already stored.
 */

/**
 * The shortest password an account may be given. Enforced by every flow that
 * sets passwords — `user:create`, the seed and the signed-in account form —
 * rather than at sign-in, where a length check would only leak how long the
 * real password is.
 */
export const MIN_PASSWORD_LENGTH = 12;

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const PARAMS = { N: 16_384, r: 8, p: 1 } as const;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// 128 * N * r is scrypt's working set (16 MiB here); Node's 32 MiB default
// leaves no headroom if the parameters are ever raised.
const MAX_MEMORY = 64 * 1024 * 1024;

/**
 * Greek passwords can be typed with different but visually identical Unicode
 * sequences depending on the keyboard and OS. Normalising both on the way in
 * and on the way out means the same typed password always matches.
 */
function normalize(password: string): Buffer {
  return Buffer.from(password.normalize('NFKC'), 'utf8');
}

/** Compare the two entries of a new password through the same normalisation as hashing. */
export function passwordsMatch(first: string, second: string): boolean {
  return first.normalize('NFKC') === second.normalize('NFKC');
}

async function derive(
  password: string,
  salt: Buffer,
  params: { N: number; r: number; p: number },
): Promise<Buffer> {
  return scryptAsync(normalize(password), salt, KEY_LENGTH, { ...params, maxmem: MAX_MEMORY });
}

/** Produce a self-describing hash: `scrypt$N$r$p$salt$key`, all base64. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await derive(password, salt, PARAMS);
  return [
    'scrypt',
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

/**
 * Check `password` against a stored hash. Returns false — never throws — for
 * malformed or unknown-algorithm hashes, so a bad row cannot turn a failed
 * sign-in into a 500.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6) return false;

  const [algorithm, n, r, p, saltB64, keyB64] = parts as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  if (algorithm !== 'scrypt') return false;

  const params = { N: Number(n), r: Number(r), p: Number(p) };
  if (!Object.values(params).every((value) => Number.isInteger(value) && value > 0)) return false;

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(keyB64, 'base64');
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = await scryptAsync(normalize(password), salt, expected.length, {
      ...params,
      maxmem: MAX_MEMORY,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    // Parameters outside scrypt's accepted range (N not a power of two, cost
    // beyond maxmem) land here rather than crashing the request.
    return false;
  }
}

/**
 * Burn the same work as a real verification when there is no account to check
 * against. Without it, "unknown email" answers measurably faster than "wrong
 * password" and the login endpoint becomes an account-enumeration oracle.
 */
export async function fakeVerify(password: string): Promise<void> {
  await derive(password, Buffer.alloc(SALT_LENGTH), PARAMS);
}
