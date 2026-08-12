import { UserAvatar } from '@/components/shell/user-avatar';
import { ROLE_LABELS, type AuthUser } from '@/lib/session';

/** Quiet signed-in identity at the foot of the sidebar and mobile drawer. */
export function UserCard({ user }: { user: AuthUser }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
      <UserAvatar name={user.name} />
      <span className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-medium">{user.name}</span>
        <span className="truncate text-[11px] text-ink-faint">{ROLE_LABELS[user.role]}</span>
      </span>
    </div>
  );
}
