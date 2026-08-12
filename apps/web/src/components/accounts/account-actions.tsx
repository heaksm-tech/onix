'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { type AccountListItem, canManageAccount } from '@/lib/accounts';
import { ApiError, apiFetch } from '@/lib/api';
import type { AuthUser } from '@/lib/session';

type Action = 'block' | 'unblock' | 'delete';

export function AccountActions({
  account,
  viewer,
}: {
  account: AccountListItem;
  viewer: Pick<AuthUser, 'id' | 'role'>;
}) {
  const router = useRouter();
  const [action, setAction] = useState<Action>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!canManageAccount(viewer, account)) {
    return (
      <span className="text-xs text-ink-faint">
        {viewer.id === account.id ? 'Τρέχων λογαριασμός' : 'Μόνο προβολή'}
      </span>
    );
  }

  function ask(nextAction: Action) {
    setError(undefined);
    setAction(nextAction);
  }

  async function confirm() {
    if (!action) return;

    setError(undefined);
    setBusy(true);

    try {
      if (action === 'delete') {
        await apiFetch(`/accounts/${account.id}`, { method: 'DELETE' });
      } else {
        await apiFetch(`/accounts/${account.id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ blocked: action === 'block' }),
        });
      }

      setAction(undefined);
      setBusy(false);
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? caught.message
          : action === 'delete'
            ? 'Δεν ήταν δυνατή η διαγραφή του λογαριασμού.'
            : 'Δεν ήταν δυνατή η αλλαγή της πρόσβασης του λογαριασμού.',
      );
      setBusy(false);
    }
  }

  const prompt = action ? promptFor(action, account.email) : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1">
        {account.active ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => ask('block')}
            aria-label={`Αποκλεισμός λογαριασμού ${account.email}`}
          >
            Αποκλεισμός
          </Button>
        ) : account.passwordSet ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => ask('unblock')}
            aria-label={`Άρση αποκλεισμού λογαριασμού ${account.email}`}
          >
            Άρση αποκλεισμού
          </Button>
        ) : null}

        {!account.active ? (
          <Button
            variant="danger"
            size="sm"
            onClick={() => ask('delete')}
            aria-label={`Οριστική διαγραφή λογαριασμού ${account.email}`}
          >
            Διαγραφή
          </Button>
        ) : null}
      </div>

      {prompt ? (
        <ConfirmDialog
          open
          tone={action === 'unblock' ? 'accent' : 'danger'}
          title={prompt.title}
          description={prompt.description}
          confirmLabel={prompt.confirmLabel}
          busyLabel={prompt.busyLabel}
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onCancel={() => setAction(undefined)}
        />
      ) : null}
    </>
  );
}

function promptFor(action: Action, email: string) {
  if (action === 'block') {
    return {
      title: 'Αποκλεισμός λογαριασμού;',
      description: `Ο λογαριασμός ${email} θα αποσυνδεθεί από όλες τις συσκευές και δεν θα μπορεί να συνδεθεί ξανά μέχρι να αρθεί ο αποκλεισμός.`,
      confirmLabel: 'Αποκλεισμός',
      busyLabel: 'Αποκλεισμός…',
    };
  }

  if (action === 'unblock') {
    return {
      title: 'Άρση αποκλεισμού;',
      description: `Ο λογαριασμός ${email} θα μπορεί να συνδεθεί ξανά με τον υπάρχοντα κωδικό πρόσβασης.`,
      confirmLabel: 'Άρση αποκλεισμού',
      busyLabel: 'Επαναφορά…',
    };
  }

  return {
    title: 'Οριστική διαγραφή λογαριασμού;',
    description: `Ο λογαριασμός ${email} θα διαγραφεί οριστικά. Οι επικοινωνίες του θα παραμείνουν και θα εμφανίζονται με την ένδειξη «Διαγραμμένος χρήστης».`,
    confirmLabel: 'Οριστική διαγραφή',
    busyLabel: 'Διαγραφή…',
  };
}
