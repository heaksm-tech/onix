import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { buttonClass } from '@/components/button';
import {
  CommunicationAccountFilter,
  CommunicationAccountFilterFallback,
} from '@/components/communications/account-filter';
import { CommunicationsList, CommunicationsListFallback } from '@/components/communications/list';
import { CommunicationsSearch } from '@/components/communications/search';
import { PageHeader } from '@/components/page-header';
import { getCurrentUser } from '@/lib/auth';
import { communicationSearch, communicationUserFilter } from '@/lib/communications';
import { canViewAllCommunications } from '@/lib/session';

export const metadata: Metadata = { title: 'Επικοινωνίες' };

/** A page number straight from the URL, where it can be anything at all. */
function readPage(value: string | string[] | undefined): number {
  const first = Array.isArray(value) ? value[0] : value;
  const page = Number(first);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export default async function CommunicationsPage({
  searchParams,
}: PageProps<'/companies/communications'>) {
  const query = await searchParams;
  const page = readPage(query.page);
  const user = await getCurrentUser();
  const sharedView = user ? canViewAllCommunications(user.role) : false;
  const userId = sharedView ? communicationUserFilter(query.userId) : undefined;
  const search = communicationSearch(query.q);

  return (
    <>
      <PageHeader
        title={sharedView ? 'Όλες οι επικοινωνίες' : 'Οι επικοινωνίες μου'}
        description={
          sharedView
            ? 'Όλες οι καταγεγραμμένες επικοινωνίες με εταιρείες, από την πιο πρόσφατη.'
            : 'Οι επικοινωνίες που έχετε καταγράψει, από την πιο πρόσφατη.'
        }
        action={
          <Link href="/companies/new-communication" className={buttonClass('primary')}>
            Νέα επικοινωνία
          </Link>
        }
      />
      {sharedView ? (
        <Suspense fallback={<CommunicationAccountFilterFallback />}>
          <CommunicationAccountFilter userId={userId} />
        </Suspense>
      ) : null}
      <CommunicationsSearch search={search} userId={userId} />
      {/* Keyed by the result set, so changing a filter shows the fallback instead of stale rows. */}
      <Suspense
        key={`${page}:${userId ?? 'all'}:${search ?? ''}`}
        fallback={<CommunicationsListFallback />}
      >
        <CommunicationsList page={page} userId={userId} search={search} />
      </Suspense>
    </>
  );
}
