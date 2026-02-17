import { useState } from 'react';
import { Pencil, Trash2, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
	AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatKm, formatDate } from '@/lib/utils';
import ServiceItemForm from './ServiceItemForm';
import type { ServiceItem, IntervalType, ServiceItemPayload } from '@/types';

interface ServiceItemListProps {
	items: ServiceItem[];
	loading: boolean;
	currentKm: number;
	sortBy: string;
	onSortChange: (sort: string) => void;
	onUpdate: (id: number, data: Omit<ServiceItemPayload, 'kendaraanId'>) => Promise<void>;
	onDelete: (id: number) => Promise<void>;
}

function calculateProgress(item: ServiceItem, currentKm: number): number {
	if (!item.intervalType || item.intervalType === 'NONE') return 0;
	if (item.intervalType === 'KM' && item.lastKm != null && item.intervalValue) {
		const kmSinceLast = currentKm - item.lastKm;
		return Math.min(Math.max((kmSinceLast / item.intervalValue) * 100, 0), 100);
	}
	if (['DAY', 'MONTH', 'YEAR'].includes(item.intervalType) && item.lastDate && item.intervalValue) {
		const lastDate = new Date(item.lastDate);
		const now = new Date();
		const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
		let intervalInDays = item.intervalValue;
		if (item.intervalType === 'MONTH') intervalInDays *= 30;
		if (item.intervalType === 'YEAR') intervalInDays *= 365;
		return Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
	}
	if (item.intervalType === 'WHICHEVER_FIRST') {
		let progressKm = 0;
		let progressTime = 0;

		if (item.lastKm != null && item.intervalValue) {
			const kmSinceLast = currentKm - item.lastKm;
			progressKm = Math.min(Math.max((kmSinceLast / item.intervalValue) * 100, 0), 100);
		}

		if (item.lastDate && item.timeIntervalValue && item.timeIntervalUnit) {
			const lastDate = new Date(item.lastDate);
			const now = new Date();
			const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
			let intervalInDays = item.timeIntervalValue;
			if (item.timeIntervalUnit === 'MONTH') intervalInDays *= 30;
			if (item.timeIntervalUnit === 'YEAR') intervalInDays *= 365;
			progressTime = Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
		}

		return Math.max(progressKm, progressTime);
	}
	return 0;
}

function getDueInfo(item: ServiceItem): string {
	if (!item.intervalType || item.intervalType === 'NONE') return 'Tidak ada interval';
	if (item.intervalType === 'KM' && item.lastKm != null && item.intervalValue) {
		const dueKm = item.lastKm + item.intervalValue;
		return `Target: ${dueKm.toLocaleString()} km`;
	}
	if (['DAY', 'MONTH', 'YEAR'].includes(item.intervalType) && item.lastDate && item.intervalValue) {
		const lastDate = new Date(item.lastDate);
		const dueDate = new Date(lastDate);
		if (item.intervalType === 'DAY') dueDate.setDate(dueDate.getDate() + item.intervalValue);
		if (item.intervalType === 'MONTH') dueDate.setMonth(dueDate.getMonth() + item.intervalValue);
		if (item.intervalType === 'YEAR') dueDate.setFullYear(dueDate.getFullYear() + item.intervalValue);
		return `Target: ${formatDate(dueDate.toISOString())}`;
	}
	if (item.intervalType === 'WHICHEVER_FIRST') {
		const dueInfoParts = [];

		if (item.lastKm != null && item.intervalValue) {
			const dueKm = item.lastKm + item.intervalValue;
			dueInfoParts.push(`${dueKm.toLocaleString()} km`);
		}

		if (item.lastDate && item.timeIntervalValue && item.timeIntervalUnit) {
			const lastDate = new Date(item.lastDate);
			const dueDate = new Date(lastDate);
			if (item.timeIntervalUnit === 'DAY') dueDate.setDate(dueDate.getDate() + item.timeIntervalValue);
			if (item.timeIntervalUnit === 'MONTH') dueDate.setMonth(dueDate.getMonth() + item.timeIntervalValue);
			if (item.timeIntervalUnit === 'YEAR') dueDate.setFullYear(dueDate.getFullYear() + item.timeIntervalValue);
			dueInfoParts.push(formatDate(dueDate.toISOString()));
		}
		
		if (dueInfoParts.length === 0) return '-';
		return `Target: ${dueInfoParts.join(' atau ')}`;
	}
	return '-';
}

