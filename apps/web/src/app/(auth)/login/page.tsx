import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Card } from '@/components/card';
import { LoginForm } from '@/components/login-form';
import { LogoMark } from '@/components/logo';
import { getCurrentUser } from '@/lib/auth';
import { loginErrorMessage, safeNextPath } from '@/lib/session';

export const metadata: Metadata = { title: 'Σύνδεση' };

/** Bare authentication screen outside the signed-in application shell. */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const error = loginErrorMessage(params.error);

  // Validate rather than trusting cookie presence, so an expired cookie still
  // reaches a usable form instead of bouncing between routes.
  if (await getCurrentUser()) redirect(next);

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="grid size-11 place-items-center rounded-xl bg-ink text-canvas shadow-card">
            <LogoMark className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">Onix CRM</h1>
            <p className="text-sm text-ink-secondary">ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.</p>
          </div>
        </div>

        <Card className="mt-8 p-5">
          <div className="mb-5">
            <h2 className="text-sm font-semibold">Σύνδεση</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Συνδεθείτε με τον λογαριασμό που σας δόθηκε.
            </p>
          </div>
          <LoginForm next={next} error={error} />
        </Card>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Οι λογαριασμοί δημιουργούνται από τον διαχειριστή. Αν δεν έχετε πρόσβαση, επικοινωνήστε
          μαζί του.
        </p>
      </div>
    </main>
  );
}
