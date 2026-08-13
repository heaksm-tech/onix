'use client';

import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import { AccountMenu } from '@/components/shell/account-menu';
import { CommunicationSearch } from '@/components/shell/communication-search';
import { MobileNav } from '@/components/shell/mobile-nav';
import { NotificationMenu } from '@/components/shell/notification-menu';
import { ThemeSwitch } from '@/components/shell/theme-switch';
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

      <ThemeSwitch />

      <CommunicationSearch />

      <NotificationMenu />

      <AccountMenu user={user} />
    </header>
  );
}
