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

// Vehicle routes
app.get('/api/vehicles', async (c) => {
	try {
		const db = c.env.DB;
		const results = await db.prepare('SELECT * FROM kendaraan ORDER BY nama').all();
		return c.json(results);
	} catch (error) {
		console.error('Error fetching vehicles:', error);
		return c.json({ error: String(error) }, 500);
	}
});

app.post('/api/vehicles', async (c) => {
	try {
		const body = await c.req.json();
		const { nama, tipe, plat, tahun, bulanPajak, currentKm } = body;
		const db = c.env.DB;
		
		await db
			.prepare(
				'INSERT INTO kendaraan (nama, tipe, plat, tahun, bulan_pajak, current_km) VALUES (?, ?, ?, ?, ?, ?)'
			)
			.bind(nama, tipe, plat, tahun, bulanPajak, currentKm || 0)
			.run();
		
		return c.json({ success: true });
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
		
		await db
			.prepare('UPDATE kendaraan SET current_km = ? WHERE id = ?')
			.bind(currentKm, id)
			.run();
		
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

app.put('/api/service-items/:id', async (c) => {
	try {
		const id = c.req.param('id');
		const body = await c.req.json();
		const { nama, intervalType, intervalValue, lastKm, lastDate } = body;
		const db = c.env.DB;
		
		await db
			.prepare(
				'UPDATE service_items SET nama = ?, interval_type = ?, interval_value = ?, last_km = ?, last_date = ? WHERE id = ?'
			)
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
		const id = c.req.param('id');
		const db = c.env.DB;
		
		await db
			.prepare('DELETE FROM service_items WHERE id = ?')
			.bind(id)
			.run();
		
		return c.json({ success: true });
	} catch (error) {
		console.error('Error deleting service item:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

export default app;
