import type { Metadata } from 'next';
import { Suspense } from 'react';

import { EditCommunicationForm } from '@/components/communications/edit-form';
import { LoadError } from '@/components/communications/load-error';
import { PageHeader } from '@/components/page-header';
import { loadCommunication } from '@/lib/communication-record';

export const metadata: Metadata = { title: 'Επεξεργασία επικοινωνίας' };

export default async function EditCommunicationPage({
  params,
}: PageProps<'/companies/communications/[id]/edit'>) {
  const { id } = await params;

  return (
    <Suspense key={id} fallback={<EditFallback />}>
      <EditCommunication id={id} />
    </Suspense>
  );
}

/** Fetches the record, then hands it to the form as its starting values. */
async function EditCommunication({ id }: { id: string }) {
  const communication = await loadCommunication(id);

  if (!communication) {
    return (
      <>
        <PageHeader title="Επεξεργασία επικοινωνίας" />
        <LoadError>Δεν ήταν δυνατή η φόρτωση της επικοινωνίας. Δοκιμάστε ξανά σε λίγο.</LoadError>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Επεξεργασία επικοινωνίας"
        description={`Καταγραφή με ${communication.companyName}.`}
      />
      <EditCommunicationForm communication={communication} />
    </>
  );
}

function EditFallback() {
  return (
    <>
      <PageHeader title="Επεξεργασία επικοινωνίας" />
      <p className="text-sm text-ink-secondary">Φόρτωση επικοινωνίας…</p>
    </>
  );
}
