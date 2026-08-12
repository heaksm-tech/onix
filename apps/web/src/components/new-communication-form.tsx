'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import {
  CommunicationDetailsFields,
  EMPTY_DETAILS,
  detailsPayload,
  type CommunicationDetailsValues,
  type CommunicationUser,
} from '@/components/communications/details-fields';
import { ApiError, apiFetch } from '@/lib/api';
import { Button } from './button';
import { Card } from './card';
import { Field, controlClass } from './field';

type Company = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

/** The shared communication fields, plus the company this form can also create. */
type FormValues = CommunicationDetailsValues & {
  companyId: string;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
};

const emptyValues: FormValues = {
  ...EMPTY_DETAILS,
  companyId: '',
  companyName: '',
  companyEmail: '',
  companyPhone: '',
};

export function NewCommunicationForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<CommunicationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void Promise.all([
      apiFetch<{ companies: Company[] }>('/companies'),
      apiFetch<{ users: CommunicationUser[] }>('/users'),
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

    if (!values.userId) {
      setError('Επιλέξτε τον χρήστη που καταγράφει την επικοινωνία.');
      return;
    }
    if (mode === 'existing' && !values.companyId) {
      setError('Επιλέξτε εταιρεία.');
      return;
    }
    if (mode === 'new' && !values.companyName.trim()) {
      setError('Συμπληρώστε την επωνυμία της νέας εταιρείας.');
      return;
    }
    if (mode === 'new' && !values.companyPhone.trim()) {
      setError('Συμπληρώστε το τηλέφωνο της νέας εταιρείας.');
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch('/communications', {
        method: 'POST',
        body: JSON.stringify({
          ...detailsPayload(values),
          ...(mode === 'existing'
            ? { companyId: values.companyId }
            : {
                company: {
                  name: values.companyName,
                  email: values.companyEmail || undefined,
                  phone: values.companyPhone,
                },
              }),
        }),
      });
      // The list is the confirmation: it opens on the record that was just
      // saved, sitting at the top. `refresh` is what makes the server-rendered
      // page re-read — without it the navigation could land on a cached copy
      // that predates the record.
      router.push('/companies/communications');
      router.refresh();
      // `submitting` deliberately stays true: the button holds its disabled,
      // "Αποθήκευση…" state until the new page takes over, so nothing can be
      // submitted twice while the navigation is in flight.
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : 'Δεν ήταν δυνατή η αποθήκευση της επικοινωνίας.',
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-4">
      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Εταιρεία</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Δημιουργήστε νέα εταιρεία ή επιλέξτε υπάρχουσα.
          </p>
        </div>
        <div className="mb-5 flex gap-4 border-b border-line">
          <label className="flex items-center gap-2 pb-3 text-sm text-ink">
            <input
              type="radio"
              name="company-mode"
              checked={mode === 'new'}
              onChange={() => setMode('new')}
            />
            Νέα εταιρεία
          </label>
          <label className="flex items-center gap-2 pb-3 text-sm text-ink">
            <input
              type="radio"
              name="company-mode"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
            />
            Υπάρχουσα εταιρεία
          </label>
        </div>
        {mode === 'new' ? (
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
                required
                value={values.companyPhone}
                onChange={(event) => update('companyPhone', event.target.value)}
                className={controlClass}
              />
            </Field>
          </div>
        ) : (
          <Field label="Εταιρεία">
            <select
              required
              disabled={loading}
              value={values.companyId}
              onChange={(event) => update('companyId', event.target.value)}
              className={controlClass}
            >
              <option value="">Επιλέξτε εταιρεία</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </Card>

      <CommunicationDetailsFields
        values={values}
        users={users}
        disabled={loading}
        onChange={update}
      />

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
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || submitting || users.length === 0}>
          {submitting ? 'Αποθήκευση…' : 'Καταχώριση επικοινωνίας'}
        </Button>
      </div>
    </form>
  );
}
