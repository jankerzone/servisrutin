import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import worker from '../src';

describe('Servis Rutin API', () => {
	describe('request for /api/health', () => {
		it('responds with status ok (unit style)', async () => {
			const request = new Request<unknown, IncomingRequestCfProperties>('http://example.com/api/health');
			// Create an empty context to pass to `worker.fetch()`.
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, env, ctx);
			// Wait for all `Promise`s passed to `ctx.waitUntil()` to settle before running test assertions
			await waitOnExecutionContext(ctx);
			const data = await response.json();
			expect(data).toEqual({ status: 'ok', message: 'Servis Rutin API is running' });
		});

		it('responds with status ok (integration style)', async () => {
			const request = new Request('http://example.com/api/health');
			const response = await SELF.fetch(request);
			const data = await response.json();
			expect(data).toEqual({ status: 'ok', message: 'Servis Rutin API is running' });
		});
	});
});
