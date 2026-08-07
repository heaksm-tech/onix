import { EmptyState } from '@/components/empty-state';
import { IconDashboard } from '@/components/icons';
import { PageHeader } from '@/components/page-header';

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Συνολική εικόνα εταιρειών, επικοινωνιών και εκκρεμοτήτων."
      />
      <EmptyState
        icon={IconDashboard}
        title="Εδώ θα εμφανίζονται οι αναφορές"
        description="Όταν οι ενότητες αποκτήσουν δεδομένα, αυτή η σελίδα θα συνοψίζει τη δραστηριότητα και τις εκκρεμότητες με μια ματιά."
      />
    </>
  );
}
