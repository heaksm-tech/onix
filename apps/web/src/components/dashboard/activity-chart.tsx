import { cn } from '@/lib/cn';
import { formatDate, formatDayOfMonth, type CommunicationsSummary } from '@/lib/communications';

type Activity = CommunicationsSummary['activity'];

/**
 * Communications per day, as a bare column chart.
 *
 * Heights are inline styles because they are data, not design — everything
 * else comes from tokens. A day with no activity keeps a hairline tick rather
 * than disappearing, so the baseline reads as a calendar and gaps stay visible.
 */
export function ActivityChart({ activity }: { activity: Activity }) {
  const max = Math.max(...activity.map((day) => day.count), 1);
  const total = activity.reduce((sum, day) => sum + day.count, 0);

  return (
    // The columns take whatever height the card ends up with, so the chart
    // fills the row rather than floating above a gap when the panel beside it
    // is the taller one.
    <div
      role="img"
      aria-label={`Επικοινωνίες ανά ημέρα για ${activity.length} ημέρες, σύνολο ${total}.`}
      className="flex min-h-32 flex-1 flex-col"
    >
      <div className="flex flex-1 items-end gap-1.5">
        {activity.map((day) => (
          <div
            key={day.date}
            title={`${formatDate(`${day.date}T12:00:00Z`)} · ${day.count}`}
            className={cn('flex-1 rounded-t-sm', day.count > 0 ? 'bg-accent' : 'bg-line-strong/60')}
            style={{ height: day.count > 0 ? `${(day.count / max) * 100}%` : '2px' }}
          />
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        {activity.map((day) => (
          <span
            key={day.date}
            className="flex-1 text-center text-[10px] tabular-nums text-ink-faint"
          >
            {formatDayOfMonth(day.date)}
          </span>
        ))}
      </div>
    </div>
  );
}
