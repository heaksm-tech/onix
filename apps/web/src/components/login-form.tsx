import { Button } from '@/components/button';
import { Field, controlClass } from '@/components/field';
import { LOGIN_ACTION_PATH } from '@/lib/session';

/** Native form submission keeps credential handling simple and server-side. */
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
