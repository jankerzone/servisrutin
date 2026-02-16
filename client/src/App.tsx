import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import AuthPage from '@/components/auth/AuthPage';
import DashboardPage from '@/components/dashboard/DashboardPage';
import VehiclesPage from '@/components/vehicles/VehiclesPage';
import VehicleDetailPage from '@/components/vehicles/VehicleDetailPage';
import HistoryPage from '@/components/history/HistoryPage';

function AuthGuard({ children }: { children: React.ReactNode }) {
	const { user, loading, checkAuth } = useAuthStore();

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!user) {
		return <Navigate to="/login" replace />;
	}

	return <>{children}</>;
}

function GuestGuard({ children }: { children: React.ReactNode }) {
	const { user, loading, checkAuth } = useAuthStore();

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);

	if (loading) {
		return (
			<div className="flex h-screen items-center justify-center">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
			</div>
		);
	}

	if (user) {
		return <Navigate to="/" replace />;
	}

	return <>{children}</>;
}

export default function App() {
	return (
		<BrowserRouter>
			<Toaster position="top-right" richColors />
			<Routes>
				<Route
					path="/login"
					element={
						<GuestGuard>
							<AuthPage />
						</GuestGuard>
					}
				/>
				<Route
					element={
						<AuthGuard>
							<AppLayout />
						</AuthGuard>
					}
				>
					<Route index element={<DashboardPage />} />
					<Route path="kendaraan" element={<VehiclesPage />} />
					<Route path="kendaraan/:id" element={<VehicleDetailPage />} />
					<Route path="riwayat" element={<HistoryPage />} />
				</Route>
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</BrowserRouter>
	);
}
