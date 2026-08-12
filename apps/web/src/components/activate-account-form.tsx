import { Button } from '@/components/button';
import { Field, controlClass } from '@/components/field';
import { ACTIVATE_ACCOUNT_ACTION_PATH, MIN_PASSWORD_LENGTH } from '@/lib/account-activation';

/** Native account-activation form; validation is repeated by the server. */
export function ActivateAccountForm({ token, error }: { token: string; error?: string }) {
  if (!token) {
    return (
      <p role="alert" className="text-sm text-negative">
        {error}
      </p>
    );
  }

  return (
    <form method="post" action={ACTIVATE_ACCOUNT_ACTION_PATH} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />

      <Field label="Νέος κωδικός" hint={`Τουλάχιστον ${MIN_PASSWORD_LENGTH} χαρακτήρες.`}>
        <input
          required
          type="password"
          name="password"
          autoComplete="new-password"
          autoFocus
          minLength={MIN_PASSWORD_LENGTH}
          className={controlClass}
        />
      </Field>

      <Field label="Επανάληψη νέου κωδικού">
        <input
          required
          type="password"
          name="confirmation"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          className={controlClass}
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="mt-1 w-full">
        Ενεργοποίηση λογαριασμού
      </Button>
    </form>
  );
}
