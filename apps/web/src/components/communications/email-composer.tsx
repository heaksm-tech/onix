'use client';

import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Field, controlClass } from '@/components/field';
import { IconClock, IconClose, IconMail } from '@/components/icons';
import { formatDateTime, fromDateTimeLocal, toDateTimeLocal } from '@/lib/communications';

export type ScheduledEmailValues = {
  subject: string;
  body: string;
  scheduledFor: string;
};

export const EMPTY_SCHEDULED_EMAIL: ScheduledEmailValues = {
  subject: '',
  body: '',
  scheduledFor: '',
};

export function scheduledEmailPayload(values: ScheduledEmailValues) {
  if (!isComplete(values)) return undefined;
  return {
    subject: values.subject.trim(),
    body: values.body,
    scheduledFor: fromDateTimeLocal(values.scheduledFor),
  };
}

function isComplete(values: ScheduledEmailValues): boolean {
  return Boolean(values.subject.trim() && values.body.trim() && values.scheduledFor);
}

/**
 * Summary card plus the full writing surface. The parent owns only a committed
 * draft; closing the popup with Άκυρο discards the modal's working copy.
 */
export function EmailComposer({
  recipientEmail,
  companyName,
  values,
  onChange,
}: {
  recipientEmail: string;
  companyName: string;
  values: ScheduledEmailValues;
  onChange: (values: ScheduledEmailValues) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const subjectInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(values);
  const [submitted, setSubmitted] = useState(false);
  const [minimumSendAt, setMinimumSendAt] = useState<string>();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      subjectInput.current?.focus();
    }
    if (!open && element.open) element.close();
  }, [open]);

  useEffect(() => {
    const updateMinimum = () =>
      setMinimumSendAt(toDateTimeLocal(new Date(Date.now() + 60_000).toISOString()));

    updateMinimum();
    const timer = window.setInterval(updateMinimum, 15_000);
    return () => window.clearInterval(timer);
  }, []);

  const configured = isComplete(values);
  const subjectError = submitted && !draft.subject.trim() ? 'Συμπληρώστε το θέμα.' : undefined;
  const bodyError = submitted && !draft.body.trim() ? 'Συμπληρώστε το κείμενο.' : undefined;
  const sendAtIsPast = Boolean(
    draft.scheduledFor && minimumSendAt && draft.scheduledFor < minimumSendAt,
  );
  const sendAtError =
    (submitted && !draft.scheduledFor) || sendAtIsPast
      ? draft.scheduledFor
        ? 'Η αποστολή πρέπει να είναι στο μέλλον.'
        : 'Επιλέξτε ημερομηνία και ώρα αποστολής.'
      : undefined;

  function showComposer() {
    setDraft(values);
    setSubmitted(false);
    setOpen(true);
  }

  function keepDraft() {
    setSubmitted(true);
    if (!isComplete(draft) || sendAtIsPast) return;
    onChange({ ...draft, subject: draft.subject.trim() });
    setOpen(false);
  }

  return (
    <>
      <Card className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <IconMail className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Προγραμματισμένο email</h2>
              {configured ? (
                <>
                  <p className="mt-1 truncate text-sm text-ink-secondary">{values.subject}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-faint">
                    <IconClock className="size-3.5" />
                    <span className="tabular-nums">
                      {formatDateTime(fromDateTimeLocal(values.scheduledFor))}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="truncate">{recipientEmail}</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-ink-secondary">
                  Συντάξτε μήνυμα προς {companyName || recipientEmail} και ορίστε την αποστολή του.
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-2">
            {configured ? (
              <Button variant="ghost" onClick={() => onChange(EMPTY_SCHEDULED_EMAIL)}>
                Αφαίρεση
              </Button>
            ) : null}
            <Button variant="secondary" onClick={showComposer}>
              {configured ? 'Επεξεργασία email' : 'Σύνταξη email'}
            </Button>
          </div>
        </div>
      </Card>

      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
        onClick={(event) => {
          if (event.target === dialog.current) setOpen(false);
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(60rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface p-0 text-ink shadow-modal"
      >
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                <IconMail className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 id={titleId} className="text-base font-semibold tracking-tight">
                  Σύνταξη προγραμματισμένου email
                </h2>
                <p id={descriptionId} className="mt-1 truncate text-sm text-ink-secondary">
                  Προς {recipientEmail}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="size-10 px-0"
              aria-label="Κλείσιμο σύνταξης email"
              onClick={() => setOpen(false)}
            >
              <IconClose className="size-5" />
            </Button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto bg-canvas p-4 sm:p-5">
            <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
              <div className="grid border-b border-line sm:grid-cols-[6rem_1fr] sm:items-center">
                <span className="px-4 pt-3 text-xs font-medium text-ink-faint sm:py-3">Προς</span>
                <p className="truncate px-4 pb-3 text-sm text-ink sm:py-3 sm:pl-0">
                  {recipientEmail}
                </p>
              </div>
              <div className="grid border-b border-line sm:grid-cols-[6rem_1fr] sm:items-start">
                <label
                  htmlFor={`${titleId}-subject`}
                  className="px-4 pt-3 text-xs font-medium text-ink-faint sm:py-3"
                >
                  Θέμα
                </label>
                <div className="px-4 pb-3 sm:py-2 sm:pl-0">
                  <input
                    ref={subjectInput}
                    id={`${titleId}-subject`}
                    maxLength={255}
                    aria-invalid={Boolean(subjectError)}
                    value={draft.subject}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, subject: event.target.value }))
                    }
                    className="w-full bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink-faint"
                    placeholder="Θέμα email"
                  />
                  {subjectError ? (
                    <p role="alert" className="mt-1 text-xs text-negative">
                      {subjectError}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="p-4">
                <Field label="Κείμενο email" error={bodyError}>
                  <textarea
                    maxLength={50_000}
                    aria-invalid={Boolean(bodyError)}
                    value={draft.body}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, body: event.target.value }))
                    }
                    className={`${controlClass} min-h-72 resize-y shadow-none`}
                    placeholder="Γράψτε το μήνυμά σας…"
                  />
                </Field>
                <p className="mt-2 text-right text-xs tabular-nums text-ink-faint">
                  {draft.body.length.toLocaleString('el-GR')} χαρακτήρες
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-line bg-surface p-4 shadow-card">
              <Field label="Ημερομηνία και ώρα αποστολής" error={sendAtError}>
                <input
                  type="datetime-local"
                  min={minimumSendAt}
                  aria-invalid={Boolean(sendAtError)}
                  value={draft.scheduledFor}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, scheduledFor: event.target.value }))
                  }
                  className={controlClass}
                />
              </Field>
            </div>
          </div>

          <footer className="flex justify-end gap-2 border-t border-line px-5 py-4">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Άκυρο
            </Button>
            <Button onClick={keepDraft}>Προσθήκη στην επικοινωνία</Button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
