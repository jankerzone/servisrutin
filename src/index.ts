import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { hashPassword, verifyPassword, createSession, getSessionUser, deleteSession, authMiddleware, getAuthUser } from './auth';
import { Bindings } from './types';
import { verifyTurnstile } from './lib/turnstile';
import { isValidEmail, isValidPassword, isValidOdometer } from './lib/validation';
import { handleError, handleValidationError, handleUnauthorized, handleNotFound } from './lib/errors';

const app = new Hono<{ Bindings: Bindings, Variables: { user: any } }>();

// Enable CORS with credentials
app.use(
	'/*',
	cors({
		origin: (origin, c) => {
			if (!origin) return undefined;
			try {
				const url = new URL(origin);
				// Allow localhost for dev
				if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
					return origin;
				}
				// In production, backend and frontend share the same domain via Cloudflare Workers assets.
				// Cross-origin requests from other domains are generally not intended for this app.
				return undefined;
			} catch (e) {
				return undefined;
			}
		},
		credentials: true,
	}),
);

// Rate limit auth endpoints to slow down brute-force / credential stuffing.
// Keyed by client IP. Skipped on staging for easier manual testing.
const authRateLimit = async (
	c: Context<{ Bindings: Bindings }>,
	next: () => Promise<void>,
) => {
	if (c.env.ENVIRONMENT === 'staging' || !c.env.AUTH_LIMITER) {
		return next();
	}
	const ip = c.req.header('CF-Connecting-IP') || 'unknown';
	const { success } = await c.env.AUTH_LIMITER.limit({ key: ip });
	if (!success) {
		return c.json({ error: 'Terlalu banyak percobaan. Silakan tunggu sebentar dan coba lagi.' }, 429);
	}
	await next();
};
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/signup', authRateLimit);

// API Routes
app.get('/api/health', (c) => {
	return c.json({ status: 'ok', message: 'Servis Rutin API is running' });
});

// Auth routes (public)
app.post('/api/auth/signup', async (c) => {
	try {
		const body = await c.req.json();
		const { email, password, name, turnstileToken } = body;

		if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
			return handleValidationError(c, 'Email and password are required and must be strings');
		}

		const normalizedEmail = email.toLowerCase();

		if (!isValidEmail(normalizedEmail)) {
			return handleValidationError(c, 'Invalid email format');
		}

		if (!isValidPassword(password)) {
			return handleValidationError(c, 'Password must be at least 8 characters long and contain both letters and numbers');
		}

		// Verify Turnstile token
		if (c.env.ENVIRONMENT !== 'staging') {
			if (!turnstileToken) {
				return handleValidationError(c, 'Verifikasi keamanan diperlukan');
			}
			const ip = c.req.header('CF-Connecting-IP');
			const turnstileOk = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, ip);
			if (!turnstileOk) {
				return c.json({ error: 'Verifikasi keamanan gagal. Silakan coba lagi.' }, 403);
			}
		}

		const db = c.env.DB;

		const existingUser = await db.prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)').bind(normalizedEmail).first();

		if (existingUser) {
			return handleValidationError(c, 'Email already registered');
		}

		const passwordHash = await hashPassword(password);
		const createdAt = new Date().toISOString();

		const result = await db
			.prepare('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)')
			.bind(normalizedEmail, passwordHash, name || null, createdAt)
			.run();

		const userId = result.meta.last_row_id;
		const sessionId = await createSession(db, userId);

		setCookie(c, 'session_id', sessionId, {
			httpOnly: true,
			secure: true,
			sameSite: 'Lax',
			maxAge: 30 * 24 * 60 * 60,
			path: '/',
		});

		return c.json({ success: true, user: { id: userId, email: normalizedEmail, name } });
	} catch (error) {
		return handleError(c, error);
	}
});

