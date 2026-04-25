# Elektronik Service Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Elektronik" category alongside kendaraan so users can track time-based routine services for electronics like AC, kulkas, TV.

**Architecture:** Three new D1 tables (elektronik, elektronik_service_items, elektronik_service_history) fully separate from kendaraan tables. Nine new API routes in src/index.ts. New React pages at /elektronik and /elektronik/:id. Dashboard updated to combine stats from both categories.

**Tech Stack:** Hono (Cloudflare Workers), D1 (SQLite), Drizzle ORM, React 19, TypeScript, Vitest, lucide-react, shadcn/ui

---

## File Map

**Create:**
- `migrations/0010_add_elektronik.sql`
- `client/src/components/elektronik/ElektronikPage.tsx`
- `client/src/components/elektronik/ElektronikForm.tsx`
- `client/src/components/elektronik/ElektronikDetailPage.tsx`
- `client/src/components/elektronik/ElektronikServiceItemForm.tsx`
- `client/src/components/elektronik/ElektronikServiceItemList.tsx`
- `client/src/components/elektronik/AddElektronikHistoryForm.tsx`
- `client/src/hooks/useElektronik.ts`
- `client/src/hooks/useElektronikServiceItems.ts`
- `client/src/hooks/useElektronikServiceHistory.ts`

**Modify:**
- `src/db/schema.ts` — add 3 new Drizzle table definitions
- `src/index.ts` — add 9 new API routes
- `client/src/types/index.ts` — add Elektronik types + transformers
- `client/src/App.tsx` — add /elektronik and /elektronik/:id routes
- `client/src/components/layout/Sidebar.tsx` — add Elektronik nav item
- `client/src/components/dashboard/DashboardPage.tsx` — add elektronik stats + Servis Mendatang

---

### Task 1: DB Migration

**Files:**
- Create: `migrations/0010_add_elektronik.sql`

- [ ] **Step 1: Write migration SQL**

Create `migrations/0010_add_elektronik.sql`:

```sql
CREATE TABLE `elektronik` (
	`id` integer PRIMARY KEY NOT NULL,
	`short_id` text UNIQUE,
	`user_id` integer NOT NULL,
	`nama` text NOT NULL,
	`tipe` text,
	`lokasi` text,
	`tahun_beli` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `elektronik_service_items` (
	`id` integer PRIMARY KEY NOT NULL,
	`elektronik_id` integer NOT NULL,
	`nama` text NOT NULL,
	`interval_type` text,
	`interval_value` integer,
	`last_date` text,
	FOREIGN KEY (`elektronik_id`) REFERENCES `elektronik`(`id`) ON UPDATE no action ON DELETE no action
);

CREATE TABLE `elektronik_service_history` (
	`id` integer PRIMARY KEY NOT NULL,
	`elektronik_id` integer NOT NULL,
	`service_date` text NOT NULL,
	`service_item_ids` text NOT NULL,
	`total_cost` integer,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`elektronik_id`) REFERENCES `elektronik`(`id`) ON UPDATE no action ON DELETE no action
);
```

- [ ] **Step 2: Apply migration to local D1**

```bash
npm run db:migrate
```

Expected output: `✅ Applied 1 migration(s)` (or similar wrangler output confirming the migration ran).

- [ ] **Step 3: Commit**

```bash
git add migrations/0010_add_elektronik.sql
git commit -m "feat: add elektronik service tracking database migration"
```

---

### Task 2: Drizzle Schema

**Files:**
- Modify: `src/db/schema.ts`

- [ ] **Step 1: Add three new table definitions**

Append to the end of `src/db/schema.ts`:

```typescript
export const elektronik = sqliteTable('elektronik', {
	id: integer('id').primaryKey(),
	shortId: text('short_id').unique(),
	userId: integer('user_id').notNull().references(() => users.id),
	nama: text('nama').notNull(),
	tipe: text('tipe'),
	lokasi: text('lokasi'),
	tahunBeli: integer('tahun_beli'),
});

export const elektronikServiceItems = sqliteTable('elektronik_service_items', {
	id: integer('id').primaryKey(),
	elektronikId: integer('elektronik_id').notNull().references(() => elektronik.id),
	nama: text('nama').notNull(),
	intervalType: text('interval_type'),
	intervalValue: integer('interval_value'),
	lastDate: text('last_date'),
});

export const elektronikServiceHistory = sqliteTable('elektronik_service_history', {
	id: integer('id').primaryKey(),
	elektronikId: integer('elektronik_id').notNull().references(() => elektronik.id),
	serviceDate: text('service_date').notNull(),
	serviceItemIds: text('service_item_ids').notNull(),
	totalCost: integer('total_cost'),
	notes: text('notes'),
	createdAt: text('created_at').notNull(),
});
```

- [ ] **Step 2: Commit**

```bash
git add src/db/schema.ts
git commit -m "feat: add elektronik drizzle schema definitions"
```

---

### Task 3: Frontend Types

**Files:**
- Modify: `client/src/types/index.ts`

- [ ] **Step 1: Add Elektronik types and transformers**

Append to the end of `client/src/types/index.ts`:

