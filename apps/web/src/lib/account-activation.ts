import type { Route } from 'next';

export const ACTIVATE_ACCOUNT_PATH: Route = '/activate-account';
export const ACTIVATE_ACCOUNT_ACTION_PATH = '/api/auth/activate-account';
export const MIN_PASSWORD_LENGTH = 12;
export const INVITATION_TOKEN_MAX_LENGTH = 128;

/** Safe outcome codes carried through the JavaScript-free form redirect. */
export const ACTIVATION_ERRORS = {
  missing: 'Ο σύνδεσμος πρόσκλησης δεν είναι πλήρης.',
  password: `Ο κωδικός πρέπει να έχει τουλάχιστον ${MIN_PASSWORD_LENGTH} χαρακτήρες.`,
  mismatch: 'Οι δύο καταχωρίσεις του κωδικού δεν συμφωνούν.',
  invalid: 'Ο σύνδεσμος πρόσκλησης δεν είναι έγκυρος ή έχει λήξει.',
  throttled: 'Πολλές προσπάθειες ενεργοποίησης. Δοκιμάστε ξανά σε λίγα λεπτά.',
  unavailable: 'Δεν ήταν δυνατή η ενεργοποίηση. Δοκιμάστε ξανά σε λίγο.',
} as const;

export type ActivationErrorCode = keyof typeof ACTIVATION_ERRORS;

export function activationErrorMessage(code: string | undefined): string | undefined {
  return code && code in ACTIVATION_ERRORS
    ? ACTIVATION_ERRORS[code as ActivationErrorCode]
    : undefined;
}

/** Next search parameters can repeat; security tokens never may. */
export function singleToken(value: string | string[] | undefined): string {
  return typeof value === 'string' ? value : '';
}
