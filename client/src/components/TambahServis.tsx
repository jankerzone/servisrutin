import { useState, useEffect } from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Button,
	Box,
	FormGroup,
	FormControlLabel,
	Checkbox,
	Typography,
	Alert,
} from '@mui/material';

interface ServiceItem {
	id: number;
	nama: string;
}

interface TambahServisProps {
	open: boolean;
	onClose: () => void;
	kendaraanId: number;
	currentKm: number;
	onSuccess?: () => void;
}

export default function TambahServis({ open, onClose, kendaraanId, currentKm, onSuccess }: TambahServisProps) {
	const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
	const [odometerKm, setOdometerKm] = useState(currentKm.toString());
	const [selectedServices, setSelectedServices] = useState<number[]>([]);
	const [totalCost, setTotalCost] = useState('');
	const [notes, setNotes] = useState('');
	const [serviceItems, setServiceItems] = useState<ServiceItem[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (open) {
			fetchServiceItems();
			setOdometerKm(currentKm.toString());
		}
	}, [open, kendaraanId, currentKm]);

	const fetchServiceItems = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/service-items?kendaraanId=${kendaraanId}`, { credentials: 'include' });
			if (response.ok) {
				const data = await response.json();
				setServiceItems(data.results || []);
			} else {
				setError('Failed to load service items');
			}
		} catch (err) {
			setError('Error loading service items');
			console.error('Error fetching service items:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleServiceToggle = (serviceId: number) => {
		setSelectedServices((prev) =>
			prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
		);
	};

	const handleSubmit = async () => {
		if (selectedServices.length === 0) {
			setError('Please select at least one service item');
			return;
		}

		if (!odometerKm || parseInt(odometerKm) <= 0) {
			setError('Please enter a valid odometer reading');
			return;
		}

		try {
			setLoading(true);
			setError('');

			const response = await fetch('/api/service-history', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					kendaraanId,
					serviceDate,
					odometerKm: parseInt(odometerKm),
					serviceItemIds: selectedServices,
					totalCost: totalCost ? parseInt(totalCost) : null,
					notes: notes || null,
				}),
			});

			if (response.ok) {
				console.log('Service record added successfully');
				resetForm();
				onSuccess?.();
				onClose();
			} else {
				const errorData = await response.json();
				setError(errorData.error || 'Failed to save service record');
			}
		} catch (err) {
			setError('Error saving service record');
			console.error('Error saving service record:', err);
		} finally {
			setLoading(false);
		}
	};

	const resetForm = () => {
		setServiceDate(new Date().toISOString().split('T')[0]);
		setOdometerKm(currentKm.toString());
		setSelectedServices([]);
		setTotalCost('');
		setNotes('');
		setError('');
	};

	const handleClose = () => {
		resetForm();
		onClose();
	};

	return (
		<Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
			<DialogTitle>Tambah Servis</DialogTitle>
			<DialogContent>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
					{error && <Alert severity="error">{error}</Alert>}

					<TextField
						label="Tanggal Servis"
						type="date"
						value={serviceDate}
						onChange={(e) => setServiceDate(e.target.value)}
						fullWidth
						required
						InputLabelProps={{ shrink: true }}
					/>

					<Box>
						<TextField
							label="Odometer (km)"
							type="number"
							value={odometerKm}
							onChange={(e) => setOdometerKm(e.target.value)}
							fullWidth
							required
							placeholder="e.g., 25000"
						/>
						<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
							Odometer terakhir: {currentKm.toLocaleString()} km
						</Typography>
					</Box>

					<Box>
						<Typography variant="subtitle2" sx={{ mb: 1 }}>
							Servis yang Dilakukan *
						</Typography>
						{loading ? (
							<Typography variant="body2" color="text.secondary">
								Loading service items...
							</Typography>
						) : serviceItems.length === 0 ? (
							<Typography variant="body2" color="text.secondary">
								No service items available. Please add service items first.
							</Typography>
						) : (
							<FormGroup>
								{serviceItems.map((item) => (
									<FormControlLabel
										key={item.id}
										control={
											<Checkbox
												checked={selectedServices.includes(item.id)}
												onChange={() => handleServiceToggle(item.id)}
											/>
										}
										label={item.nama}
									/>
								))}
							</FormGroup>
						)}
					</Box>

					<TextField
						label="Total Biaya (Rp)"
						type="number"
						value={totalCost}
						onChange={(e) => setTotalCost(e.target.value)}
						fullWidth
						placeholder="e.g., 250000 (optional)"
					/>

					<TextField
						label="Catatan"
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						fullWidth
						multiline
						rows={3}
						placeholder="Catatan tambahan (optional)"
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleClose} disabled={loading}>
					Cancel
				</Button>
				<Button
					onClick={handleSubmit}
					variant="contained"
					disabled={loading || selectedServices.length === 0}
				>
					{loading ? 'Saving...' : 'Save'}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
