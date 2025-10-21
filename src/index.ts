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

export default app;
