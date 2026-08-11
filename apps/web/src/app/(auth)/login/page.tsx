import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Card } from '@/components/card';
import { LoginForm } from '@/components/login-form';
import { LogoMark } from '@/components/logo';
import { getCurrentUser } from '@/lib/auth';
import { loginErrorMessage, safeNextPath } from '@/lib/session';

export const metadata: Metadata = { title: 'Σύνδεση' };

/**
 * Lives outside the `(app)` route group, so it renders on a bare canvas with
 * no sidebar or topbar — there is no workspace to navigate until someone has
 * signed in.
 *
 * It is also the only page an unauthenticated browser is served, and it is
 * served whole: the stylesheet is inlined and nothing here is a client
 * component, so the page needs no request to `/_next/*` — which `proxy.ts`
 * refuses anyway until there is a session.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const error = loginErrorMessage(params.error);

  // The middleware only knows whether a cookie exists. This is where a session
  // is actually verified, which is why the "already signed in" redirect lives
  // here and not there: a stale cookie lands on the form instead of in a loop.
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
            <p className="text-sm text-ink-secondary">S. D. Melas Trading Business</p>
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
