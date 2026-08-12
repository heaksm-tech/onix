import Link from 'next/link';

import { AccountActions } from '@/components/accounts/account-actions';
import { buttonClass } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { IconContacts } from '@/components/icons';
import { LoadError } from '@/components/load-error';
import { accountStatus, type AccountsPage } from '@/lib/accounts';
import { cn } from '@/lib/cn';
import { apiFetchAsUser } from '@/lib/server-api';
import { ROLE_LABELS, type AuthUser } from '@/lib/session';

export async function AccountsList({
  page,
  viewer,
}: {
  page: number;
  viewer: Pick<AuthUser, 'id' | 'role'>;
}) {
  let result: AccountsPage;

  try {
    result = await apiFetchAsUser<AccountsPage>(`/accounts?page=${page}`);
  } catch {
    return <LoadError>Δεν ήταν δυνατή η φόρτωση των λογαριασμών. Δοκιμάστε ξανά.</LoadError>;
  }

  const { items, total, pageSize } = result;
  if (total === 0) {
    return (
      <EmptyState
        icon={IconContacts}
        title="Δεν υπάρχουν λογαριασμοί"
        description="Δημιουργήστε τον πρώτο λογαριασμό στέλνοντας πρόσκληση μέσω email."
      />
    );
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <Card>
        {items.length === 0 ? (
          <p className="p-5 text-sm text-ink-secondary">
            Η σελίδα αυτή δεν έχει λογαριασμούς. Επιστρέψτε στην πρώτη σελίδα.
          </p>
        ) : (
          <ul>
            {items.map((account) => {
              const status = accountStatus(account);

              return (
                <li
                  key={account.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_9rem_13rem]"
                >
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <p className="truncate text-sm font-medium">{account.name}</p>
                    <p className="mt-0.5 truncate text-xs text-ink-secondary">{account.email}</p>
                  </div>

                  <div>
                    <p className="text-xs text-ink-secondary">{ROLE_LABELS[account.role]}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-faint">
                      <span
                        aria-hidden
                        className={cn('size-1.5 shrink-0 rounded-full', status.tone)}
                      />
                      {status.label}
                    </p>
                  </div>

                  <AccountActions account={account} viewer={viewer} />
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Pager page={page} pages={pages} total={total} />
    </div>
  );
}

function Pager({ page, pages, total }: { page: number; pages: number; total: number }) {
  if (pages === 1) return null;

  return (
    <nav className="flex items-center justify-between gap-4" aria-label="Σελίδες λογαριασμών">
      <p className="text-xs tabular-nums text-ink-faint">
        Σελίδα {page} από {pages} · {total} λογαριασμοί
      </p>
      <div className="flex items-center gap-2">
        <PagerLink page={page - 1} available={page > 1}>
          Προηγούμενη
        </PagerLink>
        <PagerLink page={page + 1} available={page < pages}>
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
}: {
  page: number;
  available: boolean;
  children: string;
}) {
  if (!available) {
    return (
      <span aria-hidden className={buttonClass('secondary', 'sm', 'opacity-40')}>
        {children}
      </span>
    );
  }

  return (
    <Link href={`/accounts?page=${page}`} className={buttonClass('secondary', 'sm')}>
      {children}
    </Link>
  );
}

export function AccountsListFallback() {
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-secondary">Φόρτωση λογαριασμών…</p>
    </Card>
  );
}
