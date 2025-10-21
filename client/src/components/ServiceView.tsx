import { useState } from 'react';
import { Box, Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AddServiceForm from './AddServiceForm';

interface ServiceViewProps {
	kendaraanId: number;
}

export default function ServiceView({ kendaraanId }: ServiceViewProps) {
	const [showForm, setShowForm] = useState(false);

	const handleSuccess = () => {
		console.log('Service item added successfully');
	};

	return (
		<Box sx={{ position: 'relative', minHeight: '300px' }}>
			<Box sx={{ p: 2 }}>
				<h2>Service Items</h2>
				<p>Service items will be displayed here...</p>
			</Box>

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
