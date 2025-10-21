import { useState } from 'react';
import { Box, Fab, FormControl, InputLabel, Select, MenuItem, Typography, SelectChangeEvent } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddServiceForm from './AddServiceForm';
import ServiceList from './ServiceList';

interface ServiceViewProps {
	kendaraanId: number;
	currentKm?: number;
}

export default function ServiceView({ kendaraanId, currentKm = 0 }: ServiceViewProps) {
	const [showForm, setShowForm] = useState(false);
	const [sortBy, setSortBy] = useState('nama');
	const [refreshKey, setRefreshKey] = useState(0);

	const handleSuccess = () => {
		console.log('Service item added successfully');
		setRefreshKey(prev => prev + 1);
	};

	const handleSortChange = (event: SelectChangeEvent) => {
		setSortBy(event.target.value);
	};

	return (
		<Box sx={{ position: 'relative', minHeight: '300px', pb: 10 }}>
			<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
				<Typography variant="h5">Service Items</Typography>
				<FormControl size="small" sx={{ minWidth: 120 }}>
					<InputLabel>Sort by</InputLabel>
					<Select value={sortBy} label="Sort by" onChange={handleSortChange}>
						<MenuItem value="nama">Name</MenuItem>
						<MenuItem value="last_date">Last Date</MenuItem>
						<MenuItem value="last_km">Last KM</MenuItem>
					</Select>
				</FormControl>
			</Box>

			<ServiceList 
				key={refreshKey}
				kendaraanId={kendaraanId} 
				sortBy={sortBy}
				currentKm={currentKm}
			/>

			<Fab
				color="primary"
				sx={{ position: 'fixed', bottom: 16, right: 16 }}
				onClick={() => setShowForm(true)}
			>
				<AddIcon />
			</Fab>

			<AddServiceForm
				open={showForm}
				onClose={() => setShowForm(false)}
				kendaraanId={kendaraanId}
				onSuccess={handleSuccess}
			/>
		</Box>
	);
}
