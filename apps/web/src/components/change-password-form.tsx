'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field, controlClass } from '@/components/field';
import { ApiError, apiFetch } from '@/lib/api';
import { cn } from '@/lib/cn';

/** Mirrors the API policy; the API remains authoritative for direct callers. */
const MIN_PASSWORD_LENGTH = 12;

type Values = {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
};

const EMPTY_VALUES: Values = { currentPassword: '', newPassword: '', confirmation: '' };

type FieldErrors = Partial<Record<keyof Values, string>>;
type Result = { message: string; tone: 'positive' | 'negative' };

export function ChangePasswordForm() {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<Result>();

  function update(key: keyof Values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError(undefined);
    setResult(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setResult(undefined);

    const nextErrors: FieldErrors = {};
    if (values.newPassword.length < MIN_PASSWORD_LENGTH) {
      nextErrors.newPassword = `Ο νέος κωδικός πρέπει να έχει τουλάχιστον ${MIN_PASSWORD_LENGTH} χαρακτήρες.`;
    }
    if (values.newPassword.normalize('NFKC') !== values.confirmation.normalize('NFKC')) {
      nextErrors.confirmation = 'Οι δύο καταχωρίσεις του νέου κωδικού δεν συμφωνούν.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch<{ notificationSent: boolean }>('/auth/password', {
        method: 'PUT',
        body: JSON.stringify(values),
      });

      setValues(EMPTY_VALUES);
      setFieldErrors({});
      setResult(
        response.notificationSent
          ? {
              message: 'Ο κωδικός άλλαξε και η επιβεβαίωση στάλθηκε με email.',
              tone: 'positive',
            }
          : {
              message: 'Ο κωδικός άλλαξε, αλλά δεν ήταν δυνατή η αποστολή του email.',
              tone: 'negative',
            },
      );
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'CURRENT_PASSWORD_INVALID') {
        setFieldErrors({ currentPassword: caught.message });
      } else if (caught instanceof ApiError && caught.code === 'PASSWORD_UNCHANGED') {
        setFieldErrors({ newPassword: caught.message });
      } else if (caught instanceof ApiError && caught.code === 'PASSWORD_CONFIRMATION_MISMATCH') {
        setFieldErrors({ confirmation: caught.message });
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Δεν ήταν δυνατή η αλλαγή του κωδικού πρόσβασης.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Κωδικός πρόσβασης</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Η αλλαγή αποσυνδέει κάθε άλλη ενεργή συνεδρία του λογαριασμού σας.
          </p>
        </div>
        <div className="space-y-4">
          <Field label="Τρέχων κωδικός" error={fieldErrors.currentPassword}>
            <input
              required
              type="password"
              autoComplete="current-password"
              value={values.currentPassword}
              onChange={(event) => update('currentPassword', event.target.value)}
              aria-invalid={Boolean(fieldErrors.currentPassword)}
              className={controlClass}
            />
          </Field>
          <Field
            label="Νέος κωδικός"
            hint={`Τουλάχιστον ${MIN_PASSWORD_LENGTH} χαρακτήρες.`}
            error={fieldErrors.newPassword}
          >
            <input
              required
              type="password"
              autoComplete="new-password"
              minLength={MIN_PASSWORD_LENGTH}
              value={values.newPassword}
              onChange={(event) => update('newPassword', event.target.value)}
              aria-invalid={Boolean(fieldErrors.newPassword)}
              className={controlClass}
            />
          </Field>
          <Field label="Επανάληψη νέου κωδικού" error={fieldErrors.confirmation}>
            <input
              required
              type="password"
              autoComplete="new-password"
              value={values.confirmation}
              onChange={(event) => update('confirmation', event.target.value)}
              aria-invalid={Boolean(fieldErrors.confirmation)}
              className={controlClass}
            />
          </Field>
        </div>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}
      {result ? (
        <p
          role={result.tone === 'negative' ? 'alert' : 'status'}
          className={cn('text-sm', result.tone === 'positive' ? 'text-positive' : 'text-negative')}
        >
          {result.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Αλλαγή…' : 'Αλλαγή κωδικού'}
        </Button>
      </div>
    </form>
  );
}
