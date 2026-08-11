import type { ReactNode } from 'react';

/**
 * Form control styling, shared so inputs look identical everywhere.
 *
 * Apply to `input`, `select` and `textarea` alike — the app has no styled
 * input component, because the native elements already behave correctly and
 * only need the tokens.
 */
export const controlClass =
  'w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink shadow-card outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/60 disabled:cursor-not-allowed disabled:opacity-60';

/** Labelled form row: label above the control, optional hint below it. */
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-ink-faint">{hint}</span> : null}
    </label>
  );
}
