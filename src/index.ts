import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Bindings = {
	DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS
app.use('/*', cors());

// API Routes
app.get('/api/health', (c) => {
	return c.json({ status: 'ok', message: 'Servis Rutin API is running' });
});

// Vehicle routes (placeholder untuk phase berikutnya)
app.get('/api/vehicles', async (c) => {
	// TODO: Implement vehicle listing
	return c.json({ vehicles: [] });
});

app.post('/api/vehicles', async (c) => {
	// TODO: Implement vehicle creation
	return c.json({ message: 'Vehicle creation endpoint' });
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
		const kendaraanId = c.req.query('kendaraanId');
		const order = c.req.query('order') || 'nama';
		const db = c.env.DB;
		
		if (!kendaraanId) {
			return c.json({ error: 'kendaraanId is required' }, 400);
		}
		
		const results = await db
			.prepare(`SELECT * FROM service_items WHERE kendaraan_id = ? ORDER BY ${order}`)
			.bind(kendaraanId)
			.all();
		
		return c.json(results);
	} catch (error) {
		console.error('Error fetching service items:', error);
		return c.json({ error: String(error) }, 500);
	}
});

app.post('/api/service-items', async (c) => {
	try {
		const body = await c.req.json();
		const { kendaraanId, nama, intervalType, intervalValue, lastKm, lastDate } = body;
		const db = c.env.DB;
		
		await db
			.prepare(
				'INSERT INTO service_items (kendaraan_id, nama, interval_type, interval_value, last_km, last_date) VALUES (?, ?, ?, ?, ?, ?)'
			)
			.bind(kendaraanId, nama, intervalType, intervalValue, lastKm, lastDate)
			.run();
		
		return c.json({ success: true });
	} catch (error) {
		console.error('Error creating service item:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

export default app;
