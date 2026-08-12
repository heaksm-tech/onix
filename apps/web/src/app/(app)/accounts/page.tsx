import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { AccountsList, AccountsListFallback } from '@/components/accounts/list';
import { buttonClass } from '@/components/button';
import { PageHeader } from '@/components/page-header';
import { getCurrentUser } from '@/lib/auth';
import { canManageAccounts } from '@/lib/session';

export const metadata: Metadata = { title: 'Λογαριασμοί' };

function readPage(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value;
  const page = Number(first);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function AccountsPage({ searchParams }: PageProps<'/accounts'>) {
  const user = await getCurrentUser();
  if (!user || !canManageAccounts(user.role)) notFound();

  const page = readPage((await searchParams).page);

  return (
    <>
      <PageHeader
        title="Λογαριασμοί"
        description="Διαχειριστείτε την πρόσβαση των χρηστών στο Onix CRM."
        action={
          <Link href="/accounts/new" className={buttonClass('primary')}>
            Νέος λογαριασμός
          </Link>
        }
      />
      <Suspense key={page} fallback={<AccountsListFallback />}>
        <AccountsList page={page} viewer={{ id: user.id, role: user.role }} />
      </Suspense>
    </>
  );
}
