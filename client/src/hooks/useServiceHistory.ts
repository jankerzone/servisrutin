import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { ServiceHistory, ServiceHistoryPayload, ServiceHistoryRow, D1Response } from '@/types';
import { toServiceHistory } from '@/types';

export function useServiceHistory(kendaraanId: number | null) {
	const [history, setHistory] = useState<ServiceHistory[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchHistory = useCallback(async () => {
		if (!kendaraanId) return;
		try {
			setLoading(true);
			const data = await api.get<D1Response<ServiceHistoryRow>>(
				`/api/service-history?kendaraanId=${kendaraanId}`,
			);
			setHistory((data.results || []).map(toServiceHistory));
		} catch (error) {
			console.error('Error fetching service history:', error);
		} finally {
			setLoading(false);
		}
	}, [kendaraanId]);

	useEffect(() => {
		fetchHistory();
	}, [fetchHistory]);

	const addHistory = async (payload: ServiceHistoryPayload) => {
		await api.post('/api/service-history', payload);
		await fetchHistory();
	};

	return { history, loading, fetchHistory, addHistory };
}

export function useAllServiceHistory(vehicleIds: number[]) {
	const [history, setHistory] = useState<ServiceHistory[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchAll = useCallback(async () => {
		if (vehicleIds.length === 0) return;
		try {
			setLoading(true);
			const results = await Promise.all(
				vehicleIds.map((id) =>
					api.get<D1Response<ServiceHistoryRow>>(`/api/service-history?kendaraanId=${id}`),
				),
			);
			const all = results.flatMap((r) => (r.results || []).map(toServiceHistory));
			all.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
			setHistory(all);
		} catch (error) {
			console.error('Error fetching all service history:', error);
		} finally {
			setLoading(false);
		}
	}, [vehicleIds.join(',')]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	return { history, loading, fetchAll };
}
