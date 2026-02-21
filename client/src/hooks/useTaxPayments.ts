import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { TaxPayment, TaxPaymentPayload, TaxPaymentRow, D1Response } from '@/types';
import { toTaxPayment } from '@/types';

export function useTaxPayments(kendaraanId: number | null) {
	const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchTaxPayments = useCallback(async () => {
		if (!kendaraanId) return;
		try {
			setLoading(true);
			const data = await api.get<D1Response<TaxPaymentRow>>(
				`/api/tax-payments?kendaraanId=${kendaraanId}`,
			);
			setTaxPayments((data.results || []).map(toTaxPayment));
		} catch (error) {
			console.error('Error fetching tax payments:', error);
		} finally {
			setLoading(false);
		}
	}, [kendaraanId]);

	useEffect(() => {
		fetchTaxPayments();
	}, [fetchTaxPayments]);

	const addTaxPayment = async (payload: TaxPaymentPayload) => {
		await api.post('/api/tax-payments', payload);
		await fetchTaxPayments();
	};

	return { taxPayments, loading, fetchTaxPayments, addTaxPayment };
}

export function useAllTaxPayments(vehicleIds: number[]) {
	const [taxPayments, setTaxPayments] = useState<TaxPayment[]>([]);
	const [loading, setLoading] = useState(false);

	const fetchAll = useCallback(async () => {
		if (vehicleIds.length === 0) return;
		try {
			setLoading(true);
			// Use the endpoint without kendaraanId to get all at once
			const data = await api.get<D1Response<TaxPaymentRow>>('/api/tax-payments');
			const all = (data.results || []).map(toTaxPayment);
			all.sort((a, b) => new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime());
			setTaxPayments(all);
		} catch (error) {
			console.error('Error fetching all tax payments:', error);
		} finally {
			setLoading(false);
		}
	}, [vehicleIds.join(',')]);

	useEffect(() => {
		fetchAll();
	}, [fetchAll]);

	return { taxPayments, loading, fetchAll };
}
