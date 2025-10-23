import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { hashPassword, verifyPassword, createSession, getSessionUser, deleteSession, authMiddleware, getAuthUser } from './auth';

type Bindings = {
	DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS with credentials
app.use('/*', cors({
	origin: (origin) => origin,
	credentials: true,
}));

// API Routes
app.get('/api/health', (c) => {
	return c.json({ status: 'ok', message: 'Servis Rutin API is running' });
});

// Debug endpoint to check cookies
app.get('/api/debug/cookies', (c) => {
	const cookieHeader = c.req.header('Cookie');
	const sessionCookie = getCookie(c, 'session_id');
	console.log('Debug - Cookie header:', cookieHeader);
	console.log('Debug - session_id cookie:', sessionCookie);
	return c.json({ 
		cookieHeader,
		sessionCookie,
		allHeaders: Object.fromEntries(c.req.raw.headers.entries())
	});
});

// Auth routes (public)
app.post('/api/auth/signup', async (c) => {
	try {
		const body = await c.req.json();
		const { email, password, name } = body;

		if (!email || !password) {
			return c.json({ error: 'Email and password are required' }, 400);
		}

		const db = c.env.DB;

		// Check if user already exists
		const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();

		if (existingUser) {
			return c.json({ error: 'Email already registered' }, 400);
		}

		// Hash password and create user
		const passwordHash = await hashPassword(password);
		const createdAt = new Date().toISOString();

		const result = await db
			.prepare('INSERT INTO users (email, password_hash, name, created_at) VALUES (?, ?, ?, ?)')
			.bind(email, passwordHash, name || null, createdAt)
			.run();

		// Create session
		const userId = result.meta.last_row_id;
		const sessionId = await createSession(db, userId);
		console.log('Signup - Created session:', sessionId, 'for user:', userId);

		// Set cookie
		setCookie(c, 'session_id', sessionId, {
			httpOnly: true,
			secure: true, // HTTPS only (use false for localhost development)
			sameSite: 'Lax',
			maxAge: 30 * 24 * 60 * 60, // 30 days
			path: '/',
		});
		console.log('Signup - Cookie set for session:', sessionId);

		return c.json({ success: true, user: { id: userId, email, name } });
	} catch (error) {
		console.error('Error during signup:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

app.post('/api/auth/login', async (c) => {
	try {
		const body = await c.req.json();
		const { email, password } = body;

		if (!email || !password) {
			return c.json({ error: 'Email and password are required' }, 400);
		}

		const db = c.env.DB;

		// Find user
		const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();

		if (!user) {
			return c.json({ error: 'Invalid email or password' }, 401);
		}

		// Verify password
		const isValid = await verifyPassword(password, user.password_hash as string);

		if (!isValid) {
			return c.json({ error: 'Invalid email or password' }, 401);
		}

		// Create session
		const sessionId = await createSession(db, user.id as number);
		console.log('Login - Created session:', sessionId, 'for user:', user.id);

		// Set cookie
		setCookie(c, 'session_id', sessionId, {
			httpOnly: true,
			secure: true, // HTTPS only (use false for localhost development)
			sameSite: 'Lax',
			maxAge: 30 * 24 * 60 * 60, // 30 days
			path: '/',
		});
		console.log('Login - Cookie set for session:', sessionId);

		return c.json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
	} catch (error) {
		console.error('Error during login:', error);
		return c.json({ success: false, error: String(error) }, 500);
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
		console.error('Error during logout:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

app.get('/api/auth/me', async (c) => {
	try {
		const sessionId = getCookie(c, 'session_id');
		const user = await getSessionUser(c.env.DB, sessionId);

		if (!user) {
			return c.json({ user: null });
		}

		return c.json({ user: { id: user.id, email: user.email, name: user.name } });
	} catch (error) {
		console.error('Error fetching current user:', error);
		return c.json({ user: null }, 500);
	}
});

// Protected routes - require authentication
// Apply middleware to all /api/* routes except auth routes
app.use('/api/*', async (c, next) => {
	// Skip auth for public endpoints
	const path = c.req.path;
	if (path.startsWith('/api/auth/') || path === '/api/health' || path === '/api/debug/cookies') {
		return next();
	}
	// Apply auth middleware for protected routes
	return authMiddleware(c, next);
});

// Vehicle routes
app.get('/api/vehicles', async (c) => {
	try {
		const user = getAuthUser(c);
		const db = c.env.DB;
		const results = await db.prepare('SELECT * FROM kendaraan WHERE user_id = ? ORDER BY nama').bind(user.id).all();
		return c.json(results);
	} catch (error) {
		console.error('Error fetching vehicles:', error);
		return c.json({ error: String(error) }, 500);
	}
});

app.post('/api/vehicles', async (c) => {
	try {
		const user = getAuthUser(c);
		console.log('User from context:', user);
		
		if (!user || !user.id) {
			console.error('No user in context');
			return c.json({ success: false, error: 'User not authenticated' }, 401);
		}

		const body = await c.req.json();
		const { nama, tipe, plat, tahun, bulanPajak, currentKm } = body;
		const db = c.env.DB;

		const result = await db
			.prepare('INSERT INTO kendaraan (user_id, nama, tipe, plat, tahun, bulan_pajak, current_km) VALUES (?, ?, ?, ?, ?, ?, ?)')
			.bind(user.id, nama, tipe, plat, tahun, bulanPajak, currentKm || 0)
			.run();

		return c.json({ success: true, result });
	} catch (error) {
		console.error('Error creating vehicle:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

app.put('/api/vehicles/:id/km', async (c) => {
	try {
		const id = c.req.param('id');
		const body = await c.req.json();
		const { currentKm } = body;
		const db = c.env.DB;

		await db.prepare('UPDATE kendaraan SET current_km = ? WHERE id = ?').bind(currentKm, id).run();

		return c.json({ success: true });
	} catch (error) {
		console.error('Error updating vehicle km:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

// Service item routes (placeholder untuk phase berikutnya)
app.get('/api/vehicles/:vehicleId/services', async (c) => {
	// TODO: Implement service items listing
	return c.json({ services: [] });
});

app.post('/api/vehicles/:vehicleId/services', async (c) => {
	// TODO: Implement service item creation
	return c.json({ message: 'Service item creation endpoint' });
});

app.get('/api/service-items', async (c) => {
	try {
		const user = getAuthUser(c);
		const kendaraanId = c.req.query('kendaraanId');
		const order = c.req.query('order') || 'nama';
		const db = c.env.DB;

		if (!kendaraanId) {
			return c.json({ error: 'kendaraanId is required' }, 400);
		}

		// Verify user owns this vehicle
		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();

		if (!vehicle) {
			return c.json({ error: 'Vehicle not found or unauthorized' }, 404);
		}

		const results = await db.prepare(`SELECT * FROM service_items WHERE kendaraan_id = ? ORDER BY ${order}`).bind(kendaraanId).all();

		return c.json(results);
	} catch (error) {
		console.error('Error fetching service items:', error);
		return c.json({ error: String(error) }, 500);
	}
});

app.post('/api/service-items', async (c) => {
	try {
		const user = getAuthUser(c);
		const body = await c.req.json();
		const { kendaraanId, nama, intervalType, intervalValue, lastKm, lastDate } = body;
		const db = c.env.DB;

		// Verify user owns this vehicle
		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();

		if (!vehicle) {
			return c.json({ error: 'Vehicle not found or unauthorized' }, 404);
		}

		await db
			.prepare(
				'INSERT INTO service_items (kendaraan_id, nama, interval_type, interval_value, last_km, last_date) VALUES (?, ?, ?, ?, ?, ?)',
			)
			.bind(kendaraanId, nama, intervalType, intervalValue, lastKm, lastDate)
			.run();

		return c.json({ success: true });
	} catch (error) {
		console.error('Error creating service item:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

app.put('/api/service-items/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const body = await c.req.json();
		const { nama, intervalType, intervalValue, lastKm, lastDate } = body;
		const db = c.env.DB;

		// Verify user owns the vehicle this service item belongs to
		const serviceItem = await db
			.prepare(
				'SELECT si.id FROM service_items si JOIN kendaraan k ON si.kendaraan_id = k.id WHERE si.id = ? AND k.user_id = ?',
			)
			.bind(id, user.id)
			.first();

		if (!serviceItem) {
			return c.json({ error: 'Service item not found or unauthorized' }, 404);
		}

		await db
			.prepare('UPDATE service_items SET nama = ?, interval_type = ?, interval_value = ?, last_km = ?, last_date = ? WHERE id = ?')
			.bind(nama, intervalType, intervalValue, lastKm, lastDate, id)
			.run();

		return c.json({ success: true });
	} catch (error) {
		console.error('Error updating service item:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

app.delete('/api/service-items/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const db = c.env.DB;

		// Verify user owns the vehicle this service item belongs to
		const serviceItem = await db
			.prepare(
				'SELECT si.id FROM service_items si JOIN kendaraan k ON si.kendaraan_id = k.id WHERE si.id = ? AND k.user_id = ?',
			)
			.bind(id, user.id)
			.first();

		if (!serviceItem) {
			return c.json({ error: 'Service item not found or unauthorized' }, 404);
		}

		await db.prepare('DELETE FROM service_items WHERE id = ?').bind(id).run();

		return c.json({ success: true });
	} catch (error) {
		console.error('Error deleting service item:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

app.delete('/api/vehicles/:id', async (c) => {
	try {
		const user = getAuthUser(c);
		const id = c.req.param('id');
		const db = c.env.DB;

		// Verify ownership
		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(id, user.id).first();

		if (!vehicle) {
			return c.json({ error: 'Vehicle not found or unauthorized' }, 404);
		}

		// First delete all service history
		await db.prepare('DELETE FROM service_history WHERE kendaraan_id = ?').bind(id).run();

		// Then delete all service items associated with this vehicle
		await db.prepare('DELETE FROM service_items WHERE kendaraan_id = ?').bind(id).run();

		// Finally delete the vehicle
		await db.prepare('DELETE FROM kendaraan WHERE id = ?').bind(id).run();

		return c.json({ success: true });
	} catch (error) {
		console.error('Error deleting vehicle:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

// Service history routes
app.post('/api/service-history', async (c) => {
	try {
		const user = getAuthUser(c);
		const body = await c.req.json();
		const { kendaraanId, serviceDate, odometerKm, serviceItemIds, totalCost, notes } = body;
		const db = c.env.DB;

		if (!kendaraanId || !serviceDate || !odometerKm || !serviceItemIds || serviceItemIds.length === 0) {
			return c.json({ error: 'Missing required fields' }, 400);
		}

		// Verify user owns this vehicle
		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();

		if (!vehicle) {
			return c.json({ error: 'Vehicle not found or unauthorized' }, 404);
		}

		const createdAt = new Date().toISOString();

		// Insert service history record
		await db
			.prepare(
				'INSERT INTO service_history (kendaraan_id, service_date, odometer_km, service_item_ids, total_cost, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
			)
			.bind(kendaraanId, serviceDate, odometerKm, JSON.stringify(serviceItemIds), totalCost || null, notes || null, createdAt)
			.run();

		// Update last_km and last_date for each service item to reset progress
		for (const itemId of serviceItemIds) {
			await db
				.prepare('UPDATE service_items SET last_km = ?, last_date = ? WHERE id = ?')
				.bind(odometerKm, serviceDate, itemId)
				.run();
		}

		// Update vehicle's current_km if the odometer reading is higher
		const vehicleResult = await db.prepare('SELECT current_km FROM kendaraan WHERE id = ?').bind(kendaraanId).first();
		if (vehicleResult && odometerKm > (vehicleResult.current_km || 0)) {
			await db.prepare('UPDATE kendaraan SET current_km = ? WHERE id = ?').bind(odometerKm, kendaraanId).run();
		}

		return c.json({ success: true });
	} catch (error) {
		console.error('Error creating service history:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

app.get('/api/service-history', async (c) => {
	try {
		const user = getAuthUser(c);
		const kendaraanId = c.req.query('kendaraanId');
		const db = c.env.DB;

		if (!kendaraanId) {
			return c.json({ error: 'kendaraanId is required' }, 400);
		}

		// Verify user owns this vehicle
		const vehicle = await db.prepare('SELECT id FROM kendaraan WHERE id = ? AND user_id = ?').bind(kendaraanId, user.id).first();

		if (!vehicle) {
			return c.json({ error: 'Vehicle not found or unauthorized' }, 404);
		}

		const results = await db
			.prepare('SELECT * FROM service_history WHERE kendaraan_id = ? ORDER BY service_date DESC, created_at DESC')
			.bind(kendaraanId)
			.all();

		return c.json(results);
	} catch (error) {
		console.error('Error fetching service history:', error);
		return c.json({ error: String(error) }, 500);
	}
});

export default app;
