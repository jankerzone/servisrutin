import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';

export default function ProfilePage() {
	const { user, setUser } = useAuthStore();
	const [name, setName] = useState(user?.name || '');
	const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
	const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

	const [oldPassword, setOldPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	const handleUpdateProfile = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsUpdatingProfile(true);

		try {
			const response = await fetch('/api/profile', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, avatarUrl }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to update profile');
			}

			setUser(data.user);
			toast.success('Profil berhasil diperbarui');
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			setIsUpdatingProfile(false);
		}
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();

		if (newPassword !== confirmPassword) {
			toast.error('Konfirmasi password tidak cocok');
			return;
		}

		if (newPassword.length < 6) {
			toast.error('Password baru harus minimal 6 karakter');
			return;
		}

		setIsChangingPassword(true);

		try {
			const response = await fetch('/api/profile/password', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ oldPassword, newPassword }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to change password');
			}

			toast.success('Password berhasil diubah');
			setOldPassword('');
			setNewPassword('');
			setConfirmPassword('');
		} catch (error: any) {
			toast.error(error.message);
		} finally {
			setIsChangingPassword(false);
		}
	};

	return (
		<div className="container py-10 space-y-8">
			<h1 className="text-3xl font-bold tracking-tight">Profil Saya</h1>

			<div className="grid gap-8 md:grid-cols-2">
				{/* General Info */}
				<Card>
					<CardHeader>
						<CardTitle>Informasi Umum</CardTitle>
						<CardDescription>Perbarui nama dan foto profil Anda.</CardDescription>
					</CardHeader>
					<form onSubmit={handleUpdateProfile}>
						<CardContent className="space-y-4">
							<div className="flex items-center gap-4 mb-4">
								<Avatar className="h-20 w-20">
									<AvatarImage src={avatarUrl} alt={name} />
									<AvatarFallback>{name?.charAt(0)?.toUpperCase() || 'U'}</AvatarFallback>
								</Avatar>
							</div>

							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input id="email" value={user?.email || ''} disabled readOnly className="bg-muted" />
								<p className="text-xs text-muted-foreground">Email tidak dapat diubah.</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="name">Nama Lengkap</Label>
								<Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama Anda" />
							</div>

							<div className="space-y-2">
								<Label htmlFor="avatarUrl">URL Avatar</Label>
								<Input
									id="avatarUrl"
									value={avatarUrl}
									onChange={(e) => setAvatarUrl(e.target.value)}
									placeholder="https://example.com/avatar.jpg"
								/>
								<p className="text-xs text-muted-foreground">Masukkan URL gambar untuk foto profil Anda.</p>
							</div>
						</CardContent>
						<CardFooter>
							<Button type="submit" disabled={isUpdatingProfile}>
								{isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Simpan Perubahan
							</Button>
						</CardFooter>
					</form>
				</Card>

				{/* Security */}
				<Card>
					<CardHeader>
						<CardTitle>Keamanan</CardTitle>
						<CardDescription>Ubah password akun Anda.</CardDescription>
					</CardHeader>
					<form onSubmit={handleChangePassword}>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="oldPassword">Password Lama</Label>
								<Input
									id="oldPassword"
									type="password"
									value={oldPassword}
									onChange={(e) => setOldPassword(e.target.value)}
									placeholder="********"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="newPassword">Password Baru</Label>
								<Input
									id="newPassword"
									type="password"
									value={newPassword}
									onChange={(e) => setNewPassword(e.target.value)}
									placeholder="********"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
								<Input
									id="confirmPassword"
									type="password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									placeholder="********"
									required
								/>
							</div>
						</CardContent>
						<CardFooter>
							<Button type="submit" variant="destructive" disabled={isChangingPassword}>
								{isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
								Ubah Password
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}
