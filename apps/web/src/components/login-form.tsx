import { Button } from '@/components/button';
import { Field, controlClass } from '@/components/field';
import { LOGIN_ACTION_PATH } from '@/lib/session';

/**
 * A plain HTML form — no `'use client'`, no state, no handlers.
 *
 * This is what lets the app deny every `/_next/*` request to a visitor who is
 * not signed in: with nothing to hydrate, the page needs no chunk to work, so
 * none has to be served. The browser posts it natively and follows the
 * redirect that comes back.
 *
 * The cost is that a failed attempt is a round trip rather than an in-place
 * message, and the typed email is not carried back — see the route handler for
 * why that is deliberate.
 */
export function LoginForm({ next, error }: { next: string; error?: string }) {
  return (
    <form method="post" action={LOGIN_ACTION_PATH} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />

      <Field label="Email">
        <input
          type="email"
          name="email"
          autoComplete="username"
          autoFocus
          required
          className={controlClass}
          placeholder="onoma@melas.gr"
        />
      </Field>

      <Field label="Κωδικός πρόσβασης">
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={controlClass}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="mt-1 w-full">
        Σύνδεση
      </Button>
    </form>
  );
}
