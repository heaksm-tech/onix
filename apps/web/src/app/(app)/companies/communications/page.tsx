import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { buttonClass } from '@/components/button';
import { CommunicationsList, CommunicationsListFallback } from '@/components/communications/list';
import { PageHeader } from '@/components/page-header';

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
  const page = readPage((await searchParams).page);

  return (
    <>
      <PageHeader
        title="Όλες οι επικοινωνίες"
        description="Όλες οι καταγεγραμμένες επικοινωνίες με εταιρείες, από την πιο πρόσφατη."
        action={
          <Link href="/companies/new-communication" className={buttonClass('primary')}>
            Νέα επικοινωνία
          </Link>
        }
      />
      {/* Keyed by page, so paging shows the fallback instead of the previous page's rows. */}
      <Suspense key={page} fallback={<CommunicationsListFallback />}>
        <CommunicationsList page={page} />
      </Suspense>
    </>
  );
}
