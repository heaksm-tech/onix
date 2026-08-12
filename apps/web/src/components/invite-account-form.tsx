'use client';

import { type FormEvent, useState } from 'react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field, controlClass } from '@/components/field';
import { ApiError, apiFetch } from '@/lib/api';
import { INVITABLE_ROLES, ROLE_LABELS, type InvitableRole } from '@/lib/session';

type Values = { email: string; role: InvitableRole | '' };
type FieldErrors = Partial<Record<keyof Values, string>>;

const EMPTY_VALUES: Values = { email: '', role: '' };

export function InviteAccountForm() {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setError(undefined);
    setSentTo(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSentTo(undefined);

    if (!values.role) {
      setFieldErrors({ role: 'Επιλέξτε ρόλο για τον νέο λογαριασμό.' });
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiFetch<{ invitation: { email: string } }>('/account-invitations', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setValues(EMPTY_VALUES);
      setFieldErrors({});
      setSentTo(response.invitation.email);
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'ACCOUNT_EXISTS') {
        setFieldErrors({ email: caught.message });
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Δεν ήταν δυνατή η αποστολή της πρόσκλησης.',
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
          <h2 className="text-sm font-semibold">Στοιχεία λογαριασμού</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Ο παραλήπτης θα ορίσει τον κωδικό πρόσβασής του από σύνδεσμο μίας χρήσης.
          </p>
        </div>
        <div className="space-y-4">
          <Field label="Email" error={fieldErrors.email}>
            <input
              required
              type="email"
              autoComplete="email"
              autoFocus
              value={values.email}
              onChange={(event) => update('email', event.target.value)}
              aria-invalid={Boolean(fieldErrors.email)}
              className={controlClass}
              placeholder="onoma@melas.gr"
            />
          </Field>
          <Field label="Ρόλος" error={fieldErrors.role}>
            <select
              required
              value={values.role}
              onChange={(event) => update('role', event.target.value as InvitableRole | '')}
              aria-invalid={Boolean(fieldErrors.role)}
              className={controlClass}
            >
              <option value="">Επιλέξτε ρόλο</option>
              {INVITABLE_ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}
      {sentTo ? (
        <p role="status" className="text-sm text-positive">
          Η πρόσκληση στάλθηκε στο {sentTo}.
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Αποστολή…' : 'Αποστολή πρόσκλησης'}
        </Button>
      </div>
    </form>
  );
}
