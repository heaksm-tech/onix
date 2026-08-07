import type { Metadata } from 'next';

import { EmptyState } from '@/components/empty-state';
import { IconActivity } from '@/components/icons';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Νέα επικοινωνία' };

export default function NewCommunicationPage() {
  return (
    <>
      <PageHeader title="Νέα επικοινωνία" description="Καταγραφή επικοινωνίας με πιθανό προμηθευτή." />
      <EmptyState
        icon={IconActivity}
        title="Η φόρμα δεν είναι έτοιμη ακόμη"
        description="Εδώ θα καταγράφονται οι κλήσεις με πιθανούς προμηθευτές."
      />
    </>
  );
}
