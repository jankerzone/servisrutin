import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Monitor, MapPin, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useElektronik } from '@/hooks/useElektronik';
import ElektronikForm from './ElektronikForm';

export default function ElektronikPage() {
	const { items, loading, addElektronik } = useElektronik();
	const [showAdd, setShowAdd] = useState(false);

	if (loading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold tracking-tight">Elektronik</h1>
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
					<h1 className="text-2xl font-bold tracking-tight">Elektronik</h1>
					<p className="text-muted-foreground">Kelola jadwal servis perangkat elektronik Anda</p>
				</div>
				<Button onClick={() => setShowAdd(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Tambah Elektronik
				</Button>
			</div>

			{items.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Monitor className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 className="text-lg font-medium mb-1">Belum ada elektronik</h3>
						<p className="text-sm text-muted-foreground mb-4">Tambah perangkat elektronik pertama Anda untuk mulai melacak servis</p>
						<Button onClick={() => setShowAdd(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Tambah Elektronik
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{items.map((item) => (
						<Link key={item.id} to={`/elektronik/${item.shortId || item.id}`}>
							<Card className="group hover:shadow-md transition-all hover:border-primary/30 cursor-pointer h-full">
								<CardContent className="p-6">
									<div className="flex items-start justify-between mb-4">
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
												<Monitor className="h-5 w-5" />
											</div>
											<h3 className="font-semibold group-hover:text-primary transition-colors">
												{item.nama}
											</h3>
										</div>
										{item.tipe && <Badge variant="secondary">{item.tipe}</Badge>}
									</div>

									<div className="space-y-1.5">
										{item.lokasi && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<MapPin className="h-4 w-4" />
												<span>{item.lokasi}</span>
											</div>
										)}
										{item.tahunBeli && (
											<div className="flex items-center gap-2 text-sm text-muted-foreground">
												<Calendar className="h-4 w-4" />
												<span>Beli {item.tahunBeli}</span>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>
			)}

			<ElektronikForm
				open={showAdd}
				onClose={() => setShowAdd(false)}
				onSubmit={async (data) => {
					await addElektronik(data);
					setShowAdd(false);
				}}
			/>
		</div>
	);
}
