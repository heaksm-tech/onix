import type { Metadata, Route } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { buttonClass } from '@/components/button';
import { EditCommunicationForm } from '@/components/communications/edit-form';
import { LoadError } from '@/components/communications/load-error';
import { PageHeader } from '@/components/page-header';
import { loadCommunication } from '@/lib/communication-record';

export const metadata: Metadata = { title: 'Επεξεργασία επικοινωνίας' };

const LIST_HREF: Route = '/companies/communications';

export default async function EditCommunicationPage({
  params,
}: PageProps<'/companies/communications/[id]/edit'>) {
  const { id } = await params;

  return (
    <Suspense key={id} fallback={<EditFallback id={id} />}>
      <EditCommunication id={id} />
    </Suspense>
  );
}

/**
 * The way out of the form, in the header where it is visible on arrival.
 *
 * The record's own page, not history: the form is reached from the detail
 * screen and from the list alike, and a browser-history step would send those
 * two visitors to different places — or out of the app entirely on a page
 * opened directly.
 */
function BackToRecord({ id }: { id: string }) {
  return (
    <Link href={`/companies/communications/${id}`} className={buttonClass('ghost')}>
      Επιστροφή στην επικοινωνία
    </Link>
  );
}

/** Fetches the record, then hands it to the form as its starting values. */
async function EditCommunication({ id }: { id: string }) {
  const communication = await loadCommunication(id);

  if (!communication) {
    return (
      <>
        {/* The record could not be read, so its page is a dead end — back
            here means the list. */}
        <PageHeader
          title="Επεξεργασία επικοινωνίας"
          action={
            <Link href={LIST_HREF} className={buttonClass('ghost')}>
              Όλες οι επικοινωνίες
            </Link>
          }
        />
        <LoadError>Δεν ήταν δυνατή η φόρτωση της επικοινωνίας. Δοκιμάστε ξανά σε λίγο.</LoadError>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Επεξεργασία επικοινωνίας"
        description={`Καταγραφή με ${communication.companyName}.`}
        action={<BackToRecord id={communication.id} />}
      />
      <EditCommunicationForm communication={communication} />
    </>
  );
}

function EditFallback({ id }: { id: string }) {
  return (
    <>
      <PageHeader title="Επεξεργασία επικοινωνίας" action={<BackToRecord id={id} />} />
      <p className="text-sm text-ink-secondary">Φόρτωση επικοινωνίας…</p>
    </>
  );
}
