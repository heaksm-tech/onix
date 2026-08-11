import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

/** Surface primitive: hairline border, soft shadow, rounded corners. */
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn('rounded-xl border border-line bg-surface shadow-card', className)}
      {...props}
    />
  );
}