app.post('/api/auth/login', async (c) => {
	try {
		const body = await c.req.json();
		const { email, password, turnstileToken } = body;

		if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
			return handleValidationError(c, 'Email and password are required and must be strings');
		}

		const normalizedEmail = email.toLowerCase();

		// Verify Turnstile token
		if (c.env.ENVIRONMENT !== 'staging') {
			if (!turnstileToken) {
				return handleValidationError(c, 'Verifikasi keamanan diperlukan');
			}
			const ip = c.req.header('CF-Connecting-IP');
			const turnstileOk = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, ip);
			if (!turnstileOk) {
				return c.json({ error: 'Verifikasi keamanan gagal. Silakan coba lagi.' }, 403);
			}
		}

		const db = c.env.DB;

		const user = await db.prepare('SELECT id, email, name, password_hash FROM users WHERE LOWER(email) = LOWER(?)').bind(normalizedEmail).first();

		if (!user) {
			return handleUnauthorized(c, 'Invalid email or password');
		}

		const isValid = await verifyPassword(password, user.password_hash as string);

		if (!isValid) {
			return handleUnauthorized(c, 'Invalid email or password');
		}

		const sessionId = await createSession(db, user.id as number);

		setCookie(c, 'session_id', sessionId, {
			httpOnly: true,
			secure: true,
			sameSite: 'Lax',
			maxAge: 30 * 24 * 60 * 60,
			path: '/',
		});

		return c.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
	} catch (error) {
		return handleError(c, error);
	}
});

