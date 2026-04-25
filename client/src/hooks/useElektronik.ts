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
