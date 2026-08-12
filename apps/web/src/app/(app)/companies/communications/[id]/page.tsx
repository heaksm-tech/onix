import type { Metadata } from 'next';
import { Suspense } from 'react';

import {
  CommunicationDetailFallback,
  CommunicationDetailView,
} from '@/components/communications/detail';

// Static, because the record's own title is the company name and reading it
// here would mean fetching the record twice.
export const metadata: Metadata = { title: 'Επικοινωνία' };

export default async function CommunicationPage({
  params,
}: PageProps<'/companies/communications/[id]'>) {
  const { id } = await params;

  return (
    <Suspense key={id} fallback={<CommunicationDetailFallback />}>
      <CommunicationDetailView id={id} />
    </Suspense>
  );
}
