import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { todayISO } from '@/lib/utils';
import type { ElektronikServiceItem } from '@/types';

interface AddElektronikHistoryFormProps {
	open: boolean;
	onClose: () => void;
	elektronikId: number;
	serviceItems: ElektronikServiceItem[];
	onSuccess: () => void;
}

export default function AddElektronikHistoryForm({
	open, onClose, elektronikId, serviceItems, onSuccess,
}: AddElektronikHistoryFormProps) {
	const [serviceDate, setServiceDate] = useState(todayISO());
	const [selectedIds, setSelectedIds] = useState<number[]>([]);
	const [totalCost, setTotalCost] = useState('');
	const [notes, setNotes] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	const handleToggle = (id: number) => {
		setSelectedIds((prev) =>
			prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
		);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (selectedIds.length === 0) {
			setError('Pilih minimal satu item servis');
			return;
		}
		setLoading(true);
		setError('');
		try {
			await api.post('/api/elektronik-service-history', {
				elektronikId,
				serviceDate,
				serviceItemIds: selectedIds,
				totalCost: totalCost ? parseInt(totalCost) : null,
				notes: notes || null,
			});
			resetForm();
			onSuccess();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Gagal menyimpan');
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setServiceDate(todayISO());
		setSelectedIds([]);
		setTotalCost('');
		setNotes('');
		setError('');
	};

	return (
		<Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
			<DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Catat Servis</DialogTitle>
					<DialogDescription>Rekam servis yang sudah dilakukan</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					{error && (
						<div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
							{error}
						</div>
					)}

					<div className="space-y-2">
						<Label>Tanggal Servis *</Label>
						<Input type="date" value={serviceDate} onChange={(e) => setServiceDate(e.target.value)} required />
					</div>

					<div className="space-y-2">
						<Label>Servis yang Dilakukan *</Label>
						{serviceItems.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								Belum ada item servis. Tambahkan item servis terlebih dahulu.
							</p>
						) : (
							<div className="space-y-2 rounded-md border p-3 max-h-48 overflow-y-auto">
								{serviceItems.map((item) => (
									<div key={item.id} className="flex items-center space-x-2">
										<Checkbox
											id={`eitem-${item.id}`}
											checked={selectedIds.includes(item.id)}
											onCheckedChange={() => handleToggle(item.id)}
										/>
										<label htmlFor={`eitem-${item.id}`} className="text-sm leading-none cursor-pointer">
											{item.nama}
										</label>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="space-y-2">
						<Label>Total Biaya (Rp)</Label>
						<Input
							type="number"
							value={totalCost}
							onChange={(e) => setTotalCost(e.target.value)}
							placeholder="cth. 150000 (opsional)"
						/>
					</div>

					<div className="space-y-2">
						<Label>Catatan</Label>
						<Textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Catatan tambahan (opsional)"
							rows={3}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => { resetForm(); onClose(); }} disabled={loading}>
							Batal
						</Button>
						<Button type="submit" disabled={loading || selectedIds.length === 0}>
							{loading ? 'Menyimpan...' : 'Simpan'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
