import { useState, useRef, useEffect, useCallback } from 'react';
import { Wrench, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/useAuthStore';

const TURNSTILE_SITE_KEY =
	window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
		? '1x00000000000000000000AA' // Cloudflare test key — always passes on localhost
		: '0x4AAAAAAB6vY94lTHtRt2JR';

declare global {
	interface Window {
		turnstile?: {
			render: (
				container: string | HTMLElement,
				options: {
					sitekey: string;
					callback?: (token: string) => void;
					'expired-callback'?: () => void;
					'error-callback'?: () => void;
					theme?: 'light' | 'dark' | 'auto';
					size?: 'normal' | 'compact';
				},
			) => string;
			reset: (widgetId: string) => void;
			remove: (widgetId: string) => void;
		};
	}
}

export default function AuthPage() {
	const [activeTab, setActiveTab] = useState('login');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
	const { login, signup } = useAuthStore();

	const turnstileRef = useRef<HTMLDivElement>(null);
	const widgetIdRef = useRef<string | null>(null);

	const renderWidget = useCallback(() => {
		if (!window.turnstile || !turnstileRef.current) return;

		if (widgetIdRef.current !== null) {
			window.turnstile.remove(widgetIdRef.current);
			widgetIdRef.current = null;
		}

		widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
			sitekey: TURNSTILE_SITE_KEY,
			callback: (token: string) => setTurnstileToken(token),
			'expired-callback': () => setTurnstileToken(null),
			'error-callback': () => setTurnstileToken(null),
			theme: 'auto',
		});
	}, []);

	useEffect(() => {
		if (window.turnstile) {
			renderWidget();
			return;
		}

		const interval = setInterval(() => {
			if (window.turnstile) {
				clearInterval(interval);
				renderWidget();
			}
		}, 100);

		return () => {
			clearInterval(interval);
			if (widgetIdRef.current !== null && window.turnstile) {
				window.turnstile.remove(widgetIdRef.current);
			}
		};
	}, [renderWidget]);

	const resetTurnstile = () => {
		setTurnstileToken(null);
		if (widgetIdRef.current !== null && window.turnstile) {
			window.turnstile.reset(widgetIdRef.current);
		}
	};

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (!turnstileToken) {
			setError('Mohon selesaikan verifikasi keamanan');
			return;
		}

		setLoading(true);
		try {
			const result = await login(email, password, turnstileToken);
			if (!result.success) {
				setError(result.error || 'Login gagal');
				resetTurnstile();
			}
		} catch {
			setError('Terjadi kesalahan');
			resetTurnstile();
		} finally {
			setLoading(false);
		}
	};

	const handleSignup = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		if (!turnstileToken) {
			setError('Mohon selesaikan verifikasi keamanan');
			return;
		}

		setLoading(true);
		try {
			const result = await signup(email, password, name, turnstileToken);
			if (!result.success) {
				setError(result.error || 'Pendaftaran gagal');
				resetTurnstile();
			}
		} catch {
			setError('Terjadi kesalahan');
			resetTurnstile();
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex bg-background">
			{/* Left — Hero image panel (hidden on mobile) */}
			<div className="hidden lg:flex lg:w-3/5 relative overflow-hidden">
				<img
					src="/images/auth-hero.webp"
					alt="Servis kendaraan"
					className="absolute inset-0 h-full w-full object-cover"
				/>
				{/* Gradient overlay */}
				<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />

				{/* Content over image */}
				<div className="relative z-10 flex flex-col justify-between p-10 text-white w-full">
					{/* Top branding */}
					<div className="flex items-center gap-3">
						<img src="/images/logo.png" alt="Logo" className="h-20 w-20 object-contain drop-shadow-md" />
						<span className="text-2xl font-semibold tracking-tight">Servis Rutin</span>
					</div>

					{/* Bottom text + features */}
					<div className="space-y-8">
						<div className="space-y-3">
							<h2 className="text-3xl font-bold leading-tight tracking-tight">
								Pantau servis kendaraan
								<br />
								dengan mudah & teratur.
							</h2>
							<p className="text-white/70 text-base max-w-md leading-relaxed">
								Catat riwayat servis, atur pengingat perawatan berkala, dan pastikan kendaraan Anda selalu dalam kondisi prima.
							</p>
						</div>

						<div className="grid grid-cols-3 gap-4">
							<div className="flex flex-col gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
								<Wrench className="h-5 w-5 text-white/80" />
								<span className="text-sm font-medium">Lacak Servis</span>
								<span className="text-xs text-white/50">Item servis per kendaraan</span>
							</div>
							<div className="flex flex-col gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
								<Clock className="h-5 w-5 text-white/80" />
								<span className="text-sm font-medium">Riwayat Lengkap</span>
								<span className="text-xs text-white/50">Timeline semua perawatan</span>
							</div>
							<div className="flex flex-col gap-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 p-4">
								<Shield className="h-5 w-5 text-white/80" />
								<span className="text-sm font-medium">Pengingat</span>
								<span className="text-xs text-white/50">Notifikasi jatuh tempo</span>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Right — Auth form */}
			<div className="flex w-full lg:w-2/5 items-center justify-center p-6 sm:p-10">
				<div className="w-full max-w-[420px] space-y-8">
					{/* Mobile branding (hidden on desktop since left panel has it) */}
					<div className="flex flex-col items-center gap-3 lg:hidden">
						<img src="/images/logo.png" alt="Logo" className="h-28 w-28 object-contain drop-shadow-lg" />
						<div className="text-center">
							<h1 className="text-2xl font-bold tracking-tight">Servis Rutin</h1>
							<p className="text-sm text-muted-foreground mt-1">
								Pantau jadwal servis kendaraan Anda
							</p>
						</div>
					</div>

					{/* Desktop heading */}
					<div className="hidden lg:block space-y-2">
						<h1 className="text-2xl font-bold tracking-tight">
							{activeTab === 'login' ? 'Selamat datang kembali' : 'Buat akun baru'}
						</h1>
						<p className="text-sm text-muted-foreground">
							{activeTab === 'login'
								? 'Masuk ke akun Anda untuk melanjutkan'
								: 'Daftar untuk mulai melacak servis kendaraan'}
						</p>
					</div>

					{/* Tabs + Forms */}
					<Tabs defaultValue="login" className="w-full" onValueChange={(v) => { setActiveTab(v); setError(''); }}>
						<TabsList className="grid w-full grid-cols-2 mb-6">
							<TabsTrigger value="login">Masuk</TabsTrigger>
							<TabsTrigger value="signup">Daftar</TabsTrigger>
						</TabsList>

						{error && (
							<div className="mb-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive border border-destructive/20">
								{error}
							</div>
						)}

						<TabsContent value="login" className="mt-0">
							<form onSubmit={handleLogin} id="form-login" className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="login-email">Email</Label>
									<Input
										id="login-email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										autoComplete="email"
										placeholder="nama@email.com"
										className="h-11"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="login-password">Password</Label>
									<Input
										id="login-password"
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										autoComplete="current-password"
										className="h-11"
									/>
								</div>
							</form>
						</TabsContent>

						<TabsContent value="signup" className="mt-0">
							<form onSubmit={handleSignup} id="form-signup" className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="signup-name">Nama (opsional)</Label>
									<Input
										id="signup-name"
										value={name}
										onChange={(e) => setName(e.target.value)}
										placeholder="Nama lengkap"
										className="h-11"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="signup-email">Email</Label>
									<Input
										id="signup-email"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
										autoComplete="email"
										placeholder="nama@email.com"
										className="h-11"
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="signup-password">Password</Label>
									<Input
										id="signup-password"
										type="password"
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
										autoComplete="new-password"
										className="h-11"
									/>
								</div>
							</form>
						</TabsContent>

						{/* Turnstile widget */}
						<div ref={turnstileRef} className="flex justify-center mt-5" />

						{/* Submit button */}
						<Button
							type="submit"
							form={activeTab === 'login' ? 'form-login' : 'form-signup'}
							className="w-full h-11 mt-4 text-sm font-medium"
							disabled={loading || !turnstileToken}
						>
							{loading ? 'Memproses...' : activeTab === 'login' ? 'Masuk' : 'Daftar'}
						</Button>
					</Tabs>

					{/* Footer */}
					<p className="text-center text-xs text-muted-foreground">
						Dilindungi oleh Cloudflare Turnstile
					</p>
				</div>
			</div>
		</div>
	);
}
