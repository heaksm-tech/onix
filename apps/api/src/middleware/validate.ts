import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

type Source = 'body' | 'query' | 'params';

/**
 * Parses the given request section with `schema` and replaces it with the
 * parsed (and coerced) result. Failures fall through to the error handler,
 * which renders ZodError as a 422.
 */
export function validate(schema: ZodType, source: Source = 'body'): RequestHandler {
  return (req, _res, next) => {
    const parsed = schema.parse(req[source]);
    // req.query is a getter in Express 5, so assign onto a writable slot.
    Object.defineProperty(req, source, { value: parsed, writable: true, configurable: true });
    next();
  };
}
