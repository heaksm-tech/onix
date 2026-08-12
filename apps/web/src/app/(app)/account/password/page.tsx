import type { Metadata } from 'next';

import { ChangePasswordForm } from '@/components/change-password-form';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Αλλαγή κωδικού πρόσβασης' };

export default function ChangePasswordPage() {
  return (
    <>
      <PageHeader
        title="Αλλαγή κωδικού πρόσβασης"
        description="Ορίστε νέο κωδικό για τον λογαριασμό σας."
      />
      <ChangePasswordForm />
    </>
  );
}
