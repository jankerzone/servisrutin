import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Car, Bike, Gauge, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useVehicles } from '@/hooks/useVehicles';
import { formatKm } from '@/lib/utils';
import VehicleForm from './VehicleForm';

const BULAN = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];

export default function VehiclesPage() {
	const { vehicles, loading, addVehicle } = useVehicles();
	const [showAdd, setShowAdd] = useState(false);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold tracking-tight">Kendaraan</h1>
				</div>
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<Card key={i}>
							<CardContent className="p-6">
								<div className="h-32 animate-pulse rounded bg-muted" />
							</CardContent>
						</Card>
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Kendaraan</h1>
					<p className="text-muted-foreground">Kelola daftar kendaraan Anda</p>
				</div>
				<Button onClick={() => setShowAdd(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Tambah Kendaraan
				</Button>
			</div>

			{vehicles.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Car className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 className="text-lg font-medium mb-1">Belum ada kendaraan</h3>
						<p className="text-sm text-muted-foreground mb-4">Tambah kendaraan pertama Anda untuk mulai melacak servis</p>
						<Button onClick={() => setShowAdd(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Tambah Kendaraan
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{vehicles.map((vehicle) => (
						<Link key={vehicle.id} to={`/kendaraan/${vehicle.id}`}>
							<Card className="group hover:shadow-md transition-all hover:border-primary/30 cursor-pointer h-full">
								<CardContent className="p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
												{vehicle.tipe === 'Motor' ? (
													<Bike className="h-5 w-5" />
												) : (
													<Car className="h-5 w-5" />
												)}
											</div>
											<div>
												<h3 className="font-semibold group-hover:text-primary transition-colors">
													{vehicle.nama}
												</h3>
												{vehicle.plat && (
													<p className="text-sm text-muted-foreground">{vehicle.plat}</p>
												)}
											</div>
										</div>
										{vehicle.tipe && (
											<Badge variant="secondary">{vehicle.tipe}</Badge>
										)}
									</div>

									<div className="space-y-2">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<Gauge className="h-4 w-4" />
											<span className="font-medium text-foreground">{formatKm(vehicle.currentKm)}</span>
										</div>
										{(vehicle.tahun || vehicle.bulanPajak) && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Calendar className="h-4 w-4" />
												<span>
													{vehicle.tahun && `Tahun ${vehicle.tahun}`}
													{vehicle.tahun && vehicle.bulanPajak && ' · '}
													{vehicle.bulanPajak && `Pajak ${BULAN[vehicle.bulanPajak]}`}
												</span>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}

			<VehicleForm
				open={showAdd}
				onClose={() => setShowAdd(false)}
				onSubmit={async (data) => {
					await addVehicle(data);
					setShowAdd(false);
				}}
			/>
		</div>
	);
}
