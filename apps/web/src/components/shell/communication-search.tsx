'use client';

import Form from 'next/form';
import { useEffect, useId, useRef, useState } from 'react';

import { buttonClass } from '@/components/button';
import { controlClass } from '@/components/field';
import { IconClose, IconSearch } from '@/components/icons';
import { cn } from '@/lib/cn';

/** Global entry point into communication-record search, including ⌘K. */
export function CommunicationSearch() {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
      event.preventDefault();
      setOpen(true);
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Αναζήτηση επικοινωνιών"
        onClick={() => setOpen(true)}
        className="grid size-8 min-w-8 place-items-center rounded-lg border border-line bg-surface text-ink-faint shadow-card transition-colors duration-150 outline-none hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent/60 sm:flex sm:w-56 sm:justify-start sm:gap-2 sm:px-2.5"
      >
        <IconSearch className="size-3.5" />
        <span className="hidden sm:inline">Αναζήτηση</span>
        <kbd className="ml-auto hidden rounded border border-line bg-canvas px-1 font-sans text-[10px] font-medium text-ink-faint sm:inline">
          ⌘K
        </kbd>
      </button>

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
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-0 text-ink shadow-modal"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold tracking-tight">
              Αναζήτηση επικοινωνιών
            </h2>
            <p id={descriptionId} className="mt-1 text-sm text-ink-secondary">
              Αναζητήστε σε εταιρεία, επαφή, σημειώσεις ή επόμενη ενέργεια.
            </p>
          </div>
          <button
            type="button"
            aria-label="Κλείσιμο αναζήτησης"
            onClick={() => setOpen(false)}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-secondary outline-none transition-colors hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <IconClose className="size-4" />
          </button>
        </div>

        <Form
          action="/companies/communications"
          onSubmit={() => setOpen(false)}
          className="flex gap-2 p-5"
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Αναζήτηση στις επικοινωνίες</span>
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              autoFocus
              required
              type="search"
              name="q"
              maxLength={200}
              placeholder="Εταιρεία, επαφή ή σημειώσεις…"
              className={cn(controlClass, 'h-9 py-0 pr-3 pl-9')}
            />
          </label>
          <button type="submit" className={buttonClass('primary')}>
            Αναζήτηση
          </button>
        </Form>
      </dialog>
    </>
  );
}
