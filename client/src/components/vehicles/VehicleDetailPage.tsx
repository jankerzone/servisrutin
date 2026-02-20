import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Gauge, Pencil, Trash2, Plus, Wrench, Car, Bike, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
	AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useVehicles } from '@/hooks/useVehicles';
import { useServiceItems } from '@/hooks/useServiceItems';
import { useServiceHistory } from '@/hooks/useServiceHistory';
import { formatKm, formatDate, formatRupiah, todayISO } from '@/lib/utils';
import ServiceItemList from '@/components/services/ServiceItemList';
import ServiceItemForm from '@/components/services/ServiceItemForm';
import AddHistoryForm from '@/components/history/AddHistoryForm';

const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function getMonthsUntil(targetDate: Date, now: Date) {
	return (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
}

function getNextAnnualTaxDate(bulanPajak: number, now: Date) {
	const currentMonth = now.getMonth();
	const dueMonth = bulanPajak - 1;
	const dueYear = dueMonth >= currentMonth ? now.getFullYear() : now.getFullYear() + 1;
	return new Date(dueYear, dueMonth, 1);
}

function getNextFiveYearTaxDate(bulanPajak: number, tahunKendaraan: number, now: Date) {
	const currentMonth = now.getMonth();
	const dueMonth = bulanPajak - 1;
	let dueYear = tahunKendaraan;

	if (dueYear < now.getFullYear()) {
		dueYear += Math.ceil((now.getFullYear() - dueYear) / 5) * 5;
	}

	if (dueYear === now.getFullYear() && dueMonth < currentMonth) {
		dueYear += 5;
	}

	return new Date(dueYear, dueMonth, 1);
}

function formatMonthsLeft(monthsLeft: number) {
	if (monthsLeft === 0) return 'bulan ini';
	if (monthsLeft === 1) return '1 bulan lagi';
	return `${monthsLeft} bulan lagi`;
}

function getReminderVariant(monthsLeft: number, warningThreshold: number): 'success' | 'warning' | 'destructive' {
	if (monthsLeft <= 1) return 'destructive';
	if (monthsLeft <= warningThreshold) return 'warning';
	return 'success';
}

export default function VehicleDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const vehicleId = Number(id);

	const { vehicles, loading: vehiclesLoading, updateKm, deleteVehicle } = useVehicles();
	const [sortBy, setSortBy] = useState('nama');
	const { items, loading: itemsLoading, addItem, updateItem, deleteItem, fetchItems } = useServiceItems(vehicleId, sortBy);
	const { history, loading: historyLoading, fetchHistory } = useServiceHistory(vehicleId);

	const [showAddItem, setShowAddItem] = useState(false);
	const [showAddHistory, setShowAddHistory] = useState(false);
	const [showKmDialog, setShowKmDialog] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [kmInput, setKmInput] = useState('');
	const [kmDate, setKmDate] = useState(todayISO());

	const vehicle = vehicles.find((v) => v.id === vehicleId);

	if (vehiclesLoading) {
		return (
			<div className="space-y-6">
				<div className="h-8 w-48 animate-pulse rounded bg-muted" />
				<div className="h-40 animate-pulse rounded-lg bg-muted" />
			</div>
		);
	}

	if (!vehicle) {
		return (
			<div className="space-y-4">
				<Link to="/kendaraan" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
					<ArrowLeft className="h-4 w-4" /> Kembali
				</Link>
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Car className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 className="text-lg font-medium">Kendaraan tidak ditemukan</h3>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleUpdateKm = async () => {
		if (!kmInput) return;
		await updateKm(vehicleId, parseInt(kmInput), kmDate);
		setShowKmDialog(false);
		setKmInput('');
		fetchItems();
	};

	const handleDelete = async () => {
		await deleteVehicle(vehicleId);
		navigate('/kendaraan');
	};

	const handleHistorySuccess = () => {
		fetchItems();
		fetchHistory();
	};

	const now = new Date();
	const annualTaxDate = vehicle.bulanPajak ? getNextAnnualTaxDate(vehicle.bulanPajak, now) : null;
	const annualTaxMonthsLeft = annualTaxDate ? getMonthsUntil(annualTaxDate, now) : null;

	const fiveYearTaxDate = vehicle.bulanPajak && vehicle.tahun
		? getNextFiveYearTaxDate(vehicle.bulanPajak, vehicle.tahun, now)
		: null;
	const fiveYearTaxMonthsLeft = fiveYearTaxDate ? getMonthsUntil(fiveYearTaxDate, now) : null;

	return (
		<div className="space-y-6">
			{/* Breadcrumb */}
			<Link to="/kendaraan" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
				<ArrowLeft className="h-4 w-4" /> Kembali ke Kendaraan
			</Link>

			{/* Vehicle Header */}
			<Card>
				<CardContent className="p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
								{vehicle.tipe === 'Motor' ? <Bike className="h-7 w-7" /> : <Car className="h-7 w-7" />}
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h1 className="text-xl font-bold">{vehicle.nama}</h1>
									{vehicle.tipe && <Badge variant="secondary">{vehicle.tipe}</Badge>}
								</div>
								<div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
									{vehicle.plat && <span>{vehicle.plat}</span>}
									{vehicle.tahun && <span>Tahun {vehicle.tahun}</span>}
									{vehicle.bulanPajak && <span>Pajak {BULAN[vehicle.bulanPajak]}</span>}
								</div>
								{(annualTaxDate || fiveYearTaxDate) && (
									<div className="mt-3 flex flex-wrap items-center gap-2">
										{annualTaxDate && annualTaxMonthsLeft != null && (
											<Badge variant={getReminderVariant(annualTaxMonthsLeft, 6)}>
												Pajak Tahunan: {formatMonthsLeft(annualTaxMonthsLeft)} ({BULAN[annualTaxDate.getMonth() + 1]} {annualTaxDate.getFullYear()})
											</Badge>
										)}
										{fiveYearTaxDate && fiveYearTaxMonthsLeft != null && (
											<Badge variant={getReminderVariant(fiveYearTaxMonthsLeft, 12)}>
												Pajak 5 Tahunan + Plat: {formatMonthsLeft(fiveYearTaxMonthsLeft)} ({BULAN[fiveYearTaxDate.getMonth() + 1]} {fiveYearTaxDate.getFullYear()})
											</Badge>
										)}
									</div>
								)}
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:text-destructive">
								<Trash2 className="mr-2 h-4 w-4" /> Hapus
							</Button>
						</div>
					</div>

					{/* Odometer */}
					<div className="mt-6 flex items-center gap-4 rounded-lg border bg-muted/30 p-4">
						<Gauge className="h-8 w-8 text-primary" />
						<div className="flex-1">
							<p className="text-sm text-muted-foreground">Odometer Saat Ini</p>
							<p className="text-2xl font-bold">{formatKm(vehicle.currentKm)}</p>
						</div>
						<Button variant="outline" size="sm" onClick={() => { setShowKmDialog(true); setKmInput(''); setKmDate(todayISO()); }}>
							<Pencil className="mr-2 h-4 w-4" /> Update
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Tabs */}
			<Tabs defaultValue="services">
				<div className="flex items-center justify-between">
					<TabsList>
						<TabsTrigger value="services">Item Servis</TabsTrigger>
						<TabsTrigger value="history">Riwayat</TabsTrigger>
					</TabsList>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={() => setShowAddHistory(true)}>
							<Wrench className="mr-2 h-4 w-4" /> Catat Servis
						</Button>
						<Button size="sm" onClick={() => setShowAddItem(true)}>
							<Plus className="mr-2 h-4 w-4" /> Tambah Item
						</Button>
					</div>
				</div>

				<TabsContent value="services" className="mt-4">
					<ServiceItemList
						items={items}
						loading={itemsLoading}
						currentKm={vehicle.currentKm}
						sortBy={sortBy}
						onSortChange={setSortBy}
						onUpdate={updateItem}
						onDelete={deleteItem}
					/>
				</TabsContent>

				<TabsContent value="history" className="mt-4">
					{historyLoading ? (
						<div className="space-y-3">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
							))}
						</div>
					) : history.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12">
								<Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm text-muted-foreground">Belum ada riwayat servis</p>
								<Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddHistory(true)}>
									<Plus className="mr-2 h-4 w-4" /> Catat Servis Pertama
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="space-y-3">
							{history.map((entry) => (
								<Card key={entry.id}>
									<CardContent className="p-4">
										<div className="flex items-start justify-between">
											<div>
												<p className="font-medium">{formatDate(entry.serviceDate)}</p>
												<p className="text-sm text-muted-foreground mt-1">
													Odometer: {formatKm(entry.odometerKm)}
												</p>
												{entry.notes && (
													<p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
												)}
												<div className="flex gap-1.5 flex-wrap mt-2">
													{entry.serviceItemIds.map((sid) => {
														const item = items.find((i) => i.id === sid);
														return (
															<Badge key={sid} variant="outline" className="text-xs">
																{item?.nama || `Item #${sid}`}
															</Badge>
														);
													})}
												</div>
											</div>
											{entry.totalCost != null && entry.totalCost > 0 && (
												<span className="text-sm font-semibold whitespace-nowrap">
													{formatRupiah(entry.totalCost)}
												</span>
											)}
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<Dialog open={showKmDialog} onOpenChange={setShowKmDialog}>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>Update Odometer</DialogTitle>
						<DialogDescription>Odometer saat ini: {formatKm(vehicle.currentKm)}</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Tanggal</Label>
							<Input type="date" value={kmDate} onChange={(e) => setKmDate(e.target.value)} />
						</div>
						<div className="space-y-2">
							<Label>Odometer Baru (km)</Label>
							<Input type="number" value={kmInput} onChange={(e) => setKmInput(e.target.value)} placeholder={vehicle.currentKm.toString()} autoFocus />
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setShowKmDialog(false)}>Batal</Button>
						<Button onClick={handleUpdateKm} disabled={!kmInput}>Update</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<ServiceItemForm
				open={showAddItem}
				onClose={() => setShowAddItem(false)}
				onSubmit={async (data) => {
					await addItem({ ...data, kendaraanId: vehicleId });
					setShowAddItem(false);
				}}
				currentKm={vehicle.currentKm}
			/>

			<AddHistoryForm
				open={showAddHistory}
				onClose={() => setShowAddHistory(false)}
				kendaraanId={vehicleId}
				currentKm={vehicle.currentKm}
				serviceItems={items}
				onSuccess={handleHistorySuccess}
			/>

			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus Kendaraan?</AlertDialogTitle>
						<AlertDialogDescription>
							Kendaraan "{vehicle.nama}" beserta semua item servis dan riwayatnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Batal</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Hapus
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
