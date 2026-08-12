import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { buttonClass } from '@/components/button';
import { Card } from '@/components/card';
import { DeleteCommunication } from '@/components/communications/delete-button';
import { LoadError } from '@/components/communications/load-error';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/cn';
import { loadCommunication } from '@/lib/communication-record';
import { formatDateTime, interestLabel, outcomeLabel, outcomeTone } from '@/lib/communications';

const LIST_HREF: Route = '/companies/communications';

/**
 * One communication in full: the record, the company it was with, and the two
 * things that can be done to it. Fetches its own data so the page around it
 * never blocks — including the header, whose title is the company's name.
 */
export async function CommunicationDetailView({ id }: { id: string }) {
  const communication = await loadCommunication(id);

  if (!communication) {
    return (
      <>
        <PageHeader title="Επικοινωνία" />
        <LoadError>Δεν ήταν δυνατή η φόρτωση της επικοινωνίας. Δοκιμάστε ξανά σε λίγο.</LoadError>
      </>
    );
  }

  const editHref = `/companies/communications/${communication.id}/edit` as const;

  return (
    <>
      <PageHeader
        title={communication.companyName}
        description={`Καταγραφή ${formatDateTime(communication.createdAt)} από ${communication.userName}.`}
        action={
          <>
            <Link href={LIST_HREF} className={buttonClass('ghost')}>
              Όλες οι επικοινωνίες
            </Link>
            <Link href={editHref} className={buttonClass('secondary')}>
              Επεξεργασία
            </Link>
            <DeleteCommunication
              id={communication.id}
              companyName={communication.companyName}
              redirectTo={LIST_HREF}
              size="md"
            />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Στοιχεία επικοινωνίας</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <Detail label="Αποτέλεσμα">
              <span className="flex items-center gap-1.5">
                <span
                  aria-hidden
                  className={cn('size-1.5 rounded-full', outcomeTone(communication.outcome))}
                />
                {outcomeLabel(communication.outcome)}
              </span>
            </Detail>
            <Detail label="Επίπεδο ενδιαφέροντος">
              <span className="tabular-nums">{interestLabel(communication.interestLevel)}</span>
            </Detail>
            <Detail label="Όνομα επαφής">{communication.contactName ?? '—'}</Detail>
            <Detail label="Ρόλος επαφής">{communication.contactRole ?? '—'}</Detail>
            <Detail label="Καταχώριση από">{communication.userName}</Detail>
            <Detail label="Τελευταία ενημέρωση">
              <span className="tabular-nums">{formatDateTime(communication.updatedAt)}</span>
            </Detail>
          </dl>

          <div className="mt-6 border-t border-line pt-5">
            <h3 className="text-sm font-semibold">Σημειώσεις</h3>
            {communication.notes ? (
              // The notes were typed with their line breaks meaning something.
              <p className="mt-2 text-sm whitespace-pre-line text-ink-secondary">
                {communication.notes}
              </p>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">Δεν έχουν καταγραφεί σημειώσεις.</p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Εταιρεία</h2>
            <dl className="mt-4 space-y-4">
              <Detail label="Επωνυμία">{communication.companyName}</Detail>
              <Detail label="Email">{communication.companyEmail ?? '—'}</Detail>
              <Detail label="Τηλέφωνο">
                <span className="tabular-nums">{communication.companyPhone ?? '—'}</span>
              </Detail>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="text-sm font-semibold">Επόμενη ενέργεια</h2>
            {communication.nextAction || communication.nextActionAt ? (
              <dl className="mt-4 space-y-4">
                <Detail label="Ενέργεια">{communication.nextAction ?? '—'}</Detail>
                <Detail label="Υπενθύμιση">
                  {communication.nextActionAt ? (
                    <>
                      <span className="tabular-nums">
                        {formatDateTime(communication.nextActionAt)}
                      </span>
                      {communication.overdue ? (
                        <span className="text-negative"> · Εκπρόθεσμη</span>
                      ) : null}
                    </>
                  ) : (
                    '—'
                  )}
                </Detail>
              </dl>
            ) : (
              <p className="mt-2 text-sm text-ink-faint">Δεν εκκρεμεί κάποια ενέργεια.</p>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

/** Quiet stand-in while the record is being fetched. */
export function CommunicationDetailFallback() {
  return (
    <>
      <PageHeader title="Επικοινωνία" />
      <Card className="p-5">
        <p className="text-sm text-ink-secondary">Φόρτωση επικοινωνίας…</p>
      </Card>
    </>
  );
}
