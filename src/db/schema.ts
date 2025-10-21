import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Vehicles table
export const vehicles = sqliteTable('vehicles', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	type: text('type').notNull(), // 'motor' atau 'mobil'
	brand: text('brand'),
	model: text('model'),
	year: integer('year'),
	plateNumber: text('plate_number'),
	currentOdometer: integer('current_odometer').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

// Service items table
export const serviceItems = sqliteTable('service_items', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	vehicleId: integer('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
	partName: text('part_name').notNull(),
	
	// Last service info
	lastServiceDate: integer('last_service_date', { mode: 'timestamp' }),
	lastServiceOdometer: integer('last_service_odometer'),
	
	// Due settings (at least one must be set)
	dueOdometerInterval: integer('due_odometer_interval'), // km interval
	dueDaysInterval: integer('due_days_interval'), // days interval
	
	// Calculated due values
	dueDate: integer('due_date', { mode: 'timestamp' }),
	dueOdometer: integer('due_odometer'),
	
	// Status
	status: text('status').notNull().default('pending'), // 'pending', 'due_soon', 'overdue', 'completed'
	
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type ServiceItem = typeof serviceItems.$inferSelect;
export type NewServiceItem = typeof serviceItems.$inferInsert;
