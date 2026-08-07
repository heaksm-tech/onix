import { apiFetch } from '@/lib/api';

type Health = { status: string; database: string };

/**
 * Server component that proves the web → API → database path is wired up.
 * Currently unused; kept for a future system-status element.
 */
export async function ApiStatus() {
  let health: Health | null = null;
  let error: string | null = null;

  try {
    health = await apiFetch<Health>('/health/ready', { cache: 'no-store' });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Άγνωστο σφάλμα';
  }

  const ok = health?.status === 'ok';

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-line p-4">
      <h2 className="text-sm font-medium">Σύνδεση API</h2>
      <p className="flex items-center gap-2 font-mono text-sm">
        <span
          aria-hidden
          className={`inline-block size-2 rounded-full ${ok ? 'bg-positive' : 'bg-negative'}`}
        />
        {ok ? 'API και βάση δεδομένων διαθέσιμα' : (error ?? 'Το API δεν αποκρίνεται')}
      </p>
    </section>
  );
}
