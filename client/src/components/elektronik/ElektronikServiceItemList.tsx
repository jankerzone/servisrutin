import { useState } from 'react';
import { Pencil, Trash2, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
	AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
	AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { formatDate } from '@/lib/utils';
import ElektronikServiceItemForm from './ElektronikServiceItemForm';
import type { ElektronikServiceItem, ElektronikIntervalType, ElektronikServiceItemPayload } from '@/types';

interface ElektronikServiceItemListProps {
	items: ElektronikServiceItem[];
	loading: boolean;
	onUpdate: (id: number, data: Omit<ElektronikServiceItemPayload, 'elektronikId'>) => Promise<void>;
	onDelete: (id: number) => Promise<void>;
}

function calculateProgress(item: ElektronikServiceItem): number {
	if (!item.intervalType || item.intervalType === 'NONE') return 0;
	if (item.lastDate && item.intervalValue) {
		const daysSinceLast = Math.floor((new Date().getTime() - new Date(item.lastDate).getTime()) / (1000 * 60 * 60 * 24));
		let intervalInDays = item.intervalValue;
		if (item.intervalType === 'MONTH') intervalInDays *= 30;
		if (item.intervalType === 'YEAR') intervalInDays *= 365;
		return Math.min(Math.max((daysSinceLast / intervalInDays) * 100, 0), 100);
	}
	return 0;
}

function getDueInfo(item: ElektronikServiceItem): string {
	if (!item.intervalType || item.intervalType === 'NONE') return 'Tidak ada interval';
	if (item.lastDate && item.intervalValue) {
		const dueDate = new Date(item.lastDate);
		if (item.intervalType === 'DAY') dueDate.setDate(dueDate.getDate() + item.intervalValue);
		if (item.intervalType === 'MONTH') dueDate.setMonth(dueDate.getMonth() + item.intervalValue);
		if (item.intervalType === 'YEAR') dueDate.setFullYear(dueDate.getFullYear() + item.intervalValue);
		return `Target: ${formatDate(dueDate.toISOString())}`;
	}
	return '-';
}

function getIntervalLabel(type: ElektronikIntervalType | null, value: number | null): string {
	if (!type || type === 'NONE') return 'Tanpa interval';
	const labels: Record<string, string> = {
		DAY: `Setiap ${value} hari`,
		MONTH: `Setiap ${value} bulan`,
		YEAR: `Setiap ${value} tahun`,
	};
	return labels[type] || type;
}

export default function ElektronikServiceItemList({ items, loading, onUpdate, onDelete }: ElektronikServiceItemListProps) {
	const [editItem, setEditItem] = useState<ElektronikServiceItem | null>(null);
	const [deleteId, setDeleteId] = useState<number | null>(null);

	if (loading) {
		return (
			<div className="space-y-3">
				{[...Array(3)].map((_, i) => (
					<div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
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
		<div className="space-y-3">
			{items.map((item) => {
				const progress = calculateProgress(item);
				const progressColor = progress >= 100 ? 'bg-destructive' : progress >= 70 ? 'bg-warning' : 'bg-success';
				const statusVariant = progress >= 100 ? 'destructive' : progress >= 70 ? 'warning' : 'success';

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
										{getIntervalLabel(item.intervalType, item.intervalValue)}
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

							{item.lastDate && (
								<p className="text-sm text-muted-foreground mb-3">Terakhir: {formatDate(item.lastDate)}</p>
							)}

							{item.intervalType && item.intervalType !== 'NONE' && (
								<div className="space-y-1.5">
									<div className="flex items-center justify-between text-sm">
										<span className="text-muted-foreground">{getDueInfo(item)}</span>
										<Badge variant={statusVariant} className="text-xs">{progress.toFixed(0)}%</Badge>
									</div>
									<Progress value={progress} className="h-2" indicatorClassName={progressColor} />
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}

			{editItem && (
				<ElektronikServiceItemForm
					open={true}
					onClose={() => setEditItem(null)}
					onSubmit={async (data) => {
						await onUpdate(editItem.id, data);
						setEditItem(null);
					}}
					item={editItem}
				/>
			)}

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
