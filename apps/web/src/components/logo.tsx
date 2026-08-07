/**
 * Onix brand mark: an emerald-cut "O" opened at the top-right corner, with a
 * small accent diamond set into the gap — a stone set into the band of the O.
 * The band fills with `currentColor`; the stone uses the theme accent.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M20.27 7.27 21 8v8l-5 5H8l-5-5V8l5-5h8l.73.73-3.77 3.77H10L7.5 10v4l2.5 2.5h4l2.5-2.5v-2.96l3.77-3.77Z"
      />
      <path fill="var(--accent)" d="M16.9 5.2l1.9 1.9-1.9 1.9L15 7.1l1.9-1.9Z" />
    </svg>
  );
}
