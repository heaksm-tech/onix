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

/** A safe optional author id read from a page query string. */
export function communicationUserFilter(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return first &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(first)
    ? first
    : undefined;
}

/** A bounded search term read from the communication list URL. */
export function communicationSearch(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const search = first?.trim().slice(0, 200);
  return search || undefined;
}

/** «3/5» — or a dash where no level was recorded. */
export function interestLabel(level: number | null): string {
  return level === null ? '—' : `${level}/5`;
}

/** One row of `GET /communications`. */
export type CommunicationListItem = {
  id: string;
  companyId: string;
  companyName: string;
  contactName: string | null;
  outcome: string | null;
  interestLevel: number | null;
  nextAction: string | null;
  nextActionAt: string | null;
  /** Settled by the database, which owns the clock the reminder was written against. */
  overdue: boolean;
  createdAt: string;
  userId: string | null;
  userName: string;
};

/** What `GET /communications` returns: one page, plus how many there are. */
export type CommunicationsPage = {
  items: CommunicationListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ScheduledEmailStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';

export type ScheduledEmailHistoryItem = {
  id: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledFor: string;
  status: ScheduledEmailStatus;
  sentAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const SCHEDULED_EMAIL_STATUS_LABELS: Record<ScheduledEmailStatus, string> = {
  pending: 'Προγραμματισμένο',
  processing: 'Αποστέλλεται',
  sent: 'Απεστάλη',
  failed: 'Αποτυχία αποστολής',
  cancelled: 'Ακυρώθηκε',
};

export const SCHEDULED_EMAIL_STATUS_TONES: Record<ScheduledEmailStatus, string> = {
  pending: 'bg-accent-soft text-accent',
  processing: 'bg-accent-soft text-accent',
  sent: 'bg-positive/10 text-positive',
  failed: 'bg-negative/10 text-negative',
  cancelled: 'bg-ink/5 text-ink-faint',
};

/** What `GET /communications/:id` returns — the list row plus everything else. */
export type CommunicationDetail = CommunicationListItem & {
  companyEmail: string | null;
  companyPhone: string | null;
  contactRole: string | null;
  notes: string | null;
  updatedAt: string;
  scheduledEmail: {
    recipientEmail: string;
    subject: string;
    body: string;
    scheduledFor: string;
  } | null;
  scheduledEmails: ScheduledEmailHistoryItem[];
};

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

/**
 * `<input type="datetime-local">` values, read and written in office time.
 *
 * A `datetime-local` control has no timezone: it hands over the wall clock the
 * user typed. Left to `new Date(value)` that would mean the *browser's* zone,
 * so the same reminder would read one way on a laptop in Athens and another on
 * a server rendering in UTC — and a value written by one would not survive a
 * round trip through the other. Both directions are therefore pinned to
 * `Europe/Athens`, the way every other date in this module is.
 */
const dateTimeLocalParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

type OfficeParts = Record<'year' | 'month' | 'day' | 'hour' | 'minute' | 'second', string>;

function officeParts(instant: Date): OfficeParts {
  const parts = new Map(
    dateTimeLocalParts.formatToParts(instant).map((part) => [part.type, part.value]),
  );
  const at = (type: Intl.DateTimeFormatPartTypes) => parts.get(type) ?? '00';

  return {
    year: at('year'),
    month: at('month'),
    day: at('day'),
    hour: at('hour'),
    minute: at('minute'),
    second: at('second'),
  };
}

/** How far Athens is from UTC at a given instant — DST included. */
function officeOffsetMs(instant: Date): number {
  const p = officeParts(instant);
  const asIfUtc = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return asIfUtc - (instant.getTime() - instant.getMilliseconds());
}

/** ISO timestamp → the `YYYY-MM-DDTHH:mm` the control expects. */
export function toDateTimeLocal(iso: string): string {
  const p = officeParts(new Date(iso));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/**
 * The control's value → an ISO timestamp.
 *
 * The offset is looked up twice because it is a function of the very instant
 * being computed: the first pass lands within an hour of the answer, the
 * second uses the offset in force *there*, which is what settles the two
 * ambiguous hours a year when the clocks change.
 */
export function fromDateTimeLocal(value: string): string {
  const wallClock = Date.parse(value.length === 16 ? `${value}:00Z` : `${value}Z`);
  if (Number.isNaN(wallClock)) return new Date(value).toISOString();

  const approximate = wallClock - officeOffsetMs(new Date(wallClock));
  return new Date(wallClock - officeOffsetMs(new Date(approximate))).toISOString();
}
