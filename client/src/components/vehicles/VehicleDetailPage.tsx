import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Gauge, Pencil, Trash2, Plus, Wrench, Car, Bike, Calendar, CheckCircle2, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
	AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useVehicles } from '@/hooks/useVehicles';
import { useServiceItems } from '@/hooks/useServiceItems';
import { useServiceHistory } from '@/hooks/useServiceHistory';
import { useTaxPayments } from '@/hooks/useTaxPayments';
import { formatKm, formatDate, formatRupiah, todayISO } from '@/lib/utils';
import ServiceItemList from '@/components/services/ServiceItemList';
import ServiceItemForm from '@/components/services/ServiceItemForm';
import AddHistoryForm from '@/components/history/AddHistoryForm';

const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function getMonthsUntil(targetDate: Date, now: Date) {
	return (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
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

// Parse "2027-03" into a Date (end of that month for comparison)
function parsePaidUntil(paidUntil: string): Date {
	const [year, month] = paidUntil.split('-').map(Number);
	return new Date(year, month - 1, 1); // 1st of the paid month
}

// Compute tax status from the paidUntil value
function getTaxStatus(paidUntil: string | null, bulanPajak: number | null, now: Date) {
	if (paidUntil) {
		const paidDate = parsePaidUntil(paidUntil);
		const monthsLeft = getMonthsUntil(paidDate, now);
		if (monthsLeft > 0) {
			// Paid and still valid
			return { paid: true, monthsLeft, date: paidDate };
		}
		// Expired — due again
		// Next due is paidUntil month in the next cycle
		const nextDueMonth = paidDate.getMonth();
		let nextDueYear = paidDate.getFullYear() + 1;
		if (nextDueYear < now.getFullYear() || (nextDueYear === now.getFullYear() && nextDueMonth < now.getMonth())) {
			nextDueYear = now.getFullYear();
			if (nextDueMonth < now.getMonth()) nextDueYear++;
		}
		const nextDue = new Date(nextDueYear, nextDueMonth, 1);
		return { paid: false, monthsLeft: getMonthsUntil(nextDue, now), date: nextDue };
	}
	// No record — fall back to bulanPajak estimate
	if (!bulanPajak) return null;
	const dueMonth = bulanPajak - 1;
	const dueYear = dueMonth >= now.getMonth() ? now.getFullYear() : now.getFullYear() + 1;
	const dueDate = new Date(dueYear, dueMonth, 1);
	return { paid: false, monthsLeft: getMonthsUntil(dueDate, now), date: dueDate };
}

function getTax5YearStatus(paidUntil: string | null, bulanPajak: number | null, tahun: number | null, now: Date) {
	if (paidUntil) {
		const paidDate = parsePaidUntil(paidUntil);
		const monthsLeft = getMonthsUntil(paidDate, now);
		if (monthsLeft > 0) {
			return { paid: true, monthsLeft, date: paidDate };
		}
		// Expired — next 5-year cycle
		const nextDueMonth = paidDate.getMonth();
		let nextDueYear = paidDate.getFullYear() + 5;
		if (nextDueYear < now.getFullYear() || (nextDueYear === now.getFullYear() && nextDueMonth < now.getMonth())) {
			nextDueYear += Math.ceil((now.getFullYear() - nextDueYear) / 5) * 5;
			if (nextDueYear === now.getFullYear() && nextDueMonth < now.getMonth()) nextDueYear += 5;
		}
		const nextDue = new Date(nextDueYear, nextDueMonth, 1);
		return { paid: false, monthsLeft: getMonthsUntil(nextDue, now), date: nextDue };
	}
	// No record — fall back to estimate
	if (!bulanPajak || !tahun) return null;
	const dueMonth = bulanPajak - 1;
	let dueYear = tahun;
	if (dueYear < now.getFullYear()) {
		dueYear += Math.ceil((now.getFullYear() - dueYear) / 5) * 5;
	}
	if (dueYear === now.getFullYear() && dueMonth < now.getMonth()) {
		dueYear += 5;
	}
	const dueDate = new Date(dueYear, dueMonth, 1);
	return { paid: false, monthsLeft: getMonthsUntil(dueDate, now), date: dueDate };
}

export default function VehicleDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { vehicles, loading: vehiclesLoading, updateKm, deleteVehicle, fetchVehicles } = useVehicles();
	
	// Find the vehicle by shortId or internal integer id
	const vehicle = vehicles.find((v) => v.shortId === id || v.id === Number(id));
	const vehicleId = vehicle?.id || 0;

	const [sortBy, setSortBy] = useState('nama');
	const { items, loading: itemsLoading, addItem, updateItem, deleteItem, fetchItems } = useServiceItems(vehicleId, sortBy);
	const { history, loading: historyLoading, fetchHistory } = useServiceHistory(vehicleId);
	const { taxPayments, loading: taxLoading, fetchTaxPayments, addTaxPayment } = useTaxPayments(vehicleId);

	const [showAddItem, setShowAddItem] = useState(false);
	const [showAddHistory, setShowAddHistory] = useState(false);
	const [showKmDialog, setShowKmDialog] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
	const [kmInput, setKmInput] = useState('');
	const [kmDate, setKmDate] = useState(todayISO());

	// Tax payment dialog state
	const [showTaxDialog, setShowTaxDialog] = useState(false);
	const [taxType, setTaxType] = useState<'tahunan' | '5tahunan'>('tahunan');
	const [taxMonth, setTaxMonth] = useState('');
	const [taxYear, setTaxYear] = useState('');
	const [taxPaidDate, setTaxPaidDate] = useState(todayISO());
	const [taxCost, setTaxCost] = useState('');
	const [taxNotes, setTaxNotes] = useState('');
	const [taxSaving, setTaxSaving] = useState(false);

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

	const openTaxDialog = (type: 'tahunan' | '5tahunan') => {
		setTaxType(type);
		// Pre-fill with bulanPajak if available
		const currentYear = new Date().getFullYear();
		setTaxMonth(vehicle.bulanPajak ? String(vehicle.bulanPajak).padStart(2, '0') : '');
		setTaxYear(type === 'tahunan' ? String(currentYear + 1) : String(currentYear + 5));
		setTaxPaidDate(todayISO());
		setTaxCost('');
		setTaxNotes('');
		setShowTaxDialog(true);
	};

	const handleTaxSubmit = async () => {
		if (!taxMonth || !taxYear) return;
		setTaxSaving(true);
		try {
			const paidUntil = `${taxYear}-${taxMonth}`;
			await addTaxPayment({
				kendaraanId: vehicleId,
				type: taxType,
				paidUntil,
				paidDate: taxPaidDate,
				cost: taxCost ? parseInt(taxCost) : null,
				notes: taxNotes || null,
			});
			await fetchVehicles(); // refresh vehicle's pajak_*_sampai
			setShowTaxDialog(false);
		} finally {
			setTaxSaving(false);
		}
	};

	const now = new Date();
	const annualTax = getTaxStatus(vehicle.pajakTahunanSampai, vehicle.bulanPajak, now);
	const fiveYearTax = getTax5YearStatus(vehicle.pajak5TahunanSampai, vehicle.bulanPajak, vehicle.tahun, now);

	const currentYear = now.getFullYear();
	const yearOptions = Array.from({ length: 12 }, (_, i) => currentYear + i);

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
								{(annualTax || fiveYearTax) && (
									<div className="mt-3 flex flex-wrap items-center gap-2">
										{annualTax && (
											<div className="flex items-center gap-1.5">
												{annualTax.paid ? (
													<Badge variant="success">
														<CheckCircle2 className="mr-1 h-3 w-3" />
														Pajak Tahunan: Lunas s/d {BULAN[annualTax.date.getMonth() + 1]} {annualTax.date.getFullYear()}
													</Badge>
												) : (
													<>
														<Badge variant={getReminderVariant(annualTax.monthsLeft, 6)}>
															Pajak Tahunan: {formatMonthsLeft(annualTax.monthsLeft)} ({BULAN[annualTax.date.getMonth() + 1]} {annualTax.date.getFullYear()})
														</Badge>
														<Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => openTaxDialog('tahunan')}>
															Sudah Bayar
														</Button>
													</>
												)}
											</div>
										)}
										{fiveYearTax && (
											<div className="flex items-center gap-1.5">
												{fiveYearTax.paid ? (
													<Badge variant="success">
														<CheckCircle2 className="mr-1 h-3 w-3" />
														Pajak 5 Tahunan + Plat: Lunas s/d {BULAN[fiveYearTax.date.getMonth() + 1]} {fiveYearTax.date.getFullYear()}
													</Badge>
												) : (
													<>
														<Badge variant={getReminderVariant(fiveYearTax.monthsLeft, 12)}>
															Pajak 5 Tahunan + Plat: {formatMonthsLeft(fiveYearTax.monthsLeft)} ({BULAN[fiveYearTax.date.getMonth() + 1]} {fiveYearTax.date.getFullYear()})
														</Badge>
														<Button variant="outline" size="sm" className="h-6 px-2 text-xs" onClick={() => openTaxDialog('5tahunan')}>
															Sudah Bayar
														</Button>
													</>
												)}
											</div>
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
				{(historyLoading || taxLoading) ? (
					<div className="space-y-3">
						{[...Array(3)].map((_, i) => (
							<div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
						))}
					</div>
				) : (history.length === 0 && taxPayments.length === 0) ? (
					<Card>
						<CardContent className="flex flex-col items-center justify-center py-12">
							<Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
							<p className="text-sm text-muted-foreground">Belum ada riwayat servis atau pajak</p>
							<Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddHistory(true)}>
								<Plus className="mr-2 h-4 w-4" /> Catat Servis Pertama
							</Button>
						</CardContent>
					</Card>
				) : (() => {
					// Merge service history and tax payments into a unified timeline
					type TimelineEntry = 
						| { kind: 'service'; date: string; data: typeof history[0] }
						| { kind: 'tax'; date: string; data: typeof taxPayments[0] };
					
					const timeline: TimelineEntry[] = [
						...history.map((h) => ({ kind: 'service' as const, date: h.serviceDate, data: h })),
						...taxPayments.map((t) => ({ kind: 'tax' as const, date: t.paidDate, data: t })),
					].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

					return (
						<div className="space-y-3">
							{timeline.map((entry) => {
								if (entry.kind === 'service') {
									const e = entry.data;
									return (
										<Card key={`s-${e.id}`}>
											<CardContent className="p-4">
												<div className="flex items-start justify-between">
													<div>
														<p className="font-medium">{formatDate(e.serviceDate)}</p>
														<p className="text-sm text-muted-foreground mt-1">
															Odometer: {formatKm(e.odometerKm)}
														</p>
														{e.notes && (
															<p className="text-sm text-muted-foreground mt-1">{e.notes}</p>
														)}
														<div className="flex gap-1.5 flex-wrap mt-2">
															{e.serviceItemIds.map((sid) => {
																const item = items.find((i) => i.id === sid);
																return (
																	<Badge key={sid} variant="outline" className="text-xs">
																		{item?.nama || `Item #${sid}`}
																	</Badge>
																);
															})}
														</div>
													</div>
													{e.totalCost != null && e.totalCost > 0 && (
														<span className="text-sm font-semibold whitespace-nowrap">
															{formatRupiah(e.totalCost)}
														</span>
													)}
												</div>
											</CardContent>
										</Card>
									);
								} else {
									const t = entry.data;
									const [y, m] = t.paidUntil.split('-').map(Number);
									return (
										<Card key={`t-${t.id}`}>
											<CardContent className="p-4">
												<div className="flex items-start justify-between">
													<div>
														<div className="flex items-center gap-2">
															<Receipt className="h-4 w-4 text-emerald-600" />
															<p className="font-medium">
																{t.type === 'tahunan' ? 'Pajak Tahunan' : 'Pajak 5 Tahunan + Plat'}
															</p>
														</div>
														<p className="text-sm text-muted-foreground mt-1">
															Dibayar {formatDate(t.paidDate)} &middot; Berlaku s/d {BULAN[m]} {y}
														</p>
														{t.notes && (
															<p className="text-sm text-muted-foreground mt-1">{t.notes}</p>
														)}
													</div>
													{t.cost != null && t.cost > 0 && (
														<span className="text-sm font-semibold whitespace-nowrap">
															{formatRupiah(t.cost)}
														</span>
													)}
												</div>
											</CardContent>
										</Card>
									);
								}
							})}
						</div>
					);
				})()}
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

		{/* Tax Payment Dialog */}
		<Dialog open={showTaxDialog} onOpenChange={setShowTaxDialog}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						Konfirmasi Pembayaran {taxType === 'tahunan' ? 'Pajak Tahunan' : 'Pajak 5 Tahunan + Plat'}
					</DialogTitle>
					<DialogDescription>
						Masukkan detail pembayaran {taxType === 'tahunan' ? 'pajak' : 'STNK/plat'} Anda.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Berlaku Sampai</Label>
						<div className="flex gap-2">
							<Select value={taxMonth} onValueChange={setTaxMonth}>
								<SelectTrigger className="flex-1">
									<SelectValue placeholder="Bulan" />
								</SelectTrigger>
								<SelectContent>
									{BULAN.slice(1).map((name, i) => (
										<SelectItem key={i + 1} value={String(i + 1).padStart(2, '0')}>
											{name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select value={taxYear} onValueChange={setTaxYear}>
								<SelectTrigger className="w-28">
									<SelectValue placeholder="Tahun" />
								</SelectTrigger>
								<SelectContent>
									{yearOptions.map((y) => (
										<SelectItem key={y} value={String(y)}>
											{y}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>
					<div className="space-y-2">
						<Label>Tanggal Bayar</Label>
						<Input type="date" value={taxPaidDate} onChange={(e) => setTaxPaidDate(e.target.value)} />
					</div>
					<div className="space-y-2">
						<Label>Biaya (Rp) <span className="text-muted-foreground font-normal">- opsional</span></Label>
						<Input type="number" value={taxCost} onChange={(e) => setTaxCost(e.target.value)} placeholder="Contoh: 250000" />
					</div>
					<div className="space-y-2">
						<Label>Catatan <span className="text-muted-foreground font-normal">- opsional</span></Label>
						<Textarea value={taxNotes} onChange={(e) => setTaxNotes(e.target.value)} placeholder="Contoh: Bayar di Samsat Keliling" rows={2} />
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setShowTaxDialog(false)}>Batal</Button>
					<Button onClick={handleTaxSubmit} disabled={!taxMonth || !taxYear || taxSaving}>
						{taxSaving ? 'Menyimpan...' : 'Simpan'}
					</Button>
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
