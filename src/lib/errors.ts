import { Context } from 'hono';
import { StatusCode } from 'hono/utils/http-status';

export function handleError(c: Context, error: unknown, statusCode: StatusCode = 500) {
  console.error(`Error [${statusCode}]:`, error);
  // Do not expose internal error details in production
  const message = statusCode === 500 ? 'Internal Server Error' : String(error);
  return c.json({ error: message }, statusCode);
}

export function handleValidationError(c: Context, message: string) {
  return c.json({ error: message }, 400);
}

export function handleUnauthorized(c: Context, message: string = 'Unauthorized') {
  return c.json({ error: message }, 401);
}

export function handleNotFound(c: Context, message: string = 'Not Found') {
  return c.json({ error: message }, 404);
}
