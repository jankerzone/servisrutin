import { useEffect, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Container, AppBar, Toolbar, Typography } from '@mui/material';
import ServiceView from './components/ServiceView';
import VehicleSelector from './components/VehicleSelector';
import { useKendaraanStore } from './store/useKendaraanStore';
import './App.css';

const theme = createTheme();

function App() {
	const [health, setHealth] = useState<{ status: string; message: string } | null>(null);
	const [currentKm, setCurrentKm] = useState(0);
	const selectedKendaraanId = useKendaraanStore((state) => state.selectedKendaraanId);

	useEffect(() => {
		fetch('/api/health')
			.then((res) => res.json())
			.then((data) => setHealth(data))
			.catch((err) => console.error('Error fetching health:', err));
	}, []);

	useEffect(() => {
		if (selectedKendaraanId) {
			fetch('/api/vehicles')
				.then((res) => res.json())
				.then((data) => {
					const vehicle = data.results?.find((v: { id: number }) => v.id === selectedKendaraanId);
					if (vehicle) setCurrentKm(vehicle.currentKm || 0);
				})
				.catch((err) => console.error('Error fetching vehicle:', err));
		}
	}, [selectedKendaraanId]);

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<AppBar position="static">
				<Toolbar>
					<Typography variant="h6" component="div">
						Servis Rutin
					</Typography>
				</Toolbar>
			</AppBar>
			
			<Container maxWidth="md" sx={{ mt: 4 }}>
				{health && (
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						API Status: {health.status}
					</Typography>
				)}
				
				<VehicleSelector />
				
				{selectedKendaraanId && <ServiceView kendaraanId={selectedKendaraanId} currentKm={currentKm} />}
			</Container>
		</ThemeProvider>
	);
}

export default App;
