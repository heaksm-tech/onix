import { Card } from '@/components/card';

/** A quiet, actionable failure state for a server-rendered data section. */
export function LoadError({ children }: { children: string }) {
  return (
    <Card className="p-5">
      <p className="flex items-center gap-2 text-sm text-ink-secondary">
        <span aria-hidden className="inline-block size-2 shrink-0 rounded-full bg-negative" />
        {children}
      </p>
    </Card>
  );
}
