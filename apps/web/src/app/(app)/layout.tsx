import { redirect } from 'next/navigation';

import { Sidebar } from '@/components/shell/sidebar';
import { Topbar } from '@/components/shell/topbar';
import { getCurrentUser } from '@/lib/auth';
import { LOGIN_PATH } from '@/lib/session';

/** Authenticated app shell: sidebar navigation + topbar around each section. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The authoritative check. The middleware has already turned away anyone
  // without a cookie; this is what rejects a cookie that no longer resolves to
  // an active user, and it doubles as the source of the sidebar's user card.
  const user = await getCurrentUser();
  if (!user) redirect(LOGIN_PATH);

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
