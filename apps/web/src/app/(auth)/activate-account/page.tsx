import type { Metadata } from 'next';

import { ActivateAccountForm } from '@/components/activate-account-form';
import { Card } from '@/components/card';
import { LogoMark } from '@/components/logo';
import { ACTIVATION_ERRORS, activationErrorMessage, singleToken } from '@/lib/account-activation';

export const metadata: Metadata = {
  title: 'Ενεργοποίηση λογαριασμού',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; error?: string }>;
}) {
  const params = await searchParams;
  const token = singleToken(params.token);
  const error =
    activationErrorMessage(params.error) ?? (!token ? ACTIVATION_ERRORS.missing : undefined);
  const usableToken = params.error === 'invalid' ? '' : token;

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
            <h2 className="text-sm font-semibold">Ενεργοποίηση λογαριασμού</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Ορίστε τον κωδικό που θα χρησιμοποιείτε για τη σύνδεσή σας.
            </p>
          </div>
          <ActivateAccountForm token={usableToken} error={error} />
        </Card>

        <p className="mt-6 text-center text-xs text-ink-faint">
          Ο σύνδεσμος είναι προσωπικός, μίας χρήσης και λήγει αυτόματα.
        </p>
      </div>
    </main>
  );
}
