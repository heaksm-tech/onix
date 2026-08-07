import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex flex-col items-center text-center">
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">Η σελίδα δεν βρέθηκε</h1>
        <p className="mt-2 max-w-sm text-sm text-ink-secondary">
          Η διεύθυνση που ζητήσατε δεν υπάρχει ή έχει μετακινηθεί.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-9 items-center rounded-lg bg-ink px-3.5 text-sm font-medium text-canvas transition-colors duration-150 outline-none hover:bg-ink/85 focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          Επιστροφή στο Dashboard
        </Link>
      </div>
    </main>
  );
}
