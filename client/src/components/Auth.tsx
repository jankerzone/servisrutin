import { useState } from 'react';
import {
	Box,
	Card,
	CardContent,
	TextField,
	Button,
	Typography,
	Alert,
	Tabs,
	Tab,
	Container,
} from '@mui/material';
import { useAuthStore } from '../store/useAuthStore';

export default function Auth() {
	const [tab, setTab] = useState(0);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const { login, signup } = useAuthStore();

	const handleSubmit = async (e: { preventDefault: () => void }) => {
		e.preventDefault();
		setError('');
		setLoading(true);

		try {
			const result = tab === 0 
				? await login(email, password)
				: await signup(email, password, name);

			if (!result.success) {
				setError(result.error || 'Authentication failed');
			}
		} catch {
			setError('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	return (
		<Box sx={{ 
			minHeight: '100vh', 
			display: 'flex', 
			alignItems: 'center', 
			justifyContent: 'center',
			bgcolor: 'background.default',
			py: 4
		}}>
			<Container maxWidth="sm">
				<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
					<Box sx={{ 
						mb: 4, 
						textAlign: 'center',
						p: 3,
						bgcolor: 'primary.main',
						borderRadius: 4,
						color: 'white',
						boxShadow: 3
					}}>
						<Typography variant="h3" component="h1" fontWeight={700} sx={{ mb: 1 }}>
							🚗 Servis Rutin
						</Typography>
						<Typography variant="body1" sx={{ opacity: 0.9 }}>
							Track your vehicle maintenance and service schedules
						</Typography>
					</Box>

					<Card sx={{ width: '100%', boxShadow: 4 }} elevation={0}>
						<CardContent sx={{ p: 4 }}>
						<Tabs 
							value={tab} 
							onChange={(_, v) => setTab(v)} 
							sx={{ 
								mb: 3,
								'& .MuiTab-root': {
									minWidth: 120,
									fontWeight: 600,
									fontSize: '1rem'
								}
							}}
							variant="fullWidth"
						>
							<Tab label="Login" />
							<Tab label="Sign Up" />
						</Tabs>

						{error && (
							<Alert severity="error" sx={{ mb: 2 }}>
								{error}
							</Alert>
						)}

						<form onSubmit={handleSubmit}>
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
								{tab === 1 && (
									<TextField
										label="Name (optional)"
										value={name}
										onChange={(e) => setName(e.target.value)}
										fullWidth
									/>
								)}

								<TextField
									label="Email"
									type="email"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
									fullWidth
									autoComplete="email"
								/>

								<TextField
									label="Password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
									fullWidth
									autoComplete={tab === 0 ? 'current-password' : 'new-password'}
								/>

								<Button
									type="submit"
									variant="contained"
									size="large"
									disabled={loading}
									fullWidth
									sx={{ 
										py: 1.5,
										fontSize: '1rem',
										fontWeight: 600
									}}
								>
									{loading ? 'Please wait...' : tab === 0 ? 'Login' : 'Sign Up'}
								</Button>
							</Box>
						</form>
					</CardContent>
				</Card>
			</Box>
		</Container>
		</Box>
	);
}
