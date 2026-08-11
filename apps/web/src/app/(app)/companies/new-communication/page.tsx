import type { Metadata } from 'next';

import { NewCommunicationForm } from '@/components/new-communication-form';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = { title: 'Νέα επικοινωνία' };

export default function NewCommunicationPage() {
  return (
    <>
      <PageHeader
        title="Νέα επικοινωνία"
        description="Καταγραφή επικοινωνίας με εταιρεία για πιθανή συνεργασία."
      />
      <NewCommunicationForm />
    </>
  );
}
