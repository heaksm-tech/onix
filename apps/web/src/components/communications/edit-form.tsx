'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useState } from 'react';

import { Button, buttonClass } from '@/components/button';
import { Card } from '@/components/card';
import {
  CommunicationDetailsFields,
  detailsPayload,
  type CommunicationDetailsValues,
  type CommunicationUser,
} from '@/components/communications/details-fields';
import { Field, controlClass } from '@/components/field';
import { ApiError, apiFetch } from '@/lib/api';
import { toDateTimeLocal, type CommunicationDetail } from '@/lib/communications';

type CompanyOption = { id: string; name: string };

/** The shared communication fields, plus the company the record belongs to. */
type FormValues = CommunicationDetailsValues & { companyId: string };

/**
 * The stored record as control values.
 *
 * Every NULL becomes an empty control, which `detailsPayload` turns back into
 * a NULL on save — so clearing a field here really does clear it there.
 */
function initialValues(communication: CommunicationDetail): FormValues {
  return {
    companyId: communication.companyId,
    userId: communication.userId,
    outcome: communication.outcome ?? '',
    contactName: communication.contactName ?? '',
    contactRole: communication.contactRole ?? '',
    interestLevel: communication.interestLevel === null ? '' : String(communication.interestLevel),
    nextAction: communication.nextAction ?? '',
    nextActionAt: communication.nextActionAt ? toDateTimeLocal(communication.nextActionAt) : '',
    notes: communication.notes ?? '',
  };
}

export function EditCommunicationForm({ communication }: { communication: CommunicationDetail }) {
  const router = useRouter();
  const detailHref = `/companies/communications/${communication.id}` as const;

  const [values, setValues] = useState<FormValues>(() => initialValues(communication));
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [users, setUsers] = useState<CommunicationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void Promise.all([
      apiFetch<{ companies: CompanyOption[] }>('/companies'),
      apiFetch<{ users: CommunicationUser[] }>('/users'),
    ])
      .then(([companyData, userData]) => {
        setCompanies(companyData.companies);
        setUsers(userData.users);
      })
      .catch(() => setError('Δεν ήταν δυνατή η φόρτωση των στοιχείων της φόρμας.'))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // Until the list arrives — and if the selected company is no longer on it —
  // the record's own company is still offered, so opening the form and saving
  // it cannot silently move the communication somewhere else.
  const companyOptions = companies.some((company) => company.id === values.companyId)
    ? companies
    : [{ id: communication.companyId, name: communication.companyName }, ...companies];

  // Same for the user: an account that has since been deactivated stays
  // selectable rather than blanking the field of a record it already owns.
  const userOptions = users.some((user) => user.id === values.userId)
    ? users
    : [{ id: communication.userId, name: communication.userName, email: '—' }, ...users];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    setSaving(true);

    try {
      await apiFetch(`/communications/${communication.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...detailsPayload(values), companyId: values.companyId }),
      });

      router.push(detailHref);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Δεν ήταν δυνατή η αποθήκευση των αλλαγών.',
      );
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-4">
      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Εταιρεία</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Η εταιρεία με την οποία έγινε η επικοινωνία.
          </p>
        </div>
        <Field
          label="Εταιρεία"
          hint="Νέα εταιρεία δημιουργείται μόνο κατά την καταχώριση νέας επικοινωνίας."
        >
          <select
            required
            value={values.companyId}
            onChange={(event) => update('companyId', event.target.value)}
            className={controlClass}
          >
            {companyOptions.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <CommunicationDetailsFields
        values={values}
        users={userOptions}
        disabled={loading}
        onChange={update}
      />

      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Link href={detailHref} className={buttonClass('secondary')}>
          Άκυρο
        </Link>
        <Button type="submit" disabled={saving}>
          {saving ? 'Αποθήκευση…' : 'Αποθήκευση αλλαγών'}
        </Button>
      </div>
    </form>
  );
}
