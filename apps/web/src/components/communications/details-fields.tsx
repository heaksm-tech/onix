import { Card } from '@/components/card';
import { Field, controlClass } from '@/components/field';
import { OUTCOMES, OUTCOME_LABELS, fromDateTimeLocal } from '@/lib/communications';

/**
 * The fields of a communication itself — everything except which company it
 * was with. Shared by the form that logs a new one and the form that edits an
 * existing one, so the two cannot drift apart, exactly as the API shares one
 * schema between its create and update routes.
 */

export type CommunicationUser = { id: string; name: string; email: string };

/** Every value is a string: this is what the controls hold, not what the API takes. */
export type CommunicationDetailsValues = {
  userId: string;
  outcome: string;
  contactName: string;
  contactRole: string;
  interestLevel: string;
  nextAction: string;
  nextActionAt: string;
  notes: string;
};

export const EMPTY_DETAILS: CommunicationDetailsValues = {
  userId: '',
  outcome: '',
  contactName: '',
  contactRole: '',
  interestLevel: '',
  nextAction: '',
  nextActionAt: '',
  notes: '',
};

/**
 * Control values → request body. An empty control means "not recorded", which
 * the API reads as `undefined` and stores as NULL.
 */
export function detailsPayload(values: CommunicationDetailsValues) {
  return {
    userId: values.userId,
    contactName: values.contactName || undefined,
    contactRole: values.contactRole || undefined,
    outcome: values.outcome || undefined,
    interestLevel: values.interestLevel ? Number(values.interestLevel) : undefined,
    notes: values.notes || undefined,
    nextAction: values.nextAction || undefined,
    nextActionAt: values.nextActionAt ? fromDateTimeLocal(values.nextActionAt) : undefined,
  };
}

export function CommunicationDetailsFields({
  values,
  users,
  disabled = false,
  onChange,
}: {
  values: CommunicationDetailsValues;
  users: CommunicationUser[];
  disabled?: boolean;
  onChange: (key: keyof CommunicationDetailsValues, value: string) => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-5">
        <h2 className="text-sm font-semibold">Επικοινωνία</h2>
        <p className="mt-1 text-sm text-ink-secondary">
          Καταγράψτε το αποτέλεσμα και την επόμενη ενέργεια.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Καταχώριση από">
          <select
            required
            disabled={disabled || users.length === 0}
            value={values.userId}
            onChange={(event) => onChange('userId', event.target.value)}
            className={controlClass}
          >
            <option value="">Επιλέξτε χρήστη</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} · {user.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Αποτέλεσμα">
          <select
            value={values.outcome}
            onChange={(event) => onChange('outcome', event.target.value)}
            className={controlClass}
          >
            <option value="">Δεν έχει οριστεί</option>
            {OUTCOMES.map((outcome) => (
              <option key={outcome} value={outcome}>
                {OUTCOME_LABELS[outcome]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Όνομα επαφής">
          <input
            value={values.contactName}
            onChange={(event) => onChange('contactName', event.target.value)}
            className={controlClass}
          />
        </Field>
        <Field label="Ρόλος επαφής">
          <input
            value={values.contactRole}
            onChange={(event) => onChange('contactRole', event.target.value)}
            className={controlClass}
          />
        </Field>
        <Field label="Επίπεδο ενδιαφέροντος">
          <select
            value={values.interestLevel}
            onChange={(event) => onChange('interestLevel', event.target.value)}
            className={controlClass}
          >
            <option value="">Δεν έχει οριστεί</option>
            {[1, 2, 3, 4, 5].map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Υπενθύμιση για">
          <input
            type="datetime-local"
            value={values.nextActionAt}
            onChange={(event) => onChange('nextActionAt', event.target.value)}
            className={controlClass}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Επόμενη ενέργεια">
            <input
              value={values.nextAction}
              onChange={(event) => onChange('nextAction', event.target.value)}
              className={controlClass}
              placeholder="π.χ. Αποστολή καταλόγου τιμών"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Σημειώσεις">
            <textarea
              value={values.notes}
              onChange={(event) => onChange('notes', event.target.value)}
              className={`${controlClass} min-h-28 resize-y`}
            />
          </Field>
        </div>
      </div>
    </Card>
  );
}
