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
	const selectedKendaraanId = useKendaraanStore((state) => state.selectedKendaraanId);
	const setSelectedKendaraanId = useKendaraanStore((state) => state.setSelectedKendaraanId);

	useEffect(() => {
		fetchVehicles();
	}, []);

	const fetchVehicles = async () => {
		try {
			const response = await fetch('/api/vehicles');
			const data = await response.json();
			setVehicles(data.results || []);
		} catch (error) {
			console.error('Error fetching vehicles:', error);
		}
	};

	const handleVehicleChange = (event: SelectChangeEvent<number>) => {
		setSelectedKendaraanId(event.target.value as number);
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

	return (
		<Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
			<FormControl sx={{ minWidth: 200 }}>
				<InputLabel>Vehicle</InputLabel>
				<Select
					value={selectedKendaraanId || ''}
					label="Vehicle"
					onChange={handleVehicleChange}
				>
					{vehicles.map((vehicle) => (
						<MenuItem key={vehicle.id} value={vehicle.id}>
							{vehicle.nama} {vehicle.plat ? `(${vehicle.plat})` : ''}
						</MenuItem>
					))}
				</Select>
			</FormControl>

			{currentVehicle && (
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
						Current: {currentVehicle.currentKm?.toLocaleString() || 0} km
					</Box>
					<Button size="small" variant="outlined" onClick={() => setShowKmDialog(true)}>
						Update KM
					</Button>
				</Box>
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
		</Box>
	);
}