```typescript
// ---- Elektronik ----
export interface Elektronik {
	id: number;
	shortId?: string;
	nama: string;
	tipe: string | null;
	lokasi: string | null;
	tahunBeli: number | null;
}

export interface ElektronikPayload {
	nama: string;
	tipe: string | null;
	lokasi: string | null;
	tahunBeli: number | null;
}

// ---- Elektronik Service Item ----
export type ElektronikIntervalType = 'DAY' | 'MONTH' | 'YEAR' | 'NONE';

export interface ElektronikServiceItem {
	id: number;
	elektronikId: number;
	nama: string;
	intervalType: ElektronikIntervalType | null;
	intervalValue: number | null;
	lastDate: string | null;
}

export interface ElektronikServiceItemPayload {
	elektronikId: number;
	nama: string;
	intervalType: ElektronikIntervalType;
	intervalValue: number | null;
	lastDate: string | null;
}

// ---- Elektronik Service History ----
export interface ElektronikServiceHistory {
	id: number;
	elektronikId: number;
	serviceDate: string;
	serviceItemIds: number[];
	serviceItemNames?: string[];
	totalCost: number | null;
	notes: string | null;
	createdAt: string;
}

export interface ElektronikServiceHistoryPayload {
	elektronikId: number;
	serviceDate: string;
	serviceItemIds: number[];
	totalCost: number | null;
	notes: string | null;
}

// ---- DB row types (snake_case from API) ----
export interface ElektronikRow {
	id: number;
	short_id?: string;
	user_id: number;
	nama: string;
	tipe: string | null;
	lokasi: string | null;
	tahun_beli: number | null;
}

export interface ElektronikServiceItemRow {
	id: number;
	elektronik_id: number;
	nama: string;
	interval_type: string | null;
	interval_value: number | null;
	last_date: string | null;
}

export interface ElektronikServiceHistoryRow {
	id: number;
	elektronik_id: number;
	service_date: string;
	service_item_ids: string;
	total_cost: number | null;
	notes: string | null;
	created_at: string;
}

// ---- Transformers ----
export function toElektronik(row: ElektronikRow): Elektronik {
	return {
		id: row.id,
		shortId: row.short_id,
		nama: row.nama,
		tipe: row.tipe,
		lokasi: row.lokasi,
		tahunBeli: row.tahun_beli,
	};
}

export function toElektronikServiceItem(row: ElektronikServiceItemRow): ElektronikServiceItem {
	return {
		id: row.id,
		elektronikId: row.elektronik_id,
		nama: row.nama,
		intervalType: row.interval_type as ElektronikIntervalType | null,
		intervalValue: row.interval_value,
		lastDate: row.last_date,
	};
}

export function toElektronikServiceHistory(row: ElektronikServiceHistoryRow): ElektronikServiceHistory {
	return {
		id: row.id,
		elektronikId: row.elektronik_id,
		serviceDate: row.service_date,
		serviceItemIds: JSON.parse(row.service_item_ids),
		totalCost: row.total_cost,
		notes: row.notes,
		createdAt: row.created_at,
	};
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/types/index.ts
git commit -m "feat: add Elektronik TypeScript types and transformers"
```

---

### Task 4: Backend — Elektronik CRUD Routes

**Files:**
- Modify: `src/index.ts`
- Modify: `test/index.spec.ts`

- [ ] **Step 1: Write auth test for new endpoint**

Add to `test/index.spec.ts` inside the `describe('Servis Rutin API', ...)` block:

```typescript
describe('Elektronik API', () => {
  it('GET /api/elektronik requires authentication', async () => {
    const request = new Request('http://example.com/api/elektronik');
    const response = await SELF.fetch(request);
    expect(response.status).toBe(401);
  });
});
```

- [ ] **Step 2: Run test to verify it passes (auth middleware already covers this)**

```bash
npm test
```

Expected: all tests pass including the new one.

- [ ] **Step 3: Add Elektronik CRUD routes to `src/index.ts`**

Add after the `// ---- Tax Payment routes ----` section and before the SPA fallback route:

```typescript
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
```

- [ ] **Step 4: Run tests to verify they still pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts test/index.spec.ts
git commit -m "feat: add Elektronik CRUD API routes"
```

---

### Task 5: Backend — Elektronik Service Items Routes

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add service items routes directly after the Elektronik CRUD routes**

```typescript
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
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add Elektronik service items CRUD API routes"
```

---

### Task 6: Backend — Elektronik Service History Routes

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Add service history routes after the service items routes**

```typescript
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

		if (!/^\d{4}-\d{2}-\d{2}$/.test(serviceDate)) {
			return handleValidationError(c, 'Invalid serviceDate format. Use YYYY-MM-DD');
		}

		const item = await db.prepare('SELECT id FROM elektronik WHERE id = ? AND user_id = ?').bind(elektronikId, user.id).first();
		if (!item) return handleNotFound(c, 'Elektronik not found or unauthorized');

		// Verify all service items belong to this elektronik
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

		// Update last_date for each serviced item
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
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/index.ts
git commit -m "feat: add Elektronik service history API routes"
```

---

### Task 7: Frontend Hooks

**Files:**
- Create: `client/src/hooks/useElektronik.ts`
- Create: `client/src/hooks/useElektronikServiceItems.ts`
- Create: `client/src/hooks/useElektronikServiceHistory.ts`

- [ ] **Step 1: Create `useElektronik.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Elektronik, ElektronikPayload, ElektronikRow, D1Response } from '@/types';
import { toElektronik } from '@/types';

