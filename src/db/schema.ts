import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: integer('id').primaryKey(),
	email: text('email').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	name: text('name'),
	createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey(),
	userId: integer('user_id').notNull().references(() => users.id),
	expiresAt: text('expires_at').notNull(),
	createdAt: text('created_at').notNull(),
});

export const kendaraan = sqliteTable('kendaraan', {
	id: integer('id').primaryKey(),
	userId: integer('user_id').notNull().references(() => users.id),
	nama: text('nama').notNull(),
	tipe: text('tipe'), // "Motor" or "Mobil"
	plat: text('plat'),
	tahun: integer('tahun'),
	bulanPajak: integer('bulan_pajak'),
	currentKm: integer('current_km').default(0),
});

export const serviceItems = sqliteTable('service_items', {
	id: integer('id').primaryKey(),
	kendaraanId: integer('kendaraan_id').references(() => kendaraan.id),
	nama: text('nama').notNull(),
	intervalType: text('interval_type'), // "KM", "DAY", "MONTH", "YEAR", "WHICHEVER_FIRST", "NONE"
	intervalValue: integer('interval_value'),
	timeIntervalValue: integer('time_interval_value'),
	timeIntervalUnit: text('time_interval_unit'), // "DAY", "MONTH", "YEAR"
	lastKm: integer('last_km'),
	lastDate: text('last_date'), // "2025-07-19"
});

export const serviceHistory = sqliteTable('service_history', {
	id: integer('id').primaryKey(),
	kendaraanId: integer('kendaraan_id').references(() => kendaraan.id),
	serviceDate: text('service_date').notNull(), // "2025-07-19"
	odometerKm: integer('odometer_km').notNull(),
	serviceItemIds: text('service_item_ids').notNull(), // JSON array of service item IDs
	totalCost: integer('total_cost'), // Optional, in rupiah
	notes: text('notes'),
	createdAt: text('created_at').notNull(), // ISO timestamp
});
