import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Vehicle, VehiclePayload, VehicleRow, D1Response } from '@/types';
import { toVehicle } from '@/types';

export function useVehicles() {
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [loading, setLoading] = useState(true);

	const fetchVehicles = useCallback(async () => {
		try {
			setLoading(true);
			const data = await api.get<D1Response<VehicleRow>>('/api/vehicles');
			setVehicles((data.results || []).map(toVehicle));
		} catch (error) {
			console.error('Error fetching vehicles:', error);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchVehicles();
	}, [fetchVehicles]);

	const addVehicle = async (payload: VehiclePayload) => {
		const result = await api.post<{ success: boolean; result: { meta: { last_row_id: number } } }>('/api/vehicles', payload);
		await fetchVehicles();
		return result;
	};

	const updateKm = async (vehicleId: number, currentKm: number, updatedAt?: string) => {
		await api.put(`/api/vehicles/${vehicleId}/km`, { currentKm, updatedAt });
		await fetchVehicles();
	};

	const deleteVehicle = async (vehicleId: number) => {
		await api.delete(`/api/vehicles/${vehicleId}`);
		await fetchVehicles();
	};

	const updateVehicle = async (vehicleId: number, payload: Partial<VehiclePayload>) => {
		await api.put(`/api/vehicles/${vehicleId}`, payload);
		await fetchVehicles();
	};

	const updateTax = async (vehicleId: number, type: 'tahunan' | '5tahunan', paidUntil: string) => {
		await api.put(`/api/vehicles/${vehicleId}/tax`, { type, paidUntil });
		await fetchVehicles();
	};

	return { vehicles, loading, fetchVehicles, addVehicle, updateKm, deleteVehicle, updateVehicle, updateTax };
}
