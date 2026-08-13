import Link from 'next/link';
import type { Route } from 'next';
import type { ReactNode } from 'react';

import { buttonClass } from '@/components/button';
import { Card } from '@/components/card';
import { DeleteCommunication } from '@/components/communications/delete-button';
import { IconChevronDown } from '@/components/icons';
import { LoadError } from '@/components/load-error';
import { PageHeader } from '@/components/page-header';
import { cn } from '@/lib/cn';
import { loadCommunication } from '@/lib/communication-record';
import {
  formatDateTime,
  interestLabel,
  outcomeLabel,
  outcomeTone,
  SCHEDULED_EMAIL_STATUS_LABELS,
  SCHEDULED_EMAIL_STATUS_TONES,
  type ScheduledEmailHistoryItem,
} from '@/lib/communications';

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
  const emailHistory = communication.scheduledEmails ?? [];

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

      <Card className="mt-4 overflow-hidden">
        <div className="p-5">
          <h2 className="text-sm font-semibold">Ιστορικό email</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Προγραμματισμένα και ολοκληρωμένα email αυτής της επικοινωνίας.
          </p>
        </div>

        {emailHistory.length > 0 ? (
          <ol className="border-t border-line">
            {emailHistory.map((email) => (
              <li key={email.id} className="border-b border-line last:border-0">
                <details
                  className="group"
                  open={email.status === 'pending' || email.status === 'processing'}
                >
                  <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-4 outline-none hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-1 text-[11px] font-medium',
                          SCHEDULED_EMAIL_STATUS_TONES[email.status],
                        )}
                      >
                        {SCHEDULED_EMAIL_STATUS_LABELS[email.status]}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">
                          {email.subject}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-faint">
                          Προς {email.recipientEmail}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center justify-between gap-3 pl-0 sm:justify-end sm:pl-4">
                      <span className="text-xs tabular-nums text-ink-secondary">
                        {scheduledEmailTiming(email)}
                      </span>
                      <IconChevronDown className="size-4 text-ink-faint transition-transform duration-150 group-open:rotate-180" />
                    </span>
                  </summary>

                  <div className="border-t border-line bg-canvas px-5 py-4">
                    <dl className="grid gap-4 sm:grid-cols-3">
                      <Detail label="Παραλήπτης">{email.recipientEmail}</Detail>
                      <Detail label="Προγραμματισμένη αποστολή">
                        <span className="tabular-nums">{formatDateTime(email.scheduledFor)}</span>
                      </Detail>
                      <Detail label="Κατάσταση">
                        {SCHEDULED_EMAIL_STATUS_LABELS[email.status]}
                      </Detail>
                    </dl>
                    <div className="mt-4 border-t border-line pt-4">
                      <h3 className="text-xs text-ink-faint">Κείμενο email</h3>
                      <p className="mt-2 text-sm whitespace-pre-wrap text-ink-secondary">
                        {email.body}
                      </p>
                    </div>
                  </div>
                </details>
              </li>
            ))}
          </ol>
        ) : (
          <p className="border-t border-line px-5 py-6 text-sm text-ink-faint">
            Δεν έχουν προγραμματιστεί email για αυτή την επικοινωνία.
          </p>
        )}
      </Card>
    </>
  );
}

function scheduledEmailTiming(email: ScheduledEmailHistoryItem): string {
  if (email.status === 'sent') {
    return `Απεστάλη ${formatDateTime(email.sentAt ?? email.updatedAt)}`;
  }
  if (email.status === 'cancelled') {
    return `Ακυρώθηκε ${formatDateTime(email.cancelledAt ?? email.updatedAt)}`;
  }
  if (email.status === 'failed') {
    return `Αποτυχία ${formatDateTime(email.updatedAt)}`;
  }
  if (email.status === 'processing') return 'Αποστολή σε εξέλιξη';
  return `Αποστολή ${formatDateTime(email.scheduledFor)}`;
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
