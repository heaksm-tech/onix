import type { Route } from 'next';
import type { ComponentType } from 'react';

import { IconCompanies, IconDashboard, type IconProps } from '@/components/icons';

export type NavSubItem = {
  label: string;
  href: Route;
};

type NavItemBase = {
  label: string;
  icon: ComponentType<IconProps>;
};

/** A leaf navigates to its page. */
export type NavLeafItem = NavItemBase & { href: Route; children?: never };

/** A group has no page of its own — it only expands its submenu. */
export type NavGroupItem = NavItemBase & { href?: never; children: NavSubItem[] };

export type NavItem = NavLeafItem | NavGroupItem;

/** Primary workspace sections, in sidebar order. */
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: IconDashboard },
  {
    label: 'Εταιρείες - Συνεργασίες',
    icon: IconCompanies,
    children: [
      { label: 'Νέα επικοινωνία', href: '/companies/new-communication' },
      { label: 'Όλες οι επικοινωνίες', href: '/companies/communications' },
    ],
  },
];

/** App pages reached outside the primary sidebar, but still named in the breadcrumb. */
const UTILITY_TRAILS: { href: Route; labels: string[] }[] = [
  { href: '/account/password', labels: ['Λογαριασμός', 'Αλλαγή κωδικού'] },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Labels from section down to the current page, for the topbar breadcrumb. */
export function breadcrumbTrail(pathname: string): string[] {
  const utility = UTILITY_TRAILS.find(({ href }) => isActive(pathname, href));
  if (utility) return utility.labels;

  for (const item of NAV_ITEMS) {
    if (item.children) {
      const child = item.children.find((sub) => isActive(pathname, sub.href));
      if (child) return [item.label, child.label];
    } else if (isActive(pathname, item.href)) {
      return [item.label];
    }
  }
  return ['Onix'];
}
