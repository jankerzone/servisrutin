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
			.prepare('INSERT INTO kendaraan (nama, tipe, plat, tahun, bulan_pajak, current_km) VALUES (?, ?, ?, ?, ?, ?)')
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
		const kendaraanId = c.req.query('kendaraanId');
		const order = c.req.query('order') || 'nama';
		const db = c.env.DB;

		if (!kendaraanId) {
			return c.json({ error: 'kendaraanId is required' }, 400);
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
		const body = await c.req.json();
		const { kendaraanId, nama, intervalType, intervalValue, lastKm, lastDate } = body;
		const db = c.env.DB;

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
		const id = c.req.param('id');
		const body = await c.req.json();
		const { nama, intervalType, intervalValue, lastKm, lastDate } = body;
		const db = c.env.DB;

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
		const id = c.req.param('id');
		const db = c.env.DB;

		await db.prepare('DELETE FROM service_items WHERE id = ?').bind(id).run();

		return c.json({ success: true });
	} catch (error) {
		console.error('Error deleting service item:', error);
		return c.json({ success: false, error: String(error) }, 500);
	}
});

app.delete('/api/vehicles/:id', async (c) => {
	try {
		const id = c.req.param('id');
		const db = c.env.DB;

		// First delete all service items associated with this vehicle
		await db.prepare('DELETE FROM service_items WHERE kendaraan_id = ?').bind(id).run();

		// Then delete the vehicle
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
		const body = await c.req.json();
		const { kendaraanId, serviceDate, odometerKm, serviceItemIds, totalCost, notes } = body;
		const db = c.env.DB;

		if (!kendaraanId || !serviceDate || !odometerKm || !serviceItemIds || serviceItemIds.length === 0) {
			return c.json({ error: 'Missing required fields' }, 400);
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
		const kendaraanId = c.req.query('kendaraanId');
		const db = c.env.DB;

		if (!kendaraanId) {
			return c.json({ error: 'kendaraanId is required' }, 400);
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
