import { Menu, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeToggle from './ThemeToggle';
import { useAuthStore } from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
	onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
	const { user, logout } = useAuthStore();
	const navigate = useNavigate();

	const initials = user?.name
		? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
		: user?.email?.[0]?.toUpperCase() || 'U';

	return (
		<header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
			<Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
				<Menu className="h-5 w-5" />
			</Button>

			<div className="flex-1" />

			<ThemeToggle />

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="ghost" className="relative h-9 w-9 rounded-full">
						<Avatar className="h-9 w-9">
							<AvatarImage src={user?.avatarUrl || ''} alt={user?.name || ''} />
							<AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
								{initials}
							</AvatarFallback>
						</Avatar>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent className="w-56" align="end" forceMount>
					<DropdownMenuLabel className="font-normal">
						<div className="flex flex-col space-y-1">
							{user?.name && <p className="text-sm font-medium">{user.name}</p>}
							<p className="text-xs text-muted-foreground">{user?.email}</p>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={() => navigate('/profil')}>
						<User className="mr-2 h-4 w-4" />
						<span>Profil</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
						<LogOut className="mr-2 h-4 w-4" />
						<span>Keluar</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</header>
	);
}
