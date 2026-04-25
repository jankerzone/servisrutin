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
import type { ElektronikIntervalType, ElektronikServiceItemPayload, ElektronikServiceItem } from '@/types';

interface ElektronikServiceItemFormProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: Omit<ElektronikServiceItemPayload, 'elektronikId'>) => Promise<void>;
	item?: ElektronikServiceItem;
}

const INTERVAL_LABELS: Record<ElektronikIntervalType, string> = {
	DAY: 'Hari',
	MONTH: 'Bulan',
	YEAR: 'Tahun',
	NONE: 'Tidak Ada',
};

export default function ElektronikServiceItemForm({ open, onClose, onSubmit, item }: ElektronikServiceItemFormProps) {
	const [nama, setNama] = useState(item?.nama || '');
	const [intervalType, setIntervalType] = useState<ElektronikIntervalType>(
		(item?.intervalType as ElektronikIntervalType) || 'MONTH',
	);
	const [intervalValue, setIntervalValue] = useState(item?.intervalValue?.toString() || '');
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
				lastDate: lastDate || null,
			});
			if (!isEdit) {
				setNama('');
				setIntervalType('MONTH');
				setIntervalValue('');
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
						{isEdit ? 'Ubah detail item servis' : 'Definisikan item servis baru untuk elektronik ini'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label>Nama Servis *</Label>
						<Input
							value={nama}
							onChange={(e) => setNama(e.target.value)}
							placeholder="cth. Cuci AC, Ganti Filter"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label>Tipe Interval</Label>
						<Select value={intervalType} onValueChange={(v) => setIntervalType(v as ElektronikIntervalType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(INTERVAL_LABELS) as ElektronikIntervalType[]).map((type) => (
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
								{intervalType === 'DAY' && ' (hari)'}
								{intervalType === 'MONTH' && ' (bulan)'}
								{intervalType === 'YEAR' && ' (tahun)'}
							</Label>
							<Input
								type="number"
								value={intervalValue}
								onChange={(e) => setIntervalValue(e.target.value)}
								placeholder="cth. 3"
								required
							/>
						</div>
					)}

					<div className="space-y-2">
						<Label>Tanggal Terakhir Servis</Label>
						<Input
							type="date"
							value={lastDate}
							onChange={(e) => setLastDate(e.target.value)}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>Batal</Button>
						<Button type="submit" disabled={loading || !nama}>
							{loading ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
