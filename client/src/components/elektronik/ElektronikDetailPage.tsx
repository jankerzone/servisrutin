import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Monitor, MapPin, Calendar, Plus, Wrench, Pencil, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
	AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useElektronik } from '@/hooks/useElektronik';
import { useElektronikServiceItems } from '@/hooks/useElektronikServiceItems';
import { useElektronikServiceHistory } from '@/hooks/useElektronikServiceHistory';
import { formatDate, formatRupiah } from '@/lib/utils';
import ElektronikServiceItemList from './ElektronikServiceItemList';
import ElektronikServiceItemForm from './ElektronikServiceItemForm';
import AddElektronikHistoryForm from './AddElektronikHistoryForm';
import ElektronikForm from './ElektronikForm';

export default function ElektronikDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();

	const { items: allDevices, loading: devicesLoading, updateElektronik, deleteElektronik } = useElektronik();

	const device = allDevices.find((e) => e.shortId === id || e.id === Number(id));
	const deviceId = device?.id || 0;

	const { items: serviceItems, loading: serviceLoading, addItem, updateItem, deleteItem, fetchItems } = useElektronikServiceItems(deviceId);
	const { history, loading: historyLoading, fetchHistory } = useElektronikServiceHistory(deviceId);

	const [showAddItem, setShowAddItem] = useState(false);
	const [showAddHistory, setShowAddHistory] = useState(false);
	const [showEditDevice, setShowEditDevice] = useState(false);
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	if (devicesLoading) {
		return (
			<div className="space-y-6">
				<div className="h-8 w-48 animate-pulse rounded bg-muted" />
				<div className="h-40 animate-pulse rounded-lg bg-muted" />
			</div>
		);
	}

	if (!device) {
		return (
			<div className="space-y-4">
				<Link to="/elektronik" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
					<ArrowLeft className="h-4 w-4" /> Kembali
				</Link>
				<Card>
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Monitor className="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 className="text-lg font-medium">Elektronik tidak ditemukan</h3>
					</CardContent>
				</Card>
			</div>
		);
	}

	const handleDelete = async () => {
		await deleteElektronik(deviceId);
		navigate('/elektronik');
	};

	const handleHistorySuccess = () => {
		fetchItems();
		fetchHistory();
	};

	return (
		<div className="space-y-6">
			<Link to="/elektronik" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
				<ArrowLeft className="h-4 w-4" /> Kembali ke Elektronik
			</Link>

			{/* Device Header */}
			<Card>
				<CardContent className="p-6">
					<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
								<Monitor className="h-7 w-7" />
							</div>
							<div>
								<div className="flex items-center gap-2">
									<h1 className="text-xl font-bold">{device.nama}</h1>
									{device.tipe && <Badge variant="secondary">{device.tipe}</Badge>}
								</div>
								<div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
									{device.lokasi && (
										<span className="flex items-center gap-1">
											<MapPin className="h-3.5 w-3.5" />
											{device.lokasi}
										</span>
									)}
									{device.tahunBeli && (
										<span className="flex items-center gap-1">
											<Calendar className="h-3.5 w-3.5" />
											Beli {device.tahunBeli}
										</span>
									)}
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" onClick={() => setShowEditDevice(true)}>
								<Pencil className="mr-2 h-4 w-4" /> Edit
							</Button>
							<Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(true)} className="text-destructive hover:text-destructive">
								<Trash2 className="mr-2 h-4 w-4" /> Hapus
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Tabs */}
			<Tabs defaultValue="services">
				<div className="flex items-center justify-between">
					<TabsList>
						<TabsTrigger value="services">Item Servis</TabsTrigger>
						<TabsTrigger value="history">Riwayat</TabsTrigger>
					</TabsList>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={() => setShowAddHistory(true)}>
							<Wrench className="mr-2 h-4 w-4" /> Catat Servis
						</Button>
						<Button size="sm" onClick={() => setShowAddItem(true)}>
							<Plus className="mr-2 h-4 w-4" /> Tambah Item
						</Button>
					</div>
				</div>

				<TabsContent value="services" className="mt-4">
					<ElektronikServiceItemList
						items={serviceItems}
						loading={serviceLoading}
						onUpdate={updateItem}
						onDelete={deleteItem}
					/>
				</TabsContent>

				<TabsContent value="history" className="mt-4">
					{historyLoading ? (
						<div className="space-y-3">
							{[...Array(3)].map((_, i) => (
								<div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
							))}
						</div>
					) : history.length === 0 ? (
						<Card>
							<CardContent className="flex flex-col items-center justify-center py-12">
								<Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
								<p className="text-sm text-muted-foreground">Belum ada riwayat servis</p>
								<Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddHistory(true)}>
									<Plus className="mr-2 h-4 w-4" /> Catat Servis Pertama
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className="space-y-3">
							{history.map((entry) => (
								<Card key={entry.id}>
									<CardContent className="p-4">
										<div className="flex items-start justify-between">
											<div>
												<p className="font-medium">{formatDate(entry.serviceDate)}</p>
												{entry.notes && (
													<p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
												)}
												<div className="flex gap-1.5 flex-wrap mt-2">
													{entry.serviceItemIds.map((sid) => {
														const si = serviceItems.find((i) => i.id === sid);
														return (
															<Badge key={sid} variant="outline" className="text-xs">
																{si?.nama || `Item #${sid}`}
															</Badge>
														);
													})}
												</div>
											</div>
											{entry.totalCost != null && entry.totalCost > 0 && (
												<span className="text-sm font-semibold whitespace-nowrap">
													{formatRupiah(entry.totalCost)}
												</span>
											)}
										</div>
									</CardContent>
								</Card>
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Dialogs */}
			<ElektronikServiceItemForm
				open={showAddItem}
				onClose={() => setShowAddItem(false)}
				onSubmit={async (data) => {
					await addItem({ ...data, elektronikId: deviceId });
					setShowAddItem(false);
				}}
			/>

			<AddElektronikHistoryForm
				open={showAddHistory}
				onClose={() => setShowAddHistory(false)}
				elektronikId={deviceId}
				serviceItems={serviceItems}
				onSuccess={handleHistorySuccess}
			/>

			<ElektronikForm
				open={showEditDevice}
				onClose={() => setShowEditDevice(false)}
				item={device}
				onSubmit={async (data) => {
					await updateElektronik(deviceId, data);
					setShowEditDevice(false);
				}}
			/>

			<AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus Elektronik?</AlertDialogTitle>
						<AlertDialogDescription>
							"{device.nama}" beserta semua item servis dan riwayatnya akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Batal</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
							Hapus
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
