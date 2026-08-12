import type { Route } from 'next';
import type { ComponentType } from 'react';

import { IconCompanies, IconContacts, IconDashboard, type IconProps } from '@/components/icons';
import { ACCOUNT_MANAGER_ROLES, canViewAllCommunications, type UserRole } from '@/lib/session';

export type NavSubItem = {
  label: string;
  href: Route;
};

type NavItemBase = {
  label: string;
  icon: ComponentType<IconProps>;
  roles?: readonly UserRole[];
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
  {
    label: 'Λογαριασμοί',
    icon: IconContacts,
    roles: ACCOUNT_MANAGER_ROLES,
    children: [
      { label: 'Όλοι οι λογαριασμοί', href: '/accounts' },
      { label: 'Νέος λογαριασμός', href: '/accounts/new' },
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

/** Navigation is presentation only; the page and API repeat the role check. */
export function navItemsFor(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map((item) => {
    if (canViewAllCommunications(role) || !item.children) return item;

    return {
      ...item,
      children: item.children.map((child) =>
        child.href === '/companies/communications'
          ? { ...child, label: 'Οι επικοινωνίες μου' }
          : child,
      ),
    };
  });
}

/** Labels from section down to the current page, for the topbar breadcrumb. */
export function breadcrumbTrail(pathname: string, role: UserRole): string[] {
  const utility = UTILITY_TRAILS.find(({ href }) => isActive(pathname, href));
  if (utility) return utility.labels;

  for (const item of navItemsFor(role)) {
    if (item.children) {
      const child = item.children.find((sub) => isActive(pathname, sub.href));
      if (child) return [item.label, child.label];
    } else if (isActive(pathname, item.href)) {
      return [item.label];
    }
  }
  return ['Onix'];
}
