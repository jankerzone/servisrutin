import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Car, History, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
	{ to: '/', label: 'Dashboard', icon: LayoutDashboard },
	{ to: '/kendaraan', label: 'Kendaraan', icon: Car },
	{ to: '/riwayat', label: 'Riwayat Servis', icon: History },
];

interface SidebarProps {
	open: boolean;
	onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
	return (
		<>
			{/* Mobile overlay */}
			{open && (
				<div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
			)}

			{/* Sidebar */}
			<aside
				className={cn(
					'fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0',
					open ? 'translate-x-0' : '-translate-x-full',
				)}
			>
				{/* Logo */}
				<div className="flex h-20 items-center justify-between border-b border-sidebar-border px-3">
					<div>
						<img src="/images/logo-black-transparent.png" alt="Servis Rutin" className="h-16 w-auto max-w-[210px] object-contain" />
					</div>
					<Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
						<X className="h-5 w-5" />
					</Button>
				</div>

				{/* Navigation */}
				<nav className="flex-1 space-y-1 px-3 py-4">
					{navItems.map((item) => (
						<NavLink
							key={item.to}
							to={item.to}
							end={item.to === '/'}
							onClick={onClose}
							className={({ isActive }) =>
								cn(
									'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
									isActive
										? 'bg-sidebar-accent text-sidebar-accent-foreground'
										: 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
								)
							}
						>
							<item.icon className="h-5 w-5" />
							{item.label}
						</NavLink>
					))}
				</nav>

				{/* Footer */}
				<div className="border-t border-sidebar-border p-4">
					<p className="text-xs text-muted-foreground">
						ServisRutin by Jankerzone
						<br />
						<span className="opacity-70 text-[10px]">v{__APP_VERSION__} ({__BUILD_DATE__})</span>
					</p>
				</div>
			</aside>
		</>
	);
}
