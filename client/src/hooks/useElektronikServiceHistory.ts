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
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [elektronikIds.join(',')]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	return { history, loading, fetchAll };
}
