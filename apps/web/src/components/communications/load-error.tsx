import { Card } from '@/components/card';

/**
 * What a communications screen shows when the API did not answer.
 *
 * Same shape as the dashboard report's failure line: a negative dot, one
 * sentence, and no stack trace — the reader can only retry anyway.
 */
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
