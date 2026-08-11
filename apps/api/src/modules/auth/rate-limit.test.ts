import { afterEach, describe, expect, it, vi } from 'vitest';

import { consume, reset, resetAll } from './rate-limit.js';

afterEach(() => {
  resetAll();
  vi.useRealTimers();
});

describe('login rate limiting', () => {
  it('allows attempts up to the limit and blocks the next one', () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(consume('key', 3, 60_000)).toEqual({ allowed: true });
    }
    expect(consume('key', 3, 60_000)).toMatchObject({ allowed: false });
  });

  it('reports how long the caller has to wait', () => {
    vi.useFakeTimers();
    consume('key', 1, 60_000);
    vi.advanceTimersByTime(20_000);

    expect(consume('key', 1, 60_000)).toEqual({ allowed: false, retryAfterSeconds: 40 });
  });

  it('starts a fresh window once the old one has passed', () => {
    vi.useFakeTimers();
    consume('key', 1, 60_000);
    expect(consume('key', 1, 60_000)).toMatchObject({ allowed: false });

    vi.advanceTimersByTime(60_001);
    expect(consume('key', 1, 60_000)).toEqual({ allowed: true });
  });

  it('counts each key separately', () => {
    consume('a', 1, 60_000);
    expect(consume('b', 1, 60_000)).toEqual({ allowed: true });
  });

  it('forgets a key on reset, as a successful sign-in does', () => {
    consume('key', 1, 60_000);
    expect(consume('key', 1, 60_000)).toMatchObject({ allowed: false });

    reset('key');
    expect(consume('key', 1, 60_000)).toEqual({ allowed: true });
  });
});
