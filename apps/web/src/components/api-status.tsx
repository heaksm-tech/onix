import { apiFetch } from '@/lib/api';

type Health = { status: string; database: string };

/**
 * Server component that proves the web → API → database path is wired up.
 * Safe to delete once real features exist.
 */
export async function ApiStatus() {
  let health: Health | null = null;
  let error: string | null = null;

  try {
    health = await apiFetch<Health>('/health/ready', { cache: 'no-store' });
  } catch (err) {
    error = err instanceof Error ? err.message : 'Unknown error';
  }

  const ok = health?.status === 'ok';

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <h2 className="text-sm font-medium">API connection</h2>
      <p className="flex items-center gap-2 font-mono text-sm">
        <span
          aria-hidden
          className={`inline-block size-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`}
        />
        {ok ? 'API and database reachable' : (error ?? 'API unreachable')}
      </p>
    </section>
  );
}
