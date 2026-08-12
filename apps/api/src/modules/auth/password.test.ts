import { describe, expect, it } from 'vitest';

import { hashPassword, passwordsMatch, verifyPassword } from './password.js';

describe('password hashing', () => {
  it('verifies the password it hashed', async () => {
    const hash = await hashPassword('σωστός-κωδικός-42');
    await expect(verifyPassword('σωστός-κωδικός-42', hash)).resolves.toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('σωστός-κωδικός-42');
    await expect(verifyPassword('σωστός-κωδικός-43', hash)).resolves.toBe(false);
  });

  it('salts each hash, so equal passwords do not collide', async () => {
    const [first, second] = await Promise.all([hashPassword('ίδιος'), hashPassword('ίδιος')]);
    expect(first).not.toBe(second);
    await expect(verifyPassword('ίδιος', second)).resolves.toBe(true);
  });

  it('records its parameters in the stored value', async () => {
    const hash = await hashPassword('οτιδήποτε');
    expect(hash.split('$').slice(0, 4)).toEqual(['scrypt', '16384', '8', '1']);
  });

  it('matches the same password typed in a different Unicode normalisation', async () => {
    // The same word twice: a precomposed "Ά" (U+0386), then alpha plus a
    // combining tonos — which is what some keyboard layouts actually emit.
    const precomposed = '\u0386λφα';
    const decomposed = '\u0391\u0301λφα';
    expect(precomposed).not.toBe(decomposed);

    const hash = await hashPassword(precomposed);
    await expect(verifyPassword(decomposed, hash)).resolves.toBe(true);
  });

  it('returns false instead of throwing on a malformed hash', async () => {
    for (const stored of ['', 'not-a-hash', 'scrypt$16384$8$1$onlyfiveparts', 'bcrypt$a$b$c$d$e']) {
      await expect(verifyPassword('whatever', stored)).resolves.toBe(false);
    }
  });

  it('compares repeated passwords through the same Unicode normalisation as hashing', () => {
    expect(passwordsMatch('\u0386λφα', '\u0391\u0301λφα')).toBe(true);
    expect(passwordsMatch('πρώτος', 'δεύτερος')).toBe(false);
  });
});
