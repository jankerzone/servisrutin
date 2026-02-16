import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Car, Calendar, Gauge, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVehicles } from '@/hooks/useVehicles';
import { useAllServiceHistory } from '@/hooks/useServiceHistory';
import { formatDate, formatKm, formatRupiah } from '@/lib/utils';

export default function HistoryPage() {
	const { vehicles, loading: vehiclesLoading } = useVehicles();
	const vehicleIds = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
	const { history, loading: historyLoading } = useAllServiceHistory(vehicleIds);

	const loading = vehiclesLoading || historyLoading;

	// Group by month-year
	const grouped = useMemo(() => {
		const groups: Record<string, typeof history> = {};
		history.forEach((entry) => {
			const date = new Date(entry.serviceDate);
			const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
			if (!groups[key]) groups[key] = [];
			groups[key].push(entry);
		});
		return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
	}, [history]);

	const totalSpent = history.reduce((sum, h) => sum + (h.totalCost || 0), 0);

	if (loading) {
		return (
			<div className="space-y-6">
				<h1 className="text-2xl font-bold tracking-tight">Riwayat Servis</h1>
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
					<h1 className="text-2xl font-bold tracking-tight">Riwayat Servis</h1>
					<p className="text-muted-foreground">Timeline semua servis kendaraan Anda</p>
				</div>
				{totalSpent > 0 && (
					<div className="text-right">
						<p className="text-sm text-muted-foreground">Total Pengeluaran</p>
						<p className="text-lg font-bold">{formatRupiah(totalSpent)}</p>
					</div>
				)}
			</div>

			{history.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 className="text-lg font-medium mb-1">Belum ada riwayat servis</h3>
						<p className="text-sm text-muted-foreground">
							Catat servis dari halaman detail kendaraan
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
						const monthTotal = entries.reduce((s, e) => s + (e.totalCost || 0), 0);

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
										const vehicle = vehicles.find((v) => v.id === entry.kendaraanId);

										return (
											<div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
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
																		to={`/kendaraan/${entry.kendaraanId}`}
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
																	{formatDate(entry.serviceDate)}
																</p>
															</div>
															{entry.totalCost != null && entry.totalCost > 0 && (
																<span className="text-sm font-semibold">
																	{formatRupiah(entry.totalCost)}
																</span>
															)}
														</div>

														<div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
															<span className="flex items-center gap-1">
																<Gauge className="h-3.5 w-3.5" />
																{formatKm(entry.odometerKm)}
															</span>
															<span>{entry.serviceItemIds.length} item servis</span>
														</div>

														{entry.notes && (
															<div className="mt-2 flex items-start gap-1.5 text-sm text-muted-foreground">
																<FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
																<span>{entry.notes}</span>
															</div>
														)}
													</CardContent>
												</Card>
											</div>
										);
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
