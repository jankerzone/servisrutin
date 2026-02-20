import { Hono } from 'hono';
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
		// TODO: Restrict to actual frontend domain in production
		origin: (origin) => origin,
		credentials: true,
	}),
);

// API Routes
app.get('/api/health', (c) => {
	return c.json({ status: 'ok', message: 'Servis Rutin API is running' });
});

// Auth routes (public)
app.post('/api/auth/signup', async (c) => {
	try {
		const body = await c.req.json();
		const { email, password, name, turnstileToken } = body;

		if (!email || !password) {
			return handleValidationError(c, 'Email and password are required');
		}

		if (!isValidEmail(email)) {
			return handleValidationError(c, 'Invalid email format');
		}

		if (!isValidPassword(password)) {
			return handleValidationError(c, 'Password must be at least 8 characters long and contain both letters and numbers');
		}

		// Verify Turnstile token
		if (!turnstileToken) {
			return handleValidationError(c, 'Verifikasi keamanan diperlukan');
		}
		const ip = c.req.header('CF-Connecting-IP');
		const turnstileOk = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, ip);
		if (!turnstileOk) {
			return c.json({ error: 'Verifikasi keamanan gagal. Silakan coba lagi.' }, 403);
		}

		const db = c.env.DB;

		const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

		if (existingUser) {
			return handleValidationError(c, 'Email already registered');
		}

		const passwordHash = await hashPassword(password);
		const createdAt = new Date().toISOString();

		const result = await db
			.prepare('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)')
			.bind(email, passwordHash, name || null, createdAt)
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

		return c.json({ success: true, user: { id: userId, email, name } });
	} catch (error) {
		return handleError(c, error);
	}
});

app.post('/api/auth/login', async (c) => {
	try {
		const body = await c.req.json();
		const { email, password, turnstileToken } = body;

		if (!email || !password) {
			return handleValidationError(c, 'Email and password are required');
		}

		// Verify Turnstile token
		if (!turnstileToken) {
			return handleValidationError(c, 'Verifikasi keamanan diperlukan');
		}
		const ip = c.req.header('CF-Connecting-IP');
		const turnstileOk = await verifyTurnstile(turnstileToken, c.env.TURNSTILE_SECRET_KEY, ip);
		if (!turnstileOk) {
			return c.json({ error: 'Verifikasi keamanan gagal. Silakan coba lagi.' }, 403);
		}

		const db = c.env.DB;

		const user = await db.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').bind(email).first();

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

// Update profile (Name, Avatar)
app.put('/api/profile', async (c) => {
	try {
		const sessionId = getCookie(c, 'session_id');
		const user = await getSessionUser(c.env.DB, sessionId);

		if (!user) {
			return handleUnauthorized(c);
		}

		const body = await c.req.json();
		const { name, avatarUrl } = body;

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
		const sessionId = getCookie(c, 'session_id');
		const user = await getSessionUser(c.env.DB, sessionId);

		if (!user) {
			return handleUnauthorized(c);
		}

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

// Protected routes - require authentication
app.use('/api/*', async (c, next) => {
	const path = c.req.path;
	if (path.startsWith('/api/auth/') || path === '/api/health') {
		return next();
	}
	return authMiddleware(c, next);
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

		const result = await db
			.prepare('INSERT INTO kendaraan (user_id, nama, tipe, plat, tahun, bulan_pajak, current_km) VALUES (?, ?, ?, ?, ?, ?, ?)')
			.bind(user.id, nama, tipe, plat, tahun, bulanPajak, normalizedCurrentKm)
			.run();

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

export default app;
