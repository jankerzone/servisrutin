import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Car, Calendar, Gauge, FileText, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicles } from '@/hooks/useVehicles';
import { useAllServiceHistory } from '@/hooks/useServiceHistory';
import { useAllTaxPayments } from '@/hooks/useTaxPayments';
import { formatDate, formatKm, formatRupiah } from '@/lib/utils';
import type { ServiceHistory, TaxPayment } from '@/types';

const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

type TimelineEntry =
	| { kind: 'service'; date: string; data: ServiceHistory }
	| { kind: 'tax'; date: string; data: TaxPayment };

export default function HistoryPage() {
	const { vehicles, loading: vehiclesLoading } = useVehicles();
	const vehicleIds = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
	const { history, loading: historyLoading } = useAllServiceHistory(vehicleIds);
	const { taxPayments, loading: taxLoading } = useAllTaxPayments(vehicleIds);

	const loading = vehiclesLoading || historyLoading || taxLoading;

	// Merge service history and tax payments into a unified timeline
	const timeline = useMemo(() => {
		const entries: TimelineEntry[] = [
			...history.map((h) => ({ kind: 'service' as const, date: h.serviceDate, data: h })),
			...taxPayments.map((t) => ({ kind: 'tax' as const, date: t.paidDate, data: t })),
		];
		entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
		return entries;
	}, [history, taxPayments]);

	// Group by month-year
	const grouped = useMemo(() => {
		const groups: Record<string, TimelineEntry[]> = {};
		timeline.forEach((entry) => {
			const date = new Date(entry.date);
			const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(entry);
		});
		return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
	}, [timeline]);

	const totalSpent = useMemo(() => {
		const serviceCost = history.reduce((sum, h) => sum + (h.totalCost || 0), 0);
		const taxCost = taxPayments.reduce((sum, t) => sum + (t.cost || 0), 0);
		return serviceCost + taxCost;
	}, [history, taxPayments]);

	if (loading) {
		return (
			<div className="space-y-6">
				<h1 className="text-2xl font-bold tracking-tight">Riwayat</h1>
				<div className="space-y-3">
					{[...Array(4)].map((_, i) => (
						<div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Riwayat</h1>
					<p className="text-muted-foreground">Timeline semua servis & pajak kendaraan Anda</p>
				</div>
				{totalSpent > 0 && (
					<div className="text-right">
						<p className="text-sm text-muted-foreground">Total Pengeluaran</p>
						<p className="text-lg font-bold">{formatRupiah(totalSpent)}</p>
					</div>
				)}
			</div>

			{timeline.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 className="text-lg font-medium mb-1">Belum ada riwayat</h3>
						<p className="text-sm text-muted-foreground">
							Catat servis atau pembayaran pajak dari halaman detail kendaraan
						</p>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-8">
					{grouped.map(([monthKey, entries]) => {
						const [year, month] = monthKey.split('-');
						const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('id-ID', {
							month: 'long',
							year: 'numeric',
						});
						const monthTotal = entries.reduce((s, e) => {
							if (e.kind === 'service') return s + (e.data.totalCost || 0);
							return s + (e.data.cost || 0);
						}, 0);

						return (
							<div key={monthKey}>
								<div className="flex items-center justify-between mb-4">
									<h2 className="text-lg font-semibold capitalize">{monthName}</h2>
									{monthTotal > 0 && (
										<span className="text-sm text-muted-foreground">{formatRupiah(monthTotal)}</span>
									)}
								</div>

								{/* Timeline */}
								<div className="relative space-y-0">
									<div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

									{entries.map((entry) => {
										if (entry.kind === 'service') {
											const e = entry.data;
											const vehicle = vehicles.find((v) => v.id === e.kendaraanId);

											return (
												<div key={`s-${e.id}`} className="relative flex gap-4 pb-6 last:pb-0">
													{/* Timeline dot */}
													<div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
														<Calendar className="h-3.5 w-3.5 text-primary" />
													</div>

													{/* Content */}
													<Card className="flex-1">
														<CardContent className="p-4">
															<div className="flex items-start justify-between">
																<div className="space-y-1">
																	<div className="flex items-center gap-2">
																		<Link
																			to={`/kendaraan/${vehicle?.shortId || e.kendaraanId}`}
																			className="font-medium hover:text-primary transition-colors"
																		>
																			{vehicle?.nama || 'Kendaraan'}
																		</Link>
																		{vehicle?.tipe && (
																			<Badge variant="secondary" className="text-xs">
																				{vehicle.tipe}
																			</Badge>
																		)}
																	</div>
																	<p className="text-sm text-muted-foreground">
																		{formatDate(e.serviceDate)}
																	</p>
																</div>
																{e.totalCost != null && e.totalCost > 0 && (
																	<span className="text-sm font-semibold">
																		{formatRupiah(e.totalCost)}
																	</span>
																)}
															</div>

															<div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
																<span className="flex items-center gap-1">
																	<Gauge className="h-3.5 w-3.5" />
																	{formatKm(e.odometerKm)}
																</span>
																<span>{e.serviceItemIds.length} item servis</span>
															</div>

															{e.notes && (
																<div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
																	<FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
																	<span>{e.notes}</span>
																</div>
															)}
														</CardContent>
													</Card>
												</div>
											);
										} else {
											const t = entry.data;
											const vehicle = vehicles.find((v) => v.id === t.kendaraanId);
											const [py, pm] = t.paidUntil.split('-').map(Number);

											return (
												<div key={`t-${t.id}`} className="relative flex gap-4 pb-6 last:pb-0">
													{/* Timeline dot - green for tax */}
													<div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-background">
														<Receipt className="h-3.5 w-3.5 text-emerald-600" />
													</div>

													{/* Content */}
													<Card className="flex-1">
														<CardContent className="p-4">
															<div className="flex items-start justify-between">
																<div className="space-y-1">
																	<div className="flex items-center gap-2">
																		<Link
																			to={`/kendaraan/${vehicle?.shortId || t.kendaraanId}`}
																			className="font-medium hover:text-primary transition-colors"
																		>
																			{vehicle?.nama || 'Kendaraan'}
																		</Link>
																		<Badge variant="outline" className="text-xs border-emerald-500 text-emerald-700">
																			{t.type === 'tahunan' ? 'Pajak Tahunan' : 'Pajak 5 Tahunan'}
																		</Badge>
																	</div>
																	<p className="text-sm text-muted-foreground">
																		{formatDate(t.paidDate)} &middot; Berlaku s/d {BULAN[pm]} {py}
																	</p>
																</div>
																{t.cost != null && t.cost > 0 && (
																	<span className="text-sm font-semibold">
																		{formatRupiah(t.cost)}
																	</span>
																)}
															</div>

															{t.notes && (
																<div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
																	<FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
																	<span>{t.notes}</span>
																</div>
															)}
														</CardContent>
													</Card>
												</div>
											);
										}
									})}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
