import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ServiceItem, ServiceItemPayload, ServiceItemRow, D1Response } from '@/types';
import { toServiceItem } from '@/types';

export function useServiceItems(kendaraanId: number | null, sortBy: string = 'nama') {
	const [items, setItems] = useState<ServiceItem[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchItems = useCallback(async () => {
		if (!kendaraanId) return;
		try {
			setLoading(true);
			const data = await api.get<D1Response<ServiceItemRow>>(
				`/api/service-items?kendaraanId=${kendaraanId}&order=${sortBy}`,
			);
			setItems((data.results || []).map(toServiceItem));
		} catch (error) {
			console.error('Error fetching service items:', error);
		} finally {
			setLoading(false);
		}
	}, [kendaraanId, sortBy]);

	useEffect(() => {
		fetchItems();
	}, [fetchItems]);

	const addItem = async (payload: ServiceItemPayload) => {
		await api.post('/api/service-items', payload);
		await fetchItems();
	};

	const updateItem = async (id: number, payload: Omit<ServiceItemPayload, 'kendaraanId'>) => {
		await api.put(`/api/service-items/${id}`, payload);
		await fetchItems();
	};

	const deleteItem = async (id: number) => {
		await api.delete(`/api/service-items/${id}`);
		await fetchItems();
	};

	return { items, loading, fetchItems, addItem, updateItem, deleteItem };
}
