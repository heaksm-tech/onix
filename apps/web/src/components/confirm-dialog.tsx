'use client';

import { useEffect, useId, useRef } from 'react';

import { Button } from '@/components/button';
import { IconAlert, type IconProps } from '@/components/icons';
import { cn } from '@/lib/cn';
import type { ComponentType } from 'react';

/**
 * The app's confirmation prompt: one question, one consequence, two answers.
 *
 * Built on the native `<dialog>` opened with `showModal()`, which is what
 * supplies the focus trap, the Escape key, the top layer, the inert page
 * behind it and the return of focus to whatever opened it. A hand-built modal
 * would have to reimplement all five, and would get at least one of them
 * wrong. The motion lives in `globals.css`, on the element itself.
 *
 * `open` is owned by the caller — this component never closes itself, so the
 * two can never disagree about whether the question is on screen. While `busy`
 * is true nothing dismisses it: not Escape, not the backdrop, not Άκυρο.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Επιβεβαίωση',
  cancelLabel = 'Άκυρο',
  busyLabel,
  tone = 'accent',
  icon: Icon = IconAlert,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Replaces the confirm label while the action runs («Διαγραφή…»). */
  busyLabel?: string;
  /** `danger` paints the chip and the confirm button negative. */
  tone?: 'accent' | 'danger';
  icon?: ComponentType<IconProps>;
  busy?: boolean;
  /** A failed action stays in the prompt, where the reader still is. */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const danger = tone === 'danger';

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Escape fires `cancel`. It is prevented so the element cannot close
      // itself behind the caller's back: the state goes up, and the effect
      // above brings the dialog down with it.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialog.current && !busy) onCancel();
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-modal"
    >
      <div className="p-5">
        <div className="flex gap-3.5">
          <div
            className={cn(
              'grid size-9 shrink-0 place-items-center rounded-lg',
              danger ? 'bg-negative/10 text-negative' : 'bg-accent-soft text-accent',
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold tracking-tight">
              {title}
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-ink-secondary">
              {description}
            </p>
          </div>
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-negative">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          {/* Focus lands on the way out, not the way in: the safe answer is the
              one a stray Enter should give. */}
          <Button variant="secondary" autoFocus disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? 'destructive' : 'primary'} disabled={busy} onClick={onConfirm}>
            {busy ? (busyLabel ?? confirmLabel) : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
