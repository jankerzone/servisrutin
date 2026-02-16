import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

function getSystemTheme(): 'light' | 'dark' {
	if (typeof window !== 'undefined') {
		return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	return 'light';
}

function applyTheme(theme: Theme) {
	const root = document.documentElement;
	const resolved = theme === 'system' ? getSystemTheme() : theme;
	root.classList.toggle('dark', resolved === 'dark');
}

const stored = (typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null) as Theme | null;
const initial: Theme = stored || 'light';

// Apply immediately on load
if (typeof document !== 'undefined') {
	applyTheme(initial);
}

export const useThemeStore = create<ThemeStore>((set) => ({
	theme: initial,
	setTheme: (theme) => {
		localStorage.setItem('theme', theme);
		applyTheme(theme);
		set({ theme });
	},
}));
