import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { InviteAccountForm } from '@/components/invite-account-form';
import { PageHeader } from '@/components/page-header';
import { getCurrentUser } from '@/lib/auth';
import { canCreateAccounts } from '@/lib/session';

export const metadata: Metadata = { title: 'Νέος λογαριασμός' };

export default async function NewAccountPage() {
  const user = await getCurrentUser();
  if (!user || !canCreateAccounts(user.role)) notFound();

  return (
    <>
      <PageHeader
        title="Νέος λογαριασμός"
        description="Στείλτε πρόσκληση για πρόσβαση στο Onix CRM."
      />
      <InviteAccountForm />
    </>
  );
}
