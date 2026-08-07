import type { ComponentType } from 'react';

import { Card } from '@/components/card';
import type { IconProps } from '@/components/icons';

/** Full-width placeholder for sections that are not built yet. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <div className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent">
        <Icon className="size-5" />
      </div>
      <h2 className="mt-4 text-base font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-ink-secondary">{description}</p>
    </Card>
  );
}
