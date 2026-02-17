import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
	Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { IntervalType, ServiceItemPayload, ServiceItem } from '@/types';

interface ServiceItemFormProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: Omit<ServiceItemPayload, 'kendaraanId'>) => Promise<void>;
	currentKm?: number;
	item?: ServiceItem; // if editing
}

const INTERVAL_LABELS: Record<IntervalType, string> = {
	KM: 'Kilometer',
	DAY: 'Hari',
	MONTH: 'Bulan',
	YEAR: 'Tahun',
	WHICHEVER_FIRST: 'Mana Duluan',
	NONE: 'Tidak Ada',
};

export default function ServiceItemForm({ open, onClose, onSubmit, currentKm = 0, item }: ServiceItemFormProps) {
	const [nama, setNama] = useState(item?.nama || '');
	const [intervalType, setIntervalType] = useState<IntervalType>(
		(item?.intervalType as IntervalType) || 'KM',
	);
	const [intervalValue, setIntervalValue] = useState(item?.intervalValue?.toString() || '');
	const [timeIntervalValue, setTimeIntervalValue] = useState(item?.timeIntervalValue?.toString() || '');
	const [timeIntervalUnit, setTimeIntervalUnit] = useState<IntervalType>((item?.timeIntervalUnit as IntervalType) || 'MONTH');
	const [lastKm, setLastKm] = useState(item?.lastKm?.toString() || '');
	const [lastDate, setLastDate] = useState(item?.lastDate || '');
	const [loading, setLoading] = useState(false);

	const isEdit = !!item;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nama) return;

		setLoading(true);
		try {
			await onSubmit({
				nama,
				intervalType,
				intervalValue: intervalType === 'NONE' ? null : parseInt(intervalValue) || null,
				timeIntervalValue: intervalType === 'WHICHEVER_FIRST' ? parseInt(timeIntervalValue) || null : null,
				timeIntervalUnit: intervalType === 'WHICHEVER_FIRST' ? timeIntervalUnit : null,
				lastKm: lastKm ? parseInt(lastKm) : null,
				lastDate: lastDate || null,
			});
			if (!isEdit) {
				setNama('');
				setIntervalType('KM');
				setIntervalValue('');
				setTimeIntervalValue('');
				setTimeIntervalUnit('MONTH');
				setLastKm('');
				setLastDate('');
			}
		} catch (error) {
			console.error('Error saving service item:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Item Servis' : 'Tambah Item Servis'}</DialogTitle>
					<DialogDescription>
						{isEdit ? 'Ubah detail item servis' : 'Definisikan item servis baru untuk kendaraan ini'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label>Nama Servis *</Label>
						<Input
							value={nama}
							onChange={(e) => setNama(e.target.value)}
							placeholder="cth. Ganti Oli, Filter Udara"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label>Tipe Interval</Label>
						<Select value={intervalType} onValueChange={(v) => setIntervalType(v as IntervalType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(INTERVAL_LABELS) as IntervalType[]).map((type) => (
									<SelectItem key={type} value={type}>
										{INTERVAL_LABELS[type]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{intervalType !== 'NONE' && intervalType !== 'WHICHEVER_FIRST' && (
						<div className="space-y-2">
							<Label>
								Nilai Interval
								{intervalType === 'KM' && ' (km)'}
								{intervalType === 'DAY' && ' (hari)'}
								{intervalType === 'MONTH' && ' (bulan)'}
								{intervalType === 'YEAR' && ' (tahun)'}
							</Label>
							<Input
								type="number"
								value={intervalValue}
								onChange={(e) => setIntervalValue(e.target.value)}
								placeholder={intervalType === 'KM' ? 'cth. 5000' : 'cth. 12'}
								required
							/>
						</div>
					)}

					{intervalType === 'WHICHEVER_FIRST' && (
						<div className="space-y-4 rounded-md border p-3 bg-muted/30">
							<div className="space-y-2">
								<Label>Interval Jarak (km)</Label>
								<Input
									type="number"
									value={intervalValue}
									onChange={(e) => setIntervalValue(e.target.value)}
									placeholder="cth. 5000"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label>Atau Interval Waktu</Label>
								<div className="flex gap-2">
									<Input
										type="number"
										value={timeIntervalValue}
										onChange={(e) => setTimeIntervalValue(e.target.value)}
										placeholder="cth. 6"
										required
										className="flex-1"
									/>
									<Select value={timeIntervalUnit} onValueChange={(v) => setTimeIntervalUnit(v as IntervalType)}>
										<SelectTrigger className="w-28">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="DAY">Hari</SelectItem>
											<SelectItem value="MONTH">Bulan</SelectItem>
											<SelectItem value="YEAR">Tahun</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</div>
					)}

					<div className="space-y-2">
						<Label>Kilometer Terakhir Servis</Label>
						<Input
							type="number"
							value={lastKm}
							onChange={(e) => setLastKm(e.target.value)}
							placeholder={currentKm > 0 ? currentKm.toString() : 'cth. 20000'}
						/>
						{currentKm > 0 && (
							<div className="flex items-center justify-between">
								<p className="text-xs text-muted-foreground">
									Odometer saat ini: {currentKm.toLocaleString()} km
								</p>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-auto p-0 text-xs text-primary hover:text-primary/80"
									onClick={() => setLastKm(currentKm.toString())}
								>
									Gunakan saat ini
								</Button>
							</div>
						)}
					</div>

					<div className="space-y-2">
						<Label>Tanggal Terakhir Servis</Label>
						<Input
							type="date"
							value={lastDate}
							onChange={(e) => setLastDate(e.target.value)}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Batal
						</Button>
						<Button type="submit" disabled={loading || !nama}>
							{loading ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
