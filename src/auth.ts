import { Context } from 'hono';
import { getCookie } from 'hono/cookie';

type Bindings = {
	DB: D1Database;
};

// Password hashing using Web Crypto API (available in Cloudflare Workers)
export async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const salt = crypto.getRandomValues(new Uint8Array(16));
	const passwordData = encoder.encode(password);

	const key = await crypto.subtle.importKey('raw', passwordData, { name: 'PBKDF2' }, false, ['deriveBits']);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: 100000,
			hash: 'SHA-256',
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

	return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
	const [saltHex, hashHex] = hashedPassword.split(':');
	const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));

	const encoder = new TextEncoder();
	const passwordData = encoder.encode(password);

	const key = await crypto.subtle.importKey('raw', passwordData, { name: 'PBKDF2' }, false, ['deriveBits']);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: 'PBKDF2',
			salt: salt,
			iterations: 100000,
			hash: 'SHA-256',
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
		console.log('getSessionUser - no sessionId provided');
		return null;
	}

	console.log('getSessionUser - looking up session:', sessionId);

	const result = await db
		.prepare(
			'SELECT users.* FROM users JOIN sessions ON users.id = sessions.user_id WHERE sessions.id = ? AND sessions.expires_at > datetime("now")',
		)
		.bind(sessionId)
		.first();

	console.log('getSessionUser - result:', result);
	return result;
}

export async function deleteSession(db: D1Database, sessionId: string): Promise<void> {
	await db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
}

// Middleware for authentication
export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) {
	// Log all cookies
	const allCookies = c.req.header('Cookie');
	console.log('Auth middleware - Cookie header:', allCookies);
	
	const sessionId = getCookie(c, 'session_id');
	console.log('Auth middleware - sessionId:', sessionId);
	
	const user = await getSessionUser(c.env.DB, sessionId);
	console.log('Auth middleware - user:', user);

	if (!user) {
		console.error('Auth middleware - No user found');
		return c.json({ error: 'Unauthorized' }, 401);
	}

	c.set('user', user);
	console.log('Auth middleware - User set in context');
	await next();
}

export function getAuthUser(c: Context): any {
	return c.get('user');
}
