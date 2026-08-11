import { cn } from '@/lib/cn';
import {
  OUTCOME_KEYS,
  OUTCOME_LABELS,
  OUTCOME_TONES,
  type CommunicationsSummary,
  type OutcomeKey,
} from '@/lib/communications';

type Outcomes = CommunicationsSummary['outcomes'];

/**
 * How the calls ended, as a share of the total.
 *
 * The four real outcomes are always listed, zeros included — «κανείς δεν
 * αρνήθηκε» is a finding, and a row that appears and disappears between loads
 * is harder to read than one that sits at zero. «Χωρίς αποτέλεσμα» only shows
 * up when something actually landed there.
 */
export function OutcomeBreakdown({ outcomes, total }: { outcomes: Outcomes; total: number }) {
  const counts = new Map(outcomes.map((row) => [row.outcome as OutcomeKey, row.count]));
  const rows = OUTCOME_KEYS.map((key) => ({ key, count: counts.get(key) ?? 0 })).filter(
    (row) => row.key !== 'unset' || row.count > 0,
  );

  return (
    <ul className="space-y-3">
      {rows.map(({ key, count }) => {
        const share = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <li key={key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={cn('size-2 shrink-0 rounded-full', OUTCOME_TONES[key])}
                />
                {OUTCOME_LABELS[key]}
              </span>
              <span className="tabular-nums text-ink-faint">
                <span className="font-medium text-ink">{count}</span> · {share}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-line">
              <div
                className={cn('h-full rounded-full', OUTCOME_TONES[key])}
                style={{ width: `${share}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
