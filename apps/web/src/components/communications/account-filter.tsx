import { Card } from '@/components/card';
import { CommunicationAccountFilterControl } from '@/components/communications/account-filter-control';
import { apiFetchAsUser } from '@/lib/server-api';

type CommunicationAuthor = { id: string; name: string; email: string };

/** Shared account filter for the two privileged communication overviews. */
export async function CommunicationAccountFilter({ userId }: { userId?: string }) {
  let users: CommunicationAuthor[];

  try {
    ({ users } = await apiFetchAsUser<{ users: CommunicationAuthor[] }>('/communication-authors'));
  } catch {
    return (
      <Card className="mb-4 p-4">
        <p className="text-sm text-ink-secondary">
          Δεν ήταν δυνατή η φόρτωση του φίλτρου λογαριασμών.
        </p>
      </Card>
    );
  }

  const options = [
    { value: '', label: 'Όλοι οι υπάλληλοι' },
    ...users.map((user) => ({ value: user.id, label: `${user.name} · ${user.email}` })),
  ];

  return (
    <Card className="mb-4 p-4">
      <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <div className="self-center">
          <h2 className="text-sm font-semibold">Φίλτρο επικοινωνιών</h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Περιορίστε τα δεδομένα στον υπάλληλο που τα κατέγραψε.
          </p>
        </div>
        <CommunicationAccountFilterControl options={options} value={userId ?? ''} />
      </div>
    </Card>
  );
}

export function CommunicationAccountFilterFallback() {
  return (
    <Card className="mb-4 p-4">
      <p className="text-sm text-ink-secondary">Φόρτωση φίλτρου λογαριασμών…</p>
    </Card>
  );
}
