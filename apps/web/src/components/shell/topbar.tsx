'use client';

import { usePathname } from 'next/navigation';
import { Fragment, useEffect, useState } from 'react';

import { IconBell, IconSearch } from '@/components/icons';
import { AccountMenu } from '@/components/shell/account-menu';
import { MobileNav } from '@/components/shell/mobile-nav';
import { cn } from '@/lib/cn';
import { breadcrumbTrail } from '@/lib/nav';
import type { AuthUser } from '@/lib/session';

export function Topbar({ user }: { user: AuthUser }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const initial = stored || 'light';
    setTheme(initial);
    document.documentElement.setAttribute('data-scheme', initial);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.setAttribute('data-scheme', next);
  };

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

      {/* Theme Switcher Button */}
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Εναλλαγή θέματος"
        className="grid size-8 place-items-center rounded-lg text-ink-secondary transition-colors duration-150 outline-none hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {theme === 'light' ? (
          <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
          </svg>
        ) : (
          <svg className="size-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )}
      </button>

      <AccountMenu user={user} />
    </header>
  );
}