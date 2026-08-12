import { cn } from '@/lib/cn';
import { initials } from '@/lib/session';

/** Initials shared by the sidebar identity and the account-menu trigger. */
export function UserAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-accent to-accent-strong text-xs font-semibold text-white',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
