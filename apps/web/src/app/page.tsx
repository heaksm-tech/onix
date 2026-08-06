import { ApiStatus } from '@/components/api-status';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-20">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Onix</h1>
        <p className="text-sm opacity-70">Internal B2B CRM for S. D. Melas Trading Business.</p>
      </header>

      <ApiStatus />
    </main>
  );
}
