import type { Metadata } from 'next';

import { NewCommunicationForm } from '@/components/new-communication-form';
import { PageHeader } from '@/components/page-header';
import { getCurrentUser } from '@/lib/auth';
import { canViewAllCommunications } from '@/lib/session';

export const metadata: Metadata = { title: 'Νέα επικοινωνία' };

export default async function NewCommunicationPage() {
  const user = await getCurrentUser();
  const fixedUser = user && !canViewAllCommunications(user.role) ? user : undefined;

  return (
    <>
      <PageHeader
        title="Νέα επικοινωνία"
        description="Καταγραφή επικοινωνίας με εταιρεία για πιθανή συνεργασία."
      />
      <NewCommunicationForm fixedUser={fixedUser} />
    </>
  );
}
