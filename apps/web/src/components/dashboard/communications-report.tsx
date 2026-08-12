import { ActivityChart } from '@/components/dashboard/activity-chart';
import { FollowUpList } from '@/components/dashboard/follow-ups';
import { OutcomeBreakdown } from '@/components/dashboard/outcome-breakdown';
import { RecentCommunications } from '@/components/dashboard/recent-communications';
import { ReportCard } from '@/components/dashboard/report-card';
import { StatTile } from '@/components/dashboard/stat-tile';
import { EmptyState } from '@/components/empty-state';
import { IconActivity } from '@/components/icons';
import type { CommunicationsSummary } from '@/lib/communications';
import { apiFetchAsUser } from '@/lib/server-api';

const ACTIVITY_DAYS = 14;

/** Greek plural that reads correctly for 1 as well as 0 and many. */
function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export async function CommunicationsReport({ userId }: { userId?: string }) {
  let summary: CommunicationsSummary;

  try {
    const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
    summary = await apiFetchAsUser<CommunicationsSummary>(`/communications/summary${query}`);
  } catch {
    return (
      <ReportCard title="Αναφορά επικοινωνιών">
        <p className="flex items-center gap-2 text-sm text-ink-secondary">
          <span aria-hidden className="inline-block size-2 shrink-0 rounded-full bg-negative" />
          Δεν ήταν δυνατή η φόρτωση της αναφοράς. Δοκιμάστε ξανά σε λίγο.
        </p>
      </ReportCard>
    );
  }

  const { totals, outcomes, activity, followUps, recent } = summary;

  if (totals.communications === 0) {
    return (
      <EmptyState
        icon={IconActivity}
        title="Δεν υπάρχουν ακόμη επικοινωνίες"
        description="Μόλις καταγραφεί η πρώτη επικοινωνία με εταιρεία, εδώ θα εμφανίζονται η δραστηριότητα, τα αποτελέσματα και οι εκκρεμείς υπενθυμίσεις."
      />
    );
  }

  const averageInterest =
    totals.averageInterest === null ? '—' : `${totals.averageInterest.toFixed(1)}/5`;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Επικοινωνίες"
          value={String(totals.communications)}
          hint={`${totals.last30Days} τις τελευταίες 30 ημέρες`}
        />
        <StatTile
          label="Εταιρείες σε επαφή"
          value={String(totals.companies)}
          hint="με τουλάχιστον μία καταγραφή"
        />
        <StatTile
          label="Μέσο ενδιαφέρον"
          value={averageInterest}
          hint="όπου έχει καταγραφεί επίπεδο"
        />
        <StatTile
          label="Εκκρεμείς υπενθυμίσεις"
          value={String(totals.overdue + totals.upcoming)}
          hint={
            totals.overdue > 0 ? (
              <span className="text-negative">
                {plural(totals.overdue, 'εκπρόθεσμη', 'εκπρόθεσμες')}
              </span>
            ) : (
              'καμία εκπρόθεσμη'
            )
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportCard
          title="Δραστηριότητα"
          note={`τελευταίες ${ACTIVITY_DAYS} ημέρες`}
          className="lg:col-span-2"
        >
          <ActivityChart activity={activity} />
        </ReportCard>

        <ReportCard title="Αποτελέσματα" note={`σύνολο ${totals.communications}`}>
          <OutcomeBreakdown outcomes={outcomes} total={totals.communications} />
        </ReportCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ReportCard
          title="Επόμενες ενέργειες"
          note={
            totals.overdue > 0 ? plural(totals.overdue, 'εκπρόθεσμη', 'εκπρόθεσμες') : undefined
          }
        >
          <FollowUpList followUps={followUps} />
        </ReportCard>

        <ReportCard title="Πρόσφατες επικοινωνίες" className="lg:col-span-2">
          <RecentCommunications recent={recent} />
        </ReportCard>
      </div>
    </div>
  );
}

/** Quiet stand-in while the report is being fetched. */
export function CommunicationsReportFallback() {
  return (
    <ReportCard title="Αναφορά επικοινωνιών">
      <p className="text-sm text-ink-secondary">Φόρτωση δεδομένων…</p>
    </ReportCard>
  );
}
