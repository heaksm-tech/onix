import type { AuthUser, UserRole } from '@/lib/session';

/** One row of the role-protected account administration list. */
export type AccountListItem = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  /** False only while the recipient has not accepted the invitation yet. */
  passwordSet: boolean;
  createdAt: string;
};

export type AccountsPage = {
  items: AccountListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export function accountStatus(account: AccountListItem): {
  label: string;
  tone: string;
} {
  if (account.active) return { label: 'Ενεργός', tone: 'bg-positive' };
  if (account.passwordSet) return { label: 'Αποκλεισμένος', tone: 'bg-negative' };
  return { label: 'Αναμένει ενεργοποίηση', tone: 'bg-accent' };
}

/** Mirrors the API's target rules so unavailable actions are not offered. */
export function canManageAccount(
  viewer: Pick<AuthUser, 'id' | 'role'>,
  account: Pick<AccountListItem, 'id' | 'role'>,
): boolean {
  if (viewer.id === account.id) return false;
  return !(viewer.role === 'technical' && account.role === 'admin');
}
