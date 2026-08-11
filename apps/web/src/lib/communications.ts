/**
 * The shared vocabulary of a communication: its outcomes, the shape the
 * dashboard report arrives in, and the date formatting both use.
 *
 * Outcome codes are stored in the database and never shown; the Greek label
 * lives here only, the way role labels live in `session.ts`. No server-only
 * import, so the form (client) and the report (server) can both use it.
 */

/** The outcomes the API accepts, plus the "not recorded" case. */
export const OUTCOMES = ['interested', 'callback', 'no_answer', 'not_interested'] as const;

export type Outcome = (typeof OUTCOMES)[number];
export type OutcomeKey = Outcome | 'unset';

/** Display order, best outcome first — used by the select and the breakdown. */
export const OUTCOME_KEYS: OutcomeKey[] = [...OUTCOMES, 'unset'];

export const OUTCOME_LABELS: Record<OutcomeKey, string> = {
  interested: 'Ενδιαφέρεται',
  callback: 'Επανάκληση',
  no_answer: 'Δεν απάντησε',
  not_interested: 'Δεν ενδιαφέρεται',
  unset: 'Χωρίς αποτέλεσμα',
};

/**
 * Token background for an outcome's bar and dot. Interest is `positive`, a
 * refusal is `negative`, and the two neutral states stay grey so the accent
 * marks the one outcome that needs a callback.
 */
export const OUTCOME_TONES: Record<OutcomeKey, string> = {
  interested: 'bg-positive',
  callback: 'bg-accent',
  no_answer: 'bg-ink-faint',
  not_interested: 'bg-negative',
  unset: 'bg-line-strong',
};

export function outcomeLabel(outcome: string | null): string {
  const key = (outcome ?? 'unset') as OutcomeKey;
  return OUTCOME_LABELS[key] ?? OUTCOME_LABELS.unset;
}

export function outcomeTone(outcome: string | null): string {
  const key = (outcome ?? 'unset') as OutcomeKey;
  return OUTCOME_TONES[key] ?? OUTCOME_TONES.unset;
}

/** What `GET /communications/summary` returns. */
export type CommunicationsSummary = {
  totals: {
    communications: number;
    companies: number;
    last30Days: number;
    averageInterest: number | null;
    overdue: number;
    upcoming: number;
  };
  outcomes: { outcome: string; count: number }[];
  activity: { date: string; count: number }[];
  followUps: {
    id: string;
    companyName: string;
    nextAction: string | null;
    nextActionAt: string;
    userName: string;
    /** Both settled by the database, which owns the clock these were written against. */
    overdue: boolean;
    dueInDays: number;
  }[];
  recent: {
    id: string;
    companyName: string;
    contactName: string | null;
    outcome: string | null;
    interestLevel: number | null;
    createdAt: string;
    userName: string;
  }[];
};

/**
 * The office's timezone, fixed rather than taken from the server.
 *
 * The report is read by one team in one place, and a deploy on a UTC host must
 * not shift what «σήμερα» means for them. The API buckets its day counts the
 * same way.
 */
const TIME_ZONE = 'Europe/Athens';
const LOCALE = 'el-GR';

const dateTimeFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const dateFormat = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: 'numeric',
  month: 'long',
});

const dayNumberFormat = new Intl.DateTimeFormat(LOCALE, { timeZone: TIME_ZONE, day: 'numeric' });

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/**
 * Day-of-month for a bare `YYYY-MM-DD` from the activity series.
 *
 * Read as UTC midnight on purpose: the string is already a calendar day in the
 * office timezone, so re-interpreting it locally would slide it by a day.
 */
export function formatDayOfMonth(date: string): string {
  return dayNumberFormat.format(new Date(`${date}T12:00:00Z`));
}

/**
 * «σήμερα» · «σε 3 ημέρες» · «πριν από 2 ημέρες» — for reminder due dates.
 *
 * Takes the day count rather than a timestamp, so it stays a pure function of
 * its argument: the clock is read once, by the database, and travels with the
 * row (`dueInDays`).
 */
export function relativeDayLabel(days: number): string {
  if (days === 0) return 'σήμερα';
  if (days === 1) return 'αύριο';
  if (days === -1) return 'χθες';
  return days > 0 ? `σε ${days} ημέρες` : `πριν από ${Math.abs(days)} ημέρες`;
}
