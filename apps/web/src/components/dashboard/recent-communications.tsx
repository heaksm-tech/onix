import { ReportEmpty } from '@/components/dashboard/report-card';
import { cn } from '@/lib/cn';
import {
  formatDateTime,
  outcomeLabel,
  outcomeTone,
  type CommunicationsSummary,
} from '@/lib/communications';

type Recent = CommunicationsSummary['recent'];

/** The last calls logged, newest first: who was reached, by whom, and how it went. */
export function RecentCommunications({ recent }: { recent: Recent }) {
  if (recent.length === 0) {
    return <ReportEmpty>Δεν έχει καταγραφεί ακόμη καμία επικοινωνία.</ReportEmpty>;
  }

  return (
    <ul className="-my-3">
      {recent.map((item) => (
        <li
          key={item.id}
          className="flex items-start justify-between gap-3 border-b border-line py-3 last:border-0"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.companyName}</p>
            <p className="truncate text-xs text-ink-secondary">
              {[item.contactName ?? 'Χωρίς επαφή', item.userName].join(' · ')}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="flex items-center justify-end gap-1.5 text-xs text-ink-secondary">
              <span
                aria-hidden
                className={cn('size-1.5 rounded-full', outcomeTone(item.outcome))}
              />
              {outcomeLabel(item.outcome)}
              {item.interestLevel !== null ? (
                <span className="tabular-nums text-ink-faint">· {item.interestLevel}/5</span>
              ) : null}
            </p>
            <p className="text-xs tabular-nums text-ink-faint">{formatDateTime(item.createdAt)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
