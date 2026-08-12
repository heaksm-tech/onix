import { Suspense } from 'react';

import {
  CommunicationsReport,
  CommunicationsReportFallback,
} from '@/components/dashboard/communications-report';
import {
  CommunicationAccountFilter,
  CommunicationAccountFilterFallback,
} from '@/components/communications/account-filter';
import { PageHeader } from '@/components/page-header';
import { getCurrentUser } from '@/lib/auth';
import { communicationUserFilter } from '@/lib/communications';
import { canViewAllCommunications } from '@/lib/session';

export default async function DashboardPage({ searchParams }: PageProps<'/'>) {
  const user = await getCurrentUser();
  const sharedView = user ? canViewAllCommunications(user.role) : false;
  const userId = sharedView ? communicationUserFilter((await searchParams).userId) : undefined;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={
          sharedView
            ? 'Συνολική εικόνα εταιρειών, επικοινωνιών και εκκρεμοτήτων.'
            : 'Η εικόνα των επικοινωνιών και των εκκρεμοτήτων σας.'
        }
      />
      {sharedView ? (
        <Suspense fallback={<CommunicationAccountFilterFallback />}>
          <CommunicationAccountFilter userId={userId} />
        </Suspense>
      ) : null}
      <Suspense key={userId ?? 'all'} fallback={<CommunicationsReportFallback />}>
        <CommunicationsReport userId={userId} />
      </Suspense>
    </>
  );
}
