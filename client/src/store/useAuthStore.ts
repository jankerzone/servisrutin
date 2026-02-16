import { create } from 'zustand';

interface User {
	id: number;
	email: string;
	name: string | null;
}

interface AuthStore {
	user: User | null;
	loading: boolean;
	setUser: (user: User | null) => void;
	setLoading: (loading: boolean) => void;
	checkAuth: () => Promise<void>;
	login: (email: string, password: string, turnstileToken: string) => Promise<{ success: boolean; error?: string }>;
	signup: (email: string, password: string, name?: string, turnstileToken?: string) => Promise<{ success: boolean; error?: string }>;
	logout: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
	user: null,
	loading: true,
	setUser: (user) => set({ user }),
	setLoading: (loading) => set({ loading }),
	checkAuth: async () => {
		try {
			const response = await fetch('/api/auth/me', {
				credentials: 'include',
			});
			const data = await response.json();
			set({ user: data.user, loading: false });
		} catch (error) {
			console.error('Error checking auth:', error);
			set({ user: null, loading: false });
		}
	},
	login: async (email: string, password: string, turnstileToken: string) => {
		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password, turnstileToken }),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				set({ user: data.user });
				return { success: true };
			} else {
				return { success: false, error: data.error || 'Login gagal' };
			}
		} catch (error) {
			console.error('Error during login:', error);
			return { success: false, error: 'Kesalahan jaringan' };
		}
	},
	signup: async (email: string, password: string, name?: string, turnstileToken?: string) => {
		try {
			const response = await fetch('/api/auth/signup', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ email, password, name, turnstileToken }),
			});

			const data = await response.json();

			if (response.ok && data.success) {
				set({ user: data.user });
				return { success: true };
			} else {
				return { success: false, error: data.error || 'Pendaftaran gagal' };
			}
		} catch (error) {
			console.error('Error during signup:', error);
			return { success: false, error: 'Kesalahan jaringan' };
		}
	},
	logout: async () => {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
				credentials: 'include',
			});
			set({ user: null });
		} catch (error) {
			console.error('Error during logout:', error);
		}
	},
}));
