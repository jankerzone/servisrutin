import { useState, useEffect } from 'react';
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
} from '@mui/material';

interface ServiceItem {
	id: number;
	kendaraanId: number;
	nama: string;
	intervalType: string | null;
	intervalValue: number | null;
	lastKm: number | null;
	lastDate: string | null;
}

interface EditServiceFormProps {
	open: boolean;
	onClose: () => void;
	item: ServiceItem;
	onSuccess?: () => void;
}

type IntervalType = 'KM' | 'DAY' | 'MONTH' | 'YEAR' | 'WHICHEVER_FIRST' | 'NONE';

export default function EditServiceForm({ open, onClose, item, onSuccess }: EditServiceFormProps) {
	const [nama, setNama] = useState('');
	const [intervalType, setIntervalType] = useState<IntervalType>('KM');
	const [intervalValue, setIntervalValue] = useState('');
	const [lastKm, setLastKm] = useState('');
	const [lastDate, setLastDate] = useState('');

	useEffect(() => {
		if (item) {
			setNama(item.nama);
			setIntervalType((item.intervalType || 'KM') as IntervalType);
			setIntervalValue(item.intervalValue?.toString() || '');
			setLastKm(item.lastKm?.toString() || '');
			setLastDate(item.lastDate || '');
		}
	}, [item]);

	const handleSubmit = async () => {
		try {
			const response = await fetch(`/api/service-items/${item.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					nama,
					intervalType,
					intervalValue: intervalType === 'NONE' ? null : parseInt(intervalValue),
					lastKm: lastKm ? parseInt(lastKm) : null,
					lastDate: lastDate || null,
				}),
			});

			if (response.ok) {
				onSuccess?.();
				onClose();
			} else {
				console.error('Update failed:', await response.text());
			}
		} catch (error) {
			console.error('Error updating service item:', error);
		}
	};

	const showIntervalValue = intervalType !== 'NONE';

	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Edit Service Item</DialogTitle>
			<DialogContent>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
					<TextField
						label="Service Name"
						value={nama}
						onChange={(e) => setNama(e.target.value)}
						fullWidth
						required
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
						/>
					)}

					<TextField
						label="Last Kilometer"
						type="number"
						value={lastKm}
						onChange={(e) => setLastKm(e.target.value)}
						fullWidth
					/>

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
					Update
				</Button>
			</DialogActions>
		</Dialog>
	);
}
