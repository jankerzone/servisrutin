import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Car, Wrench, AlertTriangle, Clock, TrendingUp, ChevronRight, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useVehicles } from '@/hooks/useVehicles';
import { useElektronik } from '@/hooks/useElektronik';
import { useAllServiceHistory } from '@/hooks/useServiceHistory';
import { useAllElektronikServiceHistory } from '@/hooks/useElektronikServiceHistory';
import { api } from '@/lib/api';
import { formatRupiah, formatKm, formatDate } from '@/lib/utils';
import type { ServiceItem, ServiceItemRow, D1Response, Vehicle, ElektronikServiceItem, ElektronikServiceItemRow, Elektronik } from '@/types';
import { toServiceItem, toElektronikServiceItem } from '@/types';

function calculateVehicleProgress(item: ServiceItem, currentKm: number): number {
	if (!item.intervalType || item.intervalType === 'NONE') return 0;
	if (item.intervalType === 'KM' && item.lastKm != null && item.intervalValue) {
		return Math.min(Math.max(((currentKm - item.lastKm) / item.intervalValue) * 100, 0), 100);
	}
	if (['DAY', 'MONTH', 'YEAR'].includes(item.intervalType) && item.lastDate && item.intervalValue) {
		const daysSinceLast = Math.floor((new Date().getTime() - new Date(item.lastDate).getTime()) / (1000 * 60 * 60 * 24));
		let intervalInDays = item.intervalValue;
		if (item.intervalType === 'MONTH') intervalInDays *= 30;
		if (item.intervalType === 'YEAR') intervalInDays *= 365;
		return Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
	}
	if (item.intervalType === 'WHICHEVER_FIRST') {
		let progressKm = 0;
		let progressTime = 0;
		if (item.lastKm != null && item.intervalValue) {
			progressKm = Math.min(Math.max(((currentKm - item.lastKm) / item.intervalValue) * 100, 0), 100);
		}
		if (item.lastDate && item.timeIntervalValue && item.timeIntervalUnit) {
			const daysSinceLast = Math.floor((new Date().getTime() - new Date(item.lastDate).getTime()) / (1000 * 60 * 60 * 24));
			let intervalInDays = item.timeIntervalValue;
			if (item.timeIntervalUnit === 'MONTH') intervalInDays *= 30;
			if (item.timeIntervalUnit === 'YEAR') intervalInDays *= 365;
			progressTime = Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
		}
		return Math.max(progressKm, progressTime);
	}
	return 0;
}

function calculateElektronikProgress(item: ElektronikServiceItem): number {
	if (!item.intervalType || item.intervalType === 'NONE') return 0;
	if (item.lastDate && item.intervalValue) {
		const daysSinceLast = Math.floor((new Date().getTime() - new Date(item.lastDate).getTime()) / (1000 * 60 * 60 * 24));
		let intervalInDays = item.intervalValue;
		if (item.intervalType === 'MONTH') intervalInDays *= 30;
		if (item.intervalType === 'YEAR') intervalInDays *= 365;
		return Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
	}
	return 0;
}

interface VehicleItems { vehicle: Vehicle; items: ServiceItem[] }
interface ElektronikItems { device: Elektronik; items: ElektronikServiceItem[] }

