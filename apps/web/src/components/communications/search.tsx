import Form from 'next/form';
import Link from 'next/link';

import { buttonClass } from '@/components/button';
import { Card } from '@/components/card';
import { controlClass } from '@/components/field';
import { IconSearch } from '@/components/icons';
import { cn } from '@/lib/cn';

/** URL-backed search for the server-paged communication list. */
export function CommunicationsSearch({ search, userId }: { search?: string; userId?: string }) {
  return (
    <Card className="mb-4 p-4">
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)]">
        <div className="self-center">
          <h2 className="text-sm font-semibold">Αναζήτηση επικοινωνιών</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Βρείτε εγγραφές από εταιρεία, επαφή, σημειώσεις ή επόμενη ενέργεια.
          </p>
        </div>

        <Form action="/companies/communications" className="flex min-w-0 flex-wrap gap-2">
          {userId ? <input type="hidden" name="userId" value={userId} /> : null}
          <label className="relative min-w-48 flex-1">
            <span className="sr-only">Αναζήτηση στις επικοινωνίες</span>
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              id="communication-search"
              type="search"
              name="q"
              defaultValue={search}
              maxLength={200}
              placeholder="Εταιρεία, επαφή ή σημειώσεις…"
              className={cn(controlClass, 'h-9 py-0 pr-3 pl-9')}
            />
          </label>
          <button type="submit" className={buttonClass('primary')}>
            Αναζήτηση
          </button>
          {search ? (
            <Link
              href={
                userId ? `/companies/communications?userId=${userId}` : '/companies/communications'
              }
              className={buttonClass('secondary')}
            >
              Καθαρισμός
            </Link>
          ) : null}
        </Form>
      </div>
    </Card>
  );
}
