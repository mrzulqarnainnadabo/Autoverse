/**
 * Lets services throw errors carrying an intended HTTP status, so routes
 * can stay thin: `catch (err) { return res.status(err.status ?? 500)... }`
 * rather than re-deriving status codes at every call site.
 */
export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function handleRouteError(err: unknown, res: import('express').Response) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  console.error('[Unhandled route error]', err);
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
}
