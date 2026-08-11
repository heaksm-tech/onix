import { Suspense } from 'react';

import {
  CommunicationsReport,
  CommunicationsReportFallback,
} from '@/components/dashboard/communications-report';
import { PageHeader } from '@/components/page-header';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Συνολική εικόνα εταιρειών, επικοινωνιών και εκκρεμοτήτων."
      />
      <Suspense fallback={<CommunicationsReportFallback />}>
        <CommunicationsReport />
      </Suspense>
    </>
  );
}
