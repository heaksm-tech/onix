'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoMark } from '@/components/logo';
import { NavList } from '@/components/shell/nav-list';
import { UserCard } from '@/components/shell/user-card';
import type { AuthUser } from '@/lib/session';

/** Permanent navigation from `md` up; below that the drawer takes over. */
export function Sidebar({ user }: { user: AuthUser }) {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-line md:flex">
      <Link
        href="/"
        className="mx-3 mt-4 flex items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-canvas shadow-card">
          <LogoMark className="size-[18px]" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight">Onix CRM</span>
          <span className="text-[11px] text-ink-faint">ΜΕΛΑΣ ΕΝΕΡΓΕΙΑΚΗ Α.Ε.</span>
        </span>
      </Link>

      <nav className="mt-4 flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
        <NavList pathname={pathname} role={user.role} />
      </nav>

      <div className="flex flex-col px-3 pb-4">
        <div className="mx-2.5 mb-2 border-t border-line" />
        <UserCard user={user} />
      </div>
    </aside>
  );
}