function getIntervalLabel(type: IntervalType | null, value: number | null, item?: ServiceItem): string {
	if (!type || type === 'NONE') return 'Tanpa interval';
	if (type === 'WHICHEVER_FIRST' && item) {
		const kmPart = item.intervalValue ? `${item.intervalValue.toLocaleString()} km` : '';
		
		let timePart = '';
		if (item.timeIntervalValue && item.timeIntervalUnit) {
			const unitLabels: Record<string, string> = {
				DAY: 'hari',
				MONTH: 'bulan',
				YEAR: 'tahun'
			};
			timePart = `${item.timeIntervalValue} ${unitLabels[item.timeIntervalUnit] || item.timeIntervalUnit}`;
		}

		if (kmPart && timePart) return `Setiap ${kmPart} atau ${timePart}`;
		if (kmPart) return `Setiap ${kmPart}`;
		if (timePart) return `Setiap ${timePart}`;
		return 'Mana duluan';
	}
	const labels: Record<string, string> = {
		KM: `Setiap ${(value || 0).toLocaleString()} km`,
		DAY: `Setiap ${value} hari`,
		MONTH: `Setiap ${value} bulan`,
		YEAR: `Setiap ${value} tahun`,
		WHICHEVER_FIRST: `Mana duluan`,
	};
	return labels[type] || type;
}

export default function ServiceItemList({
	items, loading, currentKm, sortBy, onSortChange, onUpdate, onDelete,
}: ServiceItemListProps) {
	const [editItem, setEditItem] = useState<ServiceItem | null>(null);
	const [deleteId, setDeleteId] = useState<number | null>(null);

	if (loading) {
		return (
			<div className="space-y-3">
				{[...Array(3)].map((_, i) => (
					<div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
				))}
			</div>
		);
	}

	if (items.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12">
					<Wrench className="h-10 w-10 text-muted-foreground/50 mb-3" />
					<p className="text-sm text-muted-foreground">Belum ada item servis</p>
					<p className="text-xs text-muted-foreground mt-1">Klik "Tambah Item" untuk menambahkan</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{/* Sort */}
			<div className="flex justify-end">
				<Select value={sortBy} onValueChange={onSortChange}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Urutkan" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="nama">Nama</SelectItem>
						<SelectItem value="last_date">Tanggal Terakhir</SelectItem>
						<SelectItem value="last_km">KM Terakhir</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Items */}
			<div className="space-y-3">
				{items.map((item) => {
					const progress = calculateProgress(item, currentKm);
					const progressColor =
						progress >= 100
							? 'bg-destructive'
							: progress >= 70
								? 'bg-warning'
								: 'bg-success';
					const statusVariant =
						progress >= 100 ? 'destructive' : progress >= 70 ? 'warning' : 'success';

					return (
						<Card key={item.id}>
							<CardContent className="p-4">
								<div className="flex items-start justify-between mb-3">
									<div>
										<div className="flex items-center gap-2">
											<h4 className="font-semibold">{item.nama}</h4>
											{progress >= 100 && <Badge variant="destructive">Terlambat</Badge>}
											{progress >= 70 && progress < 100 && <Badge variant="warning">Segera</Badge>}
										</div>
										<p className="text-sm text-muted-foreground mt-0.5">
											{getIntervalLabel(item.intervalType, item.intervalValue, item)}
										</p>
									</div>
									<div className="flex gap-1">
										<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(item)}>
											<Pencil className="h-4 w-4" />
										</Button>
										<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteId(item.id)}>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>

								{/* Info */}
								<div className="flex gap-4 text-sm text-muted-foreground mb-3">
									{item.lastDate && (
										<span>Terakhir: {formatDate(item.lastDate)}</span>
									)}
									{item.lastKm != null && (
										<span>di {formatKm(item.lastKm)}</span>
									)}
								</div>

								{/* Progress */}
								{item.intervalType && item.intervalType !== 'NONE' && (
									<div className="space-y-1.5">
										<div className="flex items-center justify-between text-sm">
											<span className="text-muted-foreground">{getDueInfo(item)}</span>
											<Badge variant={statusVariant} className="text-xs">
												{progress.toFixed(0)}%
											</Badge>
										</div>
										<Progress
											value={progress}
											className="h-2"
											indicatorClassName={progressColor}
										/>
									</div>
								)}
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* Edit Dialog */}
			{editItem && (
				<ServiceItemForm
					open={true}
					onClose={() => setEditItem(null)}
					onSubmit={async (data) => {
						await onUpdate(editItem.id, data);
						setEditItem(null);
					}}
					item={editItem}
					currentKm={currentKm}
				/>
			)}

			{/* Delete Confirmation */}
			<AlertDialog open={deleteId !== null} onOpenChange={(v) => !v && setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Hapus Item Servis?</AlertDialogTitle>
						<AlertDialogDescription>
							Item servis ini akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Batal</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={async () => {
								if (deleteId) {
									await onDelete(deleteId);
									setDeleteId(null);
								}
							}}
						>
							Hapus
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
