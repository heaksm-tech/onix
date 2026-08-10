'use client';

import { type FormEvent, type ReactNode, useEffect, useState } from 'react';

import { ApiError, apiFetch } from '@/lib/api';
import { Button } from './button';
import { Card } from './card';

type Company = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};
type User = { id: string; name: string; email: string };

type FormValues = {
  userId: string;
  companyId: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  contactName: string;
  contactRole: string;
  outcome: string;
  interestLevel: string;
  notes: string;
  nextAction: string;
  nextActionAt: string;
};

const emptyValues: FormValues = {
  userId: '',
  companyId: '',
  companyName: '',
  companyEmail: '',
  companyPhone: '',
  contactName: '',
  contactRole: '',
  outcome: '',
  interestLevel: '',
  notes: '',
  nextAction: '',
  nextActionAt: '',
};

const controlClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-card outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'mb-1.5 block text-sm font-medium text-ink';

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}

export function NewCommunicationForm() {
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();

  useEffect(() => {
    void Promise.all([
      apiFetch<{ companies: Company[] }>('/companies'),
      apiFetch<{ users: User[] }>('/users'),
    ])
      .then(([companyData, userData]) => {
        setCompanies(companyData.companies);
        setUsers(userData.users);
      })
      .catch(() => setError('Δεν ήταν δυνατή η φόρτωση των στοιχείων της φόρμας.'))
      .finally(() => setLoading(false));
  }, []);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSuccess(undefined);

    if (!values.userId) {
      setError('Επιλέξτε τον χρήστη που καταγράφει την επικοινωνία.');
      return;
    }
    if (mode === 'existing' && !values.companyId) {
      setError('Επιλέξτε προμηθευτή.');
      return;
    }
    if (mode === 'new' && !values.companyName.trim()) {
      setError('Συμπληρώστε την επωνυμία του νέου προμηθευτή.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/communications', {
        method: 'POST',
        body: JSON.stringify({
          userId: values.userId,
          ...(mode === 'existing'
            ? { companyId: values.companyId }
            : {
                company: {
                  name: values.companyName,
                  email: values.companyEmail || undefined,
                  phone: values.companyPhone || undefined,
                },
              }),
          contactName: values.contactName || undefined,
          contactRole: values.contactRole || undefined,
          outcome: values.outcome || undefined,
          interestLevel: values.interestLevel ? Number(values.interestLevel) : undefined,
          notes: values.notes || undefined,
          nextAction: values.nextAction || undefined,
          nextActionAt: values.nextActionAt
            ? new Date(values.nextActionAt).toISOString()
            : undefined,
        }),
      });
      setValues((current) => ({ ...emptyValues, userId: current.userId }));
      setMode('existing');
      setSuccess('Η επικοινωνία καταγράφηκε.');
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Δεν ήταν δυνατή η αποθήκευση της επικοινωνίας.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-4">
      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Προμηθευτής</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Επιλέξτε υπάρχοντα προμηθευτή ή δημιουργήστε νέο.
          </p>
        </div>
        <div className="mb-5 flex gap-4 border-b border-line">
          <label className="flex items-center gap-2 pb-3 text-sm text-ink">
            <input
              type="radio"
              name="company-mode"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
            />
            Υπάρχων προμηθευτής
          </label>
          <label className="flex items-center gap-2 pb-3 text-sm text-ink">
            <input
              type="radio"
              name="company-mode"
              checked={mode === 'new'}
              onChange={() => setMode('new')}
            />
            Νέος προμηθευτής
          </label>
        </div>
        {mode === 'existing' ? (
          <Field label="Προμηθευτής">
            <select
              required
              disabled={loading}
              value={values.companyId}
              onChange={(event) => update('companyId', event.target.value)}
              className={controlClass}
            >
              <option value="">Επιλέξτε προμηθευτή</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Επωνυμία">
                <input
                  required
                  value={values.companyName}
                  onChange={(event) => update('companyName', event.target.value)}
                  className={controlClass}
                  placeholder="π.χ. ΑΒΓ ΕΠΕ"
                />
              </Field>
            </div>
            <Field label="Email">
              <input
                type="email"
                value={values.companyEmail}
                onChange={(event) => update('companyEmail', event.target.value)}
                className={controlClass}
              />
            </Field>
            <Field label="Τηλέφωνο">
              <input
                value={values.companyPhone}
                onChange={(event) => update('companyPhone', event.target.value)}
                className={controlClass}
              />
            </Field>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Επικοινωνία</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Καταγράψτε το αποτέλεσμα και την επόμενη ενέργεια.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Καταχώριση από">
            <select
              required
              disabled={loading || users.length === 0}
              value={values.userId}
              onChange={(event) => update('userId', event.target.value)}
              className={controlClass}
            >
              <option value="">Επιλέξτε χρήστη</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} · {user.email}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Αποτέλεσμα">
            <select
              value={values.outcome}
              onChange={(event) => update('outcome', event.target.value)}
              className={controlClass}
            >
              <option value="">Δεν έχει οριστεί</option>
              <option value="no_answer">Δεν απάντησε</option>
              <option value="callback">Επανάκληση</option>
              <option value="interested">Ενδιαφέρεται</option>
              <option value="not_interested">Δεν ενδιαφέρεται</option>
            </select>
          </Field>
          <Field label="Όνομα επαφής">
            <input
              value={values.contactName}
              onChange={(event) => update('contactName', event.target.value)}
              className={controlClass}
            />
          </Field>
          <Field label="Ρόλος επαφής">
            <input
              value={values.contactRole}
              onChange={(event) => update('contactRole', event.target.value)}
              className={controlClass}
            />
          </Field>
          <Field label="Επίπεδο ενδιαφέροντος">
            <select
              value={values.interestLevel}
              onChange={(event) => update('interestLevel', event.target.value)}
              className={controlClass}
            >
              <option value="">Δεν έχει οριστεί</option>
              {[1, 2, 3, 4, 5].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Υπενθύμιση για">
            <input
              type="datetime-local"
              value={values.nextActionAt}
              onChange={(event) => update('nextActionAt', event.target.value)}
              className={controlClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Επόμενη ενέργεια">
              <input
                value={values.nextAction}
                onChange={(event) => update('nextAction', event.target.value)}
                className={controlClass}
                placeholder="π.χ. Αποστολή καταλόγου τιμών"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Σημειώσεις">
              <textarea
                value={values.notes}
                onChange={(event) => update('notes', event.target.value)}
                className={`${controlClass} min-h-28 resize-y`}
              />
            </Field>
          </div>
        </div>
      </Card>

      {users.length === 0 && !loading ? (
        <p role="alert" className="text-sm text-negative">
          Δεν υπάρχει ενεργός χρήστης για την καταχώριση της επικοινωνίας.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}
      {success ? (
        <p role="status" className="text-sm text-positive">
          {success}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || submitting || users.length === 0}>
          {submitting ? 'Αποθήκευση…' : 'Καταχώριση επικοινωνίας'}
        </Button>
      </div>
    </form>
  );
}
