import { useEffect, useState } from 'react';
import './App.css';

function App() {
	const [health, setHealth] = useState<{ status: string; message: string } | null>(null);

	useEffect(() => {
		fetch('/api/health')
			.then((res) => res.json())
			.then((data) => setHealth(data))
			.catch((err) => console.error('Error fetching health:', err));
	}, []);

	return (
		<div className="app">
			<header>
				<h1>Servis Rutin</h1>
				<p>Track your vehicle service schedule</p>
			</header>
			
			<main>
				{health && (
					<div className="health-check">
						<p>API Status: <strong>{health.status}</strong></p>
						<p>{health.message}</p>
					</div>
				)}
				
				<section className="welcome">
					<h2>Welcome to Servis Rutin</h2>
					<p>Your simple vehicle service tracker - like Simply Auto</p>
					<ul>
						<li>Track service reminders based on odometer (km) or time</li>
						<li>Manage multiple vehicles (motor/mobil)</li>
						<li>Visual progress bars for due dates</li>
					</ul>
				</section>

				<div className="placeholder">
					<p>Phase 1: Setup Complete ✓</p>
					<p>Next: Onboarding & Service Item Management</p>
				</div>
			</main>
		</div>
	);
}

export default App;
