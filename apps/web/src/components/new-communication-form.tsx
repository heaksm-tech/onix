'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

import {
  CommunicationDetailsFields,
  EMPTY_DETAILS,
  detailsPayload,
  type CommunicationDetailsValues,
  type CommunicationUser,
} from '@/components/communications/details-fields';
import { ApiError, apiFetch } from '@/lib/api';
import { companyNameKey, companyWithName } from '@/lib/companies';
import { SearchSelect, type SearchSelectOption } from '@/components/search-select';
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

const DUPLICATE_COMPANY = 'Η εταιρεία υπάρχει ήδη. Επιλέξτε την από τις υπάρχουσες εταιρείες.';

export function NewCommunicationForm({ fixedUser }: { fixedUser?: CommunicationUser }) {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(() => ({
    ...emptyValues,
    userId: fixedUser?.id ?? '',
  }));
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<CommunicationUser[]>(() => (fixedUser ? [fixedUser] : []));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  /**
   * A name the API rejected as taken. The list below catches almost every
   * duplicate as it is typed; this covers the one it cannot see — a company
   * added by someone else after this form loaded.
   */
  const [takenName, setTakenName] = useState<string>();

  useEffect(() => {
    void Promise.all([
      apiFetch<{ companies: Company[] }>('/companies'),
      fixedUser
        ? Promise.resolve({ users: [fixedUser] })
        : apiFetch<{ users: CommunicationUser[] }>('/users'),
    ])
      .then(([companyData, userData]) => {
        setCompanies(companyData.companies);
        setUsers(userData.users);
      })
      .catch(() => setError('Δεν ήταν δυνατή η φόρτωση των στοιχείων της φόρμας.'))
      .finally(() => setLoading(false));
  }, [fixedUser]);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const companyOptions = useMemo<SearchSelectOption[]>(
    () => companies.map((company) => ({ value: company.id, label: company.name })),
    [companies],
  );

  // Derived rather than stored, so the message appears and clears with the
  // field itself instead of waiting for a submit to re-check it.
  const typedName = companyNameKey(values.companyName);
  const duplicateCompany =
    mode === 'new' &&
    (Boolean(companyWithName(companies, values.companyName)) || takenName === typedName);

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
    // The message is already under the field, so this only stops the request.
    if (duplicateCompany) return;

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
      // A taken name belongs under the name field, not in the form-wide
      // message: it is that one input the user has to change.
      if (caught instanceof ApiError && caught.status === 409) {
        setTakenName(typedName);
      } else {
        setError(
          caught instanceof ApiError
            ? caught.message
            : 'Δεν ήταν δυνατή η αποθήκευση της επικοινωνίας.',
        );
      }
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
              <Field label="Επωνυμία" error={duplicateCompany ? DUPLICATE_COMPANY : undefined}>
                <input
                  required
                  aria-invalid={duplicateCompany}
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
            <SearchSelect
              options={companyOptions}
              value={values.companyId}
              onChange={(id) => update('companyId', id)}
              disabled={loading}
              placeholder={loading ? 'Φόρτωση εταιρειών…' : 'Επιλέξτε εταιρεία'}
              searchPlaceholder="Αναζήτηση εταιρείας…"
              searchLabel="Αναζήτηση εταιρείας"
              emptyLabel="Δεν βρέθηκε εταιρεία."
            />
          </Field>
        )}
      </Card>

      <CommunicationDetailsFields
        values={values}
        users={users}
        fixedUser={fixedUser}
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
        <Button
          type="submit"
          disabled={loading || submitting || users.length === 0 || duplicateCompany}
        >
          {submitting ? 'Αποθήκευση…' : 'Καταχώριση επικοινωνίας'}
        </Button>
      </div>
    </form>
  );
}
