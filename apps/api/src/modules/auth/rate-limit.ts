/**
 * Fixed-window attempt counter for the login endpoint.
 *
 * In-process and therefore per-instance: with several API replicas the real
 * limit is the configured one times the replica count. That is an accepted
 * trade for an internal CRM that runs a single container — the goal is to stop
 * password guessing, not to meter traffic. Moving to Redis later means
 * replacing this file, not its callers.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/** Sweep lazily rather than on a timer, so tests need no cleanup. */
const SWEEP_THRESHOLD = 1_000;

function sweep(now: number): void {
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

/**
 * Count one attempt against `key`. The window starts at the first attempt and
 * does not slide, so a blocked caller always gets a bounded wait.
 */
export function consume(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  if (windows.size >= SWEEP_THRESHOLD) sweep(now);

  const current = windows.get(key);

  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (current.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000) };
  }

  current.count += 1;
  return { allowed: true };
}

/** Forget a key — called after a successful sign-in. */
export function reset(key: string): void {
  windows.delete(key);
}

/** Test-only: drop all state between cases. */
export function resetAll(): void {
  windows.clear();
}
