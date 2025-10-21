import { useEffect, useState } from 'react';
import {
	Card,
	CardContent,
	Typography,
	LinearProgress,
	Box,
	CircularProgress,
} from '@mui/material';
import { format } from 'date-fns';

interface ServiceItem {
	id: number;
	kendaraanId: number;
	nama: string;
	intervalType: string | null;
	intervalValue: number | null;
	lastKm: number | null;
	lastDate: string | null;
}

interface ServiceListProps {
	kendaraanId: number;
	sortBy?: string;
	currentKm?: number;
}

export default function ServiceList({ kendaraanId, sortBy = 'nama', currentKm = 0 }: ServiceListProps) {
	const [items, setItems] = useState<ServiceItem[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchServiceItems();
	}, [kendaraanId, sortBy]);

	const fetchServiceItems = async () => {
		try {
			setLoading(true);
			const response = await fetch(`/api/service-items?kendaraanId=${kendaraanId}&order=${sortBy}`);
			const data = await response.json();
			setItems(data.results || []);
		} catch (error) {
			console.error('Error fetching service items:', error);
		} finally {
			setLoading(false);
		}
	};

	const calculateProgress = (item: ServiceItem): number => {
		if (!item.intervalType || item.intervalType === 'NONE') return 0;

		if (item.intervalType === 'KM' && item.lastKm && item.intervalValue) {
			const kmSinceLast = currentKm - item.lastKm;
			const progress = (kmSinceLast / item.intervalValue) * 100;
			return Math.min(Math.max(progress, 0), 100);
		}

		if (['DAY', 'MONTH', 'YEAR'].includes(item.intervalType) && item.lastDate && item.intervalValue) {
			const lastDate = new Date(item.lastDate);
			const now = new Date();
			const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
			
			let intervalInDays = item.intervalValue;
			if (item.intervalType === 'MONTH') intervalInDays *= 30;
			if (item.intervalType === 'YEAR') intervalInDays *= 365;
			
			const progress = (daysSinceLast / intervalInDays) * 100;
			return Math.min(Math.max(progress, 0), 100);
		}

		return 0;
	};

	const getDueInfo = (item: ServiceItem): string => {
		if (!item.intervalType || item.intervalType === 'NONE') return 'No interval set';

		if (item.intervalType === 'KM' && item.lastKm && item.intervalValue) {
			const dueKm = item.lastKm + item.intervalValue;
			return `Due: ${dueKm.toLocaleString()} km`;
		}

		if (['DAY', 'MONTH', 'YEAR'].includes(item.intervalType) && item.lastDate && item.intervalValue) {
			const lastDate = new Date(item.lastDate);
			let dueDate = new Date(lastDate);
			
			if (item.intervalType === 'DAY') dueDate.setDate(dueDate.getDate() + item.intervalValue);
			if (item.intervalType === 'MONTH') dueDate.setMonth(dueDate.getMonth() + item.intervalValue);
			if (item.intervalType === 'YEAR') dueDate.setFullYear(dueDate.getFullYear() + item.intervalValue);
			
			return `Due: ${format(dueDate, 'MMM dd, yyyy')}`;
		}

		return 'N/A';
	};

	const getLastInfo = (item: ServiceItem): string => {
		const parts: string[] = [];
		
		if (item.lastDate) {
			parts.push(format(new Date(item.lastDate), 'MMM dd, yyyy'));
		}
		
		if (item.lastKm) {
			parts.push(`${item.lastKm.toLocaleString()} km`);
		}

		return parts.length > 0 ? `Last: ${parts.join(' / ')}` : 'No service recorded';
	};

	if (loading) {
		return (
			<Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
				<CircularProgress />
			</Box>
		);
	}

	if (items.length === 0) {
		return (
			<Box sx={{ p: 4, textAlign: 'center' }}>
				<Typography color="text.secondary">
					No service items yet. Click the + button to add one.
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			{items.map((item) => {
				const progress = calculateProgress(item);
				const color = progress < 50 ? 'success' : progress < 80 ? 'warning' : 'error';
				
				return (
					<Card key={item.id} variant="outlined">
						<CardContent>
							<Typography variant="h6" gutterBottom>
								{item.nama}
							</Typography>
							
							<Typography variant="body2" color="text.secondary" gutterBottom>
								{getLastInfo(item)}
							</Typography>
							
							<Typography variant="body2" color="text.secondary" gutterBottom>
								{getDueInfo(item)}
							</Typography>
							
							<Box sx={{ mt: 2 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
									<Typography variant="caption" color="text.secondary">
										Progress
									</Typography>
									<Typography variant="caption" color="text.secondary">
										{progress.toFixed(0)}%
									</Typography>
								</Box>
								<LinearProgress 
									variant="determinate" 
									value={progress} 
									color={color}
									sx={{ height: 8, borderRadius: 1 }}
								/>
							</Box>
						</CardContent>
					</Card>
				);
			})}
		</Box>
	);
}
