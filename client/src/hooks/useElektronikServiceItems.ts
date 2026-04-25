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
