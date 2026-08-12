'use client';

import type { Route } from 'next';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

import { Field } from '@/components/field';
import { SearchSelect, type SearchSelectOption } from '@/components/search-select';

export function CommunicationAccountFilterControl({
  options,
  value,
}: {
  options: SearchSelectOption[];
  value: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(userId: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (userId) next.set('userId', userId);
    else next.delete('userId');

    // A different author can have fewer pages. Always begin their result set
    // at the top rather than leaving the reader on an empty old page number.
    next.delete('page');
    const query = next.toString();
    const href = `${pathname}${query ? `?${query}` : ''}` as Route;
    startTransition(() => router.replace(href));
  }

  return (
    <Field label="Υπάλληλος">
      <SearchSelect
        options={options}
        value={value}
        onChange={select}
        disabled={pending}
        placeholder="Όλοι οι υπάλληλοι"
        searchPlaceholder="Αναζήτηση υπαλλήλου…"
        searchLabel="Αναζήτηση υπαλλήλου"
        emptyLabel="Δεν βρέθηκε υπάλληλος."
      />
    </Field>
  );
}
