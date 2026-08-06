/**
 * Errors thrown as `HttpError` are rendered to the client verbatim.
 * Anything else becomes a generic 500 so internals never leak.
 */
export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  static badRequest(message = 'Bad request', details?: unknown): HttpError {
    return new HttpError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Unauthorized'): HttpError {
    return new HttpError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'Forbidden'): HttpError {
    return new HttpError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found'): HttpError {
    return new HttpError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Conflict', details?: unknown): HttpError {
    return new HttpError(409, 'CONFLICT', message, details);
  }

  static unprocessable(message = 'Unprocessable entity', details?: unknown): HttpError {
    return new HttpError(422, 'UNPROCESSABLE_ENTITY', message, details);
  }
}
