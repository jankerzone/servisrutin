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
				lastKm: lastKm ? parseInt(lastKm) : null,
				lastDate: lastDate || null,
			});
			if (!isEdit) {
				setNama('');
				setIntervalType('KM');
				setIntervalValue('');
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

					{intervalType !== 'NONE' && (
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

					<div className="space-y-2">
						<Label>Kilometer Terakhir Servis</Label>
						<Input
							type="number"
							value={lastKm}
							onChange={(e) => setLastKm(e.target.value)}
							placeholder={currentKm > 0 ? currentKm.toString() : 'cth. 20000'}
						/>
						{currentKm > 0 && (
							<p className="text-xs text-muted-foreground">
								Odometer saat ini: {currentKm.toLocaleString()} km
							</p>
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
