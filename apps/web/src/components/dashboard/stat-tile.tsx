import type { ReactNode } from 'react';

import { Card } from '@/components/card';

/**
 * One headline number. The label sits above the figure so the four tiles read
 * as a row of sentences rather than a row of digits.
 */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm text-ink-secondary">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-faint">{hint}</p> : null}
    </Card>
  );
}
