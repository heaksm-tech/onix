import { ApiStatus } from '@/components/api-status';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Onix</h1>
        <p className="text-sm opacity-70">Internal B2B CRM for S. D. Melas Trading Business.</p>
      </header>

      <ApiStatus />

      <section className="flex flex-col gap-3 text-sm">
        <h2 className="font-medium">Next steps</h2>
        <ul className="flex list-disc flex-col gap-1 pl-5 opacity-70">
          <li>
            Add a migration: <code className="font-mono">make migrate-create name=companies</code>
          </li>
          <li>
            Add an API module under <code className="font-mono">apps/api/src/modules/</code>
          </li>
          <li>
            Add pages and components under <code className="font-mono">apps/web/src/app/</code>
          </li>
        </ul>
      </section>
    </main>
  );
}
