import Link from 'next/link';

import { buttonClass } from '@/components/button';
import { Card } from '@/components/card';
import { DeleteCommunication } from '@/components/communications/delete-button';
import { EmptyState } from '@/components/empty-state';
import { IconActivity } from '@/components/icons';
import { LoadError } from '@/components/load-error';
import { cn } from '@/lib/cn';
import {
  formatDateTime,
  interestLabel,
  outcomeLabel,
  outcomeTone,
  type CommunicationListItem,
  type CommunicationsPage,
} from '@/lib/communications';
import { apiFetchAsUser } from '@/lib/server-api';

/**
 * Every logged communication, newest first.
 *
 * One row is a link to the full record plus the two actions the list itself
 * can take on it; the row's own text answers "who, with whom, how did it go"
 * so the reader rarely has to open anything.
 */
export async function CommunicationsList({ page, userId }: { page: number; userId?: string }) {
  let result: CommunicationsPage;

  try {
    const query = new URLSearchParams({ page: String(page) });
    if (userId) query.set('userId', userId);
    result = await apiFetchAsUser<CommunicationsPage>(`/communications?${query}`);
  } catch {
    return (
      <LoadError>Δεν ήταν δυνατή η φόρτωση των επικοινωνιών. Δοκιμάστε ξανά σε λίγο.</LoadError>
    );
  }

  const { items, total, pageSize } = result;

  if (total === 0) {
    return (
      <EmptyState
        icon={IconActivity}
        title="Δεν υπάρχουν ακόμη επικοινωνίες"
        description="Μόλις καταγραφεί η πρώτη επικοινωνία με εταιρεία, θα εμφανίζεται εδώ με το αποτέλεσμα και την επόμενη ενέργειά της."
      />
    );
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <Card>
        {items.length === 0 ? (
          <p className="p-5 text-sm text-ink-secondary">
            Η σελίδα αυτή δεν έχει καταχωρίσεις. Επιστρέψτε στην πρώτη σελίδα.
          </p>
        ) : (
          <ul>
            {items.map((item) => (
              <CommunicationRow key={item.id} item={item} />
            ))}
          </ul>
        )}
      </Card>

      <Pager page={page} pages={pages} total={total} userId={userId} />
    </div>
  );
}

function CommunicationRow({ item }: { item: CommunicationListItem }) {
  const href = `/companies/communications/${item.id}` as const;

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4 last:border-0">
      <div className="min-w-0 flex-1">
        <Link
          href={href}
          className="rounded-md text-sm font-medium outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          {item.companyName}
        </Link>
        <p className="mt-0.5 truncate text-xs text-ink-secondary">
          {[item.contactName ?? 'Χωρίς επαφή', item.userName].join(' · ')}
        </p>
        {item.nextActionAt ? (
          <p className="mt-1 text-xs tabular-nums text-ink-faint">
            {item.nextAction ?? 'Επόμενη ενέργεια'} · {formatDateTime(item.nextActionAt)}
            {item.overdue ? <span className="text-negative"> · Εκπρόθεσμη</span> : null}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center self-center justify-end gap-x-4 gap-y-2">
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs text-ink-secondary">
            <span aria-hidden className={cn('size-1.5 rounded-full', outcomeTone(item.outcome))} />
            {outcomeLabel(item.outcome)}
            {item.interestLevel !== null ? (
              <span className="tabular-nums text-ink-faint">
                · {interestLabel(item.interestLevel)}
              </span>
            ) : null}
          </p>
          <p className="text-xs tabular-nums text-ink-faint">{formatDateTime(item.createdAt)}</p>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href={href}
            className={buttonClass('ghost', 'sm')}
            aria-label={`Προβολή επικοινωνίας με ${item.companyName}`}
          >
            Προβολή
          </Link>
          <Link
            href={`${href}/edit`}
            className={buttonClass('ghost', 'sm')}
            aria-label={`Επεξεργασία επικοινωνίας με ${item.companyName}`}
          >
            Επεξεργασία
          </Link>
          <DeleteCommunication id={item.id} companyName={item.companyName} />
        </div>
      </div>
    </li>
  );
}

/** Page N of M, with the two moves that make sense from it. */
function Pager({
  page,
  pages,
  total,
  userId,
}: {
  page: number;
  pages: number;
  total: number;
  userId?: string;
}) {
  if (pages === 1) return null;

  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Σελίδες επικοινωνιών">
      <p className="text-xs tabular-nums text-ink-faint">
        Σελίδα {page} από {pages} · {total} επικοινωνίες
      </p>
      <div className="flex items-center gap-2">
        <PagerLink page={page - 1} available={page > 1} userId={userId}>
          Προηγούμενη
        </PagerLink>
        <PagerLink page={page + 1} available={page < pages} userId={userId}>
          Επόμενη
        </PagerLink>
      </div>
    </nav>
  );
}

function PagerLink({
  page,
  available,
  children,
  userId,
}: {
  page: number;
  available: boolean;
  children: string;
  userId?: string;
}) {
  // The unavailable end of the range keeps its place rather than disappearing,
  // so the pair of controls does not shift as you page through.
  if (!available) {
    return (
      <span aria-hidden className={buttonClass('secondary', 'sm', 'opacity-40')}>
        {children}
      </span>
    );
  }

  const query = new URLSearchParams({ page: String(page) });
  if (userId) query.set('userId', userId);

  return (
    <Link href={`/companies/communications?${query}`} className={buttonClass('secondary', 'sm')}>
      {children}
    </Link>
  );
}

/** Quiet stand-in while the page of records is being fetched. */
export function CommunicationsListFallback() {
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-secondary">Φόρτωση επικοινωνιών…</p>
    </Card>
  );
}