export function useElektronik() {
	const [items, setItems] = useState<Elektronik[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchElektronik = useCallback(async () => {
		try {
			setLoading(true);
			const data = await api.get<D1Response<ElektronikRow>>('/api/elektronik');
			setItems((data.results || []).map(toElektronik));
		} catch (error) {
			console.error('Error fetching elektronik:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchElektronik();
	}, [fetchElektronik]);

	const addElektronik = async (payload: ElektronikPayload) => {
		const result = await api.post<{ success: boolean; result: { meta: { last_row_id: number } } }>('/api/elektronik', payload);
		await fetchElektronik();
		return result;
	};

	const updateElektronik = async (id: number, payload: ElektronikPayload) => {
		await api.put(`/api/elektronik/${id}`, payload);
		await fetchElektronik();
	};

	const deleteElektronik = async (id: number) => {
		await api.delete(`/api/elektronik/${id}`);
		await fetchElektronik();
	};

	return { items, loading, fetchElektronik, addElektronik, updateElektronik, deleteElektronik };
}
```

- [ ] **Step 2: Create `useElektronikServiceItems.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ElektronikServiceItem, ElektronikServiceItemPayload, ElektronikServiceItemRow, D1Response } from '@/types';
import { toElektronikServiceItem } from '@/types';

export function useElektronikServiceItems(elektronikId: number | null) {
	const [items, setItems] = useState<ElektronikServiceItem[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchItems = useCallback(async () => {
		if (!elektronikId) return;
		try {
			setLoading(true);
			const data = await api.get<D1Response<ElektronikServiceItemRow>>(
				`/api/elektronik-service-items?elektronikId=${elektronikId}`,
			);
			setItems((data.results || []).map(toElektronikServiceItem));
		} catch (error) {
			console.error('Error fetching elektronik service items:', error);
		} finally {
			setLoading(false);
		}
	}, [elektronikId]);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	const addItem = async (payload: ElektronikServiceItemPayload) => {
		await api.post('/api/elektronik-service-items', payload);
		await fetchItems();
	};

	const updateItem = async (id: number, payload: Omit<ElektronikServiceItemPayload, 'elektronikId'>) => {
		await api.put(`/api/elektronik-service-items/${id}`, payload);
		await fetchItems();
	};

	const deleteItem = async (id: number) => {
		await api.delete(`/api/elektronik-service-items/${id}`);
		await fetchItems();
	};

	return { items, loading, fetchItems, addItem, updateItem, deleteItem };
}
```

- [ ] **Step 3: Create `useElektronikServiceHistory.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ElektronikServiceHistory, ElektronikServiceHistoryPayload, ElektronikServiceHistoryRow, D1Response } from '@/types';
import { toElektronikServiceHistory } from '@/types';

export function useElektronikServiceHistory(elektronikId: number | null) {
	const [history, setHistory] = useState<ElektronikServiceHistory[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchHistory = useCallback(async () => {
		if (!elektronikId) return;
		try {
			setLoading(true);
			const data = await api.get<D1Response<ElektronikServiceHistoryRow>>(
				`/api/elektronik-service-history?elektronikId=${elektronikId}`,
			);
			setHistory((data.results || []).map(toElektronikServiceHistory));
		} catch (error) {
			console.error('Error fetching elektronik service history:', error);
		} finally {
			setLoading(false);
		}
	}, [elektronikId]);

	useEffect(() => {
		fetchHistory();
	}, [fetchHistory]);

	const addHistory = async (payload: ElektronikServiceHistoryPayload) => {
		await api.post('/api/elektronik-service-history', payload);
		await fetchHistory();
	};

	return { history, loading, fetchHistory, addHistory };
}

export function useAllElektronikServiceHistory(elektronikIds: number[]) {
	const [history, setHistory] = useState<ElektronikServiceHistory[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchAll = useCallback(async () => {
		if (elektronikIds.length === 0) return;
		try {
			setLoading(true);
			const results = await Promise.all(
				elektronikIds.map((id) =>
					api.get<D1Response<ElektronikServiceHistoryRow>>(`/api/elektronik-service-history?elektronikId=${id}`),
				),
			);
			const all = results.flatMap((r) => (r.results || []).map(toElektronikServiceHistory));
			all.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
			setHistory(all);
		} catch (error) {
			console.error('Error fetching all elektronik service history:', error);
		} finally {
			setLoading(false);
		}
	}, [elektronikIds.join(',')]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	return { history, loading, fetchAll };
}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/hooks/useElektronik.ts client/src/hooks/useElektronikServiceItems.ts client/src/hooks/useElektronikServiceHistory.ts
git commit -m "feat: add Elektronik React hooks"
```

---

### Task 8: ElektronikServiceItemForm Component

**Files:**
- Create: `client/src/components/elektronik/ElektronikServiceItemForm.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { ElektronikIntervalType, ElektronikServiceItemPayload, ElektronikServiceItem } from '@/types';

interface ElektronikServiceItemFormProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: Omit<ElektronikServiceItemPayload, 'elektronikId'>) => Promise<void>;
	item?: ElektronikServiceItem;
}

const INTERVAL_LABELS: Record<ElektronikIntervalType, string> = {
	DAY: 'Hari',
	MONTH: 'Bulan',
	YEAR: 'Tahun',
	NONE: 'Tidak Ada',
};

export default function ElektronikServiceItemForm({ open, onClose, onSubmit, item }: ElektronikServiceItemFormProps) {
	const [nama, setNama] = useState(item?.nama || '');
	const [intervalType, setIntervalType] = useState<ElektronikIntervalType>(
		(item?.intervalType as ElektronikIntervalType) || 'MONTH',
	);
	const [intervalValue, setIntervalValue] = useState(item?.intervalValue?.toString() || '');
	const [lastDate, setLastDate] = useState(item?.lastDate || '');
	const [loading, setLoading] = useState(false);

	const isEdit = !!item;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nama) return;
		setLoading(true);
		try {
			await onSubmit({
				nama,
				intervalType,
				intervalValue: intervalType === 'NONE' ? null : parseInt(intervalValue) || null,
				lastDate: lastDate || null,
			});
			if (!isEdit) {
				setNama('');
				setIntervalType('MONTH');
				setIntervalValue('');
				setLastDate('');
			}
		} catch (error) {
			console.error('Error saving service item:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Item Servis' : 'Tambah Item Servis'}</DialogTitle>
					<DialogDescription>
						{isEdit ? 'Ubah detail item servis' : 'Definisikan item servis baru untuk elektronik ini'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label>Nama Servis *</Label>
						<Input
							value={nama}
							onChange={(e) => setNama(e.target.value)}
							placeholder="cth. Cuci AC, Ganti Filter"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label>Tipe Interval</Label>
						<Select value={intervalType} onValueChange={(v) => setIntervalType(v as ElektronikIntervalType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(INTERVAL_LABELS) as ElektronikIntervalType[]).map((type) => (
									<SelectItem key={type} value={type}>
										{INTERVAL_LABELS[type]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{intervalType !== 'NONE' && (
						<div className="space-y-2">
							<Label>
								Nilai Interval
								{intervalType === 'DAY' && ' (hari)'}
								{intervalType === 'MONTH' && ' (bulan)'}
								{intervalType === 'YEAR' && ' (tahun)'}
							</Label>
							<Input
								type="number"
								value={intervalValue}
								onChange={(e) => setIntervalValue(e.target.value)}
								placeholder="cth. 3"
								required
							/>
						</div>
					)}

					<div className="space-y-2">
						<Label>Tanggal Terakhir Servis</Label>
						<Input
							type="date"
							value={lastDate}
							onChange={(e) => setLastDate(e.target.value)}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>Batal</Button>
						<Button type="submit" disabled={loading || !nama}>
							{loading ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/elektronik/ElektronikServiceItemForm.tsx
git commit -m "feat: add ElektronikServiceItemForm component"
```

---

### Task 9: AddElektronikHistoryForm Component

**Files:**
- Create: `client/src/components/elektronik/AddElektronikHistoryForm.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { todayISO } from '@/lib/utils';
import type { ElektronikServiceItem } from '@/types';

interface AddElektronikHistoryFormProps {
	open: boolean;
	onClose: () => void;
	elektronikId: number;
	serviceItems: ElektronikServiceItem[];
	onSuccess: () => void;
}

export default function AddElektronikHistoryForm({
	open, onClose, elektronikId, serviceItems, onSuccess,
}: AddElektronikHistoryFormProps) {
	const [serviceDate, setServiceDate] = useState(todayISO());
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [totalCost, setTotalCost] = useState('');
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleToggle = (id: number) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedIds.length === 0) {
			setError('Pilih minimal satu item servis');
			return;
		}
		setLoading(true);
		setError('');
		try {
			await api.post('/api/elektronik-service-history', {
				elektronikId,
				serviceDate,
				serviceItemIds: selectedIds,
				totalCost: totalCost ? parseInt(totalCost) : null,
				notes: notes || null,
			});
			resetForm();
			onSuccess();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal menyimpan');
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setServiceDate(todayISO());
		setSelectedIds([]);
		setTotalCost('');
		setNotes('');
		setError('');
	};

	return (
		<Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
			<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Catat Servis</DialogTitle>
					<DialogDescription>Rekam servis yang sudah dilakukan</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
							{error}
						</div>
					)}

					<div className="space-y-2">
						<Label>Tanggal Servis *</Label>
						<Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
					</div>

					<div className="space-y-2">
						<Label>Servis yang Dilakukan *</Label>
						{serviceItems.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Belum ada item servis. Tambahkan item servis terlebih dahulu.
							</p>
						) : (
							<div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
								{serviceItems.map((item) => (
									<div key={item.id} className="flex items-center space-x-2">
										<Checkbox
											id={`eitem-${item.id}`}
											checked={selectedIds.includes(item.id)}
											onCheckedChange={() => handleToggle(item.id)}
										/>
										<label htmlFor={`eitem-${item.id}`} className="text-sm leading-none cursor-pointer">
											{item.nama}
										</label>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="space-y-2">
						<Label>Total Biaya (Rp)</Label>
						<Input
							type="number"
							value={totalCost}
							onChange={(e) => setTotalCost(e.target.value)}
							placeholder="cth. 150000 (opsional)"
						/>
					</div>

					<div className="space-y-2">
						<Label>Catatan</Label>
						<Textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Catatan tambahan (opsional)"
							rows={3}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={loading}>
							Batal
						</Button>
						<Button type="submit" disabled={loading || selectedIds.length === 0}>
							{loading ? 'Menyimpan...' : 'Simpan'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/elektronik/AddElektronikHistoryForm.tsx
git commit -m "feat: add AddElektronikHistoryForm component"
```

---

### Task 10: ElektronikForm Component

**Files:**
- Create: `client/src/components/elektronik/ElektronikForm.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { ElektronikPayload, Elektronik } from '@/types';

interface ElektronikFormProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: ElektronikPayload) => Promise<void>;
	item?: Elektronik;
}

export default function ElektronikForm({ open, onClose, onSubmit, item }: ElektronikFormProps) {
	const [nama, setNama] = useState(item?.nama || '');
	const [tipe, setTipe] = useState(item?.tipe || '');
	const [lokasi, setLokasi] = useState(item?.lokasi || '');
	const [tahunBeli, setTahunBeli] = useState(item?.tahunBeli?.toString() || '');
	const [loading, setLoading] = useState(false);

	const isEdit = !!item;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nama.trim()) return;
		setLoading(true);
		try {
			await onSubmit({
				nama: nama.trim(),
				tipe: tipe.trim() || null,
				lokasi: lokasi.trim() || null,
				tahunBeli: tahunBeli ? parseInt(tahunBeli) : null,
			});
			if (!isEdit) {
				setNama('');
				setTipe('');
				setLokasi('');
				setTahunBeli('');
			}
		} catch (error) {
			console.error('Error saving elektronik:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Elektronik' : 'Tambah Elektronik'}</DialogTitle>
					<DialogDescription>
						{isEdit ? 'Ubah detail elektronik' : 'Tambahkan perangkat elektronik untuk dilacak servisnya'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label>Nama *</Label>
						<Input
							value={nama}
							onChange={(e) => setNama(e.target.value)}
							placeholder="cth. AC Samsung Kamar, Kulkas Dapur"
							required
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<Label>Tipe <span className="text-muted-foreground font-normal">— opsional</span></Label>
						<Input
							value={tipe}
							onChange={(e) => setTipe(e.target.value)}
							placeholder="cth. AC, Kulkas, TV, Mesin Cuci"
						/>
					</div>

					<div className="space-y-2">
						<Label>Lokasi <span className="text-muted-foreground font-normal">— opsional</span></Label>
						<Input
							value={lokasi}
							onChange={(e) => setLokasi(e.target.value)}
							placeholder="cth. Kamar Utama, Dapur, Ruang Tamu"
						/>
					</div>

					<div className="space-y-2">
						<Label>Tahun Beli <span className="text-muted-foreground font-normal">— opsional</span></Label>
						<Input
							type="number"
							value={tahunBeli}
							onChange={(e) => setTahunBeli(e.target.value)}
							placeholder="cth. 2021"
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>Batal</Button>
						<Button type="submit" disabled={loading || !nama.trim()}>
							{loading ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/elektronik/ElektronikForm.tsx
git commit -m "feat: add ElektronikForm component"
```

---

### Task 11: ElektronikServiceItemList Component

**Files:**
- Create: `client/src/components/elektronik/ElektronikServiceItemList.tsx`

- [ ] **Step 1: Create the component**

```typescript
import { useState } from 'react';
import { Pencil, Trash2, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
	AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/utils';
import ElektronikServiceItemForm from './ElektronikServiceItemForm';
import type { ElektronikServiceItem, ElektronikIntervalType, ElektronikServiceItemPayload } from '@/types';

interface ElektronikServiceItemListProps {
	items: ElektronikServiceItem[];
	loading: boolean;
	onUpdate: (id: number, data: Omit<ElektronikServiceItemPayload, 'elektronikId'>) => Promise<void>;
	onDelete: (id: number) => Promise<void>;
}

function calculateProgress(item: ElektronikServiceItem): number {
	if (!item.intervalType || item.intervalType === 'NONE') return 0;
	if (item.lastDate && item.intervalValue) {
		const lastDate = new Date(item.lastDate);
		const now = new Date();
		const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
		let intervalInDays = item.intervalValue;
		if (item.intervalType === 'MONTH') intervalInDays *= 30;
		if (item.intervalType === 'YEAR') intervalInDays *= 365;
		return Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
	}
	return 0;
}

function getDueInfo(item: ElektronikServiceItem): string {
	if (!item.intervalType || item.intervalType === 'NONE') return 'Tidak ada interval';
	if (item.lastDate && item.intervalValue) {
		const lastDate = new Date(item.lastDate);
		const dueDate = new Date(lastDate);
		if (item.intervalType === 'DAY') dueDate.setDate(dueDate.getDate() + item.intervalValue);
		if (item.intervalType === 'MONTH') dueDate.setMonth(dueDate.getMonth() + item.intervalValue);
		if (item.intervalType === 'YEAR') dueDate.setFullYear(dueDate.getFullYear() + item.intervalValue);
		return `Target: ${formatDate(dueDate.toISOString())}`;
	}
	return '-';
}

function getIntervalLabel(type: ElektronikIntervalType | null, value: number | null): string {
	if (!type || type === 'NONE') return 'Tanpa interval';
	const labels: Record<string, string> = {
		DAY: `Setiap ${value} hari`,
		MONTH: `Setiap ${value} bulan`,
		YEAR: `Setiap ${value} tahun`,
	};
	return labels[type] || type;
}

export default function ElektronikServiceItemList({ items, loading, onUpdate, onDelete }: ElektronikServiceItemListProps) {
	const [editItem, setEditItem] = useState<ElektronikServiceItem | null>(null);
	const [deleteId, setDeleteId] = useState<number | null>(null);

	if (loading) {
		return (
			<div className="space-y-3">
				{[...Array(3)].map((_, i) => (
					<div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12">
					<Wrench className="h-10 w-10 text-muted-foreground/50 mb-3" />
					<p className="text-sm text-muted-foreground">Belum ada item servis</p>
					<p className="text-xs text-muted-foreground mt-1">Klik "Tambah Item" untuk menambahkan</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-3">
			{items.map((item) => {
				const progress = calculateProgress(item);
				const progressColor =
					progress >= 100 ? 'bg-destructive' : progress >= 70 ? 'bg-warning' : 'bg-success';
				const statusVariant =
					progress >= 100 ? 'destructive' : progress >= 70 ? 'warning' : 'success';

				return (
					<Card key={item.id}>
						<CardContent className="p-4">
							<div className="flex items-start justify-between mb-3">
								<div>
									<div className="flex items-center gap-2">
										<h4 className="font-semibold">{item.nama}</h4>
										{progress >= 100 && <Badge variant="destructive">Terlambat</Badge>}
										{progress >= 70 && progress < 100 && <Badge variant="warning">Segera</Badge>}
									</div>
									<p className="text-sm text-muted-foreground mt-0.5">
										{getIntervalLabel(item.intervalType, item.intervalValue)}
									</p>
								</div>
								<div className="flex gap-1">
									<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(item)}>
										<Pencil className="h-4 w-4" />
									</Button>
									<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>

							{item.lastDate && (
								<p className="text-sm text-muted-foreground mb-3">Terakhir: {formatDate(item.lastDate)}</p>
							)}

							{item.intervalType && item.intervalType !== 'NONE' && (
								<div className="space-y-1.5">
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">{getDueInfo(item)}</span>
										<Badge variant={statusVariant} className="text-xs">{progress.toFixed(0)}%</Badge>
									</div>
									<Progress value={progress} className="h-2" indicatorClassName={progressColor} />
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}

			{editItem && (
				<ElektronikServiceItemForm
					open={true}
					onClose={() => setEditItem(null)}
					onSubmit={async (data) => {
						await onUpdate(editItem.id, data);
						setEditItem(null);
					}}
					item={editItem}
				/>
			)}

			<AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus Item Servis?</AlertDialogTitle>
						<AlertDialogDescription>
							Item servis ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Batal</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={async () => {
								if (deleteId) {
									await onDelete(deleteId);
									setDeleteId(null);
								}
							}}
						>
							Hapus
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/elektronik/ElektronikServiceItemList.tsx
git commit -m "feat: add ElektronikServiceItemList component"
```

---

### Task 12: ElektronikPage

**Files:**
- Create: `client/src/components/elektronik/ElektronikPage.tsx`

- [ ] **Step 1: Create the page**

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Monitor, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useElektronik } from '@/hooks/useElektronik';
import ElektronikForm from './ElektronikForm';

export default function ElektronikPage() {
	const { items, loading, addElektronik } = useElektronik();
	const [showAdd, setShowAdd] = useState(false);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold tracking-tight">Elektronik</h1>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<div className="h-32 animate-pulse rounded bg-muted" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Elektronik</h1>
					<p className="text-muted-foreground">Kelola jadwal servis perangkat elektronik Anda</p>
				</div>
				<Button onClick={() => setShowAdd(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Tambah Elektronik
				</Button>
			</div>

			{items.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Monitor className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 className="text-lg font-medium mb-1">Belum ada elektronik</h3>
						<p className="text-sm text-muted-foreground mb-4">Tambah perangkat elektronik pertama Anda untuk mulai melacak servis</p>
						<Button onClick={() => setShowAdd(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Tambah Elektronik
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<Link key={item.id} to={`/elektronik/${item.shortId || item.id}`}>
							<Card className="group hover:shadow-md transition-all hover:border-primary/30 cursor-pointer h-full">
								<CardContent className="p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
												<Monitor className="h-5 w-5" />
											</div>
											<div>
												<h3 className="font-semibold group-hover:text-primary transition-colors">
													{item.nama}
												</h3>
											</div>
										</div>
										{item.tipe && <Badge variant="secondary">{item.tipe}</Badge>}
									</div>

									<div className="space-y-1.5">
										{item.lokasi && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<MapPin className="h-4 w-4" />
												<span>{item.lokasi}</span>
											</div>
										)}
										{item.tahunBeli && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Calendar className="h-4 w-4" />
												<span>Beli {item.tahunBeli}</span>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}

			<ElektronikForm
				open={showAdd}
				onClose={() => setShowAdd(false)}
				onSubmit={async (data) => {
					await addElektronik(data);
					setShowAdd(false);
				}}
			/>
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/elektronik/ElektronikPage.tsx
git commit -m "feat: add ElektronikPage list component"
```

---

### Task 13: ElektronikDetailPage

**Files:**
- Create: `client/src/components/elektronik/ElektronikDetailPage.tsx`

- [ ] **Step 1: Create the page**

```typescript
import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Monitor, MapPin, Calendar, Plus, Wrench, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
	AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useElektronik } from '@/hooks/useElektronik';
import { useElektronikServiceItems } from '@/hooks/useElektronikServiceItems';
import { useElektronikServiceHistory } from '@/hooks/useElektronikServiceHistory';
import { formatDate, formatRupiah } from '@/lib/utils';
import ElektronikServiceItemList from './ElektronikServiceItemList';
import ElektronikServiceItemForm from './ElektronikServiceItemForm';
import AddElektronikHistoryForm from './AddElektronikHistoryForm';
import ElektronikForm from './ElektronikForm';

export default function ElektronikDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { items: allItems, loading: itemsLoading, updateElektronik, deleteElektronik, fetchElektronik } = useElektronik();

	const device = allItems.find((e) => e.shortId === id || e.id === Number(id));
	const deviceId = device?.id || 0;

	const { items: serviceItems, loading: serviceLoading, addItem, updateItem, deleteItem, fetchItems } = useElektronikServiceItems(deviceId);
	const { history, loading: historyLoading, fetchHistory } = useElektronikServiceHistory(deviceId);

	const [showAddItem, setShowAddItem] = useState(false);
	const [showAddHistory, setShowAddHistory] = useState(false);
	const [showEditDevice, setShowEditDevice] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	if (itemsLoading) {
		return (
			<div className="space-y-6">
				<div className="h-8 w-48 animate-pulse rounded bg-muted" />
				<div className="h-40 animate-pulse rounded-lg bg-muted" />
			</div>
		);
	}

	if (!device) {
		return (
			<div className="space-y-4">
				<Link to="/elektronik" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
					<ArrowLeft className="h-4 w-4" /> Kembali
				</Link>
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Monitor className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 className="text-lg font-medium">Elektronik tidak ditemukan</h3>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleDelete = async () => {
		await deleteElektronik(deviceId);
		navigate('/elektronik');
	};

	const handleHistorySuccess = () => {
		fetchItems();
		fetchHistory();
	};

	return (
		<div className="space-y-6">
			<Link to="/elektronik" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
				<ArrowLeft className="h-4 w-4" /> Kembali ke Elektronik
			</Link>

			{/* Device Header */}
			<Card>
				<CardContent className="p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Monitor className="h-7 w-7" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h1 className="text-xl font-bold">{device.nama}</h1>
									{device.tipe && <Badge variant="secondary">{device.tipe}</Badge>}
								</div>
								<div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
									{device.lokasi && (
										<span className="flex items-center gap-1">
											<MapPin className="h-3.5 w-3.5" />
											{device.lokasi}
										</span>
									)}
									{device.tahunBeli && (
										<span className="flex items-center gap-1">
											<Calendar className="h-3.5 w-3.5" />
											Beli {device.tahunBeli}
										</span>
									)}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={() => setShowEditDevice(true)}>
								<Pencil className="mr-2 h-4 w-4" /> Edit
							</Button>
							<Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:text-destructive">
								<Trash2 className="mr-2 h-4 w-4" /> Hapus
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Tabs */}
			<Tabs defaultValue="services">
				<div className="flex items-center justify-between">
					<TabsList>
						<TabsTrigger value="services">Item Servis</TabsTrigger>
						<TabsTrigger value="history">Riwayat</TabsTrigger>
					</TabsList>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={() => setShowAddHistory(true)}>
							<Wrench className="mr-2 h-4 w-4" /> Catat Servis
						</Button>
						<Button size="sm" onClick={() => setShowAddItem(true)}>
							<Plus className="mr-2 h-4 w-4" /> Tambah Item
						</Button>
					</div>
				</div>

				<TabsContent value="services" className="mt-4">
					<ElektronikServiceItemList
						items={serviceItems}
						loading={serviceLoading}
						onUpdate={updateItem}
						onDelete={deleteItem}
					/>
				</TabsContent>

				<TabsContent value="history" className="mt-4">
					{historyLoading ? (
						<div className="space-y-3">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
							))}
						</div>
					) : history.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12">
								<Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm text-muted-foreground">Belum ada riwayat servis</p>
								<Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddHistory(true)}>
									<Plus className="mr-2 h-4 w-4" /> Catat Servis Pertama
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="space-y-3">
							{history.map((entry) => (
								<Card key={entry.id}>
									<CardContent className="p-4">
										<div className="flex items-start justify-between">
											<div>
												<p className="font-medium">{formatDate(entry.serviceDate)}</p>
												{entry.notes && (
													<p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
												)}
												<div className="flex gap-1.5 flex-wrap mt-2">
													{entry.serviceItemIds.map((sid) => {
														const item = serviceItems.find((i) => i.id === sid);
														return (
															<Badge key={sid} variant="outline" className="text-xs">
																{item?.nama || `Item #${sid}`}
															</Badge>
														);
													})}
												</div>
											</div>
											{entry.totalCost != null && entry.totalCost > 0 && (
												<span className="text-sm font-semibold whitespace-nowrap">
													{formatRupiah(entry.totalCost)}
												</span>
											)}
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<ElektronikServiceItemForm
				open={showAddItem}
				onClose={() => setShowAddItem(false)}
				onSubmit={async (data) => {
					await addItem({ ...data, elektronikId: deviceId });
					setShowAddItem(false);
				}}
			/>

			<AddElektronikHistoryForm
				open={showAddHistory}
				onClose={() => setShowAddHistory(false)}
				elektronikId={deviceId}
				serviceItems={serviceItems}
				onSuccess={handleHistorySuccess}
			/>

			<ElektronikForm
				open={showEditDevice}
				onClose={() => setShowEditDevice(false)}
				item={device}
				onSubmit={async (data) => {
					await updateElektronik(deviceId, data);
					setShowEditDevice(false);
				}}
			/>

			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus Elektronik?</AlertDialogTitle>
						<AlertDialogDescription>
							"{device.nama}" beserta semua item servis dan riwayatnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Batal</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Hapus
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/elektronik/ElektronikDetailPage.tsx
git commit -m "feat: add ElektronikDetailPage component"
```

---

### Task 14: Routing and Sidebar

**Files:**
- Modify: `client/src/App.tsx`
- Modify: `client/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add routes in `client/src/App.tsx`**

Add two imports at the top:
```typescript
import ElektronikPage from '@/components/elektronik/ElektronikPage';
import ElektronikDetailPage from '@/components/elektronik/ElektronikDetailPage';
```

Add two routes inside the authenticated `<Route element={<AuthGuard><AppLayout /></AuthGuard>}>` block, after the existing kendaraan routes:
```typescript
<Route path="elektronik" element={<ElektronikPage />} />
<Route path="elektronik/:id" element={<ElektronikDetailPage />} />
```

The full authenticated routes block should look like:
```typescript
<Route
  element={
    <AuthGuard>
      <AppLayout />
    </AuthGuard>
  }
>
  <Route index element={<DashboardPage />} />
  <Route path="kendaraan" element={<VehiclesPage />} />
  <Route path="kendaraan/:id" element={<VehicleDetailPage />} />
  <Route path="elektronik" element={<ElektronikPage />} />
  <Route path="elektronik/:id" element={<ElektronikDetailPage />} />
  <Route path="riwayat" element={<HistoryPage />} />
  <Route path="profil" element={<ProfilePage />} />
</Route>
```

- [ ] **Step 2: Add nav item in `client/src/components/layout/Sidebar.tsx`**

Add `Monitor` to the imports from lucide-react:
```typescript
import { LayoutDashboard, Car, History, X, Monitor } from 'lucide-react';
```

Add an entry to the `navItems` array between Kendaraan and Riwayat Servis:
```typescript
const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/kendaraan', label: 'Kendaraan', icon: Car },
  { to: '/elektronik', label: 'Elektronik', icon: Monitor },
  { to: '/riwayat', label: 'Riwayat Servis', icon: History },
];
```

- [ ] **Step 3: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add client/src/App.tsx client/src/components/layout/Sidebar.tsx
git commit -m "feat: add Elektronik routing and sidebar navigation"
```

---

### Task 15: Dashboard Updates

**Files:**
- Modify: `client/src/components/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Replace `client/src/components/dashboard/DashboardPage.tsx` with the updated version**

```typescript
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Wrench, AlertTriangle, Clock, TrendingUp, ChevronRight, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useVehicles } from '@/hooks/useVehicles';
import { useElektronik } from '@/hooks/useElektronik';
import { useAllServiceHistory } from '@/hooks/useServiceHistory';
import { useAllElektronikServiceHistory } from '@/hooks/useElektronikServiceHistory';
import { api } from '@/lib/api';
import { formatRupiah, formatKm, formatDate } from '@/lib/utils';
import type { ServiceItem, ServiceItemRow, D1Response, Vehicle, ElektronikServiceItem, ElektronikServiceItemRow, Elektronik } from '@/types';
import { toServiceItem, toElektronikServiceItem } from '@/types';

function calculateVehicleProgress(item: ServiceItem, currentKm: number): number {
	if (!item.intervalType || item.intervalType === 'NONE') return 0;
	if (item.intervalType === 'KM' && item.lastKm != null && item.intervalValue) {
		const kmSinceLast = currentKm - item.lastKm;
		return Math.min(Math.max((kmSinceLast / item.intervalValue) * 100, 0), 100);
	}
	if (['DAY', 'MONTH', 'YEAR'].includes(item.intervalType) && item.lastDate && item.intervalValue) {
		const lastDate = new Date(item.lastDate);
		const now = new Date();
		const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
		let intervalInDays = item.intervalValue;
		if (item.intervalType === 'MONTH') intervalInDays *= 30;
		if (item.intervalType === 'YEAR') intervalInDays *= 365;
		return Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
	}
	if (item.intervalType === 'WHICHEVER_FIRST') {
		let progressKm = 0;
		let progressTime = 0;
		if (item.lastKm != null && item.intervalValue) {
			progressKm = Math.min(Math.max(((currentKm - item.lastKm) / item.intervalValue) * 100, 0), 100);
		}
		if (item.lastDate && item.timeIntervalValue && item.timeIntervalUnit) {
			const daysSinceLast = Math.floor((new Date().getTime() - new Date(item.lastDate).getTime()) / (1000 * 60 * 60 * 24));
			let intervalInDays = item.timeIntervalValue;
			if (item.timeIntervalUnit === 'MONTH') intervalInDays *= 30;
			if (item.timeIntervalUnit === 'YEAR') intervalInDays *= 365;
			progressTime = Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
		}
		return Math.max(progressKm, progressTime);
	}
	return 0;
}

function calculateElektronikProgress(item: ElektronikServiceItem): number {
	if (!item.intervalType || item.intervalType === 'NONE') return 0;
	if (item.lastDate && item.intervalValue) {
		const daysSinceLast = Math.floor((new Date().getTime() - new Date(item.lastDate).getTime()) / (1000 * 60 * 60 * 24));
		let intervalInDays = item.intervalValue;
		if (item.intervalType === 'MONTH') intervalInDays *= 30;
		if (item.intervalType === 'YEAR') intervalInDays *= 365;
		return Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
	}
	return 0;
}

interface VehicleItems { vehicle: Vehicle; items: ServiceItem[] }
interface ElektronikItems { device: Elektronik; items: ElektronikServiceItem[] }

export default function DashboardPage() {
	const { vehicles, loading: vehiclesLoading } = useVehicles();
	const { items: elektronikList, loading: elektronikLoading } = useElektronik();
	const { history, loading: historyLoading } = useAllServiceHistory(vehicles.map((v) => v.id));
	const { history: elHistory, loading: elHistoryLoading } = useAllElektronikServiceHistory(elektronikList.map((e) => e.id));

	const [allVehicleItems, setAllVehicleItems] = useState<VehicleItems[]>([]);
	const [allElektronikItems, setAllElektronikItems] = useState<ElektronikItems[]>([]);
	const [itemsLoading, setItemsLoading] = useState(false);

	useEffect(() => {
		if (vehicles.length === 0 && elektronikList.length === 0) return;
		const fetchAll = async () => {
			setItemsLoading(true);
			try {
				const [vehicleResults, elektronikResults] = await Promise.all([
					Promise.all(
						vehicles.map(async (vehicle) => {
							const data = await api.get<D1Response<ServiceItemRow>>(`/api/service-items?kendaraanId=${vehicle.id}&order=nama`);
							return { vehicle, items: (data.results || []).map(toServiceItem) };
						}),
					),
					Promise.all(
						elektronikList.map(async (device) => {
							const data = await api.get<D1Response<ElektronikServiceItemRow>>(`/api/elektronik-service-items?elektronikId=${device.id}`);
							return { device, items: (data.results || []).map(toElektronikServiceItem) };
						}),
					),
				]);
				setAllVehicleItems(vehicleResults);
				setAllElektronikItems(elektronikResults);
			} catch (error) {
				console.error('Error fetching service items:', error);
			} finally {
				setItemsLoading(false);
			}
		};
		fetchAll();
	}, [vehicles, elektronikList]);

	// Overdue / due-soon calculation
	const overdueItems: { nama: string; ownerNama: string; ownerPath: string }[] = [];
	const dueSoonItems: { nama: string; ownerNama: string; ownerPath: string; progress: number }[] = [];

	allVehicleItems.forEach(({ vehicle, items }) => {
		items.forEach((item) => {
			const progress = calculateVehicleProgress(item, vehicle.currentKm);
			const ownerPath = `/kendaraan/${vehicle.shortId || vehicle.id}`;
			if (progress >= 100) {
				overdueItems.push({ nama: item.nama, ownerNama: vehicle.nama, ownerPath });
			} else if (progress >= 70) {
				dueSoonItems.push({ nama: item.nama, ownerNama: vehicle.nama, ownerPath, progress });
			}
		});
	});

	allElektronikItems.forEach(({ device, items }) => {
		items.forEach((item) => {
			const progress = calculateElektronikProgress(item);
			const ownerPath = `/elektronik/${device.shortId || device.id}`;
			if (progress >= 100) {
				overdueItems.push({ nama: item.nama, ownerNama: device.nama, ownerPath });
			} else if (progress >= 70) {
				dueSoonItems.push({ nama: item.nama, ownerNama: device.nama, ownerPath, progress });
			}
		});
	});

	dueSoonItems.sort((a, b) => b.progress - a.progress);

	const totalVehicleItems = allVehicleItems.flatMap((vi) => vi.items).length;
	const totalElektronikItems = allElektronikItems.flatMap((ei) => ei.items).length;
	const totalItems = totalVehicleItems + totalElektronikItems;

	const vehicleTotalSpent = history.reduce((sum, h) => sum + (h.totalCost || 0), 0);
	const elektronikTotalSpent = elHistory.reduce((sum, h) => sum + (h.totalCost || 0), 0);
	const totalSpent = vehicleTotalSpent + elektronikTotalSpent;

	const recentHistory = history.slice(0, 5);

	const loading = vehiclesLoading || elektronikLoading || historyLoading || elHistoryLoading || itemsLoading;

	if (loading && vehicles.length === 0 && elektronikList.length === 0) {
		return (
			<div className="space-y-6">
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{[...Array(5)].map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<div className="h-20 animate-pulse rounded bg-muted" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground">Ringkasan status kendaraan dan servis Anda</p>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Kendaraan</CardTitle>
						<Car className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{vehicles.length}</div>
						<p className="text-xs text-muted-foreground">terdaftar</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Elektronik</CardTitle>
						<Monitor className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{elektronikList.length}</div>
						<p className="text-xs text-muted-foreground">terdaftar</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Item Dipantau</CardTitle>
						<Wrench className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalItems}</div>
						<p className="text-xs text-muted-foreground">item servis aktif</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Perlu Perhatian</CardTitle>
						<AlertTriangle className="h-4 w-4 text-warning" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{overdueItems.length + dueSoonItems.length}</div>
						<p className="text-xs text-muted-foreground">
							{overdueItems.length > 0 && (
								<span className="text-destructive font-medium">{overdueItems.length} terlambat</span>
							)}
							{overdueItems.length > 0 && dueSoonItems.length > 0 && ', '}
							{dueSoonItems.length > 0 && `${dueSoonItems.length} segera`}
							{overdueItems.length === 0 && dueSoonItems.length === 0 && 'semua aman'}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{formatRupiah(totalSpent)}</div>
						<p className="text-xs text-muted-foreground">{history.length + elHistory.length} servis tercatat</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Upcoming Services */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="text-base">Servis Mendatang</CardTitle>
						<Link to="/kendaraan">
							<Button variant="ghost" size="sm">
								Lihat semua <ChevronRight className="ml-1 h-4 w-4" />
							</Button>
						</Link>
					</CardHeader>
					<CardContent>
						{overdueItems.length === 0 && dueSoonItems.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Wrench className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm text-muted-foreground">Semua servis masih dalam jadwal</p>
							</div>
						) : (
							<div className="space-y-3">
								{overdueItems.slice(0, 3).map(({ nama, ownerNama, ownerPath }, idx) => (
									<Link
										key={`o-${idx}`}
										to={ownerPath}
										className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{nama}</p>
											<p className="text-xs text-muted-foreground">{ownerNama}</p>
										</div>
										<Badge variant="destructive">Terlambat</Badge>
									</Link>
								))}
								{dueSoonItems.slice(0, 3).map(({ nama, ownerNama, ownerPath, progress }, idx) => (
									<Link
										key={`d-${idx}`}
										to={ownerPath}
										className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{nama}</p>
											<p className="text-xs text-muted-foreground">{ownerNama}</p>
										</div>
										<Badge variant="warning">{progress.toFixed(0)}%</Badge>
									</Link>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recent Activity (kendaraan only) */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
						<Link to="/riwayat">
							<Button variant="ghost" size="sm">
								Lihat semua <ChevronRight className="ml-1 h-4 w-4" />
							</Button>
						</Link>
					</CardHeader>
					<CardContent>
						{recentHistory.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm text-muted-foreground">Belum ada riwayat servis</p>
							</div>
						) : (
							<div className="space-y-3">
								{recentHistory.map((entry) => {
									const vehicle = vehicles.find((v) => v.id === entry.kendaraanId);
									return (
										<div
											key={entry.id}
											className="flex items-center justify-between rounded-lg border p-3"
										>
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium">{vehicle?.nama || 'Kendaraan'}</p>
												<p className="text-xs text-muted-foreground">
													{formatDate(entry.serviceDate)} &middot; {formatKm(entry.odometerKm)}
												</p>
											</div>
											{entry.totalCost && (
												<span className="text-sm font-medium text-muted-foreground">
													{formatRupiah(entry.totalCost)}
												</span>
											)}
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Run tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Start dev server and verify in browser**

```bash
npm run dev
```

Open http://localhost:8787 and verify:
- Sidebar shows "Elektronik" between Kendaraan and Riwayat Servis
- Navigating to /elektronik shows the empty state with "Tambah Elektronik" button
- Adding an elektronik (e.g., "AC Samsung Kamar", tipe: "AC", lokasi: "Kamar Utama") works
- Opening the device detail page works
- Adding a service item (e.g., "Cuci AC", interval: 3 Bulan) works
- Logging a service session works and updates last_date
- Dashboard shows 5 stat cards with Elektronik count and combined totals
- "Servis Mendatang" shows elektronik items that are overdue/due-soon

- [ ] **Step 4: Commit**

```bash
git add client/src/components/dashboard/DashboardPage.tsx
git commit -m "feat: update Dashboard to include Elektronik stats and Servis Mendatang"
```
