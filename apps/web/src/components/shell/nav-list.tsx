'use client';

import Link from 'next/link';
import { useState } from 'react';

import { IconChevronRight } from '@/components/icons';
import { cn } from '@/lib/cn';
import { NAV_ITEMS, isActive, type NavGroupItem, type NavItem, type NavLeafItem } from '@/lib/nav';

/**
 * The workspace nav rows, rendered identically by the desktop sidebar and the
 * mobile drawer. `onNavigate` lets the drawer close itself when a row is
 * followed — including a tap on the page already open, where the pathname
 * never changes.
 */
type NavProps = { pathname: string; onNavigate?: () => void };

function NavLeaf({ item, pathname, onNavigate }: NavProps & { item: NavLeafItem }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium',
        'transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
        active
          ? 'bg-surface text-ink shadow-card'
          : 'text-ink-secondary hover:bg-ink/5 hover:text-ink',
      )}
    >
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-colors duration-150',
          active ? 'text-accent' : 'text-ink-faint group-hover:text-ink-secondary',
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function NavGroup({ item, pathname, onNavigate }: NavProps & { item: NavGroupItem }) {
  const Icon = item.icon;
  const childActive = item.children.some((sub) => isActive(pathname, sub.href));

  // null = follow the route (open while a child page is active); true/false =
  // user override. The override resets on navigation, adjusted during render.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    setManualOpen(null);
  }
  const open = manualOpen ?? childActive;

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setManualOpen(!open)}
        className={cn(
          'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium',
          'transition-colors duration-150 outline-none hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-accent/60',
          childActive ? 'text-ink' : 'text-ink-secondary hover:text-ink',
        )}
      >
        <Icon
          className={cn(
            'size-[18px] shrink-0 transition-colors duration-150',
            childActive ? 'text-accent' : 'text-ink-faint group-hover:text-ink-secondary',
          )}
        />
        <span className="min-w-0 flex-1 truncate text-left">{item.label}</span>
        <IconChevronRight
          className={cn(
            'size-3.5 shrink-0 text-ink-faint transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
      </button>

      <div
        inert={!open}
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="mt-0.5 ml-[19px] flex flex-col gap-0.5 border-l border-line pb-1 pl-2.5">
            {item.children.map((sub) => {
              const subActive = pathname === sub.href;
              return (
                <Link
                  key={sub.href}
                  href={sub.href}
                  onClick={onNavigate}
                  aria-current={subActive ? 'page' : undefined}
                  className={cn(
                    'truncate rounded-md px-2 py-1.5 text-[13px] transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                    subActive
                      ? 'bg-ink/5 font-medium text-ink'
                      : 'text-ink-secondary hover:bg-ink/5 hover:text-ink',
                  )}
                >
                  {sub.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavEntry({ item, ...rest }: NavProps & { item: NavItem }) {
  return item.children ? <NavGroup item={item} {...rest} /> : <NavLeaf item={item} {...rest} />;
}

/** The «Workspace» overline plus every row of `NAV_ITEMS`. */
export function NavList(props: NavProps) {
  return (
    <>
      <p className="px-2.5 pb-1.5 text-[11px] font-medium tracking-wider text-ink-faint uppercase">
        Workspace
      </p>
      {NAV_ITEMS.map((item) => (
        <NavEntry key={item.label} item={item} {...props} />
      ))}
    </>
  );
}
