import type { ReactNode } from 'react';

import { Card } from '@/components/card';
import { cn } from '@/lib/cn';

/** A titled panel of the report: heading on the left, optional note opposite. */
export function ReportCard({
  title,
  note,
  children,
  className,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn('flex flex-col p-5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {note ? <span className="text-xs text-ink-faint">{note}</span> : null}
      </div>
      {/* A column, so a panel whose body should fill the card — the chart —
          can simply grow, while list bodies keep sizing to their content. */}
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </Card>
  );
}

/** Quiet in-card message for a panel with nothing to show yet. */
export function ReportEmpty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-ink-secondary">{children}</p>;
}
