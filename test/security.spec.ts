import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll } from 'vitest';
import worker from '../src';

describe('Security Tests', () => {
    beforeAll(async () => {
        // Setup database schema one by one
        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            name TEXT,
            avatar_url TEXT,
            created_at TEXT NOT NULL
        )`).run();

        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            expires_at TEXT NOT NULL,
            created_at TEXT NOT NULL
        )`).run();

        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS kendaraan (
            id INTEGER PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id),
            nama TEXT NOT NULL,
            tipe TEXT,
            plat TEXT,
            tahun INTEGER,
            bulan_pajak INTEGER,
            current_km INTEGER DEFAULT 0
        )`).run();

        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS service_items (
            id INTEGER PRIMARY KEY,
            kendaraan_id INTEGER REFERENCES kendaraan(id),
            nama TEXT NOT NULL,
            interval_type TEXT,
            interval_value INTEGER,
            time_interval_value INTEGER,
            time_interval_unit TEXT,
            last_km INTEGER,
            last_date TEXT
        )`).run();

        await env.DB.prepare(`CREATE TABLE IF NOT EXISTS service_history (
            id INTEGER PRIMARY KEY,
            kendaraan_id INTEGER REFERENCES kendaraan(id),
            service_date TEXT NOT NULL,
            odometer_km INTEGER NOT NULL,
            service_item_ids TEXT NOT NULL,
            total_cost INTEGER,
            notes TEXT,
            created_at TEXT NOT NULL
        )`).run();
    });

    it('should reject weak passwords on signup', async () => {
        const request = new Request('http://example.com/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'weak',
                turnstileToken: 'mock-token'
            })
        });

        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);

        const data = await response.json();
        // Since we didn't mock fetch for Turnstile, it might fail with 500 or 403 or network error.
        // But validation happens before Turnstile?
        // Let's check src/index.ts order:
        // 1. Validation (email/password)
        // 2. Turnstile

        // So we expect 400 with "Password must be..."
        expect(response.status).toBe(400);
        expect(data.error).toContain('Password must be at least 8 characters');
    });

    it('should prevent IDOR in service history', async () => {
        // 1. Create User
        await env.DB.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (1, 'user@example.com', 'hash', '2023-01-01')").run();
        // 2. Create Session
        const sessionId = 'valid-session';
        await env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, 1, '2099-01-01', '2023-01-01')").bind(sessionId).run();

        // 3. Create Vehicle 1 (User's vehicle)
        await env.DB.prepare("INSERT INTO kendaraan (id, user_id, nama) VALUES (1, 1, 'My Car')").run();

        // 4. Create Vehicle 2 (Another vehicle)
        await env.DB.prepare("INSERT INTO kendaraan (id, user_id, nama) VALUES (2, 1, 'Other Car')").run();

        // 5. Create Service Item for Vehicle 2
        await env.DB.prepare("INSERT INTO service_items (id, kendaraan_id, nama) VALUES (99, 2, 'Oil Change Car 2')").run();

        // 6. Attempt to add history for Vehicle 1 using Service Item 99 (from Vehicle 2)
        // Need to simulate Cookie header.
        const request = new Request('http://example.com/api/service-history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': `session_id=${sessionId}`
            },
            body: JSON.stringify({
                kendaraanId: 1, // Target Vehicle 1
                serviceDate: '2023-01-01',
                odometerKm: 1000,
                serviceItemIds: [99] // Malicious ID from Vehicle 2
            })
        });

        const ctx = createExecutionContext();
        const response = await worker.fetch(request, env, ctx);
        await waitOnExecutionContext(ctx);

        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data.error).toContain('One or more service items are invalid or do not belong to this vehicle');
    });
});
