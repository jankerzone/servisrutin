import { useEffect } from 'react';
import { ThemeProvider, CssBaseline, Container, AppBar, Toolbar, Typography, CircularProgress, Box, Button } from '@mui/material';
import ServiceView from './components/ServiceView';
import VehicleSelector from './components/VehicleSelector';
import Auth from './components/Auth';
import { useKendaraanStore } from './store/useKendaraanStore';
import { useAuthStore } from './store/useAuthStore';
import { theme } from './theme';
import './App.css';

function App() {
	const selectedKendaraanId = useKendaraanStore((state) => state.selectedKendaraanId);
	const currentKm = useKendaraanStore((state) => state.currentKm);
	const { user, loading, checkAuth, logout } = useAuthStore();

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	if (loading) {
		return (
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
					<CircularProgress />
				</Box>
			</ThemeProvider>
		);
	}

	if (!user) {
		return (
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<Auth />
			</ThemeProvider>
		);
	}

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
				<AppBar position="static" elevation={0}>
					<Toolbar>
						<Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
							🚗 Servis Rutin
						</Typography>
						<Typography variant="body2" sx={{ mr: 2, px: 2, py: 0.5, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
							{user.name || user.email}
						</Typography>
						<Button 
							color="inherit" 
							onClick={logout}
							sx={{ 
								bgcolor: 'rgba(255,255,255,0.1)',
								'&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
							}}
						>
							Logout
						</Button>
					</Toolbar>
				</AppBar>

				<Container maxWidth="lg" sx={{ py: 4 }}>
					<VehicleSelector />

					{selectedKendaraanId && selectedKendaraanId > 0 && <ServiceView kendaraanId={selectedKendaraanId} currentKm={currentKm} />}
				</Container>
			</Box>
		</ThemeProvider>
	);
}

export default App;
