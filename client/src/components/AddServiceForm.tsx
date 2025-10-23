import { useState } from 'react';
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	TextField,
	Button,
	FormControl,
	FormLabel,
	RadioGroup,
	FormControlLabel,
	Radio,
	Box,
	Typography,
} from '@mui/material';

interface AddServiceFormProps {
	open: boolean;
	onClose: () => void;
	kendaraanId: number;
	currentKm?: number;
	onSuccess?: () => void;
}

type IntervalType = 'KM' | 'DAY' | 'MONTH' | 'YEAR' | 'WHICHEVER_FIRST' | 'NONE';

export default function AddServiceForm({ open, onClose, kendaraanId, currentKm = 0, onSuccess }: AddServiceFormProps) {
	const [nama, setNama] = useState('');
	const [intervalType, setIntervalType] = useState<IntervalType>('KM');
	const [intervalValue, setIntervalValue] = useState('');
	const [lastKm, setLastKm] = useState('');
	const [lastDate, setLastDate] = useState('');

	const handleSubmit = async () => {
		try {
			const response = await fetch('/api/service-items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({
					kendaraanId,
					nama,
					intervalType,
					intervalValue: intervalType === 'NONE' ? null : parseInt(intervalValue),
					lastKm: lastKm ? parseInt(lastKm) : null,
					lastDate: lastDate || null,
				}),
			});

			if (response.ok) {
				const result = await response.json();
				console.log('Save success:', result);
				
				// Reset form
				setNama('');
				setIntervalType('KM');
				setIntervalValue('');
				setLastKm('');
				setLastDate('');
				
				onSuccess?.();
				onClose();
			} else {
				console.error('Save failed:', await response.text());
			}
		} catch (error) {
			console.error('Error saving service item:', error);
		}
	};

	const showIntervalValue = intervalType !== 'NONE';

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Add Service Item</DialogTitle>
			<DialogContent>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
					<TextField
						label="Service Name"
						value={nama}
						onChange={(e) => setNama(e.target.value)}
						fullWidth
						required
						placeholder="e.g., Engine Oil"
					/>

					<FormControl component="fieldset">
						<FormLabel component="legend">Interval Type</FormLabel>
						<RadioGroup
							value={intervalType}
							onChange={(e) => setIntervalType(e.target.value as IntervalType)}
						>
							<FormControlLabel value="KM" control={<Radio />} label="Kilometer" />
							<FormControlLabel value="DAY" control={<Radio />} label="Days" />
							<FormControlLabel value="MONTH" control={<Radio />} label="Months" />
							<FormControlLabel value="YEAR" control={<Radio />} label="Years" />
							<FormControlLabel value="WHICHEVER_FIRST" control={<Radio />} label="Whichever First" />
							<FormControlLabel value="NONE" control={<Radio />} label="None" />
						</RadioGroup>
					</FormControl>

					{showIntervalValue && (
						<TextField
							label="Interval Value"
							type="number"
							value={intervalValue}
							onChange={(e) => setIntervalValue(e.target.value)}
							fullWidth
							required
							placeholder={intervalType === 'KM' ? 'e.g., 5000' : 'e.g., 12'}
						/>
					)}

					<Box>
						<TextField
							label="Last Kilometer"
							type="number"
							value={lastKm}
							onChange={(e) => setLastKm(e.target.value)}
							fullWidth
							placeholder={currentKm > 0 ? currentKm.toString() : 'e.g., 20000'}
						/>
						{currentKm > 0 && (
							<Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
								Vehicle's current odometer: {currentKm.toLocaleString()} km
							</Typography>
						)}
					</Box>

					<TextField
						label="Last Service Date"
						type="date"
						value={lastDate}
						onChange={(e) => setLastDate(e.target.value)}
						fullWidth
						InputLabelProps={{ shrink: true }}
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Cancel</Button>
				<Button onClick={handleSubmit} variant="contained" disabled={!nama}>
					Save
				</Button>
			</DialogActions>
		</Dialog>
	);
}
