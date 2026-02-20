import { Context } from 'hono';
import { getCookie } from 'hono/cookie';
import { Bindings } from './types';
import { handleUnauthorized } from './lib/errors';

// Password hashing using Web Crypto API (available in Cloudflare Workers)
// Note: CF Workers CPU limit caps PBKDF2 at ~100k iterations (600k causes timeout)
const LEGACY_ITERATIONS = 100000;
const CURRENT_ITERATIONS = 100000;
const HASH_ALGORITHM = 'SHA-256';

export async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const passwordData = encoder.encode(password);

	const key = await crypto.subtle.importKey('raw', passwordData, { name: 'PBKDF2' }, false, ['deriveBits']);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: CURRENT_ITERATIONS,
			hash: HASH_ALGORITHM,
		},
		key,
		256,
	);

	const hashArray = new Uint8Array(derivedBits);
	const saltHex = Array.from(salt)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	const hashHex = Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return `${saltHex}:${CURRENT_ITERATIONS}:${hashHex}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
	const parts = storedHash.split(':');
	let saltHex: string, hashHex: string, iterations: number;

	if (parts.length === 3) {
		// Standard format: salt:iterations:hash
		[saltHex, , hashHex] = parts;
		iterations = parseInt(parts[1], 10);
	} else if (parts.length === 2) {
		// Legacy format: salt:hash (assumes 100,000 iterations)
		[saltHex, hashHex] = parts;
		iterations = LEGACY_ITERATIONS;
	} else {
		return false;
	}

	const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

	const encoder = new TextEncoder();
	const passwordData = encoder.encode(password);

	const key = await crypto.subtle.importKey('raw', passwordData, { name: 'PBKDF2' }, false, ['deriveBits']);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: iterations,
			hash: HASH_ALGORITHM,
		},
		key,
		256,
	);

	const hashArray = new Uint8Array(derivedBits);
	const newHashHex = Array.from(hashArray)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');

	return newHashHex === hashHex;
}

// Session management
export function generateSessionId(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

export async function createSession(db: D1Database, userId: number): Promise<string> {
	const sessionId = generateSessionId();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

	await db
		.prepare('INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
		.bind(sessionId, userId, expiresAt.toISOString(), now.toISOString())
		.run();

	return sessionId;
}

export async function getSessionUser(db: D1Database, sessionId: string | undefined): Promise<any> {
	if (!sessionId) {
		return null;
	}

	const result = await db
		.prepare(
			'SELECT users.id, users.email, users.name, users.avatar_url FROM users JOIN sessions ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.expires_at > datetime("now")',
		)
		.bind(sessionId)
		.first();

	return result;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

// Middleware for authentication
export async function authMiddleware(c: Context<{ Bindings: Bindings, Variables: { user: any } }>, next: () => Promise<void>) {
	const sessionId = getCookie(c, 'session_id');
	const user = await getSessionUser(c.env.DB, sessionId);

	if (!user) {
		return handleUnauthorized(c);
	}

	c.set('user', user);
	await next();
}

export function getAuthUser(c: Context): any {
	return c.get('user');
}
