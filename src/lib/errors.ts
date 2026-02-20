import { Context } from 'hono';

export function handleError(c: Context, error: unknown) {
  console.error('Error [500]:', error);
  // Never expose internal error details to the client
  return c.json({ error: 'Internal Server Error' }, 500);
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
