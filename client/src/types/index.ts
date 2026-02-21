// ---- User & Auth ----
export interface User {
	id: number;
	email: string;
	name: string | null;
}

// ---- Vehicle ----
export interface Vehicle {
	id: number;
	shortId?: string;
	nama: string;
	tipe: string | null;
	plat: string | null;
	tahun: number | null;
	bulanPajak: number | null;
	currentKm: number;
}

export interface VehiclePayload {
	nama: string;
	tipe: string | null;
	plat: string | null;
	tahun: number | null;
	bulanPajak: number | null;
	currentKm: number;
}

// ---- Service Item ----
export type IntervalType = 'KM' | 'DAY' | 'MONTH' | 'YEAR' | 'WHICHEVER_FIRST' | 'NONE';

export interface ServiceItem {
	id: number;
	kendaraanId: number;
	nama: string;
	intervalType: IntervalType | null;
	intervalValue: number | null;
	timeIntervalValue: number | null;
	timeIntervalUnit: IntervalType | null;
	lastKm: number | null;
	lastDate: string | null;
}

export interface ServiceItemPayload {
	kendaraanId: number;
	nama: string;
	intervalType: IntervalType;
	intervalValue: number | null;
	timeIntervalValue: number | null;
	timeIntervalUnit: IntervalType | null;
	lastKm: number | null;
	lastDate: string | null;
}

// ---- Service History ----
export interface ServiceHistory {
	id: number;
	kendaraanId: number;
	serviceDate: string;
	odometerKm: number;
	serviceItemIds: number[];
	serviceItemNames?: string[];
	totalCost: number | null;
	notes: string | null;
	createdAt: string;
}

export interface ServiceHistoryPayload {
	kendaraanId: number;
	serviceDate: string;
	odometerKm: number;
	serviceItemIds: number[];
	totalCost: number | null;
	notes: string | null;
}

// ---- Dashboard ----
export interface DashboardStats {
	totalVehicles: number;
	totalServiceItems: number;
	dueSoonCount: number;
	overdueCount: number;
	totalSpent: number;
	recentHistory: ServiceHistory[];
}

// ---- API Response shapes ----
export interface D1Response<T> {
	results: T[];
	success: boolean;
	meta: Record<string, unknown>;
}

export interface ApiSuccess {
	success: true;
}

// ---- DB row types (snake_case from API) ----
export interface VehicleRow {
	id: number;
	short_id?: string;
	user_id: number;
	nama: string;
	tipe: string | null;
	plat: string | null;
	tahun: number | null;
	bulan_pajak: number | null;
	current_km: number;
}

export interface ServiceItemRow {
	id: number;
	kendaraan_id: number;
	nama: string;
	interval_type: string | null;
	interval_value: number | null;
	time_interval_value: number | null;
	time_interval_unit: string | null;
	last_km: number | null;
	last_date: string | null;
}

export interface ServiceHistoryRow {
	id: number;
	kendaraan_id: number;
	service_date: string;
	odometer_km: number;
	service_item_ids: string;
	total_cost: number | null;
	notes: string | null;
	created_at: string;
}

// ---- Transformers ----
export function toVehicle(row: VehicleRow): Vehicle {
	return {
		id: row.id,
		shortId: row.short_id,
		nama: row.nama,
		tipe: row.tipe,
		plat: row.plat,
		tahun: row.tahun,
		bulanPajak: row.bulan_pajak,
		currentKm: row.current_km ?? 0,
	};
}

export function toServiceItem(row: ServiceItemRow): ServiceItem {
	return {
		id: row.id,
		kendaraanId: row.kendaraan_id,
		nama: row.nama,
		intervalType: row.interval_type as IntervalType | null,
		intervalValue: row.interval_value,
		timeIntervalValue: row.time_interval_value,
		timeIntervalUnit: row.time_interval_unit as IntervalType | null,
		lastKm: row.last_km,
		lastDate: row.last_date,
	};
}

export function toServiceHistory(row: ServiceHistoryRow): ServiceHistory {
	return {
		id: row.id,
		kendaraanId: row.kendaraan_id,
		serviceDate: row.service_date,
		odometerKm: row.odometer_km,
		serviceItemIds: JSON.parse(row.service_item_ids),
		totalCost: row.total_cost,
		notes: row.notes,
		createdAt: row.created_at,
	};
}
