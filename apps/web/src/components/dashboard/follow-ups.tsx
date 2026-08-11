import { ReportEmpty } from '@/components/dashboard/report-card';
import { cn } from '@/lib/cn';
import { formatDateTime, relativeDayLabel, type CommunicationsSummary } from '@/lib/communications';

type FollowUps = CommunicationsSummary['followUps'];

/**
 * Reminders in due order, so anything already late sits at the top.
 *
 * Being late is spelled out as well as coloured — «Εκπρόθεσμη» has to survive
 * a reader who does not see the red.
 */
export function FollowUpList({ followUps }: { followUps: FollowUps }) {
  if (followUps.length === 0) {
    return <ReportEmpty>Δεν υπάρχουν προγραμματισμένες υπενθυμίσεις.</ReportEmpty>;
  }

  return (
    <ul className="-my-3">
      {followUps.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 border-b border-line py-3 last:border-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.companyName}</p>
            <p className="truncate text-xs text-ink-secondary">
              {item.nextAction ?? 'Χωρίς περιγραφή ενέργειας'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs tabular-nums text-ink-secondary">
              {formatDateTime(item.nextActionAt)}
            </p>
            <p className={cn('text-xs', item.overdue ? 'text-negative' : 'text-ink-faint')}>
              {item.overdue ? 'Εκπρόθεσμη' : relativeDayLabel(item.dueInDays)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
