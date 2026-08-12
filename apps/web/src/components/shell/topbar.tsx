'use client';

import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import { IconBell, IconSearch } from '@/components/icons';
import { AccountMenu } from '@/components/shell/account-menu';
import { MobileNav } from '@/components/shell/mobile-nav';
import { cn } from '@/lib/cn';
import { breadcrumbTrail } from '@/lib/nav';
import type { AuthUser } from '@/lib/session';

export function Topbar({ user }: { user: AuthUser }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-sm lg:px-8">
      {/* Stands in for the sidebar while it is hidden on small screens. */}
      <MobileNav user={user} />

      <nav aria-label="Διαδρομή" className="flex min-w-0 items-center gap-1.5 text-sm">
        <span className="hidden text-ink-faint sm:inline">Workspace</span>
        {breadcrumbTrail(pathname, user.role).map((label, index, trail) => (
          <Fragment key={label}>
            <span className={cn('text-ink-faint/60', index === 0 && 'hidden sm:inline')}>/</span>
            <span
              className={cn(
                'truncate',
                index === trail.length - 1 ? 'font-medium' : 'text-ink-faint',
              )}
            >
              {label}
            </span>
          </Fragment>
        ))}
      </nav>

      <div className="flex-1" />

      <button
        type="button"
        className="hidden h-8 w-56 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-sm text-ink-faint shadow-card transition-colors duration-150 outline-none hover:border-line-strong focus-visible:ring-2 focus-visible:ring-accent/60 sm:flex"
      >
        <IconSearch className="size-3.5" />
        Αναζήτηση
        <kbd className="ml-auto rounded border border-line bg-canvas px-1 font-sans text-[10px] font-medium text-ink-faint">
          ⌘K
        </kbd>
      </button>

      <button
        type="button"
        aria-label="Ειδοποιήσεις"
        className="relative grid size-8 place-items-center rounded-lg text-ink-secondary transition-colors duration-150 outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <IconBell className="size-[18px]" />
        <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />
      </button>

      <AccountMenu user={user} />
    </header>
  );
}
