import { z } from 'zod';

const optionalSecret = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const optionalEmail = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().email().optional(),
);

const optionalUrl = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z
    .string()
    .trim()
    .url()
    .refine((value) => ['http:', 'https:'].includes(new URL(value).protocol), {
      message: 'APP_URL must use http or https',
    })
    .optional(),
);

/**
 * Environment is validated once at startup so a misconfigured deploy fails
 * immediately with a readable message rather than at the first request.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    /**
     * Comma-separated list of browser origins allowed to call the API directly.
     *
     * Empty by default, and normally stays that way: the web app reaches the API
     * from the server, or through its own `/api/v1` route, so no browser ever
     * makes a cross-origin request here. Naming an origin re-opens that door.
     */
    CORS_ORIGIN: z.string().default(''),
    /** How long a session stays valid after signing in. */
    SESSION_TTL_DAYS: z.coerce.number().int().positive().max(365).default(14),
    /** Public web origin used to build links in account-invitation emails. */
    APP_URL: optionalUrl,
    /** How long an unused account-invitation link remains valid. */
    ACCOUNT_INVITATION_TTL_HOURS: z.coerce.number().int().positive().max(168).default(48),
    /**
     * Marks the session cookie Secure.
     *
     * The cookie is set by Express but relayed to the browser by the web app, so
     * what matters is the scheme the *browser* uses to reach the web app, not
     * this service. Defaults to on in production; turn it off for a production
     * build served over plain HTTP, or the browser drops the cookie silently and
     * signing in appears to do nothing.
     */
    SESSION_COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    /** Resend is optional on a laptop, but a production API must be able to notify users. */
    RESEND_API_KEY: optionalSecret,
    /** Address at the verified production domain; the display name is added by the API. */
    RESEND_FROM_EMAIL: optionalEmail,
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') return;

    if (!value.RESEND_API_KEY) {
      context.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required in production',
      });
    }
    if (!value.RESEND_FROM_EMAIL) {
      context.addIssue({
        code: 'custom',
        path: ['RESEND_FROM_EMAIL'],
        message: 'RESEND_FROM_EMAIL is required in production',
      });
    }
    if (!value.APP_URL) {
      context.addIssue({
        code: 'custom',
        path: ['APP_URL'],
        message: 'APP_URL is required in production',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = {
  ...parsed.data,
  appUrl: (parsed.data.APP_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
  corsOrigins: parsed.data.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
  resendApiKey: parsed.data.RESEND_API_KEY,
  resendFromEmail: parsed.data.RESEND_FROM_EMAIL,
  sessionCookieSecure:
    parsed.data.SESSION_COOKIE_SECURE === undefined
      ? parsed.data.NODE_ENV === 'production'
      : parsed.data.SESSION_COOKIE_SECURE === 'true',
} as const;

export type Env = typeof env;