export default function DashboardPage() {
	const { vehicles, loading: vehiclesLoading } = useVehicles();
	const { items: elektronikList, loading: elektronikLoading } = useElektronik();
	const { history, loading: historyLoading } = useAllServiceHistory(vehicles.map((v) => v.id));
	const { history: elHistory, loading: elHistoryLoading } = useAllElektronikServiceHistory(elektronikList.map((e) => e.id));

	const [allVehicleItems, setAllVehicleItems] = useState<VehicleItems[]>([]);
	const [allElektronikItems, setAllElektronikItems] = useState<ElektronikItems[]>([]);
	const [itemsLoading, setItemsLoading] = useState(false);

	useEffect(() => {
		if (vehicles.length === 0 && elektronikList.length === 0) return;
		const fetchAll = async () => {
			setItemsLoading(true);
			try {
				const [vehicleResults, elektronikResults] = await Promise.all([
					Promise.all(
						vehicles.map(async (vehicle) => {
							const data = await api.get<D1Response<ServiceItemRow>>(`/api/service-items?kendaraanId=${vehicle.id}&order=nama`);
							return { vehicle, items: (data.results || []).map(toServiceItem) };
						}),
					),
					Promise.all(
						elektronikList.map(async (device) => {
							const data = await api.get<D1Response<ElektronikServiceItemRow>>(`/api/elektronik-service-items?elektronikId=${device.id}`);
							return { device, items: (data.results || []).map(toElektronikServiceItem) };
						}),
					),
				]);
				setAllVehicleItems(vehicleResults);
				setAllElektronikItems(elektronikResults);
			} catch (error) {
				console.error('Error fetching service items:', error);
			} finally {
				setItemsLoading(false);
			}
		};
		fetchAll();
	}, [vehicles, elektronikList]);

	const overdueItems: { nama: string; ownerNama: string; ownerPath: string }[] = [];
	const dueSoonItems: { nama: string; ownerNama: string; ownerPath: string; progress: number }[] = [];

	allVehicleItems.forEach(({ vehicle, items }) => {
		items.forEach((item) => {
			const progress = calculateVehicleProgress(item, vehicle.currentKm);
			const ownerPath = `/kendaraan/${vehicle.shortId || vehicle.id}`;
			if (progress >= 100) overdueItems.push({ nama: item.nama, ownerNama: vehicle.nama, ownerPath });
			else if (progress >= 70) dueSoonItems.push({ nama: item.nama, ownerNama: vehicle.nama, ownerPath, progress });
		});
	});

	allElektronikItems.forEach(({ device, items }) => {
		items.forEach((item) => {
			const progress = calculateElektronikProgress(item);
			const ownerPath = `/elektronik/${device.shortId || device.id}`;
			if (progress >= 100) overdueItems.push({ nama: item.nama, ownerNama: device.nama, ownerPath });
			else if (progress >= 70) dueSoonItems.push({ nama: item.nama, ownerNama: device.nama, ownerPath, progress });
		});
	});

	dueSoonItems.sort((a, b) => b.progress - a.progress);

	const totalItems = allVehicleItems.flatMap((vi) => vi.items).length + allElektronikItems.flatMap((ei) => ei.items).length;
	const totalSpent = history.reduce((sum, h) => sum + (h.totalCost || 0), 0) + elHistory.reduce((sum, h) => sum + (h.totalCost || 0), 0);
	const recentHistory = history.slice(0, 5);

	const loading = vehiclesLoading || elektronikLoading || historyLoading || elHistoryLoading || itemsLoading;

	if (loading && vehicles.length === 0 && elektronikList.length === 0) {
		return (
			<div className="space-y-6">
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{[...Array(5)].map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<div className="h-20 animate-pulse rounded bg-muted" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground">Ringkasan status kendaraan dan servis Anda</p>
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Kendaraan</CardTitle>
						<Car className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{vehicles.length}</div>
						<p className="text-xs text-muted-foreground">terdaftar</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Elektronik</CardTitle>
						<Monitor className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{elektronikList.length}</div>
						<p className="text-xs text-muted-foreground">terdaftar</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Item Dipantau</CardTitle>
						<Wrench className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{totalItems}</div>
						<p className="text-xs text-muted-foreground">item servis aktif</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Perlu Perhatian</CardTitle>
						<AlertTriangle className="h-4 w-4 text-warning" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{overdueItems.length + dueSoonItems.length}</div>
						<p className="text-xs text-muted-foreground">
							{overdueItems.length > 0 && (
								<span className="text-destructive font-medium">{overdueItems.length} terlambat</span>
							)}
							{overdueItems.length > 0 && dueSoonItems.length > 0 && ', '}
							{dueSoonItems.length > 0 && `${dueSoonItems.length} segera`}
							{overdueItems.length === 0 && dueSoonItems.length === 0 && 'semua aman'}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{formatRupiah(totalSpent)}</div>
						<p className="text-xs text-muted-foreground">{history.length + elHistory.length} servis tercatat</p>
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Upcoming Services — kendaraan + elektronik */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="text-base">Servis Mendatang</CardTitle>
						<Link to="/kendaraan">
							<Button variant="ghost" size="sm">
								Lihat semua <ChevronRight className="ml-1 h-4 w-4" />
							</Button>
						</Link>
					</CardHeader>
					<CardContent>
						{overdueItems.length === 0 && dueSoonItems.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Wrench className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm text-muted-foreground">Semua servis masih dalam jadwal</p>
							</div>
						) : (
							<div className="space-y-3">
								{overdueItems.slice(0, 3).map(({ nama, ownerNama, ownerPath }, idx) => (
									<Link
										key={`o-${idx}`}
										to={ownerPath}
										className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{nama}</p>
											<p className="text-xs text-muted-foreground">{ownerNama}</p>
										</div>
										<Badge variant="destructive">Terlambat</Badge>
									</Link>
								))}
								{dueSoonItems.slice(0, 3).map(({ nama, ownerNama, ownerPath, progress }, idx) => (
									<Link
										key={`d-${idx}`}
										to={ownerPath}
										className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent transition-colors"
									>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{nama}</p>
											<p className="text-xs text-muted-foreground">{ownerNama}</p>
										</div>
										<Badge variant="warning">{progress.toFixed(0)}%</Badge>
									</Link>
								))}
							</div>
						)}
					</CardContent>
				</Card>

				{/* Recent Activity — kendaraan only */}
				<Card>
					<CardHeader className="flex flex-row items-center justify-between">
						<CardTitle className="text-base">Aktivitas Terbaru</CardTitle>
						<Link to="/riwayat">
							<Button variant="ghost" size="sm">
								Lihat semua <ChevronRight className="ml-1 h-4 w-4" />
							</Button>
						</Link>
					</CardHeader>
					<CardContent>
						{recentHistory.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-8 text-center">
								<Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm text-muted-foreground">Belum ada riwayat servis</p>
							</div>
						) : (
							<div className="space-y-3">
								{recentHistory.map((entry) => {
									const vehicle = vehicles.find((v) => v.id === entry.kendaraanId);
									return (
										<div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
											<div className="min-w-0 flex-1">
												<p className="text-sm font-medium">{vehicle?.nama || 'Kendaraan'}</p>
												<p className="text-xs text-muted-foreground">
													{formatDate(entry.serviceDate)} &middot; {formatKm(entry.odometerKm)}
												</p>
											</div>
											{entry.totalCost && (
												<span className="text-sm font-medium text-muted-foreground">
													{formatRupiah(entry.totalCost)}
												</span>
											)}
										</div>
									);
								})}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
