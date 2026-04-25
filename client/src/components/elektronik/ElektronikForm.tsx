import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { ElektronikPayload, Elektronik } from '@/types';

interface ElektronikFormProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: ElektronikPayload) => Promise<void>;
	item?: Elektronik;
}

export default function ElektronikForm({ open, onClose, onSubmit, item }: ElektronikFormProps) {
	const [nama, setNama] = useState(item?.nama || '');
	const [tipe, setTipe] = useState(item?.tipe || '');
	const [lokasi, setLokasi] = useState(item?.lokasi || '');
	const [tahunBeli, setTahunBeli] = useState(item?.tahunBeli?.toString() || '');
	const [loading, setLoading] = useState(false);

	const isEdit = !!item;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nama.trim()) return;
		setLoading(true);
		try {
			await onSubmit({
				nama: nama.trim(),
				tipe: tipe.trim() || null,
				lokasi: lokasi.trim() || null,
				tahunBeli: tahunBeli ? parseInt(tahunBeli) : null,
			});
			if (!isEdit) {
				setNama('');
				setTipe('');
				setLokasi('');
				setTahunBeli('');
			}
		} catch (error) {
			console.error('Error saving elektronik:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Elektronik' : 'Tambah Elektronik'}</DialogTitle>
					<DialogDescription>
						{isEdit ? 'Ubah detail elektronik' : 'Tambahkan perangkat elektronik untuk dilacak servisnya'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label>Nama *</Label>
						<Input
							value={nama}
							onChange={(e) => setNama(e.target.value)}
							placeholder="cth. AC Samsung Kamar, Kulkas Dapur"
							required
							autoFocus
						/>
					</div>

					<div className="space-y-2">
						<Label>Tipe <span className="text-muted-foreground font-normal">— opsional</span></Label>
						<Input
							value={tipe}
							onChange={(e) => setTipe(e.target.value)}
							placeholder="cth. AC, Kulkas, TV, Mesin Cuci"
						/>
					</div>

					<div className="space-y-2">
						<Label>Lokasi <span className="text-muted-foreground font-normal">— opsional</span></Label>
						<Input
							value={lokasi}
							onChange={(e) => setLokasi(e.target.value)}
							placeholder="cth. Kamar Utama, Dapur, Ruang Tamu"
						/>
					</div>

					<div className="space-y-2">
						<Label>Tahun Beli <span className="text-muted-foreground font-normal">— opsional</span></Label>
						<Input
							type="number"
							value={tahunBeli}
							onChange={(e) => setTahunBeli(e.target.value)}
							placeholder="cth. 2021"
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>Batal</Button>
						<Button type="submit" disabled={loading || !nama.trim()}>
							{loading ? 'Menyimpan...' : isEdit ? 'Simpan' : 'Tambah'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
