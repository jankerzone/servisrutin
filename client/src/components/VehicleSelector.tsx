import { useEffect, useState } from 'react';
import {
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	SelectChangeEvent,
	Box,
	TextField,
	Button,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Typography,
} from '@mui/material';
import { useKendaraanStore } from '../store/useKendaraanStore';

interface Vehicle {
	id: number;
	nama: string;
	tipe: string | null;
	plat: string | null;
	tahun: number | null;
	bulanPajak: number | null;
	currentKm: number | null;
}

export default function VehicleSelector() {
	const [vehicles, setVehicles] = useState<Vehicle[]>([]);
	const [showKmDialog, setShowKmDialog] = useState(false);
	const [kmInput, setKmInput] = useState('');
	const [showAddDialog, setShowAddDialog] = useState(false);
	const [newVehicle, setNewVehicle] = useState({
		nama: '',
		tipe: '',
		plat: '',
		tahun: '',
		bulanPajak: '',
		currentKm: '',
	});
	const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
	const selectedKendaraanId = useKendaraanStore((state) => state.selectedKendaraanId);
	const setSelectedKendaraanId = useKendaraanStore((state) => state.setSelectedKendaraanId);
	const setCurrentKm = useKendaraanStore((state) => state.setCurrentKm);

	useEffect(() => {
		fetchVehicles();
	}, []);

	const fetchVehicles = async () => {
		try {
			const response = await fetch('/api/vehicles');
			const data = await response.json();
			const transformedVehicles = (data.results || []).map(
				(v: {
					id: number;
					nama: string;
					tipe: string | null;
					plat: string | null;
					tahun: number | null;
					bulan_pajak: number | null;
					current_km: number | null;
				}) => ({
					id: v.id,
					nama: v.nama,
					tipe: v.tipe,
					plat: v.plat,
					tahun: v.tahun,
					bulanPajak: v.bulan_pajak,
					currentKm: v.current_km,
				}),
			);
			setVehicles(transformedVehicles);

			if (selectedKendaraanId) {
				const currentVehicle = transformedVehicles.find((v: Vehicle) => v.id === selectedKendaraanId);
				if (currentVehicle) {
					setCurrentKm(currentVehicle.currentKm || 0);
				}
			}
		} catch (error) {
			console.error('Error fetching vehicles:', error);
		}
	};

	const handleVehicleChange = (event: SelectChangeEvent<number>) => {
		const value = event.target.value;
		if (value === -1) {
			setShowAddDialog(true);
		} else {
			setSelectedKendaraanId(value as number);
			const vehicle = vehicles.find((v) => v.id === value);
			if (vehicle) {
				setCurrentKm(vehicle.currentKm || 0);
			}
		}
	};

	const handleDeleteVehicle = (vehicleId: number) => {
		console.log('Delete button clicked for vehicle:', vehicleId);
		setDeleteConfirm(vehicleId);
	};

	const confirmDeleteVehicle = async () => {
		if (!deleteConfirm) return;

		try {
			const response = await fetch(`/api/vehicles/${deleteConfirm}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				console.log('Vehicle deleted successfully');
				setDeleteConfirm(null);
				await fetchVehicles();

				// If we deleted the currently selected vehicle, reset selection
				if (deleteConfirm === selectedKendaraanId) {
					setSelectedKendaraanId(0);
					setCurrentKm(0);
				}
			}
		} catch (error) {
			console.error('Error deleting vehicle:', error);
		}
	};

	const handleAddVehicle = async () => {
		if (!newVehicle.nama) return;

		try {
			const payload = {
				nama: newVehicle.nama,
				tipe: newVehicle.tipe || null,
				plat: newVehicle.plat || null,
				tahun: newVehicle.tahun ? parseInt(newVehicle.tahun) : null,
				bulanPajak: newVehicle.bulanPajak ? parseInt(newVehicle.bulanPajak) : null,
				currentKm: newVehicle.currentKm ? parseInt(newVehicle.currentKm) : 0,
			};

			const response = await fetch('/api/vehicles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				const data = await response.json();
				setShowAddDialog(false);
				setNewVehicle({
					nama: '',
					tipe: '',
					plat: '',
					tahun: '',
					bulanPajak: '',
					currentKm: '',
				});
				await fetchVehicles();
				setSelectedKendaraanId(data.result.id);
			}
		} catch (error) {
			console.error('Error adding vehicle:', error);
		}
	};

	const handleUpdateKm = async () => {
		if (!selectedKendaraanId || !kmInput) return;

		try {
			const response = await fetch(`/api/vehicles/${selectedKendaraanId}/km`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentKm: parseInt(kmInput) }),
			});

			if (response.ok) {
				console.log('Current km updated successfully');
				setShowKmDialog(false);
				setKmInput('');
				fetchVehicles();
			}
		} catch (error) {
			console.error('Error updating km:', error);
		}
	};

	const currentVehicle = vehicles.find((v) => v.id === selectedKendaraanId);

	// Debugging: Log when component renders and what currentVehicle is
	console.log('VehicleSelector render - currentVehicle:', currentVehicle);
	console.log('VehicleSelector render - selectedKendaraanId:', selectedKendaraanId);

	return (
		<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3, flexWrap: 'wrap' }}>
			<FormControl sx={{ minWidth: 200 }}>
				<InputLabel>Vehicle</InputLabel>
				<Select value={selectedKendaraanId || ''} label="Vehicle" onChange={handleVehicleChange}>
					{vehicles.map((vehicle) => (
						<MenuItem key={vehicle.id} value={vehicle.id}>
							{vehicle.nama} {vehicle.plat ? `(${vehicle.plat})` : ''}
						</MenuItem>
					))}
					<MenuItem value={-1} sx={{ color: 'primary.main', fontWeight: 'bold' }}>
						+ Tambahkan Kendaraan Baru
					</MenuItem>
				</Select>
			</FormControl>

			{currentVehicle && (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>Current: {currentVehicle.currentKm?.toLocaleString() || 0} km</Box>
					<Button size="small" variant="outlined" onClick={() => setShowKmDialog(true)}>
						Update KM
					</Button>
				</Box>
			)}

			{currentVehicle && (
				<Button size="small" variant="outlined" onClick={() => handleDeleteVehicle(currentVehicle.id)} sx={{ ml: 1 }}>
					DELETE
				</Button>
			)}

			<Dialog open={showKmDialog} onClose={() => setShowKmDialog(false)} maxWidth="xs" fullWidth>
				<DialogTitle>Update Current Odometer</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						margin="dense"
						label="Current KM"
						type="number"
						fullWidth
						value={kmInput}
						onChange={(e) => setKmInput(e.target.value)}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowKmDialog(false)}>Cancel</Button>
					<Button onClick={handleUpdateKm} variant="contained" disabled={!kmInput}>
						Update
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={showAddDialog} onClose={() => setShowAddDialog(false)} maxWidth="sm" fullWidth>
				<DialogTitle>Tambah Kendaraan Baru</DialogTitle>
				<DialogContent>
					<TextField
						autoFocus
						margin="dense"
						label="Nama Kendaraan"
						fullWidth
						required
						value={newVehicle.nama}
						onChange={(e) => setNewVehicle({ ...newVehicle, nama: e.target.value })}
					/>
					<TextField
						margin="dense"
						label="Tipe"
						fullWidth
						value={newVehicle.tipe}
						onChange={(e) => setNewVehicle({ ...newVehicle, tipe: e.target.value })}
					/>
					<TextField
						margin="dense"
						label="Plat Nomor"
						fullWidth
						value={newVehicle.plat}
						onChange={(e) => setNewVehicle({ ...newVehicle, plat: e.target.value })}
					/>
					<TextField
						margin="dense"
						label="Tahun"
						type="number"
						fullWidth
						value={newVehicle.tahun}
						onChange={(e) => setNewVehicle({ ...newVehicle, tahun: e.target.value })}
					/>
					<TextField
						margin="dense"
						label="Bulan Pajak (1-12)"
						type="number"
						fullWidth
						inputProps={{ min: 1, max: 12 }}
						value={newVehicle.bulanPajak}
						onChange={(e) => setNewVehicle({ ...newVehicle, bulanPajak: e.target.value })}
					/>
					<TextField
						margin="dense"
						label="Current KM"
						type="number"
						fullWidth
						value={newVehicle.currentKm}
						onChange={(e) => setNewVehicle({ ...newVehicle, currentKm: e.target.value })}
					/>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setShowAddDialog(false)}>Batal</Button>
					<Button onClick={handleAddVehicle} variant="contained" disabled={!newVehicle.nama}>
						Tambah
					</Button>
				</DialogActions>
			</Dialog>

			<Dialog open={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)}>
				<DialogTitle>Confirm Delete</DialogTitle>
				<DialogContent>
					<Typography>Are you sure you want to delete this vehicle and all its service items?</Typography>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
					<Button onClick={confirmDeleteVehicle} color="error" variant="contained">
						Delete
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}
