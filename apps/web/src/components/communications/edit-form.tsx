'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

import { Button, buttonClass } from '@/components/button';
import { Card } from '@/components/card';
import {
  CommunicationDetailsFields,
  detailsPayload,
  type CommunicationDetailsValues,
  type CommunicationUser,
} from '@/components/communications/details-fields';
import { Field, controlClass } from '@/components/field';
import { SearchSelect, type SearchSelectOption } from '@/components/search-select';
import { ApiError, apiFetch } from '@/lib/api';
import { companyNameKey, companyWithName, type CompanyOption } from '@/lib/companies';
import { toDateTimeLocal, type CommunicationDetail } from '@/lib/communications';

const NAME_TAKEN = 'Υπάρχει ήδη άλλη εταιρεία με αυτή την επωνυμία.';

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
    userId: communication.userId ?? '',
    outcome: communication.outcome ?? '',
    contactName: communication.contactName ?? '',
    contactRole: communication.contactRole ?? '',
    interestLevel: communication.interestLevel === null ? '' : String(communication.interestLevel),
    nextAction: communication.nextAction ?? '',
    nextActionAt: communication.nextActionAt ? toDateTimeLocal(communication.nextActionAt) : '',
    notes: communication.notes ?? '',
  };
}

export function EditCommunicationForm({
  communication,
  fixedUser,
}: {
  communication: CommunicationDetail;
  fixedUser?: CommunicationUser;
}) {
  const router = useRouter();
  const detailHref = `/companies/communications/${communication.id}` as const;

  const [values, setValues] = useState<FormValues>(() => initialValues(communication));
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [users, setUsers] = useState<CommunicationUser[]>(() => (fixedUser ? [fixedUser] : []));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  /**
   * The name being typed, or `undefined` while it is simply the selected
   * company's own. Held that way rather than copied into state on load, so the
   * field follows the select — and the list arriving — without an effect.
   */
  const [nameDraft, setNameDraft] = useState<string>();
  /** A name the API rejected as taken — see the note in the new-communication form. */
  const [takenName, setTakenName] = useState<string>();

  useEffect(() => {
    void Promise.all([
      apiFetch<{ companies: CompanyOption[] }>('/companies'),
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

  function update(key: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  // Until the list arrives — and if the selected company is no longer on it —
  // the record's own company is still offered, so opening the form and saving
  // it cannot silently move the communication somewhere else.
  const companyOptions = useMemo(
    () =>
      companies.some((company) => company.id === values.companyId)
        ? companies
        : [{ id: communication.companyId, name: communication.companyName }, ...companies],
    [companies, values.companyId, communication.companyId, communication.companyName],
  );

  const companySelectOptions = useMemo<SearchSelectOption[]>(
    () => companyOptions.map((company) => ({ value: company.id, label: company.name })),
    [companyOptions],
  );

  // Same for a deactivated user: the existing author stays selectable. A
  // permanently deleted author has no id to preserve, so saving the record
  // requires choosing one of the active accounts instead.
  const userOptions =
    !communication.userId || users.some((user) => user.id === values.userId)
      ? users
      : [{ id: communication.userId, name: communication.userName, email: '—' }, ...users];

  const storedName =
    companyOptions.find((company) => company.id === values.companyId)?.name ??
    communication.companyName;
  const nameValue = nameDraft ?? storedName;
  const nameTaken =
    Boolean(companyWithName(companyOptions, nameValue, values.companyId)) ||
    takenName === companyNameKey(nameValue);
  // A name that is only whitespace, or unchanged, is nothing to save. Case
  // counts as a change: «ΑΒΓ ΕΠΕ» and «Αβγ ΕΠΕ» are the same name to the unique
  // index, and correcting one to the other is a rename worth allowing.
  const nameChanged = nameValue.trim() !== '' && nameValue.trim() !== storedName;

  /**
   * Rename the selected company, as its own request.
   *
   * The name belongs to the company rather than to this record, so it is not
   * part of the communication's payload — but it is part of this form's save,
   * because a name typed into a field and then not saved is a name lost. The
   * hint under the field is what makes the reach of it plain.
   */
  async function renameCompany(name: string) {
    const { company } = await apiFetch<{ company: CompanyOption }>(
      `/companies/${values.companyId}`,
      { method: 'PATCH', body: JSON.stringify({ name }) },
    );

    setCompanies((current) =>
      current.map((option) =>
        option.id === company.id ? { ...option, name: company.name } : option,
      ),
    );
    setNameDraft(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(undefined);
    // The message is already under the field, so this only stops the request.
    if (nameTaken) return;

    setSaving(true);

    try {
      // First: a name the API refuses must not leave the communication saved
      // against a company that was supposed to be called something else.
      if (nameChanged) await renameCompany(nameValue.trim());

      await apiFetch(`/communications/${communication.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...detailsPayload(values), companyId: values.companyId }),
      });

      router.push(detailHref);
      // Also what re-reads the name everywhere else it is rendered — the page
      // header here, and every server-rendered view of this company.
      router.refresh();
    } catch (caught) {
      // Only the rename can answer 409, and it belongs under the name field.
      if (caught instanceof ApiError && caught.status === 409) {
        setTakenName(companyNameKey(nameValue));
      } else {
        setError(
          caught instanceof ApiError ? caught.message : 'Δεν ήταν δυνατή η αποθήκευση των αλλαγών.',
        );
      }
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-4xl space-y-4">
      <Card className="p-5">
        <div className="mb-5">
          <h2 className="text-sm font-semibold">Εταιρεία</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Επιλέξτε άλλη εταιρεία ή διορθώστε την επωνυμία της.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Εταιρεία"
            hint="Νέα εταιρεία δημιουργείται μόνο κατά την καταχώριση νέας επικοινωνίας."
          >
            <SearchSelect
              options={companySelectOptions}
              value={values.companyId}
              onChange={(id) => {
                update('companyId', id);
                // The name field belongs to whichever company is selected.
                setNameDraft(undefined);
                setTakenName(undefined);
              }}
              searchPlaceholder="Αναζήτηση εταιρείας…"
              searchLabel="Αναζήτηση εταιρείας"
              emptyLabel="Δεν βρέθηκε εταιρεία."
            />
          </Field>
          <Field
            label="Επωνυμία"
            hint="Η αλλαγή ισχύει για κάθε επικοινωνία της εταιρείας."
            error={nameTaken ? NAME_TAKEN : undefined}
          >
            <input
              required
              aria-invalid={nameTaken}
              disabled={loading}
              value={nameValue}
              onChange={(event) => setNameDraft(event.target.value)}
              className={controlClass}
            />
          </Field>
        </div>
      </Card>

      <CommunicationDetailsFields
        values={values}
        users={userOptions}
        fixedUser={fixedUser}
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
        <Button type="submit" disabled={saving || nameTaken}>
          {saving ? 'Αποθήκευση…' : 'Αποθήκευση αλλαγών'}
        </Button>
      </div>
    </form>
  );
}
