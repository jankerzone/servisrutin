import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import fs from 'fs';

// Get version from package.json
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));
const appVersion = packageJson.version;

// Get current date/time for build versioning
const now = new Date();
const buildDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
const hours = String(now.getHours()).padStart(2, '0');
const minutes = String(now.getMinutes()).padStart(2, '0');
const buildVersion = `${buildDate} ${hours}:${minutes}`;

export default defineConfig({
	define: {
		__APP_VERSION__: JSON.stringify(appVersion),
		__BUILD_DATE__: JSON.stringify(buildVersion),
	},
	plugins: [react(), tailwindcss()],
	root: './client',
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './client/src'),
		},
	},
	build: {
		outDir: '../public',
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		proxy: {
			'/api': {
				target: 'http://localhost:8787',
				changeOrigin: true,
			},
		},
	},
});
