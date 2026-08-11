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
    children: [{ label: 'Νέα επικοινωνία', href: '/companies/new-communication' }],
  },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Labels from section down to the current page, for the topbar breadcrumb. */
export function breadcrumbTrail(pathname: string): string[] {
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