app.post('/api/auth/logout', async (c) => {
	try {
		const sessionId = getCookie(c, 'session_id');

		if (sessionId) {
			await deleteSession(c.env.DB, sessionId);
		}

		deleteCookie(c, 'session_id', { path: '/' });

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.get('/api/auth/me', async (c) => {
	try {
		const sessionId = getCookie(c, 'session_id');
		const user = await getSessionUser(c.env.DB, sessionId);

		if (!user) {
			return c.json({ user: null });
		}

		return c.json({ user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatar_url } });
	} catch (error) {
		return handleError(c, error);
	}
});

// Protected routes - require authentication
app.use('/api/*', async (c, next) => {
	const path = c.req.path;
	if (path.startsWith('/api/auth/') || path === '/api/health') {
		return next();
	}
	return authMiddleware(c, next);
});

// Update profile (Name, Avatar)
app.put('/api/profile', async (c) => {
	try {
		const user = getAuthUser(c);

		const body = await c.req.json();
		const { name, avatarUrl } = body;

		if ((name !== undefined && name !== null && typeof name !== 'string') ||
			(avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== 'string')) {
			return handleValidationError(c, 'Invalid field type for name or avatarUrl');
		}

		await c.env.DB.prepare('UPDATE users SET name = ?, avatar_url = ? WHERE id = ?')
			.bind(name || null, avatarUrl || null, user.id)
			.run();

		return c.json({ success: true, user: { ...user, name, avatarUrl } });
	} catch (error) {
		return handleError(c, error);
	}
});

// Change password
app.put('/api/profile/password', async (c) => {
	try {
		const user = getAuthUser(c);

		const body = await c.req.json();
		const { oldPassword, newPassword } = body;

		if (!oldPassword || !newPassword) {
			return handleValidationError(c, 'Both old and new passwords are required');
		}

		if (!isValidPassword(newPassword)) {
			return handleValidationError(c, 'New password must be at least 8 characters long and contain both letters and numbers');
		}

		const fullUser = await c.env.DB.prepare('SELECT password_hash FROM users WHERE id = ?').bind(user.id).first();

		if (!fullUser) {
			return handleNotFound(c, 'User not found');
		}

		const isValid = await verifyPassword(oldPassword, fullUser.password_hash as string);

		if (!isValid) {
			return handleUnauthorized(c, 'Incorrect old password');
		}

		const newHash = await hashPassword(newPassword);

		await c.env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?').bind(newHash, user.id).run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

// ---- Vehicle routes ----

app.get('/api/vehicles', async (c) => {
	try {
		const user = getAuthUser(c);
		const db = c.env.DB;
		const results = await db.prepare('SELECT * FROM kendaraan WHERE user_id = ? ORDER BY nama').bind(user.id).all();
		return c.json(results);
	} catch (error) {
		return handleError(c, error);
	}
});

app.post('/api/vehicles', async (c) => {
	try {
		const user = getAuthUser(c);
		if (!user || !user.id) {
			return handleUnauthorized(c);
		}

		const body = await c.req.json();
		const { nama, tipe, plat, tahun, bulanPajak, currentKm } = body;
		const db = c.env.DB;
		const normalizedCurrentKm = currentKm == null || currentKm === '' ? 0 : Number(currentKm);

		if (!isValidOdometer(normalizedCurrentKm)) {
			return handleValidationError(c, 'Invalid odometer value');
		}

		// Generate a truly unique short_id using SQLite's recursive fallback or a simple loop
		// We use 4 bytes (8 hex chars) to heavily minimize collision chance
		let result;
		let attempts = 0;
		const maxAttempts = 5;

		while (attempts < maxAttempts) {
			try {
				result = await db
					.prepare('INSERT INTO kendaraan (user_id, nama, tipe, plat, tahun, bulan_pajak, current_km, short_id) VALUES (?, ?, ?, ?, ?, ?, ?, lower(hex(randomblob(4))))')
					.bind(user.id, nama, tipe, plat, tahun, bulanPajak, normalizedCurrentKm)
					.run();
				break; // Success!
			} catch (e: any) {
				// If error is UNIQUE constraint failed, retry. Otherwise throw.
				if (e.message && e.message.includes('UNIQUE constraint failed')) {
					attempts++;
				} else {
					throw e;
				}
			}
		}

		if (!result) {
			throw new Error('Gagal membuat ID unik setelah beberapa percobaan');
		}

		return c.json({ success: true, result });
	} catch (error) {
		return handleError(c, error);
	}
});

app.put('/api/vehicles/:id/km', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const body = await c.req.json();
		const { currentKm, updatedAt: _updatedAt } = body;
		const db = c.env.DB;
		const normalizedCurrentKm = currentKm == null || currentKm === '' ? NaN : Number(currentKm);

		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(id, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		if (!isValidOdometer(normalizedCurrentKm)) {
			return handleValidationError(c, 'Invalid odometer value');
		}

		await db.prepare('UPDATE kendaraan SET current_km = ? WHERE id = ?').bind(normalizedCurrentKm, id).run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

// Update vehicle details
app.put('/api/vehicles/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const body = await c.req.json();
		const { nama, tipe, plat, tahun, bulanPajak, currentKm } = body;
		const db = c.env.DB;
		const normalizedCurrentKm = currentKm == null || currentKm === '' ? 0 : Number(currentKm);

		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(id, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		if (!isValidOdometer(normalizedCurrentKm)) {
			return handleValidationError(c, 'Invalid odometer value');
		}

		await db
			.prepare('UPDATE kendaraan SET nama = ?, tipe = ?, plat = ?, tahun = ?, bulan_pajak = ?, current_km = ? WHERE id = ?')
			.bind(nama, tipe, plat, tahun, bulanPajak, normalizedCurrentKm, id)
			.run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

// Update tax payment status
app.put('/api/vehicles/:id/tax', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const body = await c.req.json();
		const { type, paidUntil } = body; // type: 'tahunan' | '5tahunan', paidUntil: '2027-03'
		const db = c.env.DB;

		if (!type || !paidUntil) {
			return handleValidationError(c, 'Type and paidUntil are required');
		}

		if (!['tahunan', '5tahunan'].includes(type)) {
			return handleValidationError(c, 'Invalid tax type');
		}

		// Validate format YYYY-MM
		if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(paidUntil)) {
			return handleValidationError(c, 'Invalid date format. Use YYYY-MM');
		}

		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(id, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		const column = type === 'tahunan' ? 'pajak_tahunan_sampai' : 'pajak_5tahunan_sampai';
		await db.prepare(`UPDATE kendaraan SET ${column} = ? WHERE id = ?`).bind(paidUntil, id).run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.delete('/api/vehicles/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const db = c.env.DB;

		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(id, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		// Use batch for atomic cascade delete
		await db.batch([
			db.prepare('DELETE FROM tax_payments WHERE kendaraan_id = ?').bind(id),
			db.prepare('DELETE FROM service_history WHERE kendaraan_id = ?').bind(id),
			db.prepare('DELETE FROM service_items WHERE kendaraan_id = ?').bind(id),
			db.prepare('DELETE FROM kendaraan WHERE id = ?').bind(id),
		]);

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

// ---- Service Item routes ----

// Whitelist ORDER BY values
const ALLOWED_ORDERS = ['nama', 'last_date', 'last_km', 'interval_type'] as const;

app.get('/api/service-items', async (c) => {
	try {
		const user = getAuthUser(c);
		const kendaraanId = c.req.query('kendaraanId');
		const orderParam = c.req.query('order') || 'nama';
		const db = c.env.DB;

		if (!kendaraanId) {
			return handleValidationError(c, 'kendaraanId is required');
		}

		const order = ALLOWED_ORDERS.includes(orderParam as typeof ALLOWED_ORDERS[number])
			? orderParam
			: 'nama';

		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		const results = await db.prepare(`SELECT * FROM service_items WHERE kendaraan_id = ? ORDER BY ${order}`).bind(kendaraanId).all();

		return c.json(results);
	} catch (error) {
		return handleError(c, error);
	}
});

app.post('/api/service-items', async (c) => {
	try {
		const user = getAuthUser(c);
		const body = await c.req.json();
		const { kendaraanId, nama, intervalType, intervalValue, timeIntervalValue, timeIntervalUnit, lastKm, lastDate } = body;
		const db = c.env.DB;

		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		await db
			.prepare(
				'INSERT INTO service_items (kendaraan_id, nama, interval_type, interval_value, time_interval_value, time_interval_unit, last_km, last_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
			)
			.bind(kendaraanId, nama, intervalType, intervalValue, timeIntervalValue || null, timeIntervalUnit || null, lastKm, lastDate)
			.run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.put('/api/service-items/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const body = await c.req.json();
		const { nama, intervalType, intervalValue, timeIntervalValue, timeIntervalUnit, lastKm, lastDate } = body;
		const db = c.env.DB;

		const serviceItem = await db
			.prepare('SELECT si.id FROM service_items si JOIN kendaraan k ON si.kendaraan_id = k.id WHERE si.id = ? AND k.user_id = ?')
			.bind(id, user.id)
			.first();

		if (!serviceItem) {
			return handleNotFound(c, 'Service item not found or unauthorized');
		}

		await db
			.prepare('UPDATE service_items SET nama = ?, interval_type = ?, interval_value = ?, time_interval_value = ?, time_interval_unit = ?, last_km = ?, last_date = ? WHERE id = ?')
			.bind(nama, intervalType, intervalValue, timeIntervalValue || null, timeIntervalUnit || null, lastKm, lastDate, id)
			.run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.delete('/api/service-items/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const db = c.env.DB;

		const serviceItem = await db
			.prepare('SELECT si.id FROM service_items si JOIN kendaraan k ON si.kendaraan_id = k.id WHERE si.id = ? AND k.user_id = ?')
			.bind(id, user.id)
			.first();

		if (!serviceItem) {
			return handleNotFound(c, 'Service item not found or unauthorized');
		}

		await db.prepare('DELETE FROM service_items WHERE id = ?').bind(id).run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

// ---- Service History routes ----

app.post('/api/service-history', async (c) => {
	try {
		const user = getAuthUser(c);
		const body = await c.req.json();
		const { kendaraanId, serviceDate, odometerKm, serviceItemIds, totalCost, notes } = body;
		const db = c.env.DB;

		if (!kendaraanId || !serviceDate || !odometerKm || !serviceItemIds || serviceItemIds.length === 0) {
			return handleValidationError(c, 'Missing required fields');
		}

		if (!Array.isArray(serviceItemIds) || serviceItemIds.length > 50 || !serviceItemIds.every((id: unknown) => Number.isInteger(id) && (id as number) > 0)) {
			return handleValidationError(c, 'serviceItemIds must be an array of positive integers (max 50)');
		}

		if (!isValidOdometer(odometerKm)) {
			return handleValidationError(c, 'Invalid odometer value');
		}

		const vehicle = await db.prepare('SELECT id, current_km FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		// Security Check: Ensure all service items belong to the vehicle
		// Construct dynamic placeholder string for "IN (?, ?, ...)"
		const placeholders = serviceItemIds.map(() => '?').join(',');
		const validItemsQuery = `SELECT id FROM service_items WHERE kendaraan_id = ? AND id IN (${placeholders})`;
		const validItems = await db.prepare(validItemsQuery).bind(kendaraanId, ...serviceItemIds).all();

		// Check if the number of valid items found matches the number of requested items
		// Note: This assumes serviceItemIds are unique. If the client sends duplicates, we should handle that.
		const uniqueRequestedIds = new Set(serviceItemIds);
		if (validItems.results.length !== uniqueRequestedIds.size) {
			return handleValidationError(c, 'One or more service items are invalid or do not belong to this vehicle');
		}

		const createdAt = new Date().toISOString();

		// Build batch of statements for atomicity
		const statements = [
			db.prepare(
				'INSERT INTO service_history (kendaraan_id, service_date, odometer_km, service_item_ids, total_cost, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
			).bind(kendaraanId, serviceDate, odometerKm, JSON.stringify(serviceItemIds), totalCost || null, notes || null, createdAt),
		];

		// Update last_km and last_date for each service item
		for (const itemId of serviceItemIds) {
			statements.push(
				db.prepare('UPDATE service_items SET last_km = ?, last_date = ? WHERE id = ?').bind(odometerKm, serviceDate, itemId),
			);
		}

		// Update vehicle's current_km if the odometer reading is higher
		if (odometerKm > ((vehicle.current_km as number) || 0)) {
			statements.push(
				db.prepare('UPDATE kendaraan SET current_km = ? WHERE id = ?').bind(odometerKm, kendaraanId),
			);
		}

		await db.batch(statements);

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.get('/api/service-history', async (c) => {
	try {
		const user = getAuthUser(c);
		const kendaraanId = c.req.query('kendaraanId');
		const db = c.env.DB;

		if (!kendaraanId) {
			return handleValidationError(c, 'kendaraanId is required');
		}

		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		const results = await db
			.prepare('SELECT * FROM service_history WHERE kendaraan_id = ? ORDER BY service_date DESC, created_at DESC')
			.bind(kendaraanId)
			.all();

		return c.json(results);
	} catch (error) {
		return handleError(c, error);
	}
});

// ---- Tax Payment routes ----

app.post('/api/tax-payments', async (c) => {
	try {
		const user = getAuthUser(c);
		const body = await c.req.json();
		const { kendaraanId, type, paidUntil, paidDate, cost, notes } = body;
		const db = c.env.DB;

		if (!kendaraanId || !type || !paidUntil || !paidDate) {
			return handleValidationError(c, 'kendaraanId, type, paidUntil, and paidDate are required');
		}

		if (!['tahunan', '5tahunan'].includes(type)) {
			return handleValidationError(c, 'Invalid tax type');
		}

		if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(paidUntil)) {
			return handleValidationError(c, 'Invalid paidUntil format. Use YYYY-MM');
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) {
			return handleValidationError(c, 'Invalid paidDate format. Use YYYY-MM-DD');
		}

		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();
		if (!vehicle) {
			return handleNotFound(c, 'Vehicle not found or unauthorized');
		}

		const createdAt = new Date().toISOString();
		const column = type === 'tahunan' ? 'pajak_tahunan_sampai' : 'pajak_5tahunan_sampai';

		// Atomically insert payment record + update vehicle's tax status
		await db.batch([
			db.prepare(
				'INSERT INTO tax_payments (kendaraan_id, type, paid_until, paid_date, cost, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
			).bind(kendaraanId, type, paidUntil, paidDate, cost || null, notes || null, createdAt),
			db.prepare(`UPDATE kendaraan SET ${column} = ? WHERE id = ?`).bind(paidUntil, kendaraanId),
		]);

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.get('/api/tax-payments', async (c) => {
	try {
		const user = getAuthUser(c);
		const kendaraanId = c.req.query('kendaraanId');
		const db = c.env.DB;

		if (kendaraanId) {
			// Fetch for a specific vehicle
			const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();
			if (!vehicle) {
				return handleNotFound(c, 'Vehicle not found or unauthorized');
			}

			const results = await db
				.prepare('SELECT * FROM tax_payments WHERE kendaraan_id = ? ORDER BY paid_date DESC, created_at DESC')
				.bind(kendaraanId)
				.all();

			return c.json(results);
		}

		// Fetch all tax payments for all user's vehicles
		const results = await db
			.prepare(
				'SELECT tp.* FROM tax_payments tp JOIN kendaraan k ON tp.kendaraan_id = k.id WHERE k.user_id = ? ORDER BY tp.paid_date DESC, tp.created_at DESC',
			)
			.bind(user.id)
			.all();

		return c.json(results);
	} catch (error) {
		return handleError(c, error);
	}
});

// ---- Elektronik routes ----

app.get('/api/elektronik', async (c) => {
	try {
		const user = getAuthUser(c);
		const db = c.env.DB;
		const results = await db.prepare('SELECT * FROM elektronik WHERE user_id = ? ORDER BY nama').bind(user.id).all();
		return c.json(results);
	} catch (error) {
		return handleError(c, error);
	}
});

app.post('/api/elektronik', async (c) => {
	try {
		const user = getAuthUser(c);
		if (!user || !user.id) return handleUnauthorized(c);

		const body = await c.req.json();
		const { nama, tipe, lokasi, tahunBeli } = body;
		const db = c.env.DB;

		if (!nama || !nama.trim()) {
			return handleValidationError(c, 'Nama elektronik wajib diisi');
		}

		let result;
		let attempts = 0;
		const maxAttempts = 5;

		while (attempts < maxAttempts) {
			try {
				result = await db
					.prepare('INSERT INTO elektronik (user_id, nama, tipe, lokasi, tahun_beli, short_id) VALUES (?, ?, ?, ?, ?, lower(hex(randomblob(4))))')
					.bind(user.id, nama.trim(), tipe || null, lokasi || null, tahunBeli || null)
					.run();
				break;
			} catch (e: any) {
				if (e.message && e.message.includes('UNIQUE constraint failed')) {
					attempts++;
				} else {
					throw e;
				}
			}
		}

		if (!result) throw new Error('Gagal membuat ID unik setelah beberapa percobaan');

		return c.json({ success: true, result });
	} catch (error) {
		return handleError(c, error);
	}
});

app.put('/api/elektronik/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const body = await c.req.json();
		const { nama, tipe, lokasi, tahunBeli } = body;
		const db = c.env.DB;

		if (!nama || !nama.trim()) {
			return handleValidationError(c, 'Nama elektronik wajib diisi');
		}

		const item = await db.prepare('SELECT id FROM elektronik WHERE id = ? AND user_id = ?').bind(id, user.id).first();
		if (!item) return handleNotFound(c, 'Elektronik not found or unauthorized');

		await db
			.prepare('UPDATE elektronik SET nama = ?, tipe = ?, lokasi = ?, tahun_beli = ? WHERE id = ?')
			.bind(nama.trim(), tipe || null, lokasi || null, tahunBeli || null, id)
			.run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.delete('/api/elektronik/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const db = c.env.DB;

		const item = await db.prepare('SELECT id FROM elektronik WHERE id = ? AND user_id = ?').bind(id, user.id).first();
		if (!item) return handleNotFound(c, 'Elektronik not found or unauthorized');

		await db.batch([
			db.prepare('DELETE FROM elektronik_service_history WHERE elektronik_id = ?').bind(id),
			db.prepare('DELETE FROM elektronik_service_items WHERE elektronik_id = ?').bind(id),
			db.prepare('DELETE FROM elektronik WHERE id = ?').bind(id),
		]);

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

// ---- Elektronik Service Item routes ----

app.get('/api/elektronik-service-items', async (c) => {
	try {
		const user = getAuthUser(c);
		const elektronikId = c.req.query('elektronikId');
		const db = c.env.DB;

		if (!elektronikId) return handleValidationError(c, 'elektronikId is required');

		const item = await db.prepare('SELECT id FROM elektronik WHERE id = ? AND user_id = ?').bind(elektronikId, user.id).first();
		if (!item) return handleNotFound(c, 'Elektronik not found or unauthorized');

		const results = await db.prepare('SELECT * FROM elektronik_service_items WHERE elektronik_id = ? ORDER BY nama').bind(elektronikId).all();
		return c.json(results);
	} catch (error) {
		return handleError(c, error);
	}
});

app.post('/api/elektronik-service-items', async (c) => {
	try {
		const user = getAuthUser(c);
		const body = await c.req.json();
		const { elektronikId, nama, intervalType, intervalValue, lastDate } = body;
		const db = c.env.DB;

		const item = await db.prepare('SELECT id FROM elektronik WHERE id = ? AND user_id = ?').bind(elektronikId, user.id).first();
		if (!item) return handleNotFound(c, 'Elektronik not found or unauthorized');

		const validIntervalTypes = ['DAY', 'MONTH', 'YEAR', 'NONE'];
		if (intervalType && !validIntervalTypes.includes(intervalType)) {
			return handleValidationError(c, 'Invalid interval_type. Must be DAY, MONTH, YEAR, or NONE');
		}

		await db
			.prepare('INSERT INTO elektronik_service_items (elektronik_id, nama, interval_type, interval_value, last_date) VALUES (?, ?, ?, ?, ?)')
			.bind(elektronikId, nama, intervalType || 'NONE', intervalType === 'NONE' ? null : intervalValue || null, lastDate || null)
			.run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.put('/api/elektronik-service-items/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const body = await c.req.json();
		const { nama, intervalType, intervalValue, lastDate } = body;
		const db = c.env.DB;

		const serviceItem = await db
			.prepare('SELECT si.id FROM elektronik_service_items si JOIN elektronik e ON si.elektronik_id = e.id WHERE si.id = ? AND e.user_id = ?')
			.bind(id, user.id)
			.first();
		if (!serviceItem) return handleNotFound(c, 'Service item not found or unauthorized');

		const validIntervalTypes = ['DAY', 'MONTH', 'YEAR', 'NONE'];
		if (intervalType && !validIntervalTypes.includes(intervalType)) {
			return handleValidationError(c, 'Invalid interval_type. Must be DAY, MONTH, YEAR, or NONE');
		}

		await db
			.prepare('UPDATE elektronik_service_items SET nama = ?, interval_type = ?, interval_value = ?, last_date = ? WHERE id = ?')
			.bind(nama, intervalType || 'NONE', intervalType === 'NONE' ? null : intervalValue || null, lastDate || null, id)
			.run();

		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.delete('/api/elektronik-service-items/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const db = c.env.DB;

		const serviceItem = await db
			.prepare('SELECT si.id FROM elektronik_service_items si JOIN elektronik e ON si.elektronik_id = e.id WHERE si.id = ? AND e.user_id = ?')
			.bind(id, user.id)
			.first();
		if (!serviceItem) return handleNotFound(c, 'Service item not found or unauthorized');

		await db.prepare('DELETE FROM elektronik_service_items WHERE id = ?').bind(id).run();
		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

// ---- Elektronik Service History routes ----

app.post('/api/elektronik-service-history', async (c) => {
	try {
		const user = getAuthUser(c);
		const body = await c.req.json();
		const { elektronikId, serviceDate, serviceItemIds, totalCost, notes } = body;
		const db = c.env.DB;

		if (!elektronikId || !serviceDate || !serviceItemIds || serviceItemIds.length === 0) {
			return handleValidationError(c, 'elektronikId, serviceDate, and serviceItemIds are required');
		}

		if (!Array.isArray(serviceItemIds) || serviceItemIds.length > 50 || !serviceItemIds.every((id: unknown) => Number.isInteger(id) && (id as number) > 0)) {
			return handleValidationError(c, 'serviceItemIds must be an array of positive integers (max 50)');
		}

		if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
			return handleValidationError(c, 'Invalid serviceDate format. Use YYYY-MM-DD');
		}

		const item = await db.prepare('SELECT id FROM elektronik WHERE id = ? AND user_id = ?').bind(elektronikId, user.id).first();
		if (!item) return handleNotFound(c, 'Elektronik not found or unauthorized');

		const placeholders = serviceItemIds.map(() => '?').join(',');
		const validItems = await db
			.prepare(`SELECT id FROM elektronik_service_items WHERE elektronik_id = ? AND id IN (${placeholders})`)
			.bind(elektronikId, ...serviceItemIds)
			.all();

		const uniqueRequestedIds = new Set(serviceItemIds);
		if (validItems.results.length !== uniqueRequestedIds.size) {
			return handleValidationError(c, 'One or more service items are invalid or do not belong to this elektronik');
		}

		const createdAt = new Date().toISOString();

		const statements = [
			db.prepare(
				'INSERT INTO elektronik_service_history (elektronik_id, service_date, service_item_ids, total_cost, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
			).bind(elektronikId, serviceDate, JSON.stringify(serviceItemIds), totalCost || null, notes || null, createdAt),
		];

		for (const itemId of serviceItemIds) {
			statements.push(
				db.prepare('UPDATE elektronik_service_items SET last_date = ? WHERE id = ?').bind(serviceDate, itemId),
			);
		}

		await db.batch(statements);
		return c.json({ success: true });
	} catch (error) {
		return handleError(c, error);
	}
});

app.get('/api/elektronik-service-history', async (c) => {
	try {
		const user = getAuthUser(c);
		const elektronikId = c.req.query('elektronikId');
		const db = c.env.DB;

		if (!elektronikId) return handleValidationError(c, 'elektronikId is required');

		const item = await db.prepare('SELECT id FROM elektronik WHERE id = ? AND user_id = ?').bind(elektronikId, user.id).first();
		if (!item) return handleNotFound(c, 'Elektronik not found or unauthorized');

		const results = await db
			.prepare('SELECT * FROM elektronik_service_history WHERE elektronik_id = ? ORDER BY service_date DESC, created_at DESC')
			.bind(elektronikId)
			.all();

		return c.json(results);
	} catch (error) {
		return handleError(c, error);
	}
});

// SPA fallback: serve index.html for non-API routes
app.get('/*', async (c) => {
	if (c.req.path.startsWith('/api/')) {
		return handleNotFound(c, 'API endpoint not found');
	}
	return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)));
});

export default {
	fetch: app.fetch,
	// Cron: bersihkan session yang sudah expired (jadwal di wrangler.jsonc — harian jam 03:00 UTC).
	async scheduled(_event: ScheduledController, env: Bindings, ctx: ExecutionContext) {
		ctx.waitUntil(
			env.DB.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run(),
		);
	},
} satisfies ExportedHandler<Bindings>;
