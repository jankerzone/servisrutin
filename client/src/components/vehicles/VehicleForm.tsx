import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import type { VehiclePayload, Vehicle } from '@/types';

interface VehicleFormProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (data: VehiclePayload) => Promise<void>;
	vehicle?: Vehicle;
}

export default function VehicleForm({ open, onClose, onSubmit, vehicle }: VehicleFormProps) {
	const [nama, setNama] = useState(vehicle?.nama || '');
	const [tipe, setTipe] = useState(vehicle?.tipe || '');
	const [plat, setPlat] = useState(vehicle?.plat || '');
	const [tahun, setTahun] = useState(vehicle?.tahun?.toString() || '');
	const [bulanPajak, setBulanPajak] = useState(vehicle?.bulanPajak?.toString() || '');
	const [currentKm, setCurrentKm] = useState(vehicle?.currentKm?.toString() || '');
	const [loading, setLoading] = useState(false);

	const isEdit = !!vehicle;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!nama) return;

		setLoading(true);
		try {
			await onSubmit({
				nama,
				tipe: tipe || null,
				plat: plat || null,
				tahun: tahun ? parseInt(tahun) : null,
				bulanPajak: bulanPajak ? parseInt(bulanPajak) : null,
				currentKm: currentKm ? parseInt(currentKm) : 0,
			});
			if (!isEdit) resetForm();
		} catch (error) {
			console.error('Error saving vehicle:', error);
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setNama('');
		setTipe('');
		setPlat('');
		setTahun('');
		setBulanPajak('');
		setCurrentKm('');
	};

	return (
		<Dialog open={open} onOpenChange={(v) => !v && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Kendaraan' : 'Tambah Kendaraan Baru'}</DialogTitle>
					<DialogDescription>
						{isEdit ? 'Ubah informasi kendaraan Anda' : 'Isi detail kendaraan yang ingin ditambahkan'}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="nama">Nama Kendaraan *</Label>
						<Input
							id="nama"
							value={nama}
							onChange={(e) => setNama(e.target.value)}
							placeholder="cth. Honda Beat, Toyota Avanza"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="tipe">Tipe</Label>
						<Select value={tipe} onValueChange={setTipe}>
							<SelectTrigger>
								<SelectValue placeholder="Pilih tipe kendaraan" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Motor">Motor</SelectItem>
								<SelectItem value="Mobil">Mobil</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label htmlFor="plat">Plat Nomor</Label>
						<Input
							id="plat"
							value={plat}
							onChange={(e) => setPlat(e.target.value)}
							placeholder="cth. B 1234 XYZ"
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="tahun">Tahun</Label>
							<Input
								id="tahun"
								type="number"
								value={tahun}
								onChange={(e) => setTahun(e.target.value)}
								placeholder="cth. 2022"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="bulanPajak">Bulan Pajak</Label>
							<Select value={bulanPajak} onValueChange={setBulanPajak}>
								<SelectTrigger>
									<SelectValue placeholder="Pilih bulan" />
								</SelectTrigger>
								<SelectContent>
									{['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'].map((m, i) => (
										<SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="currentKm">Odometer Saat Ini (km)</Label>
						<Input
							id="currentKm"
							type="number"
							value={currentKm}
							onChange={(e) => setCurrentKm(e.target.value)}
							placeholder="cth. 25000"
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
